const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  onStart: (callback) => ipcRenderer.on('log-message', (_, msg) => callback(msg)),
  onProgress: (callback) => ipcRenderer.on('progress-update', (_, data) => callback(data)),
  onDone: (callback) => ipcRenderer.on('generation-done', (_, data) => callback(data)),
  onError: (callback) => ipcRenderer.on('generation-error', (_, msg) => callback(msg))
});
