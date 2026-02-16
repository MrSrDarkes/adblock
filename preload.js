const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  activar: () => ipcRenderer.invoke('activar'),
  desactivar: () => ipcRenderer.invoke('desactivar'),
  estado: () => ipcRenderer.invoke('estado'),
  getDiagnostic: () => ipcRenderer.invoke('getDiagnostic'),
  importAdguardConfig: (filePath) => ipcRenderer.invoke('importAdguardConfig', filePath),
  openAdguardFileDialog: () => ipcRenderer.invoke('openAdguardFileDialog'),
  minimize: () => ipcRenderer.invoke('minimize'),
  maximize: () => ipcRenderer.invoke('maximize'),
  close: () => ipcRenderer.invoke('close'),
  setTooltip: (text) => ipcRenderer.invoke('setTooltip', text),
  onEstadoInicial: (callback) => {
    ipcRenderer.on('estado-inicial', (_, data) => callback(data));
  }
});
