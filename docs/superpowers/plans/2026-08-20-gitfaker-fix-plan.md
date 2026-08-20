# GitFaker Bug 修复与交互改进实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复 file-ops 行数不准、统计总量误导、自动 push 无确认、文件变更单一的问题

**架构：** file-ops 接收精确行数参数透传到生成层；orchestrator 记录 beforeHead 统计增量并移除自动 push；renderer 新增对比卡片与手动 push 按钮；文件类型按 70/20/10 权重混合

**技术栈：** Electron + Node.js，核心模块 core/*.js，renderer 原生 JS

---

## 文件结构

| 文件 | 职责 | 变更类型 |
|------|------|----------|
| `core/file-ops.js` | 文件操作（创建/追加/修改/删除） | 修改：接收行数参数、权重分组 |
| `core/orchestrator.js` | 编排流程、增量统计、移除自动 push | 修改：透传行数、增量统计 |
| `core/git-ops.js` | git 封装 | 修改：新增增量统计辅助（如需要） |
| `main.js` | IPC 主进程 | 修改：新增 push-to-remote 通道 |
| `preload.js` | IPC 暴露 | 修改：暴露 push API |
| `renderer/index.html` | UI 结构 | 修改：新增 push 按钮、对比卡片容器 |
| `renderer/app.js` | UI 逻辑 | 修改：渲染对比卡片、push 按钮逻辑 |
| `renderer/style.css` | 样式 | 修改：push 按钮与卡片样式 |

---

### 任务 1：file-ops 行数与混合分布修复

**文件：**
- 修改：`core/file-ops.js`
- 测试：`/tmp/test_fileops.js`（一次性验证脚本）

- [ ] **步骤 1：编写失败的测试**

```js
// /tmp/test_fileops.js
const { performFileOperation, reset } = require('/Users/fupingguo/fuhaha_workspace/gitfaker/core/file-ops');
const fs = require('fs'), path = require('path'), os = require('os');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-fileops-'));
reset();
const result = performFileOperation(tmpDir, 'create', 2);
const content = fs.readFileSync(result.filePath, 'utf-8');
const lines = content.split('\n').filter(Boolean).length;
console.log(`期望2行，实际${lines}行`);
console.assert(lines === 2, `FAIL: 期望2行实际${lines}行`);
fs.rmSync(tmpDir, {recursive:true, force:true});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node /tmp/test_fileops.js`
预期：FAIL，实际 10-49 行而非 2 行（当前硬编码随机数）

- [ ] **步骤 3：修改 file-ops.js**

```js
// FILE_TYPES 按权重分组
const FILE_TYPE_GROUPS = {
  source: { weight: 0.7, types: [
    { ext: '.js', dir: 'src' }, { ext: '.ts', dir: 'src' },
    { ext: '.py', dir: 'src' }, { ext: '.go', dir: 'pkg' },
    { ext: '.java', dir: 'src/main/java' },
  ]},
  config: { weight: 0.2, types: [
    { ext: '.json', dir: 'config' }, { ext: '.yaml', dir: 'config' },
  ]},
  docs: { weight: 0.1, types: [
    { ext: '.md', dir: 'docs' }, { ext: '.css', dir: 'src/styles' },
    { ext: '.html', dir: 'src/views' },
  ]},
};

function getRandomFilePath(repoRoot) {
  const r = Math.random();
  let group;
  if (r < 0.7) group = FILE_TYPE_GROUPS.source;
  else if (r < 0.9) group = FILE_TYPE_GROUPS.config;
  else group = FILE_TYPE_GROUPS.docs;
  const ft = group.types[Math.floor(Math.random() * group.types.length)];
  const name = pick(FILE_NAMES) + ft.ext;
  return path.join(repoRoot, ft.dir, name);
}

function createNewFile(repoRoot, lineCount) {
  const filePath = getRandomFilePath(repoRoot);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const count = (typeof lineCount === 'number' && lineCount > 0) ? lineCount : Math.floor(Math.random() * 40) + 10;
  const content = generateCodeLines(count);
  fs.writeFileSync(filePath, content, 'utf-8');
  repoFiles.push(filePath);
  return filePath;
}

function appendToFile(repoRoot, lineCount) {
  if (repoFiles.length === 0) return createNewFile(repoRoot, lineCount);
  const filePath = pick(repoFiles);
  const count = (typeof lineCount === 'number' && lineCount > 0) ? lineCount : Math.floor(Math.random() * 20) + 3;
  const content = generateCodeLines(count);
  fs.appendFileSync(filePath, content, 'utf-8');
  return filePath;
}

function performFileOperation(repoRoot, operation, lineCount) {
  switch (operation) {
    case 'create': return { operation: 'create', filePath: createNewFile(repoRoot, lineCount) };
    case 'append': return { operation: 'append', filePath: appendToFile(repoRoot, lineCount) };
    case 'modify': return { operation: 'modify', filePath: modifyFile(repoRoot) };
    case 'delete': return { operation: 'delete', filePath: deleteRandomFile(repoRoot) };
    default: return { operation: 'append', filePath: appendToFile(repoRoot, lineCount) };
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node /tmp/test_fileops.js`
预期：PASS，实际 2 行

- [ ] **步骤 5：验证混合分布**

```js
// /tmp/test_mix.js — 生成100次统计三类占比
const { reset, createNewFile } = require('/Users/fupingguo/fuhaha_workspace/gitfaker/core/file-ops');
const fs = require('fs'), path = require('path'), os = require('os');
reset();
const counts = { source: 0, config: 0, docs: 0 };
for (let i = 0; i < 100; i++) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mix-'));
  const fp = createNewFile(tmpDir, 5);
  if (fp.includes('/src/') || fp.includes('/pkg/')) counts.source++;
  else if (fp.includes('/config/')) counts.config++;
  else counts.docs++;
  fs.rmSync(tmpDir, {recursive:true, force:true});
}
console.log(counts); // 期望接近 70/20/10
```

- [ ] **步骤 6：Commit**

```bash
git add core/file-ops.js
git commit -m "fix: file-ops 按目标行数生成并混合文件分布"
```

---

### 任务 2：orchestrator 透传行数 + 增量统计 + 移除自动 push

**文件：**
- 修改：`core/orchestrator.js`
- 测试：`/tmp/test_orchestrator.js`

- [ ] **步骤 1：编写失败的测试**

```js
// /tmp/test_orchestrator.js — 验证1 commit 2行场景
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-'));
execSync('git init', {cwd: tmpRepo});
execSync('git config user.email "t@t.com"', {cwd: tmpRepo});
execSync('git config user.name "T"', {cwd: tmpRepo});
for (let i=0;i<5;i++){ fs.writeFileSync(path.join(tmpRepo,`h${i}.txt`),`h${i}\n`); execSync('git add -A',{cwd:tmpRepo}); execSync(`git commit -m "h${i}"`,{cwd:tmpRepo}); }
const { run } = require('/Users/fupingguo/fuhaha_workspace/gitfaker/core/orchestrator');
run({ repoPath: tmpRepo, commitCount: 1, totalLines: 2, onLog: ()=>{}, onProgress: ()=>{}, signal: null }).then(result => {
  console.assert(result.completedCommits === 1, `commit数 ${result.completedCommits} !== 1`);
  const stat = execSync('git show HEAD --shortstat', {cwd: tmpRepo, encoding:'utf-8'});
  const m = stat.match(/(\d+) insertion/);
  const actualLines = m ? parseInt(m[1]) : 0;
  console.assert(actualLines === 2, `行数 ${actualLines} !== 2`);
  const hasPush = result.pushed !== undefined;
  console.assert(!hasPush || result.pushed === false, '不应自动push');
  console.log('PASS' );
  fs.rmSync(tmpRepo,{recursive:true,force:true});
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node /tmp/test_orchestrator.js`
预期：FAIL，实际行数 40 而非 2（file-ops 未修复前）

- [ ] **步骤 3：修改 orchestrator.js**

关键改动：
```js
// 记录 beforeHead
let beforeHead = null;
try { beforeHead = gitOps.getHeadCommit(repoPath); } catch {}

// performSingleCommit 透传 linesPerCommit
function performSingleCommit(repoRoot, date, linesPerCommit) {
  const operation = pickOperation();
  const result = performFileOperation(repoRoot, operation, linesPerCommit);
  if (result.operation === 'delete' && result.filePath === null) {
    performFileOperation(repoRoot, 'append', linesPerCommit);
  }
  gitOps.addAll(repoRoot);
  const msg = generateCommitMessage();
  gitOps.commitWithDate(msg, date, repoRoot);
  return { message: msg, operation: result.operation, filePath: result.filePath };
}

// extraLines 追加也按精确行数
if (extraLines > 0 && completedCommits >= commitCount) {
  const lastDate = dates[dates.length - 1] || new Date();
  const content = generateCodeLines(extraLines);
  // 写入一个文件
  const fp = path.join(repoPath, 'src', 'extra.js');
  fs.mkdirSync(path.dirname(fp), {recursive:true});
  fs.appendFileSync(fp, content, 'utf-8');
  gitOps.addAll(repoPath);
  gitOps.commitWithDate(generateCommitMessage(), lastDate, repoPath);
}

// 增量统计
let actualCommits = completedCommits;
let actualLines = generatedLines;
let changedFiles = [];
if (beforeHead) {
  try {
    actualCommits = parseInt(gitOps.getCommitCount(beforeHead, repoPath), 10) || completedCommits;
    const stat = gitOps.getDiffShortStat(beforeHead, repoPath);
    const m = stat.match(/(\d+) insertion/);
    if (m) actualLines = parseInt(m[1], 10);
    changedFiles = gitOps.getChangedFiles(beforeHead, repoPath);
  } catch {}
}

// 移除自动 push，返回增量数据
return { completedCommits, generatedLines, actualCommits, actualLines, changedFiles, beforeHead };
```

- [ ] **步骤 4：运行测试验证通过**

运行：`node /tmp/test_orchestrator.js`
预期：PASS

- [ ] **步骤 5：Commit**

```bash
git add core/orchestrator.js
git commit -m "fix: 透传行数、增量统计并移除自动 push"
```

---

### 任务 3：git-ops 新增辅助方法

**文件：**
- 修改：`core/git-ops.js`

- [ ] **步骤 1：新增方法**

```js
function getHeadCommit(cwd) {
  return runGit('rev-parse HEAD', cwd);
}
function getCommitCount(since, cwd) {
  return runGit(`rev-list --count ${since}..HEAD`, cwd);
}
function getDiffShortStat(since, cwd) {
  return runGit(`diff --shortstat ${since}..HEAD`, cwd);
}
function getChangedFiles(since, cwd) {
  const out = runGit(`diff --name-only ${since}..HEAD`, cwd);
  return out ? out.split('\n').filter(Boolean) : [];
}
```

导出新增方法。

- [ ] **步骤 2：Commit**

```bash
git add core/git-ops.js
git commit -m "feat: 新增增量统计 git 辅助方法"
```

---

### 任务 4：手动 Push 通道（main + preload）

**文件：**
- 修改：`main.js`
- 修改：`preload.js`

- [ ] **步骤 1：修改 main.js 新增 IPC**

```js
ipcMain.handle('push-to-remote', async (event, repoPath) => {
  const mainBranch = gitOps.getDefaultBranch(repoPath);
  const currentBranch = gitOps.getCurrentBranch(repoPath);
  if (currentBranch !== mainBranch) {
    gitOps.checkout(mainBranch, repoPath);
  }
  gitOps.push(repoPath);
  return { branch: mainBranch };
});
```

- [ ] **步骤 2：修改 preload.js 暴露 API**

```js
contextBridge.exposeInMainWorld('electronAPI', {
  // ...已有
  pushToRemote: (repoPath) => ipcRenderer.invoke('push-to-remote', repoPath),
});
```

- [ ] **步骤 3：Commit**

```bash
git add main.js preload.js
git commit -m "feat: 新增手动 push IPC 通道"
```

---

### 任务 5：Renderer UI — 对比卡片 + Push 按钮

**文件：**
- 修改：`renderer/index.html`
- 修改：`renderer/app.js`
- 修改：`renderer/style.css`

- [ ] **步骤 1：修改 index.html**

在 actions 区域新增 push 按钮，默认禁用：
```html
<button id="pushBtn" class="btn-push" disabled>推送到远端</button>
```
在 terminal 区域新增对比卡片容器：
```html
<div id="summaryCard" class="summary-card" style="display:none"></div>
```

- [ ] **步骤 2：修改 app.js**

- `onDone` 接收 `actualCommits/actualLines/changedFiles`，渲染对比卡片：
```js
window.electronAPI.onDone((data) => {
  // 渲染对比卡片
  const card = document.getElementById('summaryCard');
  card.style.display = 'block';
  card.innerHTML = `
    <div class="summary-title">本次生成统计</div>
    <div class="summary-row"><span>目标</span><span>${data.targetCommits} commit · ${data.targetLines} 行</span></div>
    <div class="summary-row"><span>实际</span><span>${data.actualCommits} commit · ${data.actualLines} 行 · ${data.changedFiles.length} 文件</span></div>
    <div class="summary-files">${data.changedFiles.slice(0,5).join(', ')}${data.changedFiles.length>5?' ...':''}</div>
  `;
  // 启用 push 按钮
  pushBtn.disabled = false;
  pushBtn.textContent = `推送到远端 (${data.actualCommits} commit)`;
  // 保存 repoPath 供 push 使用
  pushBtn.dataset.repoPath = currentRepoPath;
});
```

- push 按钮点击逻辑：
```js
pushBtn.addEventListener('click', async () => {
  pushBtn.disabled = true;
  pushBtn.textContent = '推送中...';
  try {
    const result = await window.electronAPI.pushToRemote(pushBtn.dataset.repoPath);
    addLog(`✅ 已推送到 ${result.branch}`, 'success');
    pushBtn.textContent = '已推送';
  } catch (e) {
    addLog(`⚠️ 推送失败: ${e.message}`, 'warning');
    pushBtn.disabled = false;
    pushBtn.textContent = '重试推送';
  }
});
```

- 开始生成时重置卡片与按钮状态

- [ ] **步骤 3：修改 style.css 新增样式**

```css
.summary-card { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 12px; margin: 12px 0; }
.summary-title { font-weight: 600; margin-bottom: 8px; }
.summary-row { display: flex; justify-content: space-between; font-size: 13px; }
.summary-files { font-size: 12px; color: #888; margin-top: 6px; word-break: break-all; }
.btn-push { /* 与 btn-primary 同级，强调色 */ }
.btn-push:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **步骤 4：Commit**

```bash
git add renderer/index.html renderer/app.js renderer/style.css
git commit -m "feat: 新增增量对比卡片与手动 push 按钮"
```

---

### 任务 6：端到端验证

- [ ] **步骤 1：执行验证脚本**

运行：`node /tmp/test_e2e.js`（1 commit / 2 行 + 50 commit / 2000 行两档）
断言：实际行数误差 ±0，增量统计准确，push 按钮启用/推送成功

- [ ] **步骤 2：手动验证**

启动 Electron：`npm start`，输入 1 commit / 2 行，观察对比卡片与 push 按钮行为

- [ ] **步骤 3：清理临时脚本**

```bash
rm /tmp/test_fileops.js /tmp/test_mix.js /tmp/test_orchestrator.js /tmp/test_e2e.js /tmp/repro_*.js
```
