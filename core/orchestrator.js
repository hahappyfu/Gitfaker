const { performFileOperation, reset: resetFiles } = require('./file-ops');
const { generateCodeLines } = require('./random-code');
const { generateCommitMessage } = require('./commit-message');
const { generateTimeDistribution } = require('./time-distribution');
const { shouldCreateBranch, getBranchCommitCount, executeBranchWorkflow } = require('./branch-manager');
const gitOps = require('./git-ops');
const fs = require('fs');
const path = require('path');

function pickOperation() {
  const rand = Math.random();
  if (rand < 0.60) return 'append';
  if (rand < 0.80) return 'create';
  if (rand < 0.90) return 'modify';
  return 'delete';
}

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

async function run({ repoPath, commitCount, totalLines, onLog, onProgress, signal }) {
  if (!gitOps.checkGitAvailable()) {
    throw new Error('未检测到 git 命令。\n\n可能原因：\n1. 未安装 Git for Windows\n2. 安装时未勾选"Add to PATH"\n3. 需要重启电脑\n\n下载 Git：https://git-scm.com/download/win');
  }

  if (!gitOps.isGitRepo(repoPath)) {
    const gitDir = path.join(repoPath, '.git');
    const hasGitDir = fs.existsSync(gitDir);
    let detail = '';
    if (!hasGitDir) {
      detail = `\n目录下没有 .git 文件夹。请确认选择的是仓库根目录（包含 .git 的那个文件夹）。`;
    }
    throw new Error(`${repoPath} 不是一个 git 仓库${detail}`);
  }

  resetFiles();

  let beforeHead = null;
  try { beforeHead = gitOps.getHeadCommit(repoPath); } catch {}

  const firstCommitDate = gitOps.getFirstCommitDate(repoPath);
  const endDate = new Date();
  const dates = generateTimeDistribution(firstCommitDate, endDate, commitCount);

  const linesPerCommit = Math.floor(totalLines / commitCount);
  const extraLines = totalLines - (linesPerCommit * commitCount);

  onLog(`准备生成 ${commitCount} 个 commit，目标代码行数 ${totalLines}`);
  onLog(`每次 commit 约 ${linesPerCommit} 行，最后 ${extraLines} 行分配到最后几个 commit`);
  onLog(`时间范围：${firstCommitDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
  onLog('---');

  let completedCommits = 0;
  let generatedLines = 0;
  let dateIndex = 0;

  while (dateIndex < commitCount) {
    if (signal && signal.aborted) {
      onLog('⚠️ 用户中断，停止生成');
      break;
    }

    if (shouldCreateBranch()) {
      const branchCommitCount = Math.min(getBranchCommitCount(), commitCount - dateIndex);
      const branchDates = dates.slice(dateIndex, dateIndex + branchCommitCount);

      onLog(`🔀 创建 feature 分支，提交 ${branchCommitCount} 次`);

      const branchResult = executeBranchWorkflow(
        repoPath,
        (repo, date) => {
          const result = performSingleCommit(repo, date, linesPerCommit);
          onLog(`  commit: ${result.message}`);
          generatedLines += linesPerCommit;
        },
        branchDates
      );

      onLog(`  分支 ${branchResult.branchName} 已合并并删除`);
      onLog(`---`);
      completedCommits += branchCommitCount;
      dateIndex += branchCommitCount;
    } else {
      const date = dates[dateIndex];
      const result = performSingleCommit(repoPath, date, linesPerCommit);
      onLog(`✅ [${completedCommits + 1}/${commitCount}] ${result.message} (${result.operation})`);
      generatedLines += linesPerCommit;
      completedCommits++;
      dateIndex++;
    }

    onProgress({
      completed: completedCommits,
      total: commitCount,
      lines: generatedLines,
      targetLines: totalLines
    });
  }

  if (extraLines > 0 && completedCommits >= commitCount) {
    const lastDate = dates[dates.length - 1] || new Date();
    const content = generateCodeLines(extraLines);
    const fp = path.join(repoPath, 'src', 'extra.js');
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.appendFileSync(fp, content, 'utf-8');
    gitOps.addAll(repoPath);
    const msg = generateCommitMessage();
    gitOps.commitWithDate(msg, lastDate, repoPath);
    onLog(`✅ 补齐 ${extraLines} 行`);
    generatedLines += extraLines;
  }

  let actualCommits = completedCommits;
  let actualLines = generatedLines;
  let changedFiles = [];
  if (beforeHead) {
    try {
      const countStr = gitOps.getCommitCountSince(beforeHead, repoPath);
      const parsed = parseInt(countStr, 10);
      if (!isNaN(parsed) && parsed > 0) actualCommits = parsed;
    } catch {}
    try {
      const stat = gitOps.getDiffShortStat(beforeHead, repoPath);
      const m = stat.match(/(\d+) insertion/);
      if (m) actualLines = parseInt(m[1], 10);
    } catch {}
    try {
      changedFiles = gitOps.getChangedFilesSince(beforeHead, repoPath);
    } catch {}
  }

  onLog('---');
  onLog(`📊 本次增量: ${actualCommits} commit · ${actualLines} 行 · ${changedFiles.length} 文件`);
  if (changedFiles.length > 0) {
    const preview = changedFiles.slice(0, 5).join(', ') + (changedFiles.length > 5 ? ` ...等${changedFiles.length}个文件` : '');
    onLog(`   变更: ${preview}`);
  }
  onLog('💡 请确认增量统计，满意后点击「推送到远端」');

  return { completedCommits, generatedLines, actualCommits, actualLines, changedFiles, beforeHead, targetCommits: commitCount, targetLines: totalLines };
}

module.exports = { run };
