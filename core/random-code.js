// 随机代码片段生成器
// 每次调用生成一行看起来像真实代码的内容

const snippets = [
  // JavaScript
  () => `const ${randomVar()} = ${randomValue()};`,
  () => `let ${randomVar()} = ${randomValue()};`,
  () => `function ${randomFuncName()}(${randomParams()}) {`,
  () => `  return ${randomVar()}.${randomMethod()};`,
  () => `}`,
  () => `if (${randomVar()} ${randomOp()} ${randomValue()}) {`,
  () => `  ${randomVar()}.${randomMethod()}(${randomValue()});`,
  () => `}`,
  () => `// ${randomComment()}`,
  () => `/* ${randomComment()} */`,
  () => `${randomVar()}.push(${randomValue()});`,
  () => `const ${randomVar()} = ${randomVar()}.filter(x => x !== null);`,
  () => `export default ${randomVar()};`,
  () => `import { ${randomFuncName()} } from './${randomFile()}';`,
  () => `console.log(${randomVar()});`,
  () => `${randomVar()}.map(item => item.${randomMethod()});`,
  () => `async function ${randomFuncName()}() {`,
  () => `  const data = await fetch('${randomUrl()}');`,
  () => `  return data.json();`,
  () => `}`,
  () => `class ${randomClassName()} {`,
  () => `  constructor(${randomParams()}) {`,
  () => `    this.${randomVar()} = ${randomVar()};`,
  () => `  }`,
  () => `  ${randomMethod()}() {`,
  () => `    return this.${randomVar()};`,
  () => `  }`,
  () => `}`,
  // Python
  () => `${randomVar()} = ${randomValue()}`,
  () => `def ${randomFuncName()}(${randomParams()}):`,
  () => `    return ${randomVar()}.${randomMethod()}()`,
  () => `class ${randomClassName()}:`,
  () => `    def __init__(self, ${randomParams()}):`,
  () => `        self.${randomVar()} = ${randomVar()}`,
  () => `if ${randomVar()} ${randomOp()} ${randomValue()}:`,
  () => `    ${randomVar()}.${randomMethod()}()`,
  () => `# ${randomComment()}`,
  () => `for ${randomVar()} in ${randomVar()}:`,
  () => `    ${randomVar()}.${randomMethod()}(${randomValue()})`,
  // 通用
  () => `  // TODO: refactor this later`,
  () => `  ${randomVar()} = null;`,
  () => `  ${randomVar()} = undefined;`,
];

const vars = ['result', 'data', 'config', 'options', 'item', 'element', 'value', 'key',
  'handler', 'response', 'state', 'ctx', 'args', 'params', 'input', 'output',
  'buffer', 'cache', 'index', 'count', 'total', 'temp', 'current', 'next', 'prev'];

const funcs = ['processData', 'handleClick', 'validate', 'transform', 'parse',
  'serialize', 'fetch', 'update', 'initialize', 'cleanup', 'render', 'mount',
  'format', 'calculate', 'compare', 'merge', 'filter', 'reduce', 'map', 'find'];

const methods = ['toString', 'valueOf', 'then', 'catch', 'finally', 'push',
  'pop', 'shift', 'slice', 'splice', 'map', 'filter', 'reduce', 'find',
  'forEach', 'includes', 'indexOf', 'keys', 'values', 'entries', 'clone'];

const values = ['0', '1', '-1', 'true', 'false', 'null', 'undefined',
  "'string'", '"value"', '[]', '{}', 'new Date()', 'Date.now()', 'Math.random()',
  '""', "''", 'NaN', 'Infinity', "'utf-8'", "'json'", '100', '200', '255'];

const ops = ['===', '!==', '==', '!=', '>', '<', '>=', '<=', '&&', '||'];

const comments = [
  'handle edge case', 'fix memory leak', 'improve performance',
  'add error handling', 'refactor for clarity', 'temporary workaround',
  'bug fix: null check', 'optimize hot path', 'add logging',
  'resolve race condition', 'clean up unused code', 'implement caching',
];

const classes = ['UserService', 'EventHandler', 'ConfigManager', 'DataManager',
  'RequestHandler', 'ResponseBuilder', 'StateManager', 'CacheManager',
  'Logger', 'Validator', 'Transformer', 'QueryBuilder'];

const fileNames = ['utils', 'helpers', 'config', 'constants', 'types', 'api',
  'auth', 'database', 'cache', 'middleware', 'router', 'controller'];

const urls = ['/api/users', '/api/data', '/api/config', '/api/status',
  '/api/search', '/api/validate', '/health', '/metrics'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomVar() { return pick(vars); }
function randomFuncName() { return pick(funcs); }
function randomMethod() { return pick(methods); }
function randomValue() { return pick(values); }
function randomOp() { return pick(ops); }
function randomComment() { return pick(comments); }
function randomClassName() { return pick(classes); }
function randomFile() { return pick(fileNames); }
function randomUrl() { return pick(urls); }
function randomParams() {
  const count = Math.floor(Math.random() * 3) + 1;
  return Array.from({ length: count }, () => pick(vars)).join(', ');
}

/**
 * 生成指定行数的随机代码内容
 * @param {number} lines - 要生成的行数
 * @returns {string} 生成的代码内容
 */
function generateCodeLines(lines) {
  const result = [];
  for (let i = 0; i < lines; i++) {
    result.push(pick(snippets)());
  }
  return result.join('\n') + '\n';
}

module.exports = { generateCodeLines };
