const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const browseBtn = document.getElementById('browseBtn');
const logOutput = document.getElementById('logOutput');
const statsEl = document.getElementById('stats');
const repoPathInput = document.getElementById('repoPath');
const commitCountInput = document.getElementById('commitCount');
const totalLinesInput = document.getElementById('totalLines');

// 清除占位内容
function clearLog() {
  logOutput.innerHTML = '';
}

// 添加日志行
function addLog(text, type = '') {
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = text;
  logOutput.appendChild(line);
  logOutput.scrollTop = logOutput.scrollHeight;
}

// 更新进度
function updateStats(data) {
  const pct = Math.round((data.completed / data.total) * 100);
  statsEl.textContent = `${data.completed}/${data.total} commits | ${data.lines}/${data.targetLines} 行 | ${pct}%`;
}

// 浏览文件夹
browseBtn.addEventListener('click', async () => {
  const path = await window.electronAPI.selectDirectory();
  if (path) repoPathInput.value = path;
});

// 开始生成
startBtn.addEventListener('click', () => {
  const repoPath = repoPathInput.value.trim();
  const commitCount = parseInt(commitCountInput.value, 10);
  const totalLines = parseInt(totalLinesInput.value, 10);

  if (!repoPath) { addLog('❌ 请输入仓库路径', 'warning'); return; }
  if (!commitCount || commitCount <= 0) { addLog('❌ 请输入有效的提交次数', 'warning'); return; }
  if (!totalLines || totalLines <= 0) { addLog('❌ 请输入有效的代码行数', 'warning'); return; }

  clearLog();
  addLog(`🚀 开始生成 | 仓库: ${repoPath} | 次数: ${commitCount} | 行数: ${totalLines}`, 'info');
  startBtn.disabled = true;
  stopBtn.disabled = false;

  // 发送开始信号给主进程（通过 IPC）
  window.electronAPI.startGeneration({
    repoPath,
    commitCount,
    totalLines
  });
});

// 停止
stopBtn.addEventListener('click', () => {
  window.electronAPI.stopGeneration();
  addLog('⏹ 已发送停止信号', 'warning');
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// 监听日志消息
window.electronAPI.onLog((text) => {
  const type = text.startsWith('✅') ? 'success'
    : text.startsWith('⚠️') ? 'warning'
    : text.startsWith('🔀') ? 'branch'
    : text.startsWith('🚀') ? 'info'
    : '';
  addLog(text, type);
});

// 监听进度更新
window.electronAPI.onProgress((data) => {
  updateStats(data);
});

// 监听完成
window.electronAPI.onDone((data) => {
  addLog(`🎉 完成！共生成 ${data.commits} 个 commit，${data.lines} 行代码`, 'success');
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statsEl.textContent = '完成';
});

// 监听错误
window.electronAPI.onError((msg) => {
  addLog(`❌ 错误: ${msg}`, 'warning');
  startBtn.disabled = false;
  stopBtn.disabled = true;
});
