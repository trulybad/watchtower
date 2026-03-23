# WATCHTOWER - PowerShell Silent Launcher
# Run: powershell -ExecutionPolicy Bypass -File start-silent.ps1

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = "C:\Program Files\nodejs\node.exe"
$script = Join-Path $dir "meshcentral.js"

Start-Process -FilePath $node `
              -ArgumentList "`"$script`"" `
              -WorkingDirectory $dir `
              -WindowStyle Hidden

Write-Host "[WATCHTOWER] Server started silently. Access at https://localhost"
