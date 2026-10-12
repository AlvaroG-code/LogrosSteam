@echo off
REM Arranca la web local: sincroniza con Steam y abre el navegador
cd /d %~dp0
if not exist .env (
  echo Falta .env. Copiando ejemplo...
  copy .env.example .env
  echo Edita .env y pon tu STEAM_API_KEY, luego ejecuta este archivo otra vez.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js LTS desde https://nodejs.org/ y vuelve a intentarlo.
  pause
  exit /b 1
)
echo Sincronizando con Steam...
node scripts\sync.mjs
echo Abriendo web local...
start http://localhost:8080
node scripts\server.mjs
pause
