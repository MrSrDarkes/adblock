@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Instalando dependencias...
call npm install
if errorlevel 1 ( echo Error en npm install & pause & exit /b 1 )
echo.
echo Compilando con electron-builder...
call npm run build
if errorlevel 1 ( echo Error en build & pause & exit /b 1 )
echo.
echo El instalador se ha generado correctamente en la carpeta dist/
pause
