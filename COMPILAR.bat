@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Instalando dependencias...
call npm install
if errorlevel 1 ( echo Error en npm install & pause & exit /b 1 )
echo.
echo Compilando con electron-packager...
call npm run build
if errorlevel 1 ( echo Error en build & pause & exit /b 1 )
echo.
set RES=dist\adblockcoffe-win32-x64\resources
if exist "%RES%" (
  echo Copiando Update-Hosts.ps1 e Icon a %RES%
  copy /Y "Update-Hosts.ps1" "%RES%\" >nul
  if exist "Icon" xcopy /E /Y "Icon" "%RES%\Icon\" >nul
)
set UNPACKED=dist\win-unpacked\resources
if exist "%UNPACKED%" (
  copy /Y "Update-Hosts.ps1" "%UNPACKED%\" >nul
  if exist "Icon" xcopy /E /Y "Icon" "%UNPACKED%\Icon\" >nul
)
if exist "Instalar-Adblock.bat" (
  if exist "dist\adblockcoffe-win32-x64" copy /Y "Instalar-Adblock.bat" "dist\adblockcoffe-win32-x64\"
)
echo.
echo Creando adblockcoffe-portable.zip...
cd dist
if exist adblockcoffe-portable.zip del adblockcoffe-portable.zip
powershell -NoProfile -Command "Compress-Archive -Path 'adblockcoffe-win32-x64' -DestinationPath 'adblockcoffe-portable.zip'"
cd ..
echo.
echo Listo. Ejecutable: dist\adblockcoffe-win32-x64\adblockcoffe.exe | Zip: dist\adblockcoffe-portable.zip
pause
