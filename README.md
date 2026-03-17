<!-- README.md -->

<div align="center">

**🌐 其他语言版本:** [English](README.en.md) | [中文](README.md)

</div>

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

## 🔗 URI 快捷捕获 — 从任何地方记 Memo

通过 `obsidian://memo` URL 可以从 Obsidian 外部一键创建 memo：

```
obsidian://memo?content=你的想法&tags=idea,work
```

| 参数 | 必填 | 说明 |
|------|:----:|------|
| `content`（或 `text`） | ✅ | Memo 正文内容 |
| `tags` | ❌ | 逗号分隔的标签 |
| `mood` | ❌ | 心情 emoji（如 `🤔`） |
| `source` | ❌ | 来源标记（如 `kindle`、`web`） |

### 📱 iOS 快捷指令配置（手把手教程）

配好之后可以用 Siri 语音记录、主屏幕按钮、Apple Watch 一键创建 memo。

**方法一：文字输入（最常用）**

1. 打开 iPhone 上的 **快捷指令** app
2. 点右上角 **+** 创建新快捷指令
3. 添加操作：**要求输入**
   - 问题填：`记点什么？`
   - 输入类型选：**文本**
4. 添加操作：**打开 URL**
   - URL 填：`obsidian://memo?content=[要求输入的结果]`
   - （点击输入框，选择第 3 步的变量）
5. 给快捷指令起名，比如 "Quick Memo"
6. 点 **完成**

现在你可以：
- 说 **"嘿 Siri，Quick Memo"** → 输入或口述 → 自动保存
- 把它添加到 **主屏幕** 当按钮用
- 在 **Apple Watch** 上运行

**方法二：带固定标签**

和上面一样，只是把第 4 步的 URL 改成：

```
obsidian://memo?content=[要求输入的结果]&tags=quick
```

这样每条 memo 会自动带上 `#quick` 标签。

**方法三：保存剪贴板内容**

1. 添加操作：**获取剪贴板**
2. 添加操作：**打开 URL**
   - URL：`obsidian://memo?content=[剪贴板]`

适合把其他 app 里复制的文字快速存为 memo。

**方法四：保存 Safari 当前网页**

1. 创建新快捷指令，设为 **共享表单**（接受 URL）
2. 添加操作：**获取 Safari 网页的详细信息** → 获取 **名称**（标题）
3. 添加操作：**打开 URL**
   - URL：`obsidian://memo?content=[名称] - [快捷指令输入]&tags=web`

在 Safari 里点 **分享 → Quick Memo** 就能把网页标题和链接存成 memo。

### 🖥️ Alfred / Raycast（macOS）

**Alfred 工作流：**
1. 新建 Workflow，添加 **Keyword** 触发器（如 `memo`）
2. 连接到 **Open URL** 操作
3. URL 填：`obsidian://memo?content={query}`

**Raycast：**
1. 创建一个 Quicklink
2. URL：`obsidian://memo?content={Query}&tags=quick`

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

## 📥 从 Flomo 导入

支持一键导入 Flomo 导出的全部笔记，无缝迁移到 Obsidian Memos。

### 步骤

1. **从 Flomo 导出数据**：打开 Flomo → 设置 → 账号详情 → 导出，下载得到一个 `.zip` 文件
2. **解压 zip**：里面有一个 `.html` 文件（包含所有笔记）和一个 `file/` 文件夹（包含图片）
3. **导入笔记**：在 Obsidian 中打开 **设置 → Quick Memos → Import → Choose HTML file**，选择解压出来的 `.html` 文件
4. **导入图片**（可选）：把解压出来的 `file/` 文件夹里的图片复制到你的 vault 中（放在附件文件夹即可），memo 中的图片引用会自动生效

### 导入效果

每条 Flomo 笔记会转换为一个独立的 `.md` 文件：

```yaml
---
created: 2024-01-15T14:30:22.000Z
type: memo
tags:
  - 读书
  - 想法
status: active
source: "flomo"
---

今天读了一段很有启发的话 #读书 #想法
```

### 特点

- **保留原始时间** — 使用 Flomo 的记录时间，不是导入时间
- **保留标签** — 从内容中自动提取 `#标签` 写入 frontmatter
- **自动标记来源** — `source: "flomo"`，方便用 Dataview 区分哪些是从 Flomo 迁移来的
- **防重复导入** — 同一个 HTML 文件多次导入不会产生重复
- **图片引用** — 自动转换为 `![[图片名]]` 格式

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
