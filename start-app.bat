@echo off
setlocal EnableExtensions DisableDelayedExpansion

cd /d "%~dp0"

set "_POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "_DEV_SCRIPT=%~dp0scripts\restart-dev.ps1"

if exist "%_DEV_SCRIPT%" (
  call "%_POWERSHELL%" -NoProfile -ExecutionPolicy Bypass -File "%_DEV_SCRIPT%"
  exit /b %ERRORLEVEL%
)

echo [ERROR] 没找到开发启动脚本：
echo "%_DEV_SCRIPT%"
pause
