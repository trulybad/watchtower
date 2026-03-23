@echo off
:: WATCHTOWER C2 — Quick Start (Windows)
:: Run install.ps1 first if this is a fresh machine.
setlocal

set "SCRIPT_DIR=%~dp0"
set "MC_DIR=%SCRIPT_DIR%MeshCentral-master"

where node >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js not found. Running installer...
    powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install.ps1" -NoStart
    echo.
    echo [*] Re-run start.bat after install completes.
    pause
    exit /b 1
)

cd /d "%MC_DIR%"
echo [*] Starting WATCHTOWER C2...
node meshcentral.js
