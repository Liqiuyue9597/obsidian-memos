# Contributing to Quick Memos

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/Liqiuyue9597/obsidian-memos.git
cd obsidian-memos

# Install dependencies
npm install

# Build in watch mode (for development)
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Production build
npm run build
```

### Local Testing

1. Build the plugin with `npm run build`
2. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/quick-memos/` directory
3. Reload Obsidian and enable the plugin

## Project Structure

```
src/
  main.ts           # Entry point (re-exports plugin)
  plugin.ts         # Main plugin class, URI handlers, saveMemo
  view.ts           # Memos card list view
  capture-view.ts   # Quick capture editor view
  settings.ts       # Settings tab
  types.ts          # TypeScript interfaces & defaults
  constants.ts      # Shared regex, view type constants
  i18n.ts           # Chinese + English internationalization
  utils.ts          # Tag extraction, parsing helpers
  memo-parser.ts    # Frontmatter + body parsing
  stats.ts          # Heatmap, streak, statistics
  export-image.ts   # Canvas-based PNG export
  canvas-export.ts  # Obsidian Canvas export
  flomo-import.ts   # Flomo HTML import
tests/
  *.test.ts         # Unit tests (vitest)
  __mocks__/        # Obsidian API mock
```

## Guidelines

### Before Submitting a PR

- Run `npm test` — all tests must pass
- Run `npm run build` — build must succeed without errors
- Test on both desktop and mobile if your change affects the UI
- Keep commits focused: one logical change per commit

### Code Style

- TypeScript strict mode is enabled
- Use Obsidian's DOM API (`createDiv`, `createEl`, `createSpan`) instead of `innerHTML`
- Use `i18n` for all user-facing strings (support both Chinese and English)
- Pure functions should be extracted and unit tested
- Avoid `any` — use proper types or type guards

### Adding i18n Strings

1. Add the key to the `Messages` interface in `src/i18n.ts`
2. Add the English string to the `en` object
3. Add the Chinese string to the `zh` object
4. Use `i18n.yourKey` in code, or `t("yourKey", { var: value })` for templates

### Writing Tests

- Tests live in `tests/` and use [Vitest](https://vitest.dev/)
- The Obsidian API is mocked in `tests/__mocks__/obsidian.ts`
- If you add a new function that needs a new Obsidian class, add it to the mock
- Export pure functions so they can be tested independently

## Reporting Issues

Please use the [issue templates](https://github.com/Liqiuyue9597/obsidian-memos/issues/new/choose) — they help us understand and reproduce the problem quickly.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
