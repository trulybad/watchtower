#!/bin/bash
# ============================================================
# WATCHTOWER C2 — Smart Start & Auto-Setup Script
# Handles: Node.js install, npm deps, IP detect, cert rotate
# Works on: Windows MINGW64/WSL, Linux (Debian/RHEL/Arch), macOS
# Usage:  ./start-watchtower.sh [--no-start]
#           --no-start : setup only, don't launch the server
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MC_DIR="$SCRIPT_DIR/MeshCentral-master"
DATA_DIR="$SCRIPT_DIR/meshcentral-data"
CONFIG="$DATA_DIR/config.json"
LOG="$SCRIPT_DIR/watchtower.log"
NO_START=false
[[ "${1:-}" == "--no-start" ]] && NO_START=true

# ── Banner ──────────────────────────────────────────────────
echo ""
echo -e "\033[96m  ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗"
echo    "  ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║"
echo    "  ██║ █╗ ██║███████║   ██║   ██║     ███████║"
echo    "  ██║███╗██║██╔══██║   ██║   ██║     ██╔══██║"
echo    "  ╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║"
echo -e "   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝\033[0m"
echo -e "\033[93m  WATCHTOWER C2  v1.0 — Smart Start & Setup\033[0m"
echo ""

[ -d "$MC_DIR" ] || { echo -e "\033[91m[✗] MeshCentral-master/ not found at $MC_DIR\033[0m"; exit 1; }

# ── Detect OS ───────────────────────────────────────────────
OS="linux"
IS_MINGW=false
IS_WSL=false
case "$(uname -s 2>/dev/null)" in
    Darwin*)            OS="macos" ;;
    MINGW*|MSYS*|CYGWIN*) OS="windows"; IS_MINGW=true ;;
    Linux*)
        grep -qi microsoft /proc/version 2>/dev/null && IS_WSL=true || true
        ;;
esac
echo -e "\033[96m[*]\033[0m OS: $OS$(${IS_MINGW} && echo ' (MINGW64)' || true)$(${IS_WSL} && echo ' (WSL)' || true)"

# ── Node.js: detect & install ────────────────────────────────
install_node_linux() {
    if command -v apt-get &>/dev/null; then
        echo "[*] Installing Node.js LTS (apt)..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - 2>/dev/null
        sudo apt-get install -y nodejs
    elif command -v yum &>/dev/null; then
        echo "[*] Installing Node.js LTS (yum)..."
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash - 2>/dev/null
        sudo yum install -y nodejs
    elif command -v dnf &>/dev/null; then
        echo "[*] Installing Node.js LTS (dnf)..."
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash - 2>/dev/null
        sudo dnf install -y nodejs
    elif command -v pacman &>/dev/null; then
        echo "[*] Installing Node.js (pacman)..."
        sudo pacman -Sy --noconfirm nodejs npm
    elif command -v apk &>/dev/null; then
        echo "[*] Installing Node.js (apk)..."
        sudo apk add --no-cache nodejs npm
    elif command -v zypper &>/dev/null; then
        echo "[*] Installing Node.js (zypper)..."
        sudo zypper install -y nodejs npm
    else
        echo -e "\033[91m[✗] Cannot auto-install Node.js. Get it from https://nodejs.org\033[0m"
        exit 1
    fi
}

find_node() {
    # Windows MINGW: check fixed paths first
    if $IS_MINGW; then
        for p in "/c/Program Files/nodejs/node.exe" "/c/Program Files (x86)/nodejs/node.exe"; do
            [ -f "$p" ] && echo "$p" && return
        done
    fi
    command -v node 2>/dev/null && return
    command -v nodejs 2>/dev/null && return
    echo ""
}

NODE=$(find_node)

if [ -z "$NODE" ]; then
    echo -e "\033[93m[!] Node.js not found.\033[0m"
    if [ "$OS" = "macos" ]; then
        if command -v brew &>/dev/null; then
            echo "[*] Installing Node.js via Homebrew..."
            brew install node
        else
            echo -e "\033[91m[✗] Install Homebrew first: https://brew.sh\033[0m"; exit 1
        fi
    elif [ "$OS" = "linux" ]; then
        install_node_linux
    elif $IS_MINGW; then
        echo -e "\033[91m[✗] Node.js not found. Download from https://nodejs.org and re-run.\033[0m"
        exit 1
    fi
    NODE=$(find_node)
    [ -z "$NODE" ] && { echo -e "\033[91m[✗] Node.js install failed.\033[0m"; exit 1; }
fi

NODE_VER=$("$NODE" -e "process.stdout.write(process.versions.node)" 2>/dev/null || echo "0.0.0")
NODE_MAJ=$(echo "$NODE_VER" | cut -d. -f1)
if [ "$NODE_MAJ" -lt 14 ]; then
    echo -e "\033[93m[!] Node.js $NODE_VER is too old (need >=14). Upgrading...\033[0m"
    [ "$OS" = "linux" ] && install_node_linux
    NODE=$(find_node)
    NODE_VER=$("$NODE" -e "process.stdout.write(process.versions.node)" 2>/dev/null || echo "0.0.0")
fi
echo -e "\033[92m[✓]\033[0m Node.js $NODE_VER  →  $NODE"

# ── npm install ──────────────────────────────────────────────
LOCK="$MC_DIR/node_modules/.modules.yaml"
PKG_LOCK="$MC_DIR/node_modules/.package-lock.json"
if [ ! -d "$MC_DIR/node_modules" ] || ([ ! -f "$LOCK" ] && [ ! -f "$PKG_LOCK" ]); then
    echo "[*] Installing npm dependencies (first run — may take a minute)..."
    cd "$MC_DIR"
    "$NODE" "$(command -v npm 2>/dev/null || echo "/c/Program Files/nodejs/npm")" install --production 2>&1 | tail -5
    cd "$SCRIPT_DIR"
    echo -e "\033[92m[✓]\033[0m npm packages installed"
else
    echo -e "\033[92m[✓]\033[0m npm packages present ($(ls "$MC_DIR/node_modules" | wc -l) modules)"
fi

# ── Optional deps check ──────────────────────────────────────
# OpenSSL (for WTAgent RSA key generation)
if command -v openssl &>/dev/null; then
    echo -e "\033[92m[✓]\033[0m OpenSSL $(openssl version 2>/dev/null | awk '{print $2}')"
else
    echo -e "\033[93m[!] OpenSSL not found — needed for WTAgent RSA keys.\033[0m"
    if command -v apt-get &>/dev/null; then echo "    Fix: sudo apt-get install -y openssl"; fi
fi

# C# compiler (for WTAgent)
CSC_FOUND=""
if $IS_MINGW; then
    for p in \
        "/c/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe" \
        "/c/Windows/Microsoft.NET/Framework/v4.0.30319/csc.exe"; do
        [ -f "$p" ] && CSC_FOUND="$p" && break
    done
fi
if [ -z "$CSC_FOUND" ] && command -v mcs &>/dev/null; then CSC_FOUND="mcs (Mono)"; fi
if [ -z "$CSC_FOUND" ] && command -v dotnet &>/dev/null; then CSC_FOUND="dotnet SDK"; fi

if [ -n "$CSC_FOUND" ]; then
    echo -e "\033[92m[✓]\033[0m C# compiler: $CSC_FOUND"
else
    echo -e "\033[93m[!] No C# compiler — WTAgent will not compile on this host.\033[0m"
    if command -v apt-get &>/dev/null; then echo "    Fix: sudo apt-get install -y mono-complete"; fi
fi

# ── Port check (443/80) ───────────────────────────────────────
check_port() {
    local port=$1
    if command -v ss &>/dev/null; then
        ss -tlnp 2>/dev/null | grep -q ":${port} " && return 0
    elif command -v netstat &>/dev/null; then
        netstat -tlnp 2>/dev/null | grep -q ":${port} " && return 0
    fi
    return 1
}
if check_port 443; then
    PIDS=$(pgrep -f "meshcentral.js" 2>/dev/null || echo "")
    if [ -n "$PIDS" ]; then
        echo -e "\033[92m[✓]\033[0m Port 443 in use by MeshCentral (PID $PIDS) — will restart"
    else
        echo -e "\033[93m[!] Port 443 is already in use by another process.\033[0m"
        echo "    Find it: sudo ss -tlnp | grep :443"
    fi
fi

# ── Root check (Linux/macOS — port 443 needs root or authbind) ─
if [ "$OS" = "linux" ] || [ "$OS" = "macos" ]; then
    if [ "$(id -u)" -ne 0 ]; then
        echo -e "\033[93m[!] Not running as root. Port 443 requires root on Linux/macOS.\033[0m"
        echo "    Run:  sudo ./start-watchtower.sh"
        echo "    OR install authbind:  sudo apt-get install authbind"
        echo "    OR use port 8443 instead (change 'port' in config.json)."
    fi
fi

# ── meshcentral-data setup ───────────────────────────────────
mkdir -p "$DATA_DIR"
mkdir -p "$MC_DIR/public/wt"   # WTAgent binary staging dir

if [ ! -f "$CONFIG" ]; then
    echo -e "\033[93m[!] config.json not found — will create after IP detection.\033[0m"
fi

# ── IP Detection ─────────────────────────────────────────────
echo ""
echo "[*] Detecting server IP..."

if $IS_MINGW; then
    LOCAL_IPS=$(powershell -Command \
        "try { \$r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1; \$ip = (Get-NetIPAddress -InterfaceIndex \$r.InterfaceIndex -AddressFamily IPv4).IPAddress; Write-Output \$ip } catch { '' }" \
        2>/dev/null | tr -d '\r' | grep -v '^$')
elif [ "$OS" = "macos" ]; then
    LOCAL_IPS=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || \
                ifconfig 2>/dev/null | awk '/inet / && !/127\./ {print $2}')
else
    if command -v ip &>/dev/null; then
        LOCAL_IPS=$(ip -4 addr show | awk '/inet / {print $2}' | cut -d/ -f1 | grep -v '^127\.' | grep -v '^169\.')
    else
        LOCAL_IPS=$(ifconfig 2>/dev/null | awk '/inet / {print $2}' | sed 's/addr://' | grep -v '^127\.' | grep -v '^169\.')
    fi
fi

PUBLIC_IP=$(curl -s --connect-timeout 5 https://api.ipify.org 2>/dev/null \
         || curl -s --connect-timeout 5 https://ifconfig.me 2>/dev/null \
         || curl -s --connect-timeout 5 https://icanhazip.com 2>/dev/null \
         || echo "")

CERT_IP=""
MODE="LAN"

if [ -n "$PUBLIC_IP" ] && echo "$LOCAL_IPS" | grep -qF "$PUBLIC_IP" 2>/dev/null; then
    CERT_IP="$PUBLIC_IP"
    MODE="VPS"
else
    CERT_IP=$(echo "$LOCAL_IPS" | head -1)
fi

[ -z "$CERT_IP" ] && { echo -e "\033[91m[✗] Could not determine usable IP. Set 'cert' in config.json manually.\033[0m"; exit 1; }

echo -e "\033[92m[✓]\033[0m [$MODE MODE] cert IP → $CERT_IP"
[ "$MODE" = "LAN" ] && [ -n "$PUBLIC_IP" ] && echo "    Public (NAT): $PUBLIC_IP"

# ── Update config.json ───────────────────────────────────────
if [ ! -f "$CONFIG" ]; then
    echo "[*] Creating config.json..."
    WRITE_CONFIG=true
    CURRENT_CERT=""
else
    CURRENT_CERT=$(grep '"cert"' "$CONFIG" 2>/dev/null | grep -oP '(?<=: ")[^"]+' || echo "")
    WRITE_CONFIG=false
    [ "$CURRENT_CERT" != "$CERT_IP" ] && WRITE_CONFIG=true
fi

if $WRITE_CONFIG; then
    if [ -n "$CURRENT_CERT" ]; then
        echo "[*] IP changed: $CURRENT_CERT → $CERT_IP"
        echo "[*] Removing old TLS certs (will auto-regenerate)..."
        for f in webserver-cert-private.key webserver-cert-public.crt \
                  agentserver-cert-private.key agentserver-cert-public.crt \
                  mpsserver-cert-private.key mpsserver-cert-public.crt \
                  swarmserver-cert-private.key swarmserver-cert-public.crt; do
            rm -f "$DATA_DIR/$f"
        done
        echo "[*] Clearing cached signed agent binaries..."
        rm -f "$DATA_DIR/signedagents/"* 2>/dev/null || true
    fi

    # Safe JSON update via Node.js (preserves all other settings)
    "$NODE" -e "
        var fs = require('fs'), path = '$CONFIG';
        var cfg = {};
        try { cfg = JSON.parse(fs.readFileSync(path, 'utf8')); } catch(e) {}
        cfg['\$schema'] = cfg['\$schema'] || 'https://raw.githubusercontent.com/Ylianst/MeshCentral/master/meshcentral-config-schema.json';
        cfg.settings = cfg.settings || {};
        cfg.settings.cert = '$CERT_IP';
        cfg.settings.port = cfg.settings.port || 443;
        cfg.settings.redirPort = cfg.settings.redirPort || 80;
        cfg.settings.allowFraming = true;
        cfg.domains = cfg.domains || {};
        cfg.domains[''] = cfg.domains[''] || {};
        cfg.domains[''].title = cfg.domains[''].title || 'WatchTower';
        cfg.domains[''].title2 = cfg.domains[''].title2 || 'C2';
        cfg.domains[''].allowedOrigin = true;
        cfg.domains[''].newAccounts = false;
        cfg.domains[''].agentcustomization = cfg.domains[''].agentcustomization || {
            filename: 'GoogleUpdate', servicename: 'gupdate',
            displayname: 'Google Update Service (gupdate)',
            description: 'Keeps your Google software up to date. If this service is disabled or stopped, your Google software will not be kept up to date, meaning security vulnerabilities that may arise cannot be fixed and features may not work.',
            companyname: 'Google LLC'
        };
        fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
        console.log('[+] config.json written: cert=' + cfg.settings.cert);
    "
else
    echo -e "\033[92m[✓]\033[0m config.json correct (cert=$CERT_IP)"
fi

# ── Kill existing MeshCentral instance ───────────────────────
PIDS=$(pgrep -f "meshcentral.js" 2>/dev/null || echo "")
if [ -n "$PIDS" ]; then
    echo "[*] Stopping existing instance(s): PID $PIDS"
    kill $PIDS 2>/dev/null || true
    sleep 2
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "\033[92m═══════════════════════════════════════\033[0m"
echo -e "\033[92m  Setup complete!\033[0m"
echo -e "\033[92m═══════════════════════════════════════\033[0m"
echo -e "  Server IP  : \033[96m$CERT_IP\033[0m ($MODE mode)"
echo -e "  Admin URL  : \033[96mhttps://$CERT_IP\033[0m"
echo ""

$NO_START && { echo "  [--no-start] Exiting without launching server."; echo ""; exit 0; }

# ── Start MeshCentral ────────────────────────────────────────
echo "[*] Starting WATCHTOWER C2..."
cd "$MC_DIR"
"$NODE" meshcentral.js > "$LOG" 2>&1 &
MC_PID=$!
echo -e "\033[92m[✓]\033[0m MeshCentral started (PID $MC_PID)"
echo -e "  Log:  tail -f $LOG"
echo -e "  Stop: kill $MC_PID"
echo ""
