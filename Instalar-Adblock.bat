@echo off
chcp 65001 >nul
set TARGET=%LOCALAPPDATA%\adblockcoffe
set SOURCE=%~dp0
echo Instalando Adblock Coffe en %TARGET%
if not exist "%TARGET%" mkdir "%TARGET%"
xcopy /E /Y "%SOURCE%*" "%TARGET%\" >nul
echo Creando acceso directo en el Escritorio...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\\AdblockCoffe.lnk'); $s.TargetPath = '%TARGET%\\adblockcoffe.exe'; $s.WorkingDirectory = '%TARGET%'; $s.Save()"
echo Listo. Ejecuta desde el Escritorio o desde %TARGET%\adblockcoffe.exe
pause
