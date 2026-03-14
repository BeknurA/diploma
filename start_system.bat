@echo off
title Smart Schedule Launcher

echo ==========================================
echo    STARTING DIPLOMA PROJECT... 🚀
echo ==========================================

:: 1. ЗАПУСК БАЗЫ ДАННЫХ (DOCKER)
echo.
echo [1/3] Starting Database (Docker)...
cd diploma_backend
docker-compose up -d
if %errorlevel% neq 0 (
    echo ❌ ERROR: Docker failed to start! Check if Docker Desktop is running.
    pause
    exit
)
echo ✅ Database is running.

:: 2. ЗАПУСК БЭКЕНДА (В отдельном окне)
echo.
echo [2/3] Starting Backend Server...
:: Мы используем start, чтобы открыть новое окно и не ждать
start "BACKEND - Python" cmd /k "venv\Scripts\activate && uvicorn app.main:app --reload"

:: 3. ЗАПУСК ФРОНТЕНДА (В отдельном окне)
echo.
echo [3/3] Starting Frontend...
cd ..\diploma_frontend
start "FRONTEND - React" cmd /k "npm run dev"

:: 4. ОТКРЫТИЕ БРАУЗЕРА
echo.
echo ⏳ Waiting for services to warm up...
timeout /t 5 >nul
start http://localhost:5173

echo.
echo ==========================================
echo    ✅ SYSTEM ONLINE!
echo    Backend: http://localhost:8000/docs
echo    Frontend: http://localhost:5173
echo ==========================================
echo.
echo Press any key to close this launcher (Servers will keep running)...
pause