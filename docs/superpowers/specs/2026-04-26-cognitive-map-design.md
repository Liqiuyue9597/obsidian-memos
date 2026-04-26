# Cognitive Map — 认知地图设计文档

## 概述

为 Quick Memos 插件新增「认知地图」功能：一个等高线地形图风格的可视化视图，按标签将用户的 memo 聚类为山峰，笔记越多山峰越高。底部展示统计信息和来源分布。支持导出为 PNG 分享图片。

## 视觉设计

### 地图区域

- **风格**：深蓝底色（`#0f1a2e`）等高线地形图
- **背景**：散布随机小星点作为点缀
- **山峰**：每个标签形成一座山峰
  - 山峰大小和等高线圈数与该标签下的 memo 数量成正比
  - 半径使用 `√count * 18` 作为高斯核的 sigma 值
  - 相邻的大标签山峰会自然融合
- **等高线**：10 层，透明度从外圈 0.06 递增到内圈 0.31，线宽从 0.5 递增到 1.3
- **山峰标记**：顶部 △ 三角形 + 标签文字，字号与笔记数正相关
- **等高线颜色**：`rgba(180, 210, 240, alpha)` — 冷白蓝色调

### 底部信息区

- **统计行**：`{total} 笔记 · {tagCount} 主题 · {days} 天`
  - days = 从最早 memo 到今天的天数
- **来源分布条**（仅当 `enableSource` 开启且有数据时显示）：
  - 水平堆叠条形图，每个 source 一段，不同颜色
  - 颜色方案：按 source 名称固定分配（使用 HSL 基于字符串 hash）
  - 下方显示 source 名称标签
- **水印**：`Quick Memos` 小字居中，极低透明度

### 导出为 PNG

- 复用现有 `ExportModal` 的交互模式（Modal 弹窗 + 预览 + 保存/复制按钮）
- 导出尺寸：宽 390px（@2x 渲染 = 780px 实际像素），高度根据内容动态计算
- 地图区域约 440px 高，底部信息区约 100-120px

## 架构

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/cognitive-map.ts` | 核心渲染模块：密度场计算、等高线追踪、平滑、Canvas 绘制 |
| `src/cognitive-map-export.ts` | 导出功能：Modal 弹窗、PNG 生成、保存/复制 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/view.ts` | toolbar 添加地图按钮；切换逻辑：地图视图 ↔ 卡片列表 |
| `src/i18n.ts` | 新增认知地图相关的中英文文案 |
| `src/types.ts` | 无变动（复用 `MemoNote`、`MemosSettings`） |
| `src/plugin.ts` | 无变动 |

### 数据流

```
loadMemos() → MemoNote[]
    ↓
按 tags 聚合 → Map<tag, count>
按 source 聚合 → Map<source, count>（如果 enableSource）
计算 earliest created date → days
    ↓
布局算法：为每个 tag 分配 (x, y) 坐标
    ↓
Canvas 渲染：密度场 → 等高线 → 平滑 → 绘制 → 标签 → 底部信息
```

### 标签布局算法

需要为每个标签在画布上分配不重叠的位置：

1. 按笔记数降序排列标签
2. 使用力导向简化版（排斥力 + 随机初始化 + 迭代调整）确保山峰不重叠
3. 大标签优先放置在中心区域附近
4. 迭代 50-100 次达到稳定布局
5. 使用确定性随机种子（基于标签名 hash），确保同一组数据每次渲染结果一致

### 等高线算法

全部为手写 TypeScript，零外部依赖：

1. **密度场构建**：对画布建立网格（cellSize=4px），每个标签用高斯核函数叠加到网格上
2. **Marching Squares**：对每个阈值层级提取等值线段
3. **线段连接**：将相邻短线段拼接为长折线（容差 = cellSize × 1.5）
4. **Chaikin 平滑**：对折线做 3 轮 Chaikin 角切割，生成光滑曲线
5. **Canvas 绘制**：逐层从低到高绘制，透明度递增

### 性能考量

- 密度场计算限制在 3σ 范围内，避免遍历全网格
- 100 个标签、1000 条 memo 时密度场计算约 10-20ms
- Marching Squares 10 层约 20-30ms
- 总渲染时间目标 < 100ms

## 入口与交互

### Toolbar 按钮

在 `MemosView.renderToolbar()` 中，在现有按钮（pencil、dice、layout-dashboard）旁添加一个地图图标按钮。

使用 Obsidian 内置图标 `map` 或 `mountain`。

### 视图切换

- `MemosView` 新增 `showingMap: boolean` 状态字段（默认 false）
- 点击地图按钮切换 `showingMap`
- `refresh()` 中根据 `showingMap` 决定渲染卡片列表还是认知地图
- 地图模式下：stats 区域和卡片列表都隐藏，显示一个填满 `memos-cards-container` 区域的 Canvas
- toolbar 保持不变（只是地图按钮高亮）
- 切换回来时恢复卡片列表，保持原有的 tag/date 筛选状态

### 导出

- 地图视图中，toolbar 右侧显示一个导出按钮（share 图标），仅在 `showingMap=true` 时可见
- 点击弹出 `CognitiveMapExportModal`（类似现有的 `ExportModal`）
- Modal 内部创建一个 offscreen Canvas，调用与视图相同的渲染函数生成高清图
- 提供「保存为 PNG」和「复制到剪贴板」两个按钮
- 保存逻辑复用 `export-image.ts` 中已有的 `canvas.toBlob()` → `vault.createBinary()` / `clipboard.write()` 模式

## i18n 文案

| Key | 中文 | English |
|-----|------|---------|
| `cognitiveMap` | `认知地图` | `Cognitive Map` |
| `cognitiveMapTooltip` | `认知地图` | `Cognitive map` |
| `mapStats` | `{n} 笔记 · {tags} 主题 · {days} 天` | `{n} notes · {tags} topics · {days} days` |
| `mapSource` | `来源` | `Source` |
| `exportMap` | `导出地图` | `Export map` |
| `mapExported` | `地图已保存` | `Map saved` |
| `mapExportedTo` | `地图已保存到 {path}` | `Map saved to {path}` |
| `mapCopied` | `地图已复制` | `Map copied` |

## 边界情况

- **无 memo**：不显示地图按钮
- **有 memo 但无标签**：所有无标签 memo 归为一个「未分类」山峰
- **只有 1 个标签**：单座山峰居中展示
- **标签过多（>20）**：只展示笔记数最多的前 15 个标签，其余归入"其他"
- **无 source 数据**（enableSource=false 或所有 memo 都没有 source）：底部不显示来源分布条，只保留统计行
- **标签名过长**：截断到 8 个字符 + `…`

## 不做的事情

- 不做可交互（点击山峰跳转、缩放平移等）— 纯静态展示
- 不做 mood 分布展示 — mood 默认关闭，数据不可靠
- 不做 AI 语义聚类 — 按标签聚类即可
- 不做时间轴动画
- 不做暗色/亮色主题切换 — 只用深蓝底色
