@echo off
title QuickCart - Expo Frontend App
cd /d "%~dp0frontend"
echo ==================================================
echo   Starting QuickCart Expo App
echo   Connected to: http://localhost:5000 (FastAPI)
echo ==================================================
npx expo start
pause
