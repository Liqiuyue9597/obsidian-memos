# obsidian-memos 🧠

> **像 Flomo 一样快速记录** — 在 Obsidian 中即时捕获灵感，用卡片视图优雅回顾。

[![Latest Release](https://img.shields.io/github/release/Liqiuyue9597/obsidian-memos.svg)](https://github.com/Liqiuyue9597/obsidian-memos/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📖 项目介绍

**obsidian-memos** 是一个轻量级 Obsidian 插件，为你的笔记库带来 Flomo 式的快速记录体验。几秒钟记下想法，在卡片瀑布流中浏览，按标签筛选，用随机回顾重新发现遗忘的灵感。

### ✨ 为什么用它？

| 功能 | 说明 |
|------|------|
| ⚡ 快速捕获 | 一键弹出输入框，Ctrl+Enter 保存 |
| 🎴 卡片瀑布流 | 右侧边栏展示所有 memo，按日期分组 |
| 🏷️ 标签筛选 | 点击标签 pill 或 inline `#tag` 即可过滤 |
| 🎲 随机回顾 | 点击骰子图标，随机高亮一条旧 memo |
| 📱 移动端友好 | 适配虚拟键盘，支持 iOS Widget 快捷入口 |
| 🔒 本地优先 | 所有数据存在你的 vault，无需云端 |

---

## 📸 截图

> 🚧 **即将更新** — 截图将在下个版本添加。

<!-- TODO: 添加截图 -->
<!-- 
![快速捕获弹窗](screenshots/capture-modal.png)
*快速捕获弹窗 — 输入想法，添加标签，保存*

![卡片视图](screenshots/card-view.png)
*卡片视图 — 浏览所有 memo，按标签筛选*
-->

---

## 📦 安装

### 方式一：手动安装（开发者推荐）

```bash
# 克隆仓库
git clone https://github.com/Liqiuyue9597/obsidian-memos.git
cd obsidian-memos

# 安装依赖
npm install

# 构建插件
npm run build
```

然后软链接到你的 Obsidian 笔记库：

```bash
# macOS / Linux
ln -s /path/to/obsidian-memos /path/to/your-vault/.obsidian/plugins/obsidian-memos

# Windows（在 PowerShell 中以管理员身份运行）
New-Item -ItemType SymbolicLink -Path "C:\path\to\your-vault\.obsidian\plugins\obsidian-memos" -Target "C:\path\to\obsidian-memos"
```

在 Obsidian 中启用：**设置 → 社区插件 → 启用 "Quick Memos"**

### 方式二：使用 BRAT 插件

1. 在 Obsidian 中安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. 打开 BRAT → **Add a beta plugin**
3. 输入仓库 URL：`https://github.com/Liqiuyue9597/obsidian-memos`
4. 点击 **Add Plugin**

---

## 🚀 使用方法

| 操作 | 如何操作 |
|------|----------|
| 打开捕获弹窗 | 点击丝带图标 📝 或 `Ctrl/Cmd+P` → "Memos: Quick capture" |
| 保存 memo | `Ctrl+Enter` 或点击保存按钮 |
| 打开卡片视图 | `Ctrl/Cmd+P` → "Memos: Open Memos view" |
| 按标签筛选 | 点击任意标签 pill 或 inline `#tag` |
| 清除筛选 | 点击筛选栏的 × |
| 随机回顾 | 点击工具栏骰子图标 🎲 |
| 打开 memo 文件 | 点击卡片任意位置 |

### 📝 Memo 格式

Memo 保存为带 frontmatter 的标准 Markdown 文件：

```markdown
---
created: 2026-03-14T14:30:00.000+08:00
type: memo
tags:
  - idea
  - project
---

今天想到了一个很棒的插件功能！#excited #obsidian
```

- `type: memo` — 必需，用于识别 memo 文件
- `tags` — 自动从 frontmatter 和 inline 标签提取

---

## ⚙️ 设置

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 保存文件夹 | `00-Inbox` | memo 保存位置 |
| 使用固定标签 | `off` | 自动为每条 memo 添加标签 |
| 固定标签值 | _(空)_ | 自动添加的标签（不含 #） |
| 捕获笔记路径 | `Quick Capture.md` | iOS Widget 入口笔记 |

---

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 生产构建
npm run build
```

### 项目结构

```
obsidian-memos/
├── main.ts              # 插件核心
├── styles.css           # 样式
├── manifest.json        # 插件元数据
├── package.json         # 依赖与脚本
├── tsconfig.json        # TS 配置
└── esbuild.config.mjs   # 构建配置
```

---

## ❓ 常见问题

**Q: memo 保存在哪里？**  
**A:** 默认在 `00-Inbox/` 文件夹，可在设置中修改。

**Q: 手机上能用吗？**  
**A:** 可以！捕获弹窗会自动适配虚拟键盘。iOS 用户可设置 Widget 实现快速捕获。

**Q: 如何备份 memo？**  
**A:** Memo 是普通的 Markdown 文件，可用 Obsidian Sync、iCloud、Dropbox 或 Git 同步。

---

## 🤝 贡献

欢迎贡献！你可以：

- 🐛 报告 bug
- 💡 建议新功能
- 🔧 提交 PR
- 📝 改进文档

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 许可证

MIT 许可证 — 可自由使用、修改和分发，无需署名。

---

## 🙏 致谢

- 基于 [Obsidian](https://obsidian.md) 构建
- 灵感来自 [Flomo](https://flomoapp.com) — 捕捉灵感的艺术
- 与 AI 助手协作开发

---

<div align="center">

**Made with ❤️ by [@Liqiuyue9597](https://github.com/Liqiuyue9597)**

**如果觉得有用，请点个 Star ⭐！**

</div>
