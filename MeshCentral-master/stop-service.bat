@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" meshcentral.js --stop
echo [WATCHTOWER] Service stopped.
