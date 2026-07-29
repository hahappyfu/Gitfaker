const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'GitFaker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// IPC: 打开文件夹选择对话框
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

const { run } = require('./core/orchestrator');

let currentAbortController = null;

ipcMain.on('start-generation', async (event, options) => {
  const { repoPath, commitCount, totalLines } = options;
  const webContents = event.sender;

  // 创建中断控制器
  currentAbortController = new AbortController();

  try {
    const result = await run({
      repoPath,
      commitCount,
      totalLines,
      onLog: (msg) => webContents.send('log-message', msg),
      onProgress: (data) => webContents.send('progress-update', data),
      signal: currentAbortController.signal
    });

    webContents.send('generation-done', {
      commits: result.completedCommits,
      lines: result.generatedLines
    });
  } catch (e) {
    webContents.send('generation-error', e.message);
  } finally {
    currentAbortController = null;
  }
});

ipcMain.on('stop-generation', () => {
  if (currentAbortController) {
    currentAbortController.abort();
  }
});
