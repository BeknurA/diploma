@echo off
title SHUTDOWN SEQUENCE 🛑

echo ==========================================
echo    STOPPING DIPLOMA PROJECT... 🛑
echo ==========================================

:: 1. УБИВАЕМ ПРОЦЕССЫ (Python и Node.js)
echo.
echo [1/3] Killing Frontend (Node.js)...
:: /F - принудительно, /IM - по имени, /T - вместе с дочерними окнами
taskkill /F /IM node.exe /T >nul 2>&1
if %errorlevel% equ 0 ( echo    ✅ Frontend stopped. ) else ( echo    ⚠️ Frontend was not running. )

echo.
echo [2/3] Killing Backend (Python/Uvicorn)...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM uvicorn.exe /T >nul 2>&1
if %errorlevel% equ 0 ( echo    ✅ Backend stopped. ) else ( echo    ⚠️ Backend was not running. )

:: 2. ОСТАНАВЛИВАЕМ DOCKER
echo.
echo [3/3] Stopping Database (Docker)...
cd diploma_backend
docker-compose stop

echo.
echo ==========================================
echo    ✅ SYSTEM SHUTDOWN COMPLETE.
echo    Computers are sleeping. 💤
echo ==========================================
pause