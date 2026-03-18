@echo off
setlocal
set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "README_FILE=%PROJECT_DIR%\workers\auth-api\README.md"
set "ENV_FILE=%PROJECT_DIR%\workers\auth-api\.dev.vars"
set "ENV_EXAMPLE=%PROJECT_DIR%\workers\auth-api\.dev.vars.example"
set "WRANGLER_CONFIG=%PROJECT_DIR%\workers\auth-api\wrangler.jsonc"
cd /d "%PROJECT_DIR%"
title Auth API Switcher - Cloudflare Helper

if /I "%CF_HELPER_TEST%"=="1" goto end

:menu
cls
echo ==============================================
echo   Auth API Switcher - Cloudflare Helper
echo ==============================================
echo.
echo Current status:
echo   - Wrangler installed
echo   - Cloudflare login completed
echo   - D1 database created and bound
echo   - Local and remote migration 0001 applied
echo.
echo [1] Check Cloudflare login
echo [2] Run Cloudflare login again
echo [3] Open auth-api README
echo [4] Run local D1 migration
echo [5] Run remote D1 migration
echo [6] Create .dev.vars from example
echo [7] Edit .dev.vars
echo [8] Start local auth-api Worker
echo [9] Open wrangler.jsonc
echo [0] Exit
echo.
choice /c 1234567890 /n /m "Select: "
set "choice=%errorlevel%"

if "%choice%"=="1" goto whoami
if "%choice%"=="2" goto login
if "%choice%"=="3" goto readme
if "%choice%"=="4" goto migrate_local
if "%choice%"=="5" goto migrate_remote
if "%choice%"=="6" goto create_env
if "%choice%"=="7" goto edit_env
if "%choice%"=="8" goto dev_worker
if "%choice%"=="9" goto open_config
if "%choice%"=="10" goto end
goto menu

:whoami
cls
echo [RUN] npm run cf:auth:whoami
echo.
call npm run cf:auth:whoami
echo.
pause
goto menu

:login
cls
echo [RUN] npx wrangler login
echo.
call npx wrangler login
echo.
pause
goto menu

:readme
cls
echo [OPEN] workers\auth-api\README.md
echo.
start "" notepad "%README_FILE%"
goto menu

:migrate_local
cls
echo [RUN] npm run cf:auth:d1:migrate:local
echo.
call npm run cf:auth:d1:migrate:local
echo.
pause
goto menu

:migrate_remote
cls
echo [RUN] npm run cf:auth:d1:migrate:remote
echo.
call npm run cf:auth:d1:migrate:remote
echo.
pause
goto menu

:create_env
cls
if exist "%ENV_FILE%" (
  echo [INFO] .dev.vars already exists.
) else (
  copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
  echo [DONE] .dev.vars created from example.
)
echo.
echo Fill these values next:
echo   RESEND_API_KEY
echo   RESEND_FROM_EMAIL
echo.
pause
goto menu

:edit_env
cls
if not exist "%ENV_FILE%" (
  copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
  echo [DONE] .dev.vars created from example.
  echo.
)
echo [OPEN] workers\auth-api\.dev.vars
echo.
start "" notepad "%ENV_FILE%"
goto menu

:dev_worker
cls
echo [INFO] Starting local Worker in a new cmd window.
echo [INFO] Health URL: http://127.0.0.1:8787/api/health
echo.
start "Auth API Worker" cmd /k "cd /d \"%PROJECT_DIR%\" && npm run cf:auth:dev"
goto menu

:open_config
cls
echo [OPEN] workers\auth-api\wrangler.jsonc
echo.
start "" notepad "%WRANGLER_CONFIG%"
goto menu

:end
endlocal
exit /b 0
