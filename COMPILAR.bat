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

echo   [3/3] Copiando Update-Hosts.ps1 e Icon a resources...
set "PROYECTO=%~dp0"
set "SCRIPT_SRC=%PROYECTO%Update-Hosts.ps1"
set "ICON_SRC=%PROYECTO%Icon"

if not exist "%SCRIPT_SRC%" (
    echo   [!] No se encuentra Update-Hosts.ps1 en la carpeta del proyecto.
    echo       Ruta esperada: %SCRIPT_SRC%
    goto :fin
)

set "RES1=%PROYECTO%dist\Adblock-win32-x64\resources"
set "RES2=%PROYECTO%dist\win-unpacked\resources"

for %%R in ("%RES1%" "%RES2%") do (
    if exist "%%~dpR" (
        if not exist "%%R\" mkdir "%%R\"
        copy /Y "%SCRIPT_SRC%" "%%R\Update-Hosts.ps1"
        if exist "%ICON_SRC%" (
            if not exist "%%R\Icon\" mkdir "%%R\Icon\"
            xcopy /Y /E /I /Q "%ICON_SRC%\*" "%%R\Icon\" >nul 2>&1
        )
        echo         Copiado a %%~dpR
    )
)

if not exist "%RES1%" if not exist "%RES2%" (
    echo   [!] No existe dist\Adblock-win32-x64 ni dist\win-unpacked.
    echo       Ejecuta de nuevo "npm run build".
)

:fin
echo.
echo   ========================================
echo     Resultado: dist\Adblock-win32-x64\Adblock.exe
echo     (o dist\win-unpacked\ si usaste electron-builder)
echo     Update-Hosts.ps1 debe estar en resources\
echo     Ejecuta como Administrador.
echo   ========================================
echo.
pause
