@echo off
:: WATCHTOWER - Install as Windows Service
:: Run this ONCE as Administrator. After that, starts automatically on boot, no window, no popup.
echo [WATCHTOWER] Installing as Windows service...
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" meshcentral.js --install
echo.
echo [WATCHTOWER] Service installed. Use:
echo   start-service.bat   -> Start the service
echo   stop-service.bat    -> Stop the service
echo   remove-service.bat  -> Uninstall the service
pause
