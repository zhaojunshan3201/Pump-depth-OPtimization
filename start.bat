@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Resolve-Path '%~dp0').Path; $pidFile=Join-Path $root '.server.pid'; if(Test-Path $pidFile){ $oldPid=Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1; if($oldPid -match '^\d+$' -and (Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue)){ Write-Host ('Server already running. PID=' + $oldPid); Write-Host 'URL: http://localhost:3000'; exit 0 } }; $out=Join-Path $root 'server.out.log'; $err=Join-Path $root 'server.err.log'; $process=Start-Process -FilePath 'node' -ArgumentList 'server\index.js' -WorkingDirectory $root -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden -PassThru; Set-Content -Path $pidFile -Value $process.Id; Write-Host ('Server started. PID=' + $process.Id); Write-Host 'URL: http://localhost:3000'; Write-Host ('Logs: ' + $out + ' / ' + $err)"
