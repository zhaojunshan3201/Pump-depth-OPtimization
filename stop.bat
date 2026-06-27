@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path '%~dp0').Path; $pidFile=Join-Path $root '.server.pid'; if(!(Test-Path $pidFile)){ Write-Host 'No PID file found. Server may already be stopped.'; exit 0 }; $pidText=Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1; if($pidText -match '^\d+$'){ $process=Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue; if($process){ Stop-Process -Id $process.Id -Force; Write-Host ('Server stopped. PID=' + $pidText) } else { Write-Host ('No running process found for PID=' + $pidText) } } else { Write-Host 'PID file is invalid.' }; Remove-Item -Path $pidFile -ErrorAction SilentlyContinue"
