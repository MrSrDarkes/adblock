const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  activate: () => ipcRenderer.invoke('adblock:activate'),
  deactivate: () => ipcRenderer.invoke('adblock:deactivate'),
  status: () => ipcRenderer.invoke('adblock:status'),
  minimize: () => ipcRenderer.send('win:minimize'),
  close: () => ipcRenderer.send('win:close'),
  setTooltip: (t) => ipcRenderer.send('tray:tooltip', t),
  isAdmin: () => ipcRenderer.invoke('app:isAdmin'),
  relaunchAsAdmin: () => ipcRenderer.invoke('app:relaunchAsAdmin'),
  importAdguardConfig: () => ipcRenderer.invoke('config:importAdguard'),
});
