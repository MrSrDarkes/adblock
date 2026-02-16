const statusText = document.getElementById('statusText');
const detailsText = document.getElementById('detailsText');
const toggleBtn = document.getElementById('toggleBtn');
const refreshBtn = document.getElementById('refreshBtn');
const importBtn = document.getElementById('importBtn');
const logBox = document.getElementById('logBox');

const minBtn = document.getElementById('minBtn');
const closeBtn = document.getElementById('closeBtn');

let isActive = false;
let busy = false;

function hasBridge() {
  return Boolean(window.api);
}

function appendLog(message) {
  const stamp = new Date().toLocaleTimeString();
  logBox.textContent = `[${stamp}] ${message}\n` + logBox.textContent;
}

function normalizeText(output = '') {
  if (!output) return '';
  return String(output)
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function parseStatus(output = '') {
  const clean = normalizeText(output).toUpperCase();

  // Importante: evaluar INACTIVO primero, porque "INACTIVO" contiene "ACTIVO".
  if (
    clean.includes('ESTADO: ADBLOCK INACTIVO')
    || clean.includes('ADBLOCK DESACTIVADO')
    || /\bINACTIVO\b/.test(clean)
    || /\bDESACTIVADO\b/.test(clean)
  ) {
    return false;
  }

  if (
    clean.includes('ESTADO: ADBLOCK ACTIVO')
    || clean.includes('ADBLOCK ACTIVADO')
    || /\bACTIVO\b/.test(clean)
    || /\bACTIVADO\b/.test(clean)
  ) {
    return true;
  }

  return null;
}

function extractBlockedCount(output = '') {
  const clean = normalizeText(output);
  const match = clean.match(/Dominios bloqueados:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function setUiState(active) {
  isActive = active;
  statusText.textContent = active ? 'Activo' : 'Inactivo';
  statusText.classList.toggle('active', active);
  statusText.classList.toggle('inactive', !active);

  toggleBtn.textContent = active ? 'Pausar' : 'Iniciar';
  toggleBtn.classList.toggle('active', active);
  toggleBtn.classList.toggle('inactive', !active);

  if (hasBridge()) {
    window.api.setTooltip(active ? 'Adblock (ACTIVO)' : 'Adblock (INACTIVO)');
  }
}

function setBusyState(value) {
  busy = value;
  toggleBtn.disabled = value;
  refreshBtn.disabled = value;
  importBtn.disabled = value;
}

async function preflightCheck() {
  if (!hasBridge()) {
    detailsText.textContent = 'No hay conexión con Electron (preload/API).';
    appendLog('window.api no está disponible. Abre la app con Electron, no el HTML directo.');
    return;
  }

  try {
    const diag = await window.api.getDiagnostic();
    if (!diag.scriptExists) {
      appendLog(`Falta script: ${diag.scriptPath}`);
      detailsText.textContent = 'Falta Update-Hosts.ps1 en resources. Reinstala/compila la app.';
    }
    if (!diag.isAdmin) {
      appendLog('La app no tiene privilegios de administrador.');
      detailsText.textContent = 'Ejecuta como administrador para modificar hosts.';
    }
  } catch (error) {
    appendLog(`Diagnóstico no disponible: ${error.message}`);
  }
}

async function refreshStatus() {
  if (!hasBridge()) {
    detailsText.textContent = 'No hay conexión con Electron (preload/API).';
    appendLog('window.api no está disponible.');
    return;
  }

  setBusyState(true);
  try {
    const result = await window.api.status();
    if (!result.ok) throw new Error(result.error || 'Error al consultar estado');

    const active = parseStatus(result.output);
    if (active !== null) setUiState(active);

    const blocked = extractBlockedCount(result.output);
    detailsText.textContent = blocked !== null
      ? `${blocked} dominios bloqueados.`
      : 'Estado consultado correctamente.';

    appendLog(normalizeText(result.output) || 'Estado actualizado');
  } catch (error) {
    appendLog(`Error de estado: ${error.message}`);
    detailsText.textContent = 'No se pudo consultar el estado.';
  } finally {
    setBusyState(false);
  }
}

async function toggleAdblock() {
  if (busy) return;
  if (!hasBridge()) {
    appendLog('No se puede ejecutar: window.api no está disponible.');
    return;
  }

  setBusyState(true);

  try {
    const action = isActive ? 'deactivate' : 'activate';
    const result = await window.api[action]();
    if (!result.ok) throw new Error(result.error || 'Fallo de PowerShell');

    appendLog(normalizeText(result.output) || 'Comando ejecutado');

    const parsed = parseStatus(result.output);
    const nextState = parsed !== null ? parsed : !isActive;
    setUiState(nextState);

    const blocked = extractBlockedCount(result.output);
    detailsText.textContent = blocked !== null
      ? `${blocked} dominios bloqueados.`
      : nextState ? 'Protección activa.' : 'Protección detenida.';

    await refreshStatus();
  } catch (error) {
    appendLog(`Error: ${error.message}`);
    detailsText.textContent = 'No se pudo ejecutar la acción.';
  } finally {
    setBusyState(false);
  }
}

async function importConfig() {
  if (!hasBridge()) {
    appendLog('No se puede importar: window.api no está disponible.');
    return;
  }

  try {
    const result = await window.api.importAdguardConfig();
    if (result.canceled) return;
    if (!result.ok) throw new Error(result.error || 'No se pudo importar');

    appendLog(`Importación completada. allow=${result.allowCount}, block=${result.blockCount}`);
    detailsText.textContent = 'Configuración importada. Vuelve a activar para aplicar.';
  } catch (error) {
    appendLog(`Error importando: ${error.message}`);
  }
}

minBtn.addEventListener('click', () => hasBridge() && window.api.minimize());
closeBtn.addEventListener('click', () => hasBridge() && window.api.close());
toggleBtn.addEventListener('click', toggleAdblock);
refreshBtn.addEventListener('click', refreshStatus);
importBtn.addEventListener('click', importConfig);

preflightCheck().then(refreshStatus);
