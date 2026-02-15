@echo off
title Crear ejecutable Adblock
cd /d "%~dp0"

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "%APPDATA%\npm" set "PATH=%PATH%;%APPDATA%\npm"

set CSC_IDENTITY_AUTO_DISCOVERY=false

echo.
echo   ========================================
echo     Adblock - Crear ejecutable (.exe)
echo   ========================================
echo.

where node >nul 2>&1
if %errorLevel% neq 0 (
    echo   [!] Node.js no encontrado.
    echo       Instala desde: https://nodejs.org
    pause
    exit /b 1
)

echo   [1/3] Instalando dependencias...
call npm install --loglevel=error
if %errorLevel% neq 0 (
    echo   [!] Error en npm install.
    pause
    exit /b 1
)

echo.
echo   [2/3] Compilando aplicacion...
echo         (esto puede tardar 1-3 minutos)
echo.
call npm run build
if %errorLevel% neq 0 (
    echo   [!] Error al compilar.
    pause
    exit /b 1
)

echo.
echo   [3/3] Listo!
echo.
echo   ========================================
echo     Resultado: dist\win-unpacked\Adblock.exe
echo     Ejecuta como Administrador.
echo   ========================================
echo.
pause
