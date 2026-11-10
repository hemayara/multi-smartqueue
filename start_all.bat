@echo off
title Smart Queue System - Full Stack Launcher
echo ============================================================
echo   Starting Smart Queue System (Backend + Frontend)...
echo ============================================================

echo [1/2] Launching Backend API & Socket.IO server (Port 5000)...
start "SmartQueue Backend (Flask + SocketIO)" cmd /c "%~dp0start_backend.bat"

echo Waiting for backend initialization...
timeout /t 3 /nobreak >nul

echo [2/2] Launching Frontend UI (Vite Dev Server - Port 5173)...
start "SmartQueue Frontend (React + Vite)" cmd /c "%~dp0start_frontend.bat"

echo ============================================================
echo   System Started Successfully!
echo   - Backend API: http://127.0.0.1:5000
echo   - Frontend UI: http://localhost:5173
echo ============================================================
timeout /t 5 >nul
