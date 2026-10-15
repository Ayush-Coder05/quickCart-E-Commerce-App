@echo off
title QuickCart - Seed MongoDB Database
cd /d "%~dp0"
echo ==================================================
echo   Seeding QuickCart Database in MongoDB...
echo ==================================================
python backend/seed.py
echo ==================================================
echo   Done!
echo ==================================================
pause
