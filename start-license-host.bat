@echo off
setlocal EnableExtensions DisableDelayedExpansion

cd /d "%~dp0"

if not exist "package.json" (
  echo [ERROR] ??? package.json?
  echo "%~dp0package.json"
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] ??? npm.cmd????? Node.js ??? npm ? PATH ??
  pause
  exit /b 1
)

call npm.cmd run dev:host
exit /b %ERRORLEVEL%
