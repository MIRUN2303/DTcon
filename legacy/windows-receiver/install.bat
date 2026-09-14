@echo off
setlocal

:: DTcon wired receiver — one-time installer
:: Copies receiver to %LOCALAPPDATA%\DTcon and adds it to Windows Startup.

set "PYTHON=python"
where python >nul 2>&1 || (
    echo Python not found in PATH. Install Python 3.10+ or add it to PATH.
    pause
    exit /b 1
)

set "DEST=%LOCALAPPDATA%\DTcon"
set "SCRIPT=%DEST%\wired_receiver.py"
set "LAUNCHER=%DEST%\start_receiver.vbs"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DTconReceiver.vbs"

if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%~dp0wired_receiver.py" "%SCRIPT%" >nul

:: Create VBS launcher (runs Python hidden, no console window)
:: No & signs here on purpose: batch treats & as a command separator.
> "%LAUNCHER%" (
    echo Set WshShell = CreateObject^("WScript.Shell"^)
    echo WshShell.Run "python ""%SCRIPT%""", 0, False
)

:: Copy to Startup folder
copy /Y "%LAUNCHER%" "%STARTUP%" >nul

:: Start now
start "" wscript "%LAUNCHER%"

echo.
echo  DTcon receiver installed.
echo  - Runs automatically on Windows login.
echo  - Location: %DEST%
echo  - To remove: delete %STARTUP%
echo.
pause
