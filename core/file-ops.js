const fs = require('fs');
const path = require('path');
const { generateCodeLines } = require('./random-code');

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

const FILE_NAMES = [
  'index', 'main', 'app', 'utils', 'helpers', 'config',
  'constants', 'types', 'api', 'auth', 'database', 'cache',
  'middleware', 'router', 'controller', 'service', 'model',
  'handler', 'validator', 'transformer', 'parser', 'logger',
  'test-utils', 'setup', 'teardown', 'fixtures', 'mocks',
];

const repoFiles = []; // 跟踪仓库中已创建的文件

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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

/**
 * 创建新文件
 * @param {string} repoRoot - 仓库根目录
 * @param {number} lineCount - 精确行数（可选，不传则随机 10-49）
 * @returns {string} 创建的文件路径
 */
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

/**
 * 追加内容到已有文件
 * @param {string} repoRoot - 仓库根目录
 * @param {number} lineCount - 精确行数（可选，不传则随机 3-22）
 * @returns {string} 修改的文件路径，如果没有可用文件则创建新文件
 */
function appendToFile(repoRoot, lineCount) {
  if (repoFiles.length === 0) return createNewFile(repoRoot, lineCount);
  const filePath = pick(repoFiles);
  const count = (typeof lineCount === 'number' && lineCount > 0) ? lineCount : Math.floor(Math.random() * 20) + 3;
  const content = generateCodeLines(count);
  fs.appendFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * 修改已有文件的部分内容
 * @param {string} repoRoot - 仓库根目录
 * @returns {string} 修改的文件路径
 */
function modifyFile(repoRoot) {
  if (repoFiles.length === 0) return createNewFile(repoRoot);
  const filePath = pick(repoFiles);
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  if (lines.length < 3) return appendToFile(repoRoot);
  // 随机修改 1-3 行
  const changeCount = Math.min(Math.floor(Math.random() * 3) + 1, lines.length);
  for (let i = 0; i < changeCount; i++) {
    const lineIndex = Math.floor(Math.random() * lines.length);
    lines[lineIndex] = generateCodeLines(1).trimEnd();
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
  return filePath;
}

/**
 * 删除一个随机文件
 * @param {string} repoRoot - 仓库根目录
 * @returns {string|null} 删除的文件路径，如果没有可删除的文件则返回 null
 */
function deleteRandomFile(repoRoot) {
  if (repoFiles.length === 0) return null;
  const index = Math.floor(Math.random() * repoFiles.length);
  const filePath = repoFiles[index];
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    repoFiles.splice(index, 1);
    return filePath;
  }
  repoFiles.splice(index, 1);
  return null;
}

/**
 * 根据操作类型执行文件操作
 * @param {string} repoRoot - 仓库根目录
 * @param {string} operation - 操作类型: 'create' | 'append' | 'modify' | 'delete'
 * @param {number} lineCount - 精确行数（可选）
 * @returns {{ operation: string, filePath: string|null }}
 */
function performFileOperation(repoRoot, operation, lineCount) {
  switch (operation) {
    case 'create':
      return { operation: 'create', filePath: createNewFile(repoRoot, lineCount) };
    case 'append':
      return { operation: 'append', filePath: appendToFile(repoRoot, lineCount) };
    case 'modify':
      return { operation: 'modify', filePath: modifyFile(repoRoot) };
    case 'delete':
      return { operation: 'delete', filePath: deleteRandomFile(repoRoot) };
    default:
      return { operation: 'append', filePath: appendToFile(repoRoot, lineCount) };
  }
}

/**
 * 重置文件跟踪（用于新仓库）
 */
function reset() {
  repoFiles.length = 0;
}

module.exports = {
  performFileOperation,
  createNewFile,
  appendToFile,
  modifyFile,
  deleteRandomFile,
  reset
};
