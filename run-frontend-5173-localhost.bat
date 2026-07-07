@echo off
cd /d "%~dp0frontend"
set VITE_API_URL=http://localhost:8100
npm.cmd run dev -- --host 127.0.0.1 --port 5173