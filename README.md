# Adblock para Windows

Aplicación de escritorio que bloquea anuncios y rastreadores en todo el sistema modificando el archivo `hosts`.

## Crear el ejecutable

1. Instala [Node.js](https://nodejs.org) (solo para compilar).
2. Doble clic en **`COMPILAR.bat`** (usa **electron-builder**; resultado en `dist/win-unpacked/`).
3. Alternativa con **electron-packager**:  
   `npx @electron/packager . Adblock --platform=win32 --arch=x64 --out=dist --overwrite --extra-resource=Update-Hosts.ps1 --extra-resource=Icon`  
   Resultado en `dist/Adblock-win32-x64/Adblock.exe`.

En ambos casos, **Update-Hosts.ps1** debe quedar dentro de la carpeta **resources** junto al .exe. La app usa `process.resourcesPath` para encontrarlo. Si el UAC no aparece al abrir el .exe, revisa el archivo de diagnóstico en `%TEMP%\adblock-diagnostico.txt` (se genera al iniciar la app empaquetada).

## Uso

- Doble clic en **Adblock** (desde el Escritorio o menú Inicio).
- Botón **ON** para activar el bloqueo, **OFF** para desactivar.
- Cerrar la ventana lo envía a la **bandeja del sistema**.
- Clic derecho en el icono de la bandeja → **Salir** para cerrar.
- Ejecutar como **administrador** para que pueda modificar el archivo hosts.

## Archivos del proyecto

| Archivo | Función |
|---|---|
| `main.js` | Ventana, bandeja del sistema, ejecución de PowerShell |
| `preload.js` | API segura entre frontend y backend |
| `app/index.html` | Interfaz gráfica |
| `app/styles.css` | Tema oscuro |
| `app/renderer.js` | Lógica de la interfaz |
| `Update-Hosts.ps1` | Script que modifica el archivo hosts |
| `Icon/adblock-icon.png` | Icono del programa |
