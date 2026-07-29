# GitFaker

批量生成拟真 git commit 的 Electron 桌面工具。

## 功能

- 输入目标仓库路径、提交次数、代码行数，一键生成
- 混合模式文件操作（追加 60% / 创建 20% / 修改 10% / 删除 10%）
- 拟真 commit message（feat/fix/refactor/docs 等 conventional commits 风格）
- 模拟分支开发（随机创建 feature 分支，提交后合并）
- 自然时间分布（工作日多、周末少）
- 精确控制代码总行数
- commit 完成后自动 push 到远端
- 实时日志输出 + 进度条

## 安装

需要 Node.js 16+

```bash
git clone https://gitee.com/fuhahah/gitfaker.git
cd gitfaker
npm install
```

## 使用

```bash
# 开发模式启动
npm start

# 打包成 Windows 安装包
npm run build
```

### 界面操作

1. 选择或输入 git 仓库路径
2. 设置提交次数和代码行数
3. 点击「开始生成」
4. 在右侧终端区域查看实时日志

## 技术栈

- Electron
- Node.js child_process（执行 git CLI）
- 原生 HTML/CSS/JS
- electron-builder（打包）

## 项目结构

```
gitfaker/
├── main.js              # Electron 主进程
├── preload.js           # IPC 桥接
├── core/
│   ├── orchestrator.js  # 编排器
│   ├── git-ops.js       # git 命令封装
│   ├── file-ops.js      # 文件操作
│   ├── random-code.js   # 随机代码生成
│   ├── commit-message.js # commit message 生成
│   ├── time-distribution.js # 时间分布
│   └── branch-manager.js    # 分支管理
└── renderer/
    ├── index.html       # UI 页面
    ├── style.css        # 样式
    └── app.js           # 前端逻辑
```

## 许可

MIT
