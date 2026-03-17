# obsidian-memos 项目概览

## 简介

**obsidian-memos** 是一款仿 flomo 风格的 Obsidian 快速捕捉与卡片回顾插件，专为轻量级笔记场景设计，帮助用户无摩擦地记录灵感闪念，并通过可视化卡片界面进行组织与回顾。

- **仓库地址**: https://github.com/Liqiuyue9597/obsidian-memos
- **当前版本**: 1.3.0
- **许可证**: MIT
- **最低 Obsidian 版本**: 1.4.0
- **作者**: Liqiuyue9597

## 项目愿景

让 Obsidian 用户能够快速、无摩擦地捕捉灵感与想法，并通过卡片式界面配合标签过滤、热力图统计和随机回顾功能，实现间隔重复式学习与知识管理。

## 核心功能

### 1. 快速捕捉（CaptureItemView）
- 通过侧边栏图标或 Cmd/Ctrl+P 快捷键打开独立 Tab 视图
- 轻量级文本输入，支持可选标签字段（pill 式标签 UI）
- Ctrl+Enter 快速保存
- 移动端键盘自适应定位
- 插入图片 `![[image]]` 和笔记链接 `[[note]]`（Wikilink 自动补全弹窗）
- 可选心情 emoji 选择器（mood picker）
- 可选来源标记选择器（source picker）
- 错误处理与可视化提醒

### 2. 卡片瀑布流视图（MemosView）
- 侧边栏以卡片形式展示所有 memo
- 按日期分组排列（最新优先）
- 支持搜索与过滤（标签 + 日期双重过滤）
- 可点击的标签胶囊进行过滤
- 从 memo 内容中自动提取行内标签
- 内嵌图片渲染（`![[image.png]]` 直接显示）
- Wikilink 渲染（`[[note]]` 可点击跳转，支持 hover 预览）
- 右键菜单「Save as Memo」快速将选中文本保存为 memo

### 3. 标签系统
- **行内标签**: 从 memo 文本中提取 `#标签`（支持中日韩字符）
- **固定标签**: 可配置为每条 memo 自动添加指定标签
- **标签过滤**: 点击标签胶囊即可按标签过滤视图
- **Pill 式标签输入**: 捕获界面中以 pill 形式添加/删除标签，支持 IME 输入法
- 完整支持拉丁文、中文、日文、韩文字符

### 4. 统计与热力图（Stats）
- GitHub 风格热力图，展示过去 17 周的 memo 活跃度
- 5 级颜色深度（0/1/2-3/4-6/7+）
- 点击热力图单元格按日期过滤
- 统计面板：总计、连续天数、今日、本月
- 可折叠统计区域，状态持久化
- 支持亮色/暗色主题

### 5. 随机回顾
- 骰子按钮随机高亮一条 memo，带脉冲动画效果
- 支持间隔重复式学习工作流
- 快速翻阅被遗忘的笔记

### 6. 图片导出（Export Image）
- 将单条 memo 导出为精美 PNG 卡片图
- Canvas 2D 直接绘制（无 DOM 序列化、无 foreignObject）
- 支持亮色/暗色主题自动适配
- 可选作者签名和品牌水印
- 导出预览弹窗，支持 Save as PNG / Copy to clipboard
- 移动端通过 Web Share API 分享，降级保存到 vault

### 7. Canvas 导出
- 将当前筛选后的 memo 集合导出为 Obsidian Canvas 文件
- 按首标签分组排列为列式布局
- 自动创建/覆盖 Canvas 文件并打开

### 8. Flomo 导入
- 从 Flomo 导出的 HTML 文件中解析 memo
- HTML → Markdown 转换（段落、列表、引用）
- 保留原始时间戳
- 自动提取标签和图片引用
- 重复导入自动跳过（基于文件名去重）
- source 字段标记为 "flomo"

### 9. Memo 嵌入（Transclusion）
- `![[memo-xxx]]` 嵌入自动应用卡片样式
- CSS 属性选择器 + PostProcessor + MutationObserver 三层检测
- 支持命名规范匹配和 frontmatter 类型检测

### 10. URI Handler
- `obsidian://memo?content=...&tags=...` 外部快速创建 memo
- 支持 content/text、tags、mood、source 参数
- 适配 iOS 快捷指令、Alfred、Raycast 等工具

### 11. iOS Widget 集成
- 配置入口笔记路径（Quick Capture.md）
- 打开入口笔记自动触发捕获视图
- 命令创建入口笔记

## 技术栈

| 组件 | 技术选型 |
|------|---------|
| **开发语言** | TypeScript（ES2018 目标） |
| **构建工具** | esbuild |
| **运行时** | Obsidian API（最新版） |
| **样式** | CSS（1264 行） |
| **包管理** | npm |
| **测试框架** | Vitest |
| **像素比** | 2x（图片导出） |

## 架构设计

### 模块化架构
项目采用多文件模块化结构，通过 `src/main.ts` 作为入口，各模块职责清晰分离。

### 核心模块

#### `plugin.ts` — MemosPlugin（262 行）
继承 `Plugin`，是插件的核心协调器：
- 插件生命周期管理（onload/onunload）
- 设置持久化（loadSettings/saveSettings）
- 视图注册与激活（MemosView + CaptureItemView）
- Memo 文件创建（含 YAML frontmatter + mood/source/status 扩展字段）
- 快捷键与侧边栏图标注册
- URI 协议处理（`obsidian://memo`）
- 右键菜单「Save as Memo」
- Transclusion 样式标记（PostProcessor + MutationObserver）
- iOS 入口笔记监听

#### `view.ts` — MemosView（504 行）
继承 `ItemView`，侧边栏卡片视图：
- 从配置文件夹加载并解析全部 memo
- 按日期分组排列卡片
- 标签 + 日期双重过滤
- 内嵌图片渲染和 Wikilink 渲染（含 hover 预览）
- 统计热力图和统计面板
- 随机回顾功能（带脉冲动画）
- Canvas 导出入口
- 防抖刷新（300ms）

#### `capture-view.ts` — CaptureItemView（397 行）
继承 `ItemView`，全屏捕获视图（替代原 Modal 方案，解决移动端键盘问题）：
- Textarea 文本输入
- Pill 式标签 UI（添加/删除/IME 输入法兼容）
- 图片选择弹窗（ImageSuggestModal）
- 笔记链接弹窗（NoteSuggestModal）— 输入 `[[` 自动触发
- 心情选择器 + 来源选择器（可选）
- Ctrl+Enter 快捷保存

#### `export-image.ts` — 图片导出（573 行）
Canvas 2D 绘制的 PNG 图片生成系统：
- 解析内容为文本段落（支持 #tag 颜色区分）
- 字符级自动换行（CJK 友好）
- 两遍渲染：测量高度 → 绘制内容
- 亮色/暗色双主题（硬编码颜色，保证输出一致性）
- DOM 预览卡片（ExportModal 弹窗中使用）
- 移动端 Web Share API + vault 降级保存

#### `canvas-export.ts` — Canvas 文件导出（98 行）
将 memo 集合导出为 Obsidian Canvas JSON 格式：
- 按首标签分组形成列式布局
- 创建/覆盖 Canvas 文件并自动打开

#### `flomo-import.ts` — Flomo 导入（187 行）
解析 Flomo HTML 导出文件，批量转换为 memo：
- DOMParser 解析 HTML 结构（.memo > .time + .content + .files）
- HTML → Markdown 转换（p/ul/ol/blockquote）
- 图片引用提取（`![[filename]]`）
- 时间戳保留，自动提取行内标签
- 文件名去重防止重复导入

#### `stats.ts` — 统计系统（210 行）
纯函数式统计计算与热力图渲染：
- `computeStats()` — 计算总计/连续天数/今日/本月
- `computeStreak()` — 连续签到天数算法
- `renderHeatmap()` — GitHub 风格 7×17 热力图（CSS Grid）
- `renderStatsSection()` — 可折叠统计面板
- `getLevel()` — 5 级颜色映射

#### `settings.ts` — 设置面板（226 行）
继承 `PluginSettingTab`：
- 保存文件夹、固定标签、入口笔记路径
- 扩展元数据开关（mood/source）及选项配置
- 图片导出设置（作者名、品牌水印）
- Flomo 导入按钮（HTML 文件选择 + 导入逻辑调用）

#### `memo-parser.ts` — Memo 解析器（40 行）
纯函数式 memo 内容解析：
- 剥离 YAML frontmatter
- 合并 frontmatter tags + inline #tags
- 支持 MetadataCache offset 精确定位

#### `types.ts` — 类型定义（49 行）
- `MemoNote` — memo 数据模型（file, content, tags, created, dateLabel, mood, source）
- `MemoStats` — 统计数据模型（total, streak, today, thisMonth, dailyCounts）
- `MemosSettings` — 设置接口与默认值

#### `utils.ts` — 工具函数（30 行）
- `extractInlineTags()` — 从文本提取 `#tag`，支持 CJK
- `escapeHtmlAttr()` — XSS 安全的 HTML 属性转义
- `parseTags()` — 解析用户输入的标签字符串（支持中文逗号分隔）

#### `constants.ts` — 常量定义（8 行）
- `VIEW_TYPE_MEMOS` / `VIEW_TYPE_CAPTURE` — 视图类型标识
- `INLINE_TAG_RE` — 共享标签正则（覆盖拉丁文 + 中日韩）
- `WIKILINK_RE` — Wikilink 匹配正则

## 数据模型

### Memo 文件格式
Memo 以标准 Markdown 文件存储，包含 YAML frontmatter：

```markdown
---
created: 2026-03-14T14:30:00.000Z
type: memo
tags:
  - 想法
  - 项目
mood: "💡"
source: "kindle"
status: active
---

今天有个新功能的好想法。#兴奋
```

### 扩展字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `created` | ISO 8601 | 创建时间 |
| `type` | `"memo"` | 文件类型标识（必需） |
| `tags` | string[] | 标签列表 |
| `mood` | string | 心情 emoji（可选） |
| `source` | string | 来源标记（可选） |
| `status` | `"active"` | 状态（默认 active） |

## 用户可配置项

| 设置项 | 默认值 | 说明 |
|--------|-------|------|
| 保存文件夹 | `00-Inbox` | 新 memo 的保存目录 |
| 启用固定标签 | 关闭 | 是否为每条 memo 自动添加标签 |
| 固定标签值 | （空） | 自动添加的标签（不含 `#` 前缀） |
| 入口笔记路径 | `Quick Capture.md` | iOS 小组件触发捕捉弹窗的入口文件 |
| 统计面板折叠 | 关闭 | 是否默认折叠统计面板 |
| 启用心情 | 关闭 | 捕获时显示心情 emoji 选择器 |
| 心情选项 | 💡, 🤔, 😊, 😤, 📖 | 可自定义的心情 emoji 列表 |
| 启用来源 | 关闭 | 捕获时显示来源选择器 |
| 来源选项 | thought, kindle, web, conversation, podcast | 可自定义的来源标签列表 |
| 显示作者名 | 关闭 | 导出图片时显示作者名 |
| 作者名 | （空） | 导出图片上的作者签名 |
| 显示品牌 | 开启 | 导出图片显示 "Quick Memos for Obsidian" |

## 开发规范

### 代码质量
- TypeScript 严格模式
- XSS 防护（HTML 转义 + 纯 DOM API 构建内容）
- 中日韩字符标签提取支持
- 性能防抖（300ms）
- Memo 保存错误处理
- 移动端键盘自适应（ItemView 方案替代 Modal）
- macOS 快捷键适配显示
- IME 输入法兼容（compositionstart/compositionend）

### 测试覆盖
- `utils.test.ts` — extractInlineTags、escapeHtmlAttr、parseTags
- `memo-parser.test.ts` — parseMemoContent
- `stats.test.ts` — computeStats、computeStreak、getLevel
- 测试框架：Vitest，运行命令 `npm run test`

### 近期质量改进（详见 start.md）
- 修复标签渲染中的 XSS 漏洞
- 修复文件夹路径匹配 bug（改用 `folder + "/"` 前缀匹配）
- 添加防抖以避免性能问题
- 统一本地时间处理，防止冲突
- 扩展标签正则以支持中日韩字符
- 添加中文逗号分隔标签支持
- 从单文件架构重构为模块化多文件架构
- 添加 Vitest 单元测试
- CaptureModal 重构为 CaptureItemView 解决移动端键盘问题

## 构建与开发

```bash
npm run dev      # 开发模式（带 source map 的监听模式）
npm run build    # 生产构建（启用 tree-shaking）
npm run test     # 运行 Vitest 单元测试
```

## 项目结构

```
obsidian-memos/
├── src/
│   ├── main.ts              # 入口文件（re-export plugin）
│   ├── plugin.ts            # 插件核心协调器（262 行）
│   ├── view.ts              # 卡片瀑布流视图（504 行）
│   ├── capture-view.ts      # 快速捕获视图（397 行）
│   ├── export-image.ts      # PNG 图片导出（573 行）
│   ├── canvas-export.ts     # Canvas 文件导出（98 行）
│   ├── flomo-import.ts      # Flomo HTML 导入（187 行）
│   ├── stats.ts             # 统计与热力图（210 行）
│   ├── settings.ts          # 设置面板（226 行）
│   ├── memo-parser.ts       # Memo 内容解析（40 行）
│   ├── types.ts             # 类型定义与默认值（49 行）
│   ├── utils.ts             # 工具函数（30 行）
│   └── constants.ts         # 常量定义（8 行）
├── tests/
│   ├── __mocks__/           # Obsidian API mock
│   ├── utils.test.ts        # 工具函数测试（119 行）
│   ├── memo-parser.test.ts  # Memo 解析器测试（126 行）
│   └── stats.test.ts        # 统计函数测试（276 行）
├── styles.css               # UI 样式（1264 行）
├── main.js                  # 构建产物
├── manifest.json            # 插件元数据
├── package.json             # 依赖与脚本
├── tsconfig.json            # TypeScript 配置
├── esbuild.config.mjs       # 构建配置（45 行）
├── vitest.config.ts         # Vitest 测试配置
├── README.md                # 用户文档（中文，默认）
├── README.en.md             # 用户文档（英文）
├── start.md                 # 代码审查指南
├── versions.json            # 版本兼容性
└── openspec/                # OpenSpec 工作流目录
    ├── config.yaml          # OpenSpec 配置
    ├── project.md           # 项目概览（本文件）
    ├── changes/             # 变更规格文档
    ├── specs/               # 功能规格文档
    └── archive/             # 已归档的变更
```

## 关键指标

- **源代码总量**: 2585 行（src/ 目录，13 个模块）
- **样式代码**: 1264 行（styles.css）
- **测试代码**: 521 行（3 个测试文件）
- **构建配置**: 45 行（esbuild.config.mjs）
- **架构复杂度**: 模块化多文件，职责分离清晰
- **性能优化**: 防抖刷新（300ms）、懒加载图片、Canvas 2D 绘制

## 依赖项

- **obsidian**（latest）— Obsidian 插件 API
- **typescript**（^4.7.4）— TypeScript 编译器
- **esbuild**（^0.17.3）— JavaScript 打包工具
- **vitest**（^4.1.0）— 测试框架
- **@types/node**（^22.19.15）— Node.js 类型定义

## 已知注意事项

1. **Flomo 导入** — HTML 解析依赖 DOMParser，Flomo 导出格式变更可能需要适配
2. **防抖策略** — 使用 300ms 防抖处理 vault 事件以优化性能
3. **标签提取** — 支持中日韩的正则表达式在更新时需仔细测试
4. **XSS 防护** — 所有用户输入均使用纯 DOM API 构建，不使用 innerHTML
5. **时间处理** — 保存/加载操作中保持一致的本地时间处理
6. **图片导出** — Canvas 2D 绘制使用硬编码颜色值，保证跨主题输出一致性
7. **移动端适配** — CaptureItemView 方案替代 Modal，避免虚拟键盘挤压布局

## 相关文档

- **README.md** — 用户文档（中文，默认展示）
- **README.en.md** — 用户文档（英文版）
- **manifest.json** — 插件元数据与 Obsidian 兼容性
- **versions.json** — 版本兼容性信息
