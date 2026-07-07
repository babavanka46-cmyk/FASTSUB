@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$backend='DOWN'; $frontend='DOWN';" ^
  "try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8100/api/health -TimeoutSec 5; if ($r.StatusCode -eq 200) { $backend='OK' } } catch {}" ^
  "try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173 -TimeoutSec 5; if ($r.StatusCode -eq 200) { $frontend='OK' } } catch {}" ^
  "Write-Host ('Backend  8100: ' + $backend);" ^
  "Write-Host ('Frontend 5173: ' + $frontend);"