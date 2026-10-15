@echo off
title QuickCart - Python FastAPI Backend
cd /d "%~dp0backend"
echo ==================================================
echo   Starting QuickCart Python FastAPI Backend
echo   Database: MongoDB (mongodb://127.0.0.1:27017/quickcart)
echo   API URL:  http://localhost:5000
echo   Docs URL: http://localhost:5000/docs
echo ==================================================

:: Free port 5000 if an old background instance was left running
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
pause
