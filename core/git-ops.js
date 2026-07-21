const { execSync } = require('child_process');

/**
 * 在指定目录执行 git 命令
 * @param {string} command - git 子命令（不含 'git' 前缀）
 * @param {string} cwd - 工作目录
 * @returns {string} 命令输出
 */
function runGit(command, cwd) {
  return execSync(`git ${command}`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
}

/**
 * 添加所有变更
 */
function addAll(cwd) {
  return runGit('add -A', cwd);
}

/**
 * 创建 commit
 */
function commit(message, cwd) {
  return runGit(`commit -m "${message.replace(/"/g, '\\"')}"`, cwd);
}

/**
 * 创建分支
 */
function createBranch(branchName, cwd) {
  return runGit(`checkout -b ${branchName}`, cwd);
}

/**
 * 切换分支
 */
function checkout(branchName, cwd) {
  return runGit(`checkout ${branchName}`, cwd);
}

/**
 * 合并分支
 */
function merge(branchName, cwd) {
  return runGit(`merge ${branchName} --no-edit`, cwd);
}

/**
 * 删除本地分支
 */
function deleteBranch(branchName, cwd) {
  return runGit(`branch -d ${branchName}`, cwd);
}

/**
 * 设置 commit 时间戳（使用环境变量 GIT_AUTHOR_DATE 和 GIT_COMMITTER_DATE）
 */
function commitWithDate(message, date, cwd) {
  const dateStr = date.toISOString();
  const env = `GIT_AUTHOR_DATE="${dateStr}" GIT_COMMITTER_DATE="${dateStr}"`;
  return execSync(`${env} git commit -m "${message.replace(/"/g, '\\"')}"`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
}

/**
 * 推送到远端
 */
function push(cwd) {
  try {
    return runGit('push', cwd);
  } catch (e) {
    if (e.message && e.message.includes('does not have a remote')) {
      return null; // 没有配置 remote
    }
    throw e;
  }
}

/**
 * 检查是否是 git 仓库
 */
function isGitRepo(cwd) {
  try {
    const result = runGit('rev-parse --is-inside-work-tree', cwd);
    return result === 'true';
  } catch (e) {
    console.error('isGitRepo check failed:', e.message);
    return false;
  }
}

/**
 * 检查 git 是否可用
 */
function checkGitAvailable() {
  try {
    execSync('git --version', { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取仓库的初始 commit 日期
 */
function getFirstCommitDate(cwd) {
  try {
    const output = runGit('log --reverse --format=%ai --diff-filter=A HEAD | head -1', cwd);
    return new Date(output);
  } catch {
    return new Date();
  }
}

module.exports = {
  runGit, addAll, commit, commitWithDate, createBranch, checkout,
  merge, deleteBranch, push, isGitRepo, getFirstCommitDate, checkGitAvailable
};
