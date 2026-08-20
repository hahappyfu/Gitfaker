# GitFaker Bug 修复与交互改进设计

## 背景

用户在 `D:\Doc\oafakepoc` 仓库设置 1 commit / 2 行，实际生成统计显示 56 commit / 1.4M 行，排查发现：

1. `file-ops.js` 硬编码随机行数，忽略 `linesPerCommit`，导致实际行数远超目标
2. 终端统计用 `git rev-list --count HEAD` 总量对比目标增量，误导性显示
3. 自动 `push` 无确认，存在误推送风险
4. 生成文件变更集中在单一 `md` 文档，真实感不足

## 目标

- 实际生成行数贴近用户目标值（误差 ±1 行内）
- 生成后展示**增量**统计（本次新增 commit / 行数 / 文件），而非总量
- `push` 改为手动确认，独立按钮
- 文件变更按 70% 源码 / 20% 配置 / 10% 文档混合分布

## 非目标

- 不改时间分布、分支策略、commit message 生成逻辑
- 不引入新的文件类型或语言

## 方案

### 1. file-ops 行数修复

- `performFileOperation(repoRoot, operation, linesPerCommit)` 新增 `linesPerCommit` 参数
- `createNewFile(repoRoot, lineCount)` / `appendToFile(repoRoot, lineCount)` 接收精确行数，直接传给 `generateCodeLines(lineCount)`
- `modifyFile` 保持 1-3 行修改（属于行内改动，不按总量计）
- `delete` 不产生行数
- `orchestrator.performSingleCommit` 透传 `linesPerCommit` 给 `performFileOperation`
- 余数 `extraLines` 逻辑保留，按精确行数追加

### 2. 增量统计与预览

- `orchestrator` 记录生成前的 `HEAD`（`beforeHead`），生成后统计增量：
  - `actualCommits = git rev-list --count beforeHead..HEAD`
  - `actualLines = git diff --shortstat beforeHead..HEAD` 解析 insertions
  - `changedFiles = git diff --name-only beforeHead..HEAD`
- 返回值新增 `actualCommits` / `actualLines` / `changedFiles`
- `main.js` 透传增量数据到 renderer
- `renderer` 在终端区追加对比卡片：
  ```
  ── 本次生成统计 ──
  目标: 1 commit · 2 行
  实际: 1 commit · 2 行 · 1 文件
  变更: src/handlers/auth.js (+2)
  ```

### 3. 手动 Push

- 移除 `orchestrator` 末尾的自动 `checkout` + `push`
- `git-ops.push` 保留，新增 IPC `push-to-remote` 通道
- `renderer/index.html` 新增「推送到远端」按钮，默认禁用，生成完成后启用
- 点击后 `main.js` 执行 `getDefaultBranch` → `checkout` → `push`，结果回显到终端
- 未 push 前可继续生成（增量累积），push 按钮文案显示待推送 commit 数

### 4. 文件变更混合分布

- `FILE_TYPES` 按三类分组：
  - 源码 70%：`{ext:'.js',dir:'src'}` / `.ts` / `.py` / `.go` / `.java`
  - 配置 20%：`.json` / `.yaml`（`config/`）
  - 文档 10%：`.md`（`docs/`）/ `.css` / `.html`
- `getRandomFilePath` 按权重随机选组，再在组内随机选类型
- 保持现有 `FILE_NAMES` 随机文件名逻辑

## 数据流

```
用户输入 commitCount/totalLines
  → orchestrator 计算 linesPerCommit，记录 beforeHead
  → 循环 performSingleCommit(linesPerCommit) → file-ops 按精确行数生成
  → 统计增量 actualCommits/actualLines/changedFiles
  → 返回给 main.js → renderer 展示对比卡片 + 启用 push 按钮
  → 用户点击 push → IPC push-to-remote → git checkout + push → 回显结果
```

## 错误处理

- `beforeHead` 获取失败（如空仓库）则退化为内部计数 `completedCommits / generatedLines`
- `push` 失败回显错误信息，不影响本地 commit
- `getDefaultBranch` 失败回退到 `main` / `master`

## 验证

- 复现脚本：1 commit / 2 行场景，断言 `actualCommits === 1` 且 `实际行数 === 2`
- 混合分布：生成 20 次，统计三类文件占比接近 70/20/10
- 手动 push：生成后不自动 push，点击按钮后才 push，重复点击幂等
