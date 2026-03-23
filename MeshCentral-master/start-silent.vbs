' WATCHTOWER - Silent Launcher (no console window, no UAC popup)
' Double-click this file to start the server silently in the background.
' Server will be accessible at https://localhost

Dim WshShell, strDir, strCmd
Set WshShell = CreateObject("WScript.Shell")

strDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
strCmd = """C:\Program Files\nodejs\node.exe"" """ & strDir & "\meshcentral.js"""

' WindowStyle 0 = completely hidden, False = don't wait for process to finish
WshShell.Run "cmd /c cd /d """ & strDir & """ && " & strCmd, 0, False

Set WshShell = Nothing
