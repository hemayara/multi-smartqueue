@echo off
title Smart Queue System - React Frontend
echo ============================================================
echo   Starting Smart Queue React Frontend (Vite)...
echo ============================================================
cd /d "%~dp0frontend"

set "PATH=C:\Program Files\nodejs;%PATH%"

call "C:\Program Files\nodejs\npm.cmd" run dev
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start frontend dev server.
    pause
)
