// 拟真 commit message 生成器
// 使用 conventional commits 风格 (feat/fix/refactor/docs 等)

const prefixes = [
  { prefix: 'feat', weight: 25 },
  { prefix: 'fix', weight: 20 },
  { prefix: 'refactor', weight: 15 },
  { prefix: 'chore', weight: 10 },
  { prefix: 'docs', weight: 8 },
  { prefix: 'style', weight: 5 },
  { prefix: 'perf', weight: 7 },
  { prefix: 'test', weight: 5 },
  { prefix: 'ci', weight: 3 },
  { prefix: 'build', weight: 2 },
];

const actions = {
  feat: [
    'add {module} module', 'implement {feature}', 'introduce {feature}',
    'add support for {feature}', 'create {module} component',
    'add {feature} to {module}', 'implement {feature} handler',
  ],
  fix: [
    'resolve {issue} in {module}', 'fix {issue}', 'patch {issue} issue',
    'correct {issue} behavior', 'fix race condition in {module}',
    'handle edge case in {module}', 'fix null pointer in {module}',
  ],
  refactor: [
    'improve {module} structure', 'simplify {module} logic',
    'extract {module} utility', 'clean up {module}',
    'reorganize {module} code', 'optimize {module} performance',
  ],
  chore: [
    'update dependencies', 'configure build pipeline', 'update gitignore',
    'add editorconfig', 'clean up dead code', 'remove unused imports',
  ],
  docs: [
    'update README', 'add API documentation', 'document {module} module',
    'add usage examples', 'update changelog',
  ],
  style: [
    'format {module} code', 'fix indentation', 'normalize line endings',
    'apply consistent styling',
  ],
  perf: [
    'optimize {module} rendering', 'cache {module} results',
    'reduce memory usage in {module}', 'speed up {module} queries',
  ],
  test: [
    'add tests for {module}', 'add integration tests',
    'improve test coverage for {module}', 'fix flaky test in {module}',
  ],
  ci: [
    'update CI pipeline', 'add deployment step', 'fix CI configuration',
  ],
  build: [
    'update build config', 'add build script', 'configure bundler',
  ],
};

const modules = [
  'auth', 'user', 'data', 'api', 'config', 'cache', 'router',
  'middleware', 'validator', 'transformer', 'parser', 'logger',
  'database', 'queue', 'scheduler', 'handler', 'controller',
  'service', 'repository', 'model', 'view', 'component',
];

const features = [
  'search', 'filter', 'pagination', 'sorting', 'export',
  'import', 'backup', 'restore', 'retry logic', 'caching layer',
  'rate limiting', 'request throttling', 'batch processing',
  'real-time updates', 'webhook support',
];

const issues = [
  'memory leak', 'timeout', 'null reference', 'buffer overflow',
  'connection leak', 'race condition', 'deadlock', 'overflow',
  'type mismatch', 'validation error',
];

function pickWeighted(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.prefix;
  }
  return items[0].prefix;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function fillTemplate(template) {
  return template
    .replace('{module}', pick(modules))
    .replace('{feature}', pick(features))
    .replace('{issue}', pick(issues));
}

/**
 * 生成一条拟真的 commit message
 * @returns {string} commit message
 */
function generateCommitMessage() {
  const prefix = pickWeighted(prefixes);
  const templates = actions[prefix];
  const template = pick(templates);
  return `${prefix}: ${fillTemplate(template)}`;
}

module.exports = { generateCommitMessage };
