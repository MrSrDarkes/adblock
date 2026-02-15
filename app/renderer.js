(() => {
  const $ = (s) => document.getElementById(s);
  const statusLabel = $('statusLabel');
  const blockedCount = $('blockedCount');
  const blockedTotal = $('blockedTotal');
  const powerBtn = $('powerBtn');
  const powerLabel = $('powerLabel');
  const statDomains = $('statDomains');
  const statState = $('statState');
  const statDate = $('statDate');
  const logArea = $('logArea');
  const adminBanner = $('adminBanner');

  let isActive = false;
  let count = 0;

  function showAdminBanner() {
    if (adminBanner) adminBanner.classList.remove('hidden');
  }
  function hideAdminBanner() {
    if (adminBanner) adminBanner.classList.add('hidden');
  }

  function log(msg) {
    const ts = new Date().toLocaleTimeString('es');
    logArea.textContent += `[${ts}] ${msg}\n`;
    logArea.scrollTop = logArea.scrollHeight;
  }

  function fmt(n) {
    return Number(n).toLocaleString('es');
  }

  function updateUI() {
    const c = fmt(count);
    if (blockedCount) { blockedCount.textContent = isActive ? c : '0'; blockedCount.className = 'blocked-count' + (isActive ? '' : ' inactive'); }
    if (blockedTotal) blockedTotal.textContent = isActive ? c : '0';
    if (statusLabel) statusLabel.textContent = isActive ? 'Protección activa' : 'Protección inactiva';
    if (powerBtn) powerBtn.className = 'power-btn ' + (isActive ? 'on' : 'off');
    if (powerLabel) { powerLabel.textContent = isActive ? 'ON' : 'OFF'; powerLabel.className = 'power-label' + (isActive ? ' on' : ''); }
    if (statDomains) statDomains.textContent = isActive ? c : '0';
    if (statState) { statState.textContent = isActive ? 'Activo' : 'Inactivo'; statState.style.color = isActive ? '#2ecc71' : '#e53935'; }
    if (window.api && window.api.setTooltip) window.api.setTooltip(isActive ? `Adblock — ${c} bloqueados` : 'Adblock — Inactivo');
  }

  function parseCount(output) {
    if (output == null || typeof output !== 'string') return 0;
    const m = output.match(/Dominios bloqueados:\s*(\d+)/i) || output.match(/(\d+)\s*dominios bloqueados/i);
    return m ? parseInt(m[1], 10) : 0;
  }

  async function refreshStatus() {
    try {
      const r = await window.api.status();
      if (r.ok) {
        isActive = /Adblock\s+ACTIVO/i.test(r.output) && !/INACTIVO/i.test(r.output);
        count = parseCount(r.output) || count;
        hideAdminBanner();
      } else {
        isActive = false;
        showAdminBanner();
        log('Aviso: Ejecutar como administrador para modificar hosts.');
      }
    } catch (e) {
      isActive = false;
      showAdminBanner();
      log('Error al consultar estado: ' + e.message);
    }
    updateUI();
  }

  powerBtn.addEventListener('click', async () => {
    if (powerBtn.disabled) return;
    powerBtn.disabled = true;
    powerLabel.textContent = '...';

    log(isActive ? 'Desactivando bloqueo…' : 'Activando bloqueo (descargando lista)…');

    try {
      const api = window.api;
      if (!api || !api.activate || !api.deactivate) {
        log('Error: No se pudo conectar con el programa.');
        return;
      }
      const r = isActive ? await api.deactivate() : await api.activate();
      const out = (r && r.output != null) ? String(r.output) : '';

      if (r && r.ok) {
        if (isActive) {
          isActive = false;
          count = 0;
          statDate.textContent = '—';
          log('Desactivado.');
        } else {
          isActive = true;
          const n = parseCount(out);
          if (n > 0) count = n;
          statDate.textContent = new Date().toLocaleString('es');
          log('Activado. ' + fmt(count) + ' dominios bloqueados.');
        }
      } else {
        const err = (r && r.error != null) ? String(r.error) : '';
        if (/administrador|Administrator|elevated|denied|Acceso|RunAs|requiere/i.test(err)) {
          showAdminBanner();
          log('ERROR: Ejecuta Adblock como Administrador.');
          log('→ Clic derecho en Adblock.exe → Ejecutar como administrador');
        } else {
          log('Error: ' + (err || 'Desconocido'));
        }
      }
    } catch (e) {
      log('Error: ' + (e && e.message ? e.message : String(e)));
    } finally {
      powerBtn.disabled = false;
      updateUI();
    }
  });

  $('actionUpdate').addEventListener('click', async (e) => {
    e.preventDefault();
    powerBtn.disabled = true;
    log('Actualizando lista de bloqueo…');
    const r = await window.api.activate();
    if (r.ok) {
      isActive = true;
      count = parseCount(r.output) || count;
      statDate.textContent = new Date().toLocaleString('es');
      log(`Lista actualizada. ${fmt(count)} dominios.`);
    } else {
      log('Error: ' + (r.error || 'Ejecutar como administrador.'));
    }
    updateUI();
    powerBtn.disabled = false;
  });

  $('actionRestore').addEventListener('click', async (e) => {
    e.preventDefault();
    log('Restaurando hosts original…');
    const r = await window.api.deactivate();
    if (r.ok) { isActive = false; count = 0; log('Hosts restaurado.'); }
    else { log('Error: ' + (r.error || 'Ejecutar como administrador.')); }
    updateUI();
  });

  $('actionImportAdguard').addEventListener('click', async (e) => {
    e.preventDefault();
    if (!window.api || !window.api.importAdguardConfig) return;
    log('Importando configuración AdGuard…');
    const r = await window.api.importAdguardConfig();
    if (r.canceled) {
      log('Importación cancelada.');
      return;
    }
    if (r.ok) {
      log(`Configuración importada: ${r.allowCount} dominios en lista blanca, ${r.blockCount} en bloqueo.`);
      log('Activa de nuevo el bloqueo para aplicar los cambios.');
    } else {
      log('Error al importar: ' + (r.error || 'Desconocido'));
    }
  });

  $('btnMin').addEventListener('click', () => window.api && window.api.minimize());
  $('btnClose').addEventListener('click', () => window.api && window.api.close());

  $('btnRelaunchAdmin').addEventListener('click', async () => {
    if (!window.api || !window.api.relaunchAsAdmin) return;
    const r = await window.api.relaunchAsAdmin();
    if (r && r.ok) {
      if (r.alreadyAdmin) hideAdminBanner();
      else log('Reiniciando como administrador… Acepta el aviso de UAC.');
    } else {
      log('Reiniciar como admin solo está disponible en Adblock.exe instalado.');
    }
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = $('panel-' + tab.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  logArea.textContent = '';
  log('Adblock iniciado.');
  refreshStatus();
})();
