const gitOps = require('./git-ops');

// 分支名生成
const branchPrefixes = ['feature', 'fix', 'hotfix', 'chore', 'refactor'];
const branchTopics = [
  'auth', 'login', 'search', 'dashboard', 'api', 'config',
  'cache', 'validation', 'upload', 'export', 'notification',
  'settings', 'profile', 'admin', 'reports', 'analytics',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * 生成一个随机的分支名
 */
function generateBranchName() {
  return `${pick(branchPrefixes)}/${pick(branchTopics)}-${Date.now().toString(36)}`;
}

/**
 * 是否应该创建 feature 分支（30% 概率）
 */
function shouldCreateBranch() {
  return Math.random() < 0.3;
}

/**
 * 获取 feature 分支上应该提交的次数（1-3 次）
 */
function getBranchCommitCount() {
  return Math.floor(Math.random() * 3) + 1;
}

/**
 * 在 feature 分支上执行提交，然后合并回主分支
 * @param {string} repoRoot - 仓库根目录
 * @param {Function} commitFn - 执行单次提交的函数 (repoRoot, date) => void
 * @param {Date[]} dates - 本次分支提交的时间数组
 * @returns {{ branchName: string, commitCount: number }}
 */
function executeBranchWorkflow(repoRoot, commitFn, dates) {
  const branchName = generateBranchName();
  gitOps.createBranch(branchName, repoRoot);

  const commitCount = dates.length;
  for (let i = 0; i < commitCount; i++) {
    commitFn(repoRoot, dates[i]);
  }

  // 切回主分支并合并
  gitOps.checkout('main', repoRoot);
  gitOps.merge(branchName, repoRoot);
  gitOps.deleteBranch(branchName, repoRoot);

  return { branchName, commitCount };
}

module.exports = {
  generateBranchName,
  shouldCreateBranch,
  getBranchCommitCount,
  executeBranchWorkflow
};
