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

if exist "%STATE_FILE%" (
  call "%STATE_FILE%"
) else (
  echo [WARN] No bootup state file found. Nothing will be stopped automatically.
)

echo ==========================================
echo ROAR shutdown starting...
echo Repo: %REPO_DIR%
echo ==========================================

call :stop_frontend
call :stop_backend
call :stop_n8n
call :stop_postgres
call :clear_state

echo.
echo ==========================================
echo ROAR shutdown complete.
echo ==========================================
goto :eof

:stop_frontend
echo.
echo [1/4] Stopping frontend...
if /I not "%STARTED_FRONTEND%"=="1" (
  echo [OK] Frontend was not started by bootup, so it is being left alone.
  goto :eof
)
call :http_ready "http://127.0.0.1:3000"
if errorlevel 1 (
  echo [OK] Frontend is already down.
) else (
  echo [INFO] Closing frontend window...
  taskkill /FI "WINDOWTITLE eq ROAR Frontend" /T >nul 2>&1
  call :wait_for_http_down "http://127.0.0.1:3000" "Frontend"
)
goto :eof

:stop_backend
echo.
echo [2/4] Stopping FastAPI backend...
if /I not "%STARTED_BACKEND%"=="1" (
  echo [OK] FastAPI was not started by bootup, so it is being left alone.
  goto :eof
)
call :http_ready "http://127.0.0.1:8000/docs"
if errorlevel 1 (
  echo [OK] FastAPI is already down.
) else (
  echo [INFO] Closing FastAPI window...
  taskkill /FI "WINDOWTITLE eq ROAR API" /T >nul 2>&1
  call :wait_for_http_down "http://127.0.0.1:8000/docs" "FastAPI"
)
goto :eof

:stop_n8n
echo.
echo [3/4] Stopping n8n...
if /I not "%STARTED_N8N%"=="1" (
  echo [OK] n8n was not started by bootup, so it is being left alone.
  goto :eof
)
docker ps --format "{{.Names}}" | findstr /I /X "roar-n8n" >nul
if errorlevel 1 (
  call :http_ready "http://127.0.0.1:5678"
  if errorlevel 1 (
    echo [OK] n8n is already down.
  ) else (
    echo [WARN] n8n is running, but not as the managed "roar-n8n" container.
    echo [WARN] Leaving it untouched to avoid stopping the wrong instance.
  )
  goto :eof
)

echo [INFO] Stopping "roar-n8n"...
docker stop roar-n8n >nul
echo [INFO] Closing n8n window...
taskkill /FI "WINDOWTITLE eq ROAR n8n" /T >nul 2>&1
call :wait_for_http_down "http://127.0.0.1:5678" "n8n"
goto :eof

:stop_postgres
echo.
echo [4/4] Stopping Postgres container...
if /I not "%STARTED_POSTGRES%"=="1" (
  echo [OK] Postgres was not started by bootup, so it is being left alone.
  goto :eof
)
docker ps --format "{{.Names}}" | findstr /I /X "roar-postgres" >nul
if errorlevel 1 (
  echo [OK] Postgres is already down.
  goto :eof
)

echo [INFO] Stopping "roar-postgres"...
docker stop roar-postgres >nul
call :wait_for_port_down 5432 "Postgres"
goto :eof

:clear_state
(
  echo @echo off
  echo set "STARTED_POSTGRES=0"
  echo set "STARTED_N8N=0"
  echo set "STARTED_BACKEND=0"
  echo set "STARTED_FRONTEND=0"
) > "%STATE_FILE%"
echo [INFO] Cleared startup state in "%STATE_FILE%".
goto :eof

:wait_for_http_down
set "WAIT_URL=%~1"
set "WAIT_NAME=%~2"
echo [WAIT] Waiting for %WAIT_NAME% to stop...
for /L %%I in (1,1,45) do (
  call :http_ready "%WAIT_URL%"
  if errorlevel 1 (
    echo [OK] %WAIT_NAME% is down.
    goto :eof
  )
  timeout /t 2 /nobreak >nul
)
echo [WARN] Timed out waiting for %WAIT_NAME% to stop.
goto :eof

:wait_for_port_down
set "WAIT_PORT=%~1"
set "WAIT_NAME=%~2"
echo [WAIT] Waiting for %WAIT_NAME% on port %WAIT_PORT% to stop...
for /L %%I in (1,1,45) do (
  powershell -NoProfile -Command "$client = New-Object Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', %WAIT_PORT%); exit 0 } catch { exit 1 } finally { $client.Dispose() }" >nul 2>&1
  if errorlevel 1 (
    echo [OK] %WAIT_NAME% is down.
    goto :eof
  )
  timeout /t 2 /nobreak >nul
)
echo [WARN] Timed out waiting for %WAIT_NAME% on port %WAIT_PORT% to stop.
goto :eof

:http_ready
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%~1' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { if ($_.Exception.Response) { exit 0 } else { exit 1 } }" >nul 2>&1
exit /b %errorlevel%
