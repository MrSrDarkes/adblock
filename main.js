const { app, BrowserWindow, ipcMain, Tray, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let tray = null;

const spawnOpts = {
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe']
};

// Rutas fijas: empaquetado OBLIGATORIAMENTE process.resourcesPath; desarrollo __dirname
function getScriptPath() {
  if (app.isPackaged && process.resourcesPath) {
    return path.join(process.resourcesPath, 'Update-Hosts.ps1');
  }
  return path.join(__dirname, 'Update-Hosts.ps1');
}

function getIconPath() {
  const names = ['icon.png', 'adblock-icon.png'];
  if (app.isPackaged && process.resourcesPath) {
    for (const n of names) {
      const p = path.join(process.resourcesPath, 'Icon', n);
      if (fs.existsSync(p)) return p;
    }
  }
  for (const n of names) {
    const p = path.join(__dirname, 'Icon', n);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Detecta si el error es por falta de permisos de administrador
function isPermissionError(err) {
  if (!err || !err.message) return false;
  const msg = (err.message + '').toLowerCase();
  return /administrador|access is denied|runas|permiso|privilegio|elevación|denied|unauthorized/i.test(msg);
}

// PowerShell silencioso: -WindowStyle Hidden, sin ventanas CMD; salida trim y objeto limpio
function runPS(accion) {
  return new Promise((resolve, reject) => {
    const script = getScriptPath();
    const args = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-File', script,
      '-Accion', accion
    ];
    const ps = spawn('powershell.exe', args, {
      cwd: path.dirname(script),
      ...spawnOpts
    });
    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', d => { stdout += d.toString(); });
    ps.stderr.on('data', d => { stderr += d.toString(); });
    ps.on('close', code => {
      const out = (stdout + '').trim();
      const err = (stderr + '').trim();
      if (code !== 0) {
        const error = new Error(err || `Exit ${code}`);
        if (isPermissionError(error)) error.code = 'ELEVATION_REQUIRED';
        return reject(error);
      }
      resolve({ output: out, error: err });
    });
    ps.on('error', err => reject(err));
  });
}

// Parsea salida del script (ya trim) → { activo, dominios }; extrae "Dominios bloqueados: X"
function parseEstadoOutput(output) {
  const text = (output || '') + '';
  const activo = text.toLowerCase().includes('estado: adblock activo');
  let dominios = 0;
  const m = text.match(/Dominios bloqueados:\s*(\d+)/i);
  if (m) dominios = parseInt(m[1], 10);
  return { activo, dominios };
}

async function getEstado() {
  try {
    const r = await runPS('estado');
    const parsed = parseEstadoOutput(r.output);
    return { ok: true, activo: parsed.activo, dominios: parsed.dominios, output: r.output };
  } catch (e) {
    const needsAdmin = e.code === 'ELEVATION_REQUIRED' || isPermissionError(e);
    return {
      ok: false,
      error: e.message,
      activo: false,
      dominios: 0,
      needsAdmin
    };
  }
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const indexPath = path.join(__dirname, 'app', 'index.html');
  mainWindow = new BrowserWindow({
    width: 420,
    height: 520,
    frame: false,
    icon: getIconPath() || undefined,
    resizable: true,
    minimizable: true,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'Adblock Coffe'
  });
  mainWindow.loadFile(indexPath);
  if (!app.isPackaged) mainWindow.webContents.openDevTools({ mode: 'detach' });
  mainWindow.on('close', e => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Persistencia del estado: al cargar la ventana, enviar estado para que el botón sea correcto desde el primer segundo
  mainWindow.webContents.once('did-finish-load', async () => {
    try {
      const estado = await getEstado();
      mainWindow.webContents.send('estado-inicial', {
        activo: estado.activo,
        dominios: estado.dominios,
        ok: estado.ok,
        error: estado.error,
        needsAdmin: estado.needsAdmin
      });
    } catch (_) {}
  });
}

function createTray() {
  const iconPath = getIconPath();
  if (!iconPath) return;
  tray = new Tray(iconPath);
  tray.setToolTip('Adblock Coffe');
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function setTrayTooltip(text) {
  if (tray) tray.setToolTip(text);
}

function checkIsAdmin() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(true);
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
      '-Command', "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"
    ], spawnOpts);
    let out = '';
    ps.stdout.on('data', d => { out += d.toString(); });
    ps.on('close', code => {
      resolve(code === 0 && out.trim().toLowerCase() === 'true');
    });
    ps.on('error', () => resolve(false));
  });
}

function relaunchAsAdmin() {
  return new Promise((resolve, reject) => {
    const exe = process.execPath;
    const cwd = process.cwd();
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
      '-Command', `Start-Process -FilePath ${JSON.stringify(exe)} -Verb RunAs -WorkingDirectory ${JSON.stringify(cwd)} -ArgumentList '--elevated'`
    ], { windowsHide: true, detached: true, stdio: 'ignore' });
    ps.on('error', reject);
    ps.on('close', () => {
      app.isQuitting = true;
      app.quit();
      resolve();
    });
  });
}

// --- IPC ---

ipcMain.handle('activar', async () => {
  try {
    await runPS('activar');
    const estado = await getEstado();
    return {
      ok: true,
      activo: estado.activo,
      dominios: typeof estado.dominios === 'number' ? estado.dominios : 0
    };
  } catch (e) {
    const needsAdmin = e.code === 'ELEVATION_REQUIRED' || isPermissionError(e);
    const estado = await getEstado().catch(() => ({}));
    return {
      ok: false,
      error: e.message,
      activo: estado.activo ?? false,
      dominios: typeof estado.dominios === 'number' ? estado.dominios : 0,
      needsAdmin
    };
  }
});

ipcMain.handle('desactivar', async () => {
  try {
    await runPS('desactivar');
    const estado = await getEstado();
    return {
      ok: true,
      activo: estado.activo,
      dominios: typeof estado.dominios === 'number' ? estado.dominios : 0
    };
  } catch (e) {
    const needsAdmin = e.code === 'ELEVATION_REQUIRED' || isPermissionError(e);
    const estado = await getEstado().catch(() => ({}));
    return {
      ok: false,
      error: e.message,
      activo: estado.activo ?? false,
      dominios: typeof estado.dominios === 'number' ? estado.dominios : 0,
      needsAdmin
    };
  }
});

ipcMain.handle('estado', async () => {
  const r = await getEstado();
  return {
    ok: r.ok,
    activo: r.activo,
    dominios: typeof r.dominios === 'number' ? r.dominios : 0,
    error: r.error,
    needsAdmin: r.needsAdmin
  };
});

ipcMain.handle('getDiagnostic', async () => {
  const script = getScriptPath();
  const exists = fs.existsSync(script);
  return {
    scriptPath: script,
    scriptExists: exists,
    resourcesPath: app.isPackaged ? process.resourcesPath : path.join(__dirname, 'resources'),
    isPackaged: app.isPackaged
  };
});

function importAdguardFromPath(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  const userBlock = path.join(path.dirname(getScriptPath()), 'user-block.txt');
  let rulesRaw = '';
  if (data.filters && data.filters['user-filter'] && typeof data.filters['user-filter'].rules === 'string') {
    rulesRaw = data.filters['user-filter'].rules;
  } else if (data.filters && data.filters['user-filter'] && Array.isArray(data.filters['user-filter'].rules)) {
    rulesRaw = (data.filters['user-filter'].rules || []).join('\n');
  }
  const lines = rulesRaw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  fs.writeFileSync(userBlock, lines.join('\n'), 'utf8');
  return { ok: true, count: lines.length };
}

ipcMain.handle('importAdguardConfig', async (_, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return { ok: false, error: 'Ruta de archivo no válida' };
    return importAdguardFromPath(filePath);
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('openAdguardFileDialog', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow || null, {
      title: 'Importar configuración AdGuard',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths || filePaths.length === 0) return { ok: false, canceled: true };
    return importAdguardFromPath(filePaths[0]);
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('close', () => { if (mainWindow) mainWindow.hide(); });
ipcMain.handle('setTooltip', (_, text) => setTrayTooltip(text));

app.whenReady().then(async () => {
  if (process.platform === 'win32' && !process.argv.includes('--elevated')) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      try {
        await relaunchAsAdmin();
        return;
      } catch (e) {
        console.error('No se pudo elevar. Ejecuta la app como administrador.', e);
      }
    }
  }

  createWindow();
  createTray();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { app.isQuitting = true; });
