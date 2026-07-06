@echo off
cd /d D:\Ai-app-Project\FASTSUB\backend
"C:\Users\ARRAY\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8100
