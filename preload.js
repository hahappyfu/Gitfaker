const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  startGeneration: (options) => ipcRenderer.send('start-generation', options),
  stopGeneration: () => ipcRenderer.send('stop-generation'),
  pushToRemote: (repoPath) => ipcRenderer.invoke('push-to-remote', repoPath),
  onLog: (callback) => ipcRenderer.on('log-message', (_, msg) => callback(msg)),
  onProgress: (callback) => ipcRenderer.on('progress-update', (_, data) => callback(data)),
  onDone: (callback) => ipcRenderer.on('generation-done', (_, data) => callback(data)),
  onError: (callback) => ipcRenderer.on('generation-error', (_, msg) => callback(msg))
});
