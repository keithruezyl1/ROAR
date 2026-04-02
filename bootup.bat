@echo off
setlocal EnableExtensions

cd /d "%~dp0"
set "REPO_DIR=%~dp0"
if "%REPO_DIR:~-1%"=="\" set "REPO_DIR=%REPO_DIR:~0,-1%"
set "STATE_FILE=%REPO_DIR%\bootup.state"
set "STARTED_POSTGRES=0"
set "STARTED_N8N=0"
set "STARTED_BACKEND=0"
set "STARTED_FRONTEND=0"
set "BACKEND_UVICORN_CMD=python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"

echo ==========================================
echo ROAR bootup starting...
echo Repo: %REPO_DIR%
echo ==========================================

call :start_postgres
call :start_n8n
call :start_dev_servers
call :write_state

echo.
echo ==========================================
echo ROAR bootup launched.
echo Postgres : localhost:5432
echo n8n      : http://localhost:5678
echo FastAPI  : http://localhost:8000/docs
echo Frontend : http://localhost:3000
echo State    : %STATE_FILE%
echo ==========================================
goto :eof

:start_postgres
echo.
echo [1/3] Checking Postgres container...
call :is_container_running "roar-postgres"
if not errorlevel 1 (
  echo [OK] Postgres is already running.
  call :wait_for_port 5432 "Postgres"
  goto :eof
)

call :container_exists "roar-postgres"
if errorlevel 1 (
  echo [INFO] No "roar-postgres" container found. Creating and launching it...
  docker run -d --name roar-postgres -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=roar postgres:15 >nul
  if errorlevel 1 (
    echo [WARN] Failed to create "roar-postgres". Continuing with the remaining services.
    goto :eof
  )
  set "STARTED_POSTGRES=1"
  call :wait_for_port 5432 "Postgres"
  goto :eof
)

echo [INFO] Starting Postgres container "roar-postgres"...
docker start roar-postgres >nul
if errorlevel 1 (
  echo [WARN] Failed to start "roar-postgres". Continuing with the remaining services.
  goto :eof
)

set "STARTED_POSTGRES=1"
call :wait_for_port 5432 "Postgres"
goto :eof

:start_n8n
echo.
echo [2/3] Checking n8n...
call :http_ready "http://127.0.0.1:5678"
if not errorlevel 1 (
  echo [OK] n8n is already responding on port 5678.
  goto :eof
)

call :is_container_running "roar-n8n"
if not errorlevel 1 (
  echo [INFO] Existing n8n container "roar-n8n" is already running.
  call :wait_for_http "http://127.0.0.1:5678" "n8n"
  goto :eof
)

call :container_exists "roar-n8n"
if not errorlevel 1 (
  echo [INFO] Starting existing n8n container "roar-n8n"...
  docker start roar-n8n >nul
  if errorlevel 1 (
    echo [WARN] Failed to start "roar-n8n". Continuing with the remaining services.
    goto :eof
  )
  set "STARTED_N8N=1"
  call :wait_for_http "http://127.0.0.1:5678" "n8n"
  goto :eof
)

echo [WARN] No "roar-n8n" container found. Skipping installation as requested.
goto :eof

:start_dev_servers
echo.
echo [3/3] Checking FastAPI backend and frontend dev server...
set "NEED_BACKEND=0"
set "NEED_FRONTEND=0"

call :http_ready "http://127.0.0.1:8000/docs"
if errorlevel 1 set "NEED_BACKEND=1"

call :http_ready "http://127.0.0.1:3000"
if errorlevel 1 set "NEED_FRONTEND=1"

if "%NEED_BACKEND%"=="0" echo [OK] FastAPI is already responding on port 8000.
if "%NEED_FRONTEND%"=="0" echo [OK] Frontend is already responding on port 3000.

if "%NEED_BACKEND%%NEED_FRONTEND%"=="00" goto :eof

set "WT_PATH="
where wt >nul 2>&1
if not errorlevel 1 (
  set "WT_PATH=wt"
) else if exist "%LocalAppData%\Microsoft\WindowsApps\wt.exe" (
  set "WT_PATH=%LocalAppData%\Microsoft\WindowsApps\wt.exe"
)

if defined WT_PATH (
  echo [INFO] Launching dev servers in Windows Terminal (PowerShell tabs^)...
  REM Bind backend to 0.0.0.0 so n8n (Docker) can reach FastAPI via the host LAN IP.
  if "%NEED_BACKEND%%NEED_FRONTEND%"=="11" (
    "%WT_PATH%" new-tab --title "ROAR API" powershell.exe -NoExit -NoProfile -Command "Set-Location -LiteralPath '%REPO_DIR%'; %BACKEND_UVICORN_CMD%" ; new-tab --title "ROAR Frontend" powershell.exe -NoExit -NoProfile -Command "Set-Location -LiteralPath '%REPO_DIR%\web'; npm run dev"
  ) else if "%NEED_BACKEND%"=="1" (
    "%WT_PATH%" new-tab --title "ROAR API" powershell.exe -NoExit -NoProfile -Command "Set-Location -LiteralPath '%REPO_DIR%'; %BACKEND_UVICORN_CMD%"
  ) else (
    "%WT_PATH%" new-tab --title "ROAR Frontend" powershell.exe -NoExit -NoProfile -Command "Set-Location -LiteralPath '%REPO_DIR%\web'; npm run dev"
  )
) else (
  echo [WARN] Windows Terminal ^(wt^) not found; using separate console windows instead.
  if "%NEED_BACKEND%"=="1" (
    start "ROAR API" cmd /k "cd /d ""%REPO_DIR%"" && %BACKEND_UVICORN_CMD%"
  )
  if "%NEED_FRONTEND%"=="1" (
    start "ROAR Frontend" cmd /k "cd /d ""%REPO_DIR%\web"" && npm run dev"
  )
)

if "%NEED_BACKEND%"=="1" set "STARTED_BACKEND=1"
if "%NEED_FRONTEND%"=="1" set "STARTED_FRONTEND=1"

if "%NEED_BACKEND%"=="1" call :wait_for_http "http://127.0.0.1:8000/docs" "FastAPI"
if "%NEED_FRONTEND%"=="1" call :wait_for_http "http://127.0.0.1:3000" "Frontend"
goto :eof

:write_state
(
  echo @echo off
  echo set "STARTED_POSTGRES=%STARTED_POSTGRES%"
  echo set "STARTED_N8N=%STARTED_N8N%"
  echo set "STARTED_BACKEND=%STARTED_BACKEND%"
  echo set "STARTED_FRONTEND=%STARTED_FRONTEND%"
  echo set "BACKEND_UVICORN_CMD=%BACKEND_UVICORN_CMD%"
) > "%STATE_FILE%"
echo [INFO] Wrote startup state to "%STATE_FILE%".
goto :eof

:wait_for_port
set "WAIT_PORT=%~1"
set "WAIT_NAME=%~2"
echo [WAIT] Waiting for %WAIT_NAME% on port %WAIT_PORT%...
for /L %%I in (1,1,60) do (
  powershell -NoProfile -Command "$client = New-Object Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', %WAIT_PORT%); exit 0 } catch { exit 1 } finally { $client.Dispose() }" >nul 2>&1
  if not errorlevel 1 (
    echo [OK] %WAIT_NAME% is accepting connections.
    goto :eof
  )
  timeout /t 2 /nobreak >nul
)
echo [WARN] Timed out waiting for %WAIT_NAME% on port %WAIT_PORT%.
goto :eof

:wait_for_http
set "WAIT_URL=%~1"
set "WAIT_NAME=%~2"
echo [WAIT] Waiting for %WAIT_NAME% at %WAIT_URL%...
for /L %%I in (1,1,90) do (
  call :http_ready "%WAIT_URL%"
  if not errorlevel 1 (
    echo [OK] %WAIT_NAME% responded.
    goto :eof
  )
  timeout /t 2 /nobreak >nul
)
echo [WARN] Timed out waiting for %WAIT_NAME% at %WAIT_URL%.
goto :eof

:http_ready
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { if ($_.Exception.Response) { exit 0 } else { exit 1 } }" >nul 2>&1
exit /b %errorlevel%

:container_exists
docker inspect "%~1" >nul 2>&1
exit /b %errorlevel%

:is_container_running
docker inspect -f "{{.State.Running}}" "%~1" 2>nul | findstr /I /X "true" >nul
exit /b %errorlevel%
