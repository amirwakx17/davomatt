@echo off
cd /d "%~dp0"
set "NODE_EXE=node"
if exist ".runtime\node\node.exe" set "NODE_EXE=.runtime\node\node.exe"
if not exist ".runtime\node\node.exe" (
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js topilmadi. Iltimos, Node.js o'rnating yoki .runtime\node papkasini joylashtiring.
    pause
    exit /b 1
  )
)
echo Server: http://localhost:3000
"%NODE_EXE%" server.js
pause
