const { app, BrowserWindow, ipcMain, Tray, nativeImage, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execSync } = require('child_process');

/* ── Auto-elevación solo en .exe empaquetado: si no somos admin, reiniciar como admin ── */
function isAdmin() {
  try {
    execSync('net session', { windowsHide: true, stdio: 'ignore' });
    return true;
  } catch { return false; }
}

if (app.isPackaged && !isAdmin()) {
  const exePath = process.execPath;
  // Sin -ArgumentList: solo lanzar el .exe con RunAs para que aparezca UAC
  const cmd = `Start-Process -FilePath "${exePath.replace(/"/g, '`"')}" -Verb RunAs`;
  const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', cmd], {
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
    shell: false,
  });
  child.unref();
  // Dar tiempo al proceso elevado a iniciar antes de cerrar este
  setTimeout(() => {
    app.quit();
    process.exit(0);
  }, 800);
} else {
  // ─── Código normal de la app (solo si ya somos admin o no estamos empaquetados) ───
let mainWindow = null;
let tray = null;
let isQuitting = false;

const RES = app.isPackaged ? process.resourcesPath : __dirname;
const ICON_FILE = path.join(RES, 'Icon', 'adblock-icon.png');
const SCRIPT = path.join(RES, 'Update-Hosts.ps1');
const USER_ALLOW_PATH = path.join(RES, 'user-allow.txt');
const USER_BLOCK_PATH = path.join(RES, 'user-block.txt');
const CONFIG_PATH = path.join(RES, 'config.json');

function iconPath() {
  return fs.existsSync(ICON_FILE) ? ICON_FILE : null;
}

/** Escribe diagnóstico en %TEMP%\\adblock-diagnostico.txt (solo empaquetado) */
function writeDiagnostic() {
  if (!app.isPackaged) return;
  const lines = [
    'Adblock - Diagnóstico',
    '=====================',
    'Fecha: ' + new Date().toISOString(),
    'Empaquetado: ' + app.isPackaged,
    'Es admin: ' + isAdmin(),
    'process.execPath: ' + process.execPath,
    'process.resourcesPath (RES): ' + process.resourcesPath,
    'Ruta script (SCRIPT): ' + SCRIPT,
    'Update-Hosts.ps1 existe: ' + fs.existsSync(SCRIPT),
    'Icono existe: ' + fs.existsSync(ICON_FILE),
    'Carpeta RES existe: ' + fs.existsSync(RES),
  ];
  const file = path.join(os.tmpdir(), 'adblock-diagnostico.txt');
  try {
    fs.writeFileSync(file, lines.join('\r\n'), 'utf8');
  } catch (e) {
    console.error('Diagnóstico no escrito:', e.message);
  }
}

function createWindow() {
  const ico = iconPath();
  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#121212',
    icon: ico || undefined,
    show: false,
    title: 'Adblock',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const ico = iconPath();
  if (!ico) return;
  const img = nativeImage.createFromPath(ico);
  if (img.isEmpty()) return;
  tray = new Tray(img.resize({ width: 16, height: 16 }));
  tray.setToolTip('Adblock');
  tray.on('click', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir Adblock', click() { if (mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Salir', click() { app.quit(); } },
  ]));
}

app.on('before-quit', () => { isQuitting = true; });

app.whenReady().then(() => {
  writeDiagnostic();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});

function runPS(action) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(SCRIPT)) {
      return reject(new Error('No se encuentra Update-Hosts.ps1'));
    }
    const ps = spawn('powershell.exe', [
      '-ExecutionPolicy', 'Bypass', '-NoProfile', '-File', SCRIPT, '-Accion', action,
    ], { cwd: RES, windowsHide: true, shell: false });

    let out = '', err = '';
    ps.stdout.on('data', (d) => { out += (d && d.toString) ? d.toString() : String(d); });
    ps.stderr.on('data', (d) => { err += (d && d.toString) ? d.toString() : String(d); });
    ps.on('close', (code) => {
      const combined = (out + '\n' + err).trim();
      if (code === 0) return resolve(combined || out || err);
      reject(new Error(combined || err || out || `Código salida ${code}`));
    });
    ps.on('error', (e) => reject(e));
  });
}

ipcMain.handle('adblock:activate', async () => {
  try { return { ok: true, output: await runPS('activar') }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('adblock:deactivate', async () => {
  try { return { ok: true, output: await runPS('desactivar') }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('adblock:status', async () => {
  try { return { ok: true, output: await runPS('estado') }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.on('win:minimize', () => { if (mainWindow) mainWindow.hide(); });
ipcMain.on('win:close', () => { app.quit(); });

ipcMain.on('tray:tooltip', (_e, text) => {
  if (tray) tray.setToolTip(text || 'Adblock');
});

ipcMain.handle('app:isAdmin', () => isAdmin());

ipcMain.handle('app:getDiagnostic', () => {
  const file = path.join(os.tmpdir(), 'adblock-diagnostico.txt');
  return {
    resourcesPath: RES,
    scriptPath: SCRIPT,
    scriptExists: fs.existsSync(SCRIPT),
    iconExists: fs.existsSync(ICON_FILE),
    isPackaged: app.isPackaged,
    isAdmin: isAdmin(),
    diagnosticFile: file,
    diagnosticExists: fs.existsSync(file),
  };
});

ipcMain.handle('app:relaunchAsAdmin', () => {
  if (!app.isPackaged) return { ok: false, error: 'Solo en la aplicación instalada' };
  if (isAdmin()) return { ok: true, alreadyAdmin: true };
  const exePath = process.execPath;
  spawn('powershell.exe', [
    '-NoProfile', '-Command',
    `Start-Process -FilePath "${exePath}" -Verb RunAs`,
  ], { windowsHide: true, detached: true, stdio: 'ignore' });
  setTimeout(() => app.quit(), 500);
  return { ok: true };
});

/* ── Importar configuración tipo AdGuard ── */
function extractDomainsFromAdguardRules(rulesText) {
  if (!rulesText || typeof rulesText !== 'string') return [];
  const domains = new Set();
  const lines = rulesText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    const m = line.match(/\|\|([a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)\^/);
    if (m) domains.add(m[1].toLowerCase());
  }
  return [...domains];
}

ipcMain.handle('config:importAdguard', async () => {
  try {
    const win = mainWindow;
    const result = await dialog.showOpenDialog(win, {
      title: 'Importar configuración AdGuard',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) {
      return { ok: false, canceled: true };
    }
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    const data = JSON.parse(content);

    let allowList = [];
    if (data.filters && data.filters.allowlist && Array.isArray(data.filters.allowlist.domains)) {
      allowList = data.filters.allowlist.domains
        .map(d => (d && typeof d === 'string' ? d.trim().toLowerCase() : ''))
        .filter(Boolean);
    }

    let blockList = [];
    if (data.filters && data.filters['user-filter'] && data.filters['user-filter'].rules) {
      blockList = extractDomainsFromAdguardRules(data.filters['user-filter'].rules);
    }

    const allowContent = allowList.join('\n') + (allowList.length ? '\n' : '');
    const blockContent = blockList.join('\n') + (blockList.length ? '\n' : '');
    fs.writeFileSync(USER_ALLOW_PATH, allowContent, 'utf8');
    fs.writeFileSync(USER_BLOCK_PATH, blockContent, 'utf8');

    return {
      ok: true,
      allowCount: allowList.length,
      blockCount: blockList.length,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

} // fin else (app normal)
