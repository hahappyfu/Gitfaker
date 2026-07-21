// ─── DOM ───
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const browseBtn = document.getElementById('browseBtn');
const logOutput = document.getElementById('logOutput');
const statsEl = document.getElementById('stats');
const repoPathInput = document.getElementById('repoPath');
const commitCountInput = document.getElementById('commitCount');
const totalLinesInput = document.getElementById('totalLines');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressCommits = document.getElementById('progressCommits');
const progressLines = document.getElementById('progressLines');

const lightIdle = document.getElementById('lightIdle');
const lightRunning = document.getElementById('lightRunning');
const lightDone = document.getElementById('lightDone');
const lightError = document.getElementById('lightError');

// ─── Status lights ───
function setStatus(state) {
  [lightIdle, lightRunning, lightDone, lightError].forEach(el => el.style.display = 'none');
  const map = { idle: lightIdle, running: lightRunning, done: lightDone, error: lightError };
  if (map[state]) map[state].style.display = 'flex';
}

// ─── Log ───
let logInitialized = false;

function clearLog() {
  logOutput.innerHTML = '';
  logInitialized = false;
}

function addLog(text, type = '') {
  if (!logInitialized) {
    logOutput.innerHTML = '';
    logInitialized = true;
  }

  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = text;
  logOutput.appendChild(line);

  // 脉冲扫过动画
  requestAnimationFrame(() => {
    line.classList.add('flash');
    setTimeout(() => line.classList.remove('flash'), 400);
  });

  logOutput.scrollTop = logOutput.scrollHeight;
}

// ─── Progress ───
function updateProgress(data) {
  const pct = Math.round((data.completed / data.total) * 100);
  progressFill.style.width = `${pct}%`;
  progressCommits.textContent = `${data.completed} / ${data.total}`;
  progressLines.textContent = `${data.lines.toLocaleString()} 行`;
  statsEl.textContent = `${pct}% · ${data.completed}/${data.total}`;
}

// ─── Browse folder ───
browseBtn.addEventListener('click', async () => {
  const p = await window.electronAPI.selectDirectory();
  if (p) repoPathInput.value = p;
});

// ─── Start ───
startBtn.addEventListener('click', () => {
  const repoPath = repoPathInput.value.trim();
  const commitCount = parseInt(commitCountInput.value, 10);
  const totalLines = parseInt(totalLinesInput.value, 10);

  if (!repoPath) {
    addLog('请输入仓库路径', 'warning');
    return;
  }
  if (!commitCount || commitCount <= 0) {
    addLog('请输入有效的提交次数', 'warning');
    return;
  }
  if (!totalLines || totalLines <= 0) {
    addLog('请输入有效的代码行数', 'warning');
    return;
  }

  clearLog();
  progressBar.style.display = 'block';
  progressFill.style.width = '0%';
  setStatus('running');

  addLog(`目标仓库  ${repoPath}`, 'dim');
  addLog(`提交次数  ${commitCount}`, 'dim');
  addLog(`代码行数  ${totalLines.toLocaleString()}`, 'dim');
  addLog('─'.repeat(44), 'dim');
  addLog('');

  startBtn.disabled = true;
  stopBtn.disabled = false;

  window.electronAPI.startGeneration({ repoPath, commitCount, totalLines });
});

// ─── Stop ───
stopBtn.addEventListener('click', () => {
  window.electronAPI.stopGeneration();
  addLog('已发送停止信号...', 'warning');
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// ─── IPC listeners ───
window.electronAPI.onLog((text) => {
  const type = text.startsWith('✅') ? 'success'
    : text.startsWith('⚠️') ? 'warning'
    : text.startsWith('🔀') ? 'branch'
    : '';
  addLog(text, type);
});

window.electronAPI.onProgress((data) => {
  updateProgress(data);
});

window.electronAPI.onDone((data) => {
  addLog('');
  addLog('─'.repeat(44), 'dim');
  addLog(`完成  ${data.commits} 个 commit · ${data.lines.toLocaleString()} 行`, 'success');
  setStatus('done');
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statsEl.textContent = '完成';
});

window.electronAPI.onError((msg) => {
  addLog(`错误: ${msg}`, 'warning');
  setStatus('error');
  startBtn.disabled = false;
  stopBtn.disabled = true;
});
