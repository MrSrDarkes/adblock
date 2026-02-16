# Adblock para Windows

Aplicación de escritorio que bloquea anuncios y rastreadores en todo el sistema modificando el archivo `hosts`.

## Crear el ejecutable

1. Instala [Node.js](https://nodejs.org) (solo para compilar).
2. Instala dependencias en la carpeta del proyecto:
   `npm install`
3. Compila con:
   `npm run build`
   Resultado esperado: `dist/Adblock-win32-x64/Adblock.exe`.

> También puedes usar **COMPILAR.bat**, que ejecuta instalación + compilación automáticamente.

**Importante:** `Update-Hosts.ps1` debe quedar dentro de `resources/` junto al `.exe`. La app usa `process.resourcesPath` para encontrarlo. Si el UAC no aparece al abrir el `.exe`, revisa `%TEMP%\adblock-diagnostico.txt`.

## Uso

- Abre **Adblock.exe**.
- Botón **Iniciar** para activar el bloqueo, **Pausar** para desactivar.
- Cerrar la ventana lo envía a la **bandeja del sistema**.
- Clic derecho en el icono de la bandeja → **Salir** para cerrar.
- Ejecuta como **administrador** para poder modificar `hosts`.

## Errores comunes al ejecutar

1. **Sigue apareciendo "Inactivo"**
   - Verifica que el script sí se esté ejecutando como administrador.
   - Revisa el log de la app (cuadro inferior) y `%TEMP%\adblock-diagnostico.txt`.

2. **No bloquea anuncios**
   - Confirma conexión a internet para descargar la lista base (StevenBlack).
   - Revisa que antivirus/firewall no bloqueen PowerShell o acceso al archivo `hosts`.

3. **Falla la compilación por dependencias**
   - Ejecuta `npm install` antes de `npm run build`.
   - Si tu red corporativa bloquea npm, configura proxy/registro permitido.

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
