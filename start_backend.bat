@echo off
title Smart Queue System - Backend API Server
echo ============================================================
echo   Starting Smart Queue Backend API ^& Socket.IO Server...
echo ============================================================
cd /d "%~dp0backend"
if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe run.py --seed
) else (
    python run.py --seed
)
pause
