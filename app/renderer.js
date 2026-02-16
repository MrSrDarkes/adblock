let btnToggle, statusTitle, statusSubtitle, statusLoading, statDominios, statEstado;
let btnRecargar, btnActivarManual, btnImport, btnMin, btnMax, btnClose;
let tabAcciones, tabEstadisticas, panelAcciones, panelEstadisticas;
let logEl, notification, notificationText, notificationDismiss;

const MSG_NEED_ADMIN = 'Se requieren permisos de administrador para aplicar los cambios.';

function getEl(id) { return document.getElementById(id); }

function showApiError() {
  if (notification && notificationText) {
    notificationText.textContent = 'Error: no se pudo cargar la conexión con la app. Cierra y vuelve a abrir, o ejecuta como administrador.';
    notification.classList.remove('notification-hidden');
  }
}

function log(msg) {
  if (!logEl) return;
  const ts = new Date().toLocaleTimeString('es-AR');
  logEl.textContent = (logEl.textContent ? logEl.textContent + '\n' : '') + `[${ts}] ${msg}`;
  logEl.scrollTop = logEl.scrollHeight;
}

function showNotification(message) {
  if (notificationText) notificationText.textContent = message || MSG_NEED_ADMIN;
  if (notification) notification.classList.remove('notification-hidden');
}

function hideNotification() {
  if (notification) notification.classList.add('notification-hidden');
}

function setLoading(loading) {
  if (!btnToggle) return;
  if (loading) {
    btnToggle.classList.add('loading');
    btnToggle.disabled = true;
    if (statusLoading) statusLoading.classList.remove('status-loading-hidden');
  } else {
    btnToggle.classList.remove('loading');
    btnToggle.disabled = false;
    if (statusLoading) statusLoading.classList.add('status-loading-hidden');
  }
}

function applyEstado(data) {
  const activo = data && data.activo === true;
  const dominios = data && typeof data.dominios === 'number' ? data.dominios : (data && data.dominios != null ? data.dominios : null);
  const num = dominios != null ? Number(dominios) : 0;

  if (activo) {
    if (btnToggle) { btnToggle.classList.add('protected'); btnToggle.setAttribute('aria-pressed', 'true'); }
    if (statusTitle) statusTitle.textContent = 'Protección habilitada';
    if (statusSubtitle) statusSubtitle.textContent = 'Total bloqueado: ' + num.toLocaleString();
    if (statEstado) { statEstado.textContent = 'Protegido'; statEstado.className = 'stat-value stat-status activo'; }
    if (statDominios) statDominios.textContent = num > 0 ? num.toLocaleString() : '—';
  } else {
    if (btnToggle) btnToggle.classList.remove('protected');
    btnToggle?.setAttribute('aria-pressed', 'false');
    if (statusTitle) statusTitle.textContent = 'Protección deshabilitada';
    if (statusSubtitle) statusSubtitle.textContent = 'Total bloqueado: 0';
    if (statEstado) { statEstado.textContent = 'Desprotegido'; statEstado.className = 'stat-value stat-status inactivo'; }
    if (statDominios) statDominios.textContent = '—';
  }

  if (window.api && window.api.setTooltip) {
    window.api.setTooltip(activo ? 'Adblock Coffe – Protección activa' : 'Adblock Coffe – Protección desactivada');
  }
}

async function refreshStatus() {
  const r = await window.api.estado();
  if (!r.ok) {
    applyEstado({ activo: false, dominios: null });
    if (r.needsAdmin) showNotification(MSG_NEED_ADMIN);
    else if (r.error) log('Error estado: ' + r.error);
    return;
  }
  hideNotification();
  applyEstado({ activo: r.activo, dominios: r.dominios });
}

async function toggleAdblock() {
  const wasProtected = btnToggle && btnToggle.classList.contains('protected');
  const action = wasProtected ? 'desactivar' : 'activar';
  setLoading(true);
  hideNotification();

  let r;
  try {
    r = await (action === 'activar' ? window.api.activar() : window.api.desactivar());
  } catch (err) {
    r = { ok: false, activo: wasProtected, dominios: null, error: err && err.message ? err.message : 'Error desconocido' };
  }

  setLoading(false);

  if (r.ok) {
    log(action === 'activar' ? 'Protección activada.' : 'Protección desactivada.');
    applyEstado({ activo: r.activo, dominios: r.dominios });
  } else {
    if (r.needsAdmin) showNotification(MSG_NEED_ADMIN);
    else showNotification(r.error || 'No se pudieron aplicar los cambios.');
    applyEstado({ activo: r.activo !== undefined ? r.activo : wasProtected, dominios: r.dominios != null ? r.dominios : null });
  }
}

function switchTab(toAcciones) {
  tabAcciones.classList.toggle('active', toAcciones);
  tabEstadisticas.classList.toggle('active', !toAcciones);
  tabAcciones.setAttribute('aria-selected', toAcciones ? 'true' : 'false');
  tabEstadisticas.setAttribute('aria-selected', !toAcciones ? 'true' : 'false');
  panelAcciones.classList.toggle('active', toAcciones);
  panelEstadisticas.classList.toggle('active', !toAcciones);
  panelAcciones.hidden = !toAcciones;
  panelEstadisticas.hidden = toAcciones;
}

async function preflightCheck() {
  const d = await window.api.getDiagnostic();
  if (!d.scriptExists) log('Aviso: Update-Hosts.ps1 no encontrado en ' + (d.scriptPath || ''));
}

async function importConfig() {
  if (!window.api || !window.api.openAdguardFileDialog) {
    log('Error: no se puede abrir el diálogo de importación.');
    return;
  }
  const r = await window.api.openAdguardFileDialog();
  if (r.canceled) return;
  if (r.ok) {
    log('Importados ' + r.count + ' reglas de AdGuard.');
  } else {
    log('Error importación: ' + (r.error || ''));
  }
}

function init() {
  btnToggle = getEl('btnToggle');
  statusTitle = getEl('statusTitle');
  statusSubtitle = getEl('statusSubtitle');
  statusLoading = getEl('statusLoading');
  statDominios = getEl('statDominios');
  statEstado = getEl('statEstado');
  btnRecargar = getEl('btnRecargar');
  btnActivarManual = getEl('btnActivarManual');
  btnImport = getEl('btnImport');
  btnMin = getEl('btnMin');
  btnMax = getEl('btnMax');
  btnClose = getEl('btnClose');
  tabAcciones = getEl('tabAcciones');
  tabEstadisticas = getEl('tabEstadisticas');
  panelAcciones = getEl('panelAcciones');
  panelEstadisticas = getEl('panelEstadisticas');
  logEl = getEl('log');
  notification = getEl('notification');
  if (notification) {
    notificationText = notification.querySelector('.notification-text');
    notificationDismiss = notification.querySelector('.notification-dismiss');
  }

  if (!window.api) {
    console.error('Adblock: window.api no disponible. ¿Se cargó el preload?');
    showApiError();
    return;
  }

  if (window.api.onEstadoInicial) {
    window.api.onEstadoInicial((data) => {
      if (data && typeof data.activo === 'boolean') applyEstado({ activo: data.activo, dominios: data.dominios });
      if (data && data.needsAdmin) showNotification(MSG_NEED_ADMIN);
    });
  }

  if (btnToggle) btnToggle.addEventListener('click', toggleAdblock);
  if (btnRecargar) btnRecargar.addEventListener('click', () => { log('Recargando estado...'); refreshStatus(); });
  if (btnActivarManual) btnActivarManual.addEventListener('click', () => { if (!btnToggle || !btnToggle.classList.contains('protected')) toggleAdblock(); else log('La protección ya está activa.'); });
  if (btnImport) btnImport.addEventListener('click', importConfig);
  if (btnMin) btnMin.addEventListener('click', () => window.api && window.api.minimize());
  if (btnMax) btnMax.addEventListener('click', () => window.api && window.api.maximize());
  if (btnClose) btnClose.addEventListener('click', () => window.api && window.api.close());
  if (notificationDismiss) notificationDismiss.addEventListener('click', hideNotification);
  if (tabAcciones) tabAcciones.addEventListener('click', () => switchTab(true));
  if (tabEstadisticas) tabEstadisticas.addEventListener('click', () => switchTab(false));

  preflightCheck();
  refreshStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
