# Quick Memos

Flomo-style quick capture and card view for Obsidian. Jot down ideas in seconds, browse them as cards, filter by tags, and rediscover forgotten thoughts with random review.

All data is stored as local Markdown files — your data, your rules.

![Quick Memos screenshots](https://github.com/user-attachments/assets/6abc5200-3136-4bb4-bda5-8889ad3527f9)

**[中文文档](README.zh.md)**

## Installation

1. Open **Settings → Community plugins → Browse**
2. Search for "Quick Memos"
3. Click **Install**, then **Enable**

### Alternative: BRAT (beta testing)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. BRAT → **Add a beta plugin** → `https://github.com/Liqiuyue9597/quick-memos`

## Features

| Category | Feature |
|----------|---------|
| Capture | Quick capture view with `Ctrl+Enter` to save |
| Capture | Tag suggestions — recent and frequent tags shown first |
| Capture | Wikilink support — type `[[` to search and insert note links |
| Capture | Image attachment (iOS Photos / desktop file picker) |
| Capture | Mood and source metadata (optional) |
| Browse | Card waterfall view with heatmap stats |
| Browse | Filter by tag, date, or keyword |
| Browse | Random review (dice button) |
| Export | Share memo as PNG card image |
| Export | Export filtered memos to Obsidian Canvas |
| Integration | Right-click any text → Save as Memo |
| Integration | `![[memo]]` transclusion renders as styled card |
| Integration | iOS Shortcuts via `obsidian://memo-view` |
| Import | One-click Flomo HTML import with timestamps and tags |

## Commands

| Command | Description |
|---------|-------------|
| `Memos: Quick capture` | Open the capture view |
| `Memos: Open Memos view` | Open the card waterfall view |

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + Enter` | Save memo (in capture view) |
| `[[` | Open note search for wikilink insertion |

## Usage

### Quick capture

1. Click the ribbon icon or run `Memos: Quick capture`
2. Type your thought
3. (Optional) Add tags, mood, source, or images
4. Press `Ctrl+Enter` or click Save

### Card view

- Click any **tag** to filter
- Click a **heatmap cell** to filter by date
- Click **×** on a filter pill to clear
- Click the **dice** icon for random review
- Click a **card** to open the source file
- Click the **share** button to export as image

### iOS Shortcuts

Create a home screen shortcut to open Quick Memos directly:

1. iOS **Shortcuts** app → tap **+**
2. Add "Open URL" action → enter `obsidian://memo-view`
3. Name and save the shortcut

## Import from Flomo

1. Flomo → Settings → Account → Export (download `.zip`)
2. Extract to get the `.html` file
3. Obsidian → Settings → Quick Memos → Import → **Choose HTML file**
4. (Optional) Copy images from `file/` into your vault's attachment folder

Import preserves original timestamps, extracts `#tags` into frontmatter, marks memos with `source: "flomo"`, and deduplicates on re-import.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Save folder | `Memos` | Where memo files are stored |
| Fixed tag | Off | Auto-add a tag to every new memo |
| Enable mood | Off | Show mood emoji picker in capture view |
| Enable source | Off | Show source label picker in capture view |
| Show author name | Off | Display author on exported images |
| Show branding | On | Display "Quick Memos for Obsidian" on exported images |

## Memo file format

Each memo is a standalone Markdown file:

```markdown
---
created: 2026-03-14T14:30:00.000Z
type: memo
tags:
  - idea
  - project
mood: "\U0001f4a1"
source: "thought"
---

Had a great idea for a new feature today! #excited
```

All memos have `type: memo` in frontmatter, making them easy to query with Dataview.

## Network disclosure

This plugin makes **no network requests**. All data stays local in your vault.

## FAQ

**Where are memos saved?**
In the configured save folder (default `Memos/`). Each memo is a standalone `.md` file.

**Does it work on mobile?**
Yes. The card view opens automatically on mobile. The capture view adapts to virtual keyboards. iOS users can set up Shortcuts for one-tap access.

**How do I back up my memos?**
Memos are regular Markdown files. Sync with Obsidian Sync, iCloud, Dropbox, or Git.

**Can I use this with Dataview?**
Yes. Query `type: memo` in frontmatter. With mood/source enabled, those fields are also available.

## Development

```bash
npm install       # Install dependencies
npm run dev       # Dev mode with hot reload
npm run build     # Production build
npm run test      # Run tests
npm run lint      # Lint (matches Obsidian Community Portal checks)
```

## License

[MIT](LICENSE)
