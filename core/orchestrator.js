const { performFileOperation, reset: resetFiles } = require('./file-ops');
const { generateCodeLines } = require('./random-code');
const { generateCommitMessage } = require('./commit-message');
const { generateTimeDistribution } = require('./time-distribution');
const { shouldCreateBranch, getBranchCommitCount, executeBranchWorkflow } = require('./branch-manager');
const gitOps = require('./git-ops');
const fs = require('fs');
const path = require('path');

/**
 * 根据权重随机选择文件操作类型
 */
function pickOperation() {
  const rand = Math.random();
  if (rand < 0.60) return 'append';   // 60% 追加
  if (rand < 0.80) return 'create';   // 20% 创建
  if (rand < 0.90) return 'modify';   // 10% 修改
  return 'delete';                     // 10% 删除
}

/**
 * 执行单次 commit（用于直接在主分支上提交）
 * @param {string} repoRoot - 仓库根目录
 * @param {Date} date - commit 时间
 * @param {number} linesPerCommit - 每次 commit 的行数
 */
function performSingleCommit(repoRoot, date, linesPerCommit) {
  const operation = pickOperation();
  const result = performFileOperation(repoRoot, operation);

  if (result.operation === 'delete' && result.filePath === null) {
    // 如果没有文件可删除，改为追加
    performFileOperation(repoRoot, 'append');
  }

  gitOps.addAll(repoRoot);
  const msg = generateCommitMessage();
  gitOps.commitWithDate(msg, date, repoRoot);

  return { message: msg, operation: result.operation, filePath: result.filePath };
}

/**
 * 主编排流程
 * @param {Object} options
 * @param {string} options.repoPath - 仓库路径
 * @param {number} options.commitCount - 提交次数
 * @param {number} options.totalLines - 代码总行数
 * @param {Function} options.onLog - 日志回调
 * @param {Function} options.onProgress - 进度回调
 * @param {AbortSignal} options.signal - 中断信号
 */
async function run({ repoPath, commitCount, totalLines, onLog, onProgress, signal }) {
  // 验证仓库
  if (!gitOps.isGitRepo(repoPath)) {
    throw new Error(`${repoPath} 不是一个 git 仓库`);
  }

  resetFiles();

  // 计算时间分布
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

    // 决定是否创建 feature 分支
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
      // 直接在主分支上提交
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

  // 最后几个 commit 补齐余数
  if (extraLines > 0 && completedCommits >= commitCount) {
    const lastDate = dates[dates.length - 1] || new Date();
    for (let i = 0; i < extraLines; i++) {
      performFileOperation(repoPath, 'append');
    }
    gitOps.addAll(repoPath);
    const msg = generateCommitMessage();
    gitOps.commitWithDate(msg, lastDate, repoPath);
    onLog(`✅ 补齐 ${extraLines} 行`);
  }

  onLog('---');
  onLog('📤 尝试 push 到远端...');
  try {
    gitOps.push(repoPath);
    onLog('✅ push 成功');
  } catch (e) {
    onLog(`⚠️ push 失败：${e.message}（本地 commit 已完成）`);
  }

  return { completedCommits, generatedLines };
}

module.exports = { run };
