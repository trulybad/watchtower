@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" meshcentral.js --stop
"C:\Program Files\nodejs\node.exe" meshcentral.js --uninstall
echo [WATCHTOWER] Service removed.
pause
