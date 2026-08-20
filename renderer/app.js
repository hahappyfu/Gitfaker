// ─── DOM ───
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pushBtn = document.getElementById('pushBtn');
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
const summaryCard = document.getElementById('summaryCard');

const lightIdle = document.getElementById('lightIdle');
const lightRunning = document.getElementById('lightRunning');
const lightDone = document.getElementById('lightDone');
const lightError = document.getElementById('lightError');

// ─── State ───
let currentRepoPath = '';

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

  requestAnimationFrame(() => {
    line.classList.add('flash');
    setTimeout(() => line.classList.remove('flash'), 400);
  });

  logOutput.scrollTop = logOutput.scrollHeight;
}

// ─── Summary Card ───
function showSummary(data) {
  summaryCard.style.display = 'block';
  summaryCard.className = 'summary-card';
  const targetCommits = data.targetCommits || data.commits;
  const targetLines = data.targetLines || data.lines;
  const actualCommits = data.actualCommits ?? data.commits;
  const actualLines = data.actualLines ?? data.lines;
  const files = data.changedFiles || [];
  const filePreview = files.length > 0
    ? files.slice(0, 5).join(', ') + (files.length > 5 ? ` ...等${files.length}个文件` : '')
    : '—';

  summaryCard.innerHTML = `
    <div class="summary-title">本次生成统计</div>
    <div class="summary-row"><span class="summary-label">目标</span><span>${targetCommits} commit · ${targetLines.toLocaleString()} 行</span></div>
    <div class="summary-row"><span class="summary-label">实际</span><span class="summary-actual">${actualCommits} commit · ${actualLines.toLocaleString()} 行 · ${files.length} 文件</span></div>
    <div class="summary-files">${filePreview}</div>
  `;
}

function hideSummary() {
  summaryCard.style.display = 'none';
  summaryCard.innerHTML = '';
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

  currentRepoPath = repoPath;
  clearLog();
  hideSummary();
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
  pushBtn.disabled = true;
  pushBtn.textContent = '推送到远端';

  window.electronAPI.startGeneration({ repoPath, commitCount, totalLines });
});

// ─── Stop ───
stopBtn.addEventListener('click', () => {
  window.electronAPI.stopGeneration();
  addLog('已发送停止信号...', 'warning');
  startBtn.disabled = false;
  stopBtn.disabled = true;
});

// ─── Push ───
pushBtn.addEventListener('click', async () => {
  if (!currentRepoPath) {
    addLog('请先生成 commit', 'warning');
    return;
  }
  pushBtn.disabled = true;
  pushBtn.textContent = '推送中...';
  try {
    const result = await window.electronAPI.pushToRemote(currentRepoPath);
    addLog(`✅ 已推送到 ${result.branch}`, 'success');
    pushBtn.textContent = '已推送';
  } catch (e) {
    const msg = e.message || String(e);
    addLog(`⚠️ 推送失败: ${msg}`, 'warning');
    pushBtn.disabled = false;
    pushBtn.textContent = '重试推送';
  }
});

// ─── IPC listeners ───
window.electronAPI.onLog((text) => {
  const type = text.startsWith('✅') ? 'success'
    : text.startsWith('⚠️') ? 'warning'
    : text.startsWith('🔀') ? 'branch'
    : text.startsWith('📊') || text.startsWith('💡') ? 'info'
    : '';
  addLog(text, type);
});

window.electronAPI.onProgress((data) => {
  updateProgress(data);
});

window.electronAPI.onDone((data) => {
  showSummary(data);
  addLog('');
  addLog('─'.repeat(44), 'dim');
  addLog(`完成  ${data.actualCommits ?? data.commits} 个 commit · ${(data.actualLines ?? data.lines).toLocaleString()} 行`, 'success');
  setStatus('done');
  startBtn.disabled = false;
  stopBtn.disabled = true;
  pushBtn.disabled = false;
  pushBtn.textContent = `推送到远端 (${data.actualCommits ?? data.commits} commit)`;
  statsEl.textContent = '完成 · 待推送';
});

window.electronAPI.onError((msg) => {
  addLog(`错误: ${msg}`, 'warning');
  setStatus('error');
  startBtn.disabled = false;
  stopBtn.disabled = true;
});
