# Adblock Coffe

Aplicación de escritorio para Windows que bloquea anuncios y rastreadores modificando el archivo **hosts**. Usa listas de Steven Black, EasyList y AdGuard Filters.

## Requisitos

- Windows 10/11
- **Ejecutar como administrador** (necesario para editar `C:\Windows\System32\drivers\etc\hosts`)

## Instalación

1. Descarga el instalador desde [Releases](https://github.com/tu-usuario/adblock-coffe/releases) (`Adblock Coffe Setup x.x.x.exe`) o la carpeta portable `win-unpacked`.
2. Si usas el instalador: ejecútalo y elige la carpeta de instalación.
3. Ejecuta **Adblock Coffe** como administrador (clic derecho → Ejecutar como administrador).

## Uso

- **Toggle central**: activa o desactiva la protección (verde = activa, naranja = desactivada).
- **Minimizar / Maximizar / Cerrar**: botones en la barra de título (la app se cierra a la bandeja).
- **Acciones**: actualizar estado, importar configuración AdGuard (abre un diálogo para elegir el JSON).
- **Estadísticas**: dominios bloqueados y estado del sistema.
- Doble clic en el icono de la bandeja para volver a abrir la ventana.

## Compilar

```bash
npm install
npm run build
```

Se genera el instalador en `dist\Adblock Coffe Setup 1.0.0.exe` y la versión portable en `dist\win-unpacked\`.

Opcional: coloca un icono en `Icon\adblock-icon.png` para la ventana y la bandeja.

## Estructura

- `main.js` / `preload.js` / `app/`: interfaz Electron (ventana sin bordes, toggle, pestañas).
- `Update-Hosts.ps1`: script que modifica el archivo hosts (Steven Black + EasyList + AdGuard Filters).
- `user-block.txt` / `user-allow.txt`: se crean en la carpeta de recursos al importar o al usar listas propias.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Adblock Coffe - versión inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

Reemplaza `TU-USUARIO` y `TU-REPO` por tu usuario y nombre del repositorio en GitHub.
