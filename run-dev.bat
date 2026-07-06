@echo off
cd /d D:\Ai-app-Project\FASTSUB
if not exist logs mkdir logs
start "FASTSUB Backend 8100" cmd /k "run-backend-8100.bat"
start "FASTSUB Frontend 5173" cmd /k "run-frontend-5173-localhost.bat"
echo FASTSUB dev servers are starting.
echo Backend:  http://127.0.0.1:8100
echo Frontend: http://127.0.0.1:5173
