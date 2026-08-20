const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Windows 下自动查找 git 路径
function getGitPath() {
  if (process.platform !== 'win32') return 'git';

  // 1. 优先用 where 命令（尊重 PATH，覆盖 Scoop / 自定义安装等）
  for (const cmd of ['where git', 'where.exe git']) {
    try {
      const out = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', shell: true }).trim();
      const first = out.split(/\r?\n/)[0].trim();
      if (first && fs.existsSync(first)) return `"${first}"`;
    } catch {}
  }

  // 2. 常见安装路径（含 Scoop、GitHub Desktop 等）
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const paths = [
    'C:\\Program Files\\Git\\bin\\git.exe',
    'C:\\Program Files (x86)\\Git\\bin\\git.exe',
    path.join(programFiles, 'Git', 'bin', 'git.exe'),
    path.join(programFilesX86, 'Git', 'bin', 'git.exe'),
    path.join(localAppData, 'Programs', 'Git', 'bin', 'git.exe'),
    path.join(localAppData, 'Git', 'bin', 'git.exe'),
    path.join(userProfile, 'scoop', 'shims', 'git.exe'),
    path.join(userProfile, 'scoop', 'apps', 'git', 'current', 'bin', 'git.exe'),
    path.join(userProfile, 'scoop', 'apps', 'git', 'current', 'cmd', 'git.exe'),
  ];
  // 去重
  const seen = new Set();
  for (const p of paths) {
    if (!p || seen.has(p)) continue;
    seen.add(p);
    try {
      if (fs.existsSync(p)) {
        console.log('Found git at:', p);
        return `"${p}"`;
      }
    } catch {}
  }
  console.log('No git found in standard paths, falling back to "git"');
  return 'git'; // fallback
}

const GIT = getGitPath();

/**
 * 在指定目录执行 git 命令
 * @param {string} command - git 子命令（不含 'git' 前缀）
 * @param {string} cwd - 工作目录
 * @returns {string} 命令输出
 */
function runGit(command, cwd) {
  return execSync(`${GIT} ${command}`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
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
  if (!date || isNaN(date.getTime())) {
    date = new Date();
  }
  const dateStr = date.toISOString();
  return execSync(`${GIT} commit -m "${message.replace(/"/g, '\\"')}"`, {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, GIT_AUTHOR_DATE: dateStr, GIT_COMMITTER_DATE: dateStr }
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
  const debugInfo = [];
  const extraCandidates = [];
  if (process.platform === 'win32') {
    try {
      const whereOut = execSync('where git', { encoding: 'utf-8', stdio: 'pipe', shell: true }).trim();
      const first = whereOut.split(/\r?\n/)[0].trim();
      if (first) extraCandidates.push(`"${first}" --version`);
    } catch (e) {
      debugInfo.push(`❌ where git: ${e.message.split('\n')[0]}`);
    }
  }
  const commands = process.platform === 'win32'
    ? [`${GIT} --version`, ...extraCandidates, 'git.exe --version', 'git --version']
    : ['git --version'];
  // 去重
  const seen = new Set();
  const deduped = commands.filter(c => { if (seen.has(c)) return false; seen.add(c); return true; });
  for (const cmd of deduped) {
    try {
      const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', shell: true });
      debugInfo.push(`✅ ${cmd}: ${result.trim()}`);
      return true;
    } catch (e) {
      debugInfo.push(`❌ ${cmd}: ${e.message.split('\n')[0]}`);
    }
  }
  console.error('Git detection debug:', debugInfo.join('\n'));
  return false;
}

/**
 * 获取仓库的初始 commit 日期
 */
function getFirstCommitDate(cwd) {
  try {
    const output = runGit('log --reverse --format=%ai --diff-filter=A HEAD', cwd);
    const firstLine = output.split('\n')[0].trim();
    if (firstLine) {
      const date = new Date(firstLine);
      if (!isNaN(date.getTime())) return date;
    }
  } catch {}
  // fallback: 7 天前
  const fallback = new Date();
  fallback.setDate(fallback.getDate() - 7);
  return fallback;
}

/**
 * 获取当前 HEAD commit
 */
function getHeadCommit(cwd) {
  return runGit('rev-parse HEAD', cwd);
}

/**
 * 统计自 since 之后的 commit 数
 */
function getCommitCountSince(since, cwd) {
  return runGit(`rev-list --count ${since}..HEAD`, cwd);
}

/**
 * 统计自 since 之后的 diff 概览
 */
function getDiffShortStat(since, cwd) {
  return runGit(`diff --shortstat ${since}..HEAD`, cwd);
}

/**
 * 获取自 since 之后变更的文件列表
 */
function getChangedFilesSince(since, cwd) {
  const out = runGit(`diff --name-only ${since}..HEAD`, cwd);
  return out ? out.split('\n').filter(Boolean) : [];
}

/**
 * 获取默认分支名（main 或 master）
 */
function getDefaultBranch(cwd) {
  try {
    // 尝试从 remote HEAD 获取
    const ref = runGit('symbolic-ref refs/remotes/origin/HEAD', cwd);
    return ref.replace('refs/remotes/origin/', '');
  } catch {
    // 检查 main 是否存在
    try {
      runGit('rev-parse --verify main', cwd);
      return 'main';
    } catch {
      return 'master';
    }
  }
}

/**
 * 获取当前分支名
 */
function getCurrentBranch(cwd) {
  return runGit('rev-parse --abbrev-ref HEAD', cwd);
}

module.exports = {
  runGit, addAll, commit, commitWithDate, createBranch, checkout,
  merge, deleteBranch, push, isGitRepo, getFirstCommitDate, checkGitAvailable,
  getCurrentBranch, getDefaultBranch,
  getHeadCommit, getCommitCountSince, getDiffShortStat, getChangedFilesSince
};
