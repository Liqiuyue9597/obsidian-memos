# Cognitive Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **NOTE:** Do NOT create git commits during implementation. The user will commit when ready.

**Goal:** Add a "Cognitive Map" feature to the Quick Memos Obsidian plugin — a contour-line topographic visualization that clusters memos by tag into mountain peaks.

**Architecture:** New `src/cognitive-map.ts` module handles all rendering (density field, marching squares, smoothing, Canvas drawing). New `src/cognitive-map-export.ts` provides Modal-based PNG export. `src/view.ts` gets a toolbar button to toggle between card list and map. `src/i18n.ts` gets new strings.

**Tech Stack:** TypeScript, Obsidian Plugin API, Canvas 2D (zero external dependencies). Tests via Vitest.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/cognitive-map.ts` | Create | Pure rendering: data aggregation, layout, density field, contour extraction, smoothing, Canvas drawing |
| `src/cognitive-map-export.ts` | Create | Export Modal: offscreen Canvas rendering, save-as-PNG, copy-to-clipboard |
| `src/i18n.ts` | Modify | Add 8 new i18n keys for cognitive map |
| `src/view.ts` | Modify | Add toolbar button, toggle state, render map in cards container |
| `styles.css` | Modify | Add `.memos-map-btn-active` highlight style and `.memos-map-container` layout |
| `tests/cognitive-map.test.ts` | Create | Unit tests for pure functions (aggregation, layout, density, contours, smoothing) |

---

### Task 1: i18n — Add cognitive map strings

**Files:**
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add i18n keys to the Messages interface**

In `src/i18n.ts`, add a new section to the `Messages` interface after the `// ── Flomo import ──` comment block (before the closing `}`):

```typescript
  // ── Cognitive Map ──
  cognitiveMap: string;
  cognitiveMapTooltip: string;
  mapStats: (n: number, tags: number, days: number) => string;
  mapSource: string;
  exportMap: string;
  mapExported: string;
  mapExportedTo: string;             // ${path}
  mapCopied: string;
  mapUncategorized: string;
```

- [ ] **Step 2: Add English translations**

In the `en` object, add after the `noMemosInHtml` line:

```typescript
  cognitiveMap: "Cognitive Map",
  cognitiveMapTooltip: "Cognitive map",
  mapStats: (n, tags, days) => `${n} note${n !== 1 ? "s" : ""} · ${tags} topic${tags !== 1 ? "s" : ""} · ${days} day${days !== 1 ? "s" : ""}`,
  mapSource: "Source",
  exportMap: "Export map",
  mapExported: "Map saved!",
  mapExportedTo: "Map saved to ${path}",
  mapCopied: "Map copied to clipboard!",
  mapUncategorized: "Uncategorized",
```

- [ ] **Step 3: Add Chinese translations**

In the `zh` object, add after the `noMemosInHtml` line:

```typescript
  cognitiveMap: "认知地图",
  cognitiveMapTooltip: "认知地图",
  mapStats: (n, tags, days) => `${n} 笔记 · ${tags} 主题 · ${days} 天`,
  mapSource: "来源",
  exportMap: "导出地图",
  mapExported: "地图已保存！",
  mapExportedTo: "地图已保存到 ${path}",
  mapCopied: "地图已复制到剪贴板！",
  mapUncategorized: "未分类",
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/elissali/github/quick-memos && npx tsc --noEmit`
Expected: No errors

---

### Task 2: Core rendering module — data aggregation and layout

**Files:**
- Create: `src/cognitive-map.ts`
- Create: `tests/cognitive-map.test.ts`

This task creates the file with pure functions for data aggregation and peak layout. The Canvas rendering is added in Task 3.

- [ ] **Step 1: Write tests for data aggregation**

Create `tests/cognitive-map.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TFile } from "obsidian";
import { MemoNote } from "../src/types";
import {
  aggregateTags,
  aggregateSources,
  computeDaysSince,
  layoutPeaks,
  hashString,
} from "../src/cognitive-map";

function makeMemo(tags: string[], source = "", created = "2025-06-01T12:00:00"): MemoNote {
  return {
    file: new TFile(),
    content: "test",
    tags,
    created,
    dateLabel: created.slice(0, 10),
    mood: "",
    source,
  };
}

describe("aggregateTags", () => {
  it("returns empty map for no memos", () => {
    expect(aggregateTags([])).toEqual(new Map());
  });

  it("counts tags across memos", () => {
    const memos = [
      makeMemo(["读书", "成长"]),
      makeMemo(["读书"]),
      makeMemo(["技术"]),
    ];
    const result = aggregateTags(memos);
    expect(result.get("读书")).toBe(2);
    expect(result.get("成长")).toBe(1);
    expect(result.get("技术")).toBe(1);
  });

  it("groups untagged memos under __untagged__", () => {
    const memos = [makeMemo([]), makeMemo([])];
    const result = aggregateTags(memos);
    expect(result.get("__untagged__")).toBe(2);
  });

  it("caps at 15 tags, grouping rest into __other__", () => {
    const memos: MemoNote[] = [];
    for (let i = 0; i < 20; i++) {
      // Each tag gets (20 - i) memos so they sort deterministically
      for (let j = 0; j < 20 - i; j++) {
        memos.push(makeMemo([`tag${i.toString().padStart(2, "0")}`]));
      }
    }
    const result = aggregateTags(memos);
    // 15 named tags + __other__
    expect(result.size).toBeLessThanOrEqual(16);
    expect(result.has("__other__")).toBe(true);
  });
});

describe("aggregateSources", () => {
  it("returns empty map when no sources", () => {
    expect(aggregateSources([makeMemo(["a"])])).toEqual(new Map());
  });

  it("counts sources", () => {
    const memos = [
      makeMemo(["a"], "kindle"),
      makeMemo(["b"], "kindle"),
      makeMemo(["c"], "web"),
    ];
    const result = aggregateSources(memos);
    expect(result.get("kindle")).toBe(2);
    expect(result.get("web")).toBe(1);
  });
});

describe("computeDaysSince", () => {
  it("returns 0 for empty memos", () => {
    expect(computeDaysSince([])).toBe(0);
  });

  it("computes days from earliest memo to now", () => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const iso = threeDaysAgo.toISOString();
    const memos = [makeMemo(["a"], "", iso)];
    const days = computeDaysSince(memos);
    expect(days).toBeGreaterThanOrEqual(3);
    expect(days).toBeLessThanOrEqual(4); // allow 1 day rounding
  });
});

describe("hashString", () => {
  it("returns a deterministic number", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
  });

  it("returns different values for different strings", () => {
    expect(hashString("hello")).not.toBe(hashString("world"));
  });
});

describe("layoutPeaks", () => {
  it("returns empty for empty tag map", () => {
    expect(layoutPeaks(new Map(), 400, 500)).toEqual([]);
  });

  it("centers a single peak", () => {
    const tags = new Map([["test", 10]]);
    const result = layoutPeaks(tags, 400, 500);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("test");
    // Should be roughly centered
    expect(result[0].x).toBeGreaterThan(150);
    expect(result[0].x).toBeLessThan(250);
    expect(result[0].y).toBeGreaterThan(200);
    expect(result[0].y).toBeLessThan(300);
  });

  it("produces non-overlapping peaks for multiple tags", () => {
    const tags = new Map([
      ["a", 40],
      ["b", 30],
      ["c", 20],
      ["d", 10],
    ]);
    const result = layoutPeaks(tags, 400, 500);
    expect(result).toHaveLength(4);

    // Check no two peaks are at the exact same position
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dist = Math.hypot(result[i].x - result[j].x, result[i].y - result[j].y);
        expect(dist).toBeGreaterThan(20);
      }
    }
  });

  it("is deterministic — same input gives same output", () => {
    const tags = new Map([["x", 15], ["y", 10]]);
    const a = layoutPeaks(tags, 400, 500);
    const b = layoutPeaks(tags, 400, 500);
    expect(a).toEqual(b);
  });

  it("truncates long labels to 8 chars + ellipsis", () => {
    const tags = new Map([["这是一个非常长的标签名称", 5]]);
    const result = layoutPeaks(tags, 400, 500);
    expect(result[0].displayLabel.length).toBeLessThanOrEqual(9); // 8 + …
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `cd /Users/elissali/github/quick-memos && npx vitest run tests/cognitive-map.test.ts`
Expected: FAIL — module `../src/cognitive-map` not found

- [ ] **Step 3: Implement data aggregation and layout functions**

Create `src/cognitive-map.ts`:

```typescript
import { MemoNote } from "./types";
import { i18n } from "./i18n";

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

export interface Peak {
  label: string;        // raw tag name (or "__untagged__" / "__other__")
  displayLabel: string; // truncated for rendering
  count: number;
  x: number;            // pixel coordinate on canvas
  y: number;            // pixel coordinate on canvas
}

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

const MAX_TAGS = 15;
const LABEL_MAX_LEN = 8;
const LAYOUT_PADDING = 0.08;  // fraction of canvas reserved as edge margin
const LAYOUT_ITERATIONS = 80;

/* ---------------------------------------------------------------------------
   Deterministic hash (for seeded random)
   --------------------------------------------------------------------------- */

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — deterministic sequence from a seed. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------------------
   Data aggregation
   --------------------------------------------------------------------------- */

/** Count memos per tag. Untagged memos → "__untagged__". Overflow → "__other__". */
export function aggregateTags(memos: MemoNote[]): Map<string, number> {
  const raw = new Map<string, number>();

  for (const memo of memos) {
    if (memo.tags.length === 0) {
      raw.set("__untagged__", (raw.get("__untagged__") ?? 0) + 1);
    } else {
      for (const tag of memo.tags) {
        raw.set(tag, (raw.get(tag) ?? 0) + 1);
      }
    }
  }

  if (raw.size <= MAX_TAGS) return raw;

  // Keep top MAX_TAGS by count, merge rest into "__other__"
  const sorted = [...raw.entries()].sort((a, b) => b[1] - a[1]);
  const result = new Map<string, number>();
  let otherCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (i < MAX_TAGS) {
      result.set(sorted[i][0], sorted[i][1]);
    } else {
      otherCount += sorted[i][1];
    }
  }

  if (otherCount > 0) {
    result.set("__other__", otherCount);
  }

  return result;
}

/** Count memos per source. Ignores memos with empty source. */
export function aggregateSources(memos: MemoNote[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const memo of memos) {
    if (memo.source) {
      counts.set(memo.source, (counts.get(memo.source) ?? 0) + 1);
    }
  }
  return counts;
}

/** Days from earliest memo to today. Returns 0 for empty array. */
export function computeDaysSince(memos: MemoNote[]): number {
  if (memos.length === 0) return 0;
  let earliest = memos[0].created;
  for (const m of memos) {
    if (m.created < earliest) earliest = m.created;
  }
  const diff = Date.now() - new Date(earliest).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/* ---------------------------------------------------------------------------
   Peak layout — force-directed simplified
   --------------------------------------------------------------------------- */

function truncateLabel(label: string): string {
  if (label === "__untagged__") return i18n.mapUncategorized;
  if (label === "__other__") return "…";
  if ([...label].length <= LABEL_MAX_LEN) return label;
  return [...label].slice(0, LABEL_MAX_LEN).join("") + "…";
}

/** Assign (x, y) positions to peaks using simple repulsion layout. */
export function layoutPeaks(
  tagCounts: Map<string, number>,
  canvasW: number,
  canvasH: number
): Peak[] {
  if (tagCounts.size === 0) return [];

  const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Build a combined seed from all tag names for determinism
  let combinedSeed = 0;
  for (const [tag] of sorted) combinedSeed = (combinedSeed + hashString(tag)) | 0;
  const rng = mulberry32(combinedSeed);

  const padX = canvasW * LAYOUT_PADDING;
  const padY = canvasH * LAYOUT_PADDING;
  const innerW = canvasW - padX * 2;
  const innerH = canvasH - padY * 2;

  // Initialize positions: largest tags closer to center, with randomness
  const peaks: Peak[] = sorted.map(([tag, count], idx) => {
    const centerBias = 1 - idx / sorted.length; // 1 for largest, 0 for smallest
    const cx = padX + innerW / 2;
    const cy = padY + innerH / 2;
    const spreadX = innerW * 0.4 * (1 - centerBias * 0.5);
    const spreadY = innerH * 0.4 * (1 - centerBias * 0.5);

    return {
      label: tag,
      displayLabel: truncateLabel(tag),
      count,
      x: cx + (rng() - 0.5) * spreadX * 2,
      y: cy + (rng() - 0.5) * spreadY * 2,
    };
  });

  if (peaks.length === 1) {
    peaks[0].x = canvasW / 2;
    peaks[0].y = canvasH / 2;
    return peaks;
  }

  // Repulsion iterations
  for (let iter = 0; iter < LAYOUT_ITERATIONS; iter++) {
    const cooling = 1 - iter / LAYOUT_ITERATIONS; // decreasing force

    for (let i = 0; i < peaks.length; i++) {
      let fx = 0, fy = 0;

      for (let j = 0; j < peaks.length; j++) {
        if (i === j) continue;
        const dx = peaks[i].x - peaks[j].x;
        const dy = peaks[i].y - peaks[j].y;
        const dist = Math.max(Math.hypot(dx, dy), 1);

        // Minimum distance based on both peaks' sizes
        const minDist = (Math.sqrt(peaks[i].count) + Math.sqrt(peaks[j].count)) * 14;

        if (dist < minDist) {
          const force = ((minDist - dist) / dist) * 2 * cooling;
          fx += dx * force;
          fy += dy * force;
        }
      }

      // Gentle pull toward center
      const cx = canvasW / 2;
      const cy = canvasH / 2;
      fx += (cx - peaks[i].x) * 0.01 * cooling;
      fy += (cy - peaks[i].y) * 0.01 * cooling;

      peaks[i].x += fx;
      peaks[i].y += fy;

      // Clamp to canvas bounds
      peaks[i].x = Math.max(padX + 20, Math.min(canvasW - padX - 20, peaks[i].x));
      peaks[i].y = Math.max(padY + 20, Math.min(canvasH - padY - 20, peaks[i].y));
    }
  }

  return peaks;
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `cd /Users/elissali/github/quick-memos && npx vitest run tests/cognitive-map.test.ts`
Expected: All PASS

---

### Task 3: Core rendering module — density field, contours, and Canvas drawing

**Files:**
- Modify: `src/cognitive-map.ts`

This task adds the contour-line rendering pipeline and the main `renderCognitiveMap` function. No new test file — these are Canvas-drawing functions that can't be unit-tested without a DOM; the pure algorithm functions were already tested in Task 2.

- [ ] **Step 1: Add density field and contour functions to `src/cognitive-map.ts`**

Append the following to the end of `src/cognitive-map.ts`:

```typescript
/* ---------------------------------------------------------------------------
   Density field (Gaussian kernel)
   --------------------------------------------------------------------------- */

interface DensityField {
  data: Float32Array;
  cols: number;
  rows: number;
}

function buildDensityField(
  peaks: Peak[],
  width: number,
  height: number,
  cellSize: number
): DensityField {
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const data = new Float32Array(cols * rows);

  for (const peak of peaks) {
    const sigma = Math.sqrt(peak.count) * 18;
    const amplitude = peak.count;
    const reach = Math.ceil((sigma * 3) / cellSize);
    const ci = Math.round(peak.x / cellSize);
    const cj = Math.round(peak.y / cellSize);

    for (let j = Math.max(0, cj - reach); j < Math.min(rows, cj + reach); j++) {
      for (let i = Math.max(0, ci - reach); i < Math.min(cols, ci + reach); i++) {
        const dx = i * cellSize - peak.x;
        const dy = j * cellSize - peak.y;
        data[j * cols + i] += amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      }
    }
  }

  return { data, cols, rows };
}

/* ---------------------------------------------------------------------------
   Marching Squares contour extraction
   --------------------------------------------------------------------------- */

interface Point {
  x: number;
  y: number;
}

function traceContourSegments(
  field: DensityField,
  threshold: number,
  cellSize: number
): Point[][] {
  const { data, cols, rows } = field;
  const segments: Point[][] = [];

  function val(i: number, j: number): number {
    if (i < 0 || i >= cols || j < 0 || j >= rows) return 0;
    return data[j * cols + i];
  }

  function lerp(a: number, b: number): number {
    return Math.abs(b - a) < 1e-4 ? 0.5 : (threshold - a) / (b - a);
  }

  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const tl = val(i, j);
      const tr = val(i + 1, j);
      const br = val(i + 1, j + 1);
      const bl = val(i, j + 1);

      let code = 0;
      if (tl >= threshold) code |= 8;
      if (tr >= threshold) code |= 4;
      if (br >= threshold) code |= 2;
      if (bl >= threshold) code |= 1;

      if (code === 0 || code === 15) continue;

      const top:    Point = { x: (i + lerp(tl, tr)) * cellSize, y: j * cellSize };
      const right:  Point = { x: (i + 1) * cellSize, y: (j + lerp(tr, br)) * cellSize };
      const bottom: Point = { x: (i + lerp(bl, br)) * cellSize, y: (j + 1) * cellSize };
      const left:   Point = { x: i * cellSize, y: (j + lerp(tl, bl)) * cellSize };

      const lookup: Record<number, Point[][]> = {
        1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]],
        4: [[top, right]], 5: [[left, top], [bottom, right]], 6: [[top, bottom]],
        7: [[left, top]], 8: [[top, left]], 9: [[top, bottom]],
        10: [[top, right], [left, bottom]], 11: [[top, right]],
        12: [[left, right]], 13: [[bottom, right]], 14: [[left, bottom]],
      };

      const segs = lookup[code];
      if (segs) {
        for (const seg of segs) segments.push(seg);
      }
    }
  }

  return segments;
}

/* ---------------------------------------------------------------------------
   Segment connection + Chaikin smoothing
   --------------------------------------------------------------------------- */

function connectSegments(segments: Point[][], tolerance: number): Point[][] {
  if (segments.length === 0) return [];

  const available = segments.map((s) => ({ pts: [...s], used: false }));
  const polylines: Point[][] = [];

  function dist(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  for (let i = 0; i < available.length; i++) {
    if (available[i].used) continue;
    available[i].used = true;
    const line = [...available[i].pts];

    let found = true;
    while (found) {
      found = false;
      for (let j = 0; j < available.length; j++) {
        if (available[j].used) continue;
        const s = available[j].pts;
        const t = tolerance;

        if (dist(line[line.length - 1], s[0]) < t) {
          line.push(s[1]); available[j].used = true; found = true;
        } else if (dist(line[line.length - 1], s[1]) < t) {
          line.push(s[0]); available[j].used = true; found = true;
        } else if (dist(line[0], s[1]) < t) {
          line.unshift(s[0]); available[j].used = true; found = true;
        } else if (dist(line[0], s[0]) < t) {
          line.unshift(s[1]); available[j].used = true; found = true;
        }
      }
    }

    if (line.length >= 3) polylines.push(line);
  }

  return polylines;
}

function smoothPolyline(pts: Point[], iterations: number): Point[] {
  let current = pts;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [];
    for (let i = 0; i < current.length - 1; i++) {
      next.push({
        x: current[i].x * 0.75 + current[i + 1].x * 0.25,
        y: current[i].y * 0.75 + current[i + 1].y * 0.25,
      });
      next.push({
        x: current[i].x * 0.25 + current[i + 1].x * 0.75,
        y: current[i].y * 0.25 + current[i + 1].y * 0.75,
      });
    }
    current = next;
  }
  return current;
}

/* ---------------------------------------------------------------------------
   Source color assignment
   --------------------------------------------------------------------------- */

function sourceColor(name: string, alpha: number): string {
  const hue = hashString(name) % 360;
  return `hsla(${hue}, 55%, 60%, ${alpha})`;
}

/* ---------------------------------------------------------------------------
   Main render function
   --------------------------------------------------------------------------- */

const MAP_BG = "#0f1a2e";
const CONTOUR_LEVELS = 10;
const CELL_SIZE = 4;
const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif";

export interface RenderOptions {
  memos: MemoNote[];
  enableSource: boolean;
  width: number;     // logical pixels
  mapHeight: number; // logical pixels — map area only
  pixelRatio: number;
}

/**
 * Render the full cognitive map onto the given Canvas element.
 * Returns the total height (map + footer) in logical pixels.
 */
export function renderCognitiveMap(
  canvas: HTMLCanvasElement,
  opts: RenderOptions
): number {
  const { memos, enableSource, width, mapHeight, pixelRatio } = opts;
  const tagCounts = aggregateTags(memos);
  const sourceCounts = enableSource ? aggregateSources(memos) : new Map<string, number>();
  const days = computeDaysSince(memos);
  const peaks = layoutPeaks(tagCounts, width, mapHeight);

  // Determine footer height
  const hasSourceData = sourceCounts.size > 0;
  const footerHeight = hasSourceData ? 110 : 60;
  const totalHeight = mapHeight + footerHeight;

  // Setup canvas
  canvas.width = width * pixelRatio;
  canvas.height = totalHeight * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${totalHeight}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(pixelRatio, pixelRatio);

  // === Background ===
  ctx.fillStyle = MAP_BG;
  ctx.fillRect(0, 0, width, totalHeight);

  // === Stars ===
  const starRng = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(
      starRng() * width,
      starRng() * mapHeight,
      starRng() * 1 + 0.3,
      0, Math.PI * 2
    );
    ctx.fillStyle = `rgba(180,210,240,${starRng() * 0.2 + 0.05})`;
    ctx.fill();
  }

  // === Contour lines ===
  if (peaks.length > 0) {
    const field = buildDensityField(peaks, width, mapHeight, CELL_SIZE);

    let maxVal = 0;
    for (let i = 0; i < field.data.length; i++) {
      if (field.data[i] > maxVal) maxVal = field.data[i];
    }

    for (let lv = 1; lv <= CONTOUR_LEVELS; lv++) {
      const threshold = (lv / (CONTOUR_LEVELS + 1)) * maxVal * 0.85;
      const alpha = 0.06 + (lv / CONTOUR_LEVELS) * 0.25;
      const lineWidth = 0.5 + (lv / CONTOUR_LEVELS) * 0.8;

      const segments = traceContourSegments(field, threshold, CELL_SIZE);
      const polylines = connectSegments(segments, CELL_SIZE * 1.5);

      ctx.strokeStyle = `rgba(180,210,240,${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      for (const pl of polylines) {
        const smooth = smoothPolyline(pl, 3);
        if (smooth.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(smooth[0].x, smooth[0].y);
        for (let k = 1; k < smooth.length; k++) {
          ctx.lineTo(smooth[k].x, smooth[k].y);
        }
        ctx.stroke();
      }
    }
  }

  // === Peak markers + labels ===
  for (const peak of peaks) {
    // Triangle marker
    const triSize = 5 + Math.sqrt(peak.count) * 0.8;
    ctx.beginPath();
    ctx.moveTo(peak.x, peak.y - triSize);
    ctx.lineTo(peak.x - triSize * 0.65, peak.y + triSize * 0.3);
    ctx.lineTo(peak.x + triSize * 0.65, peak.y + triSize * 0.3);
    ctx.closePath();
    ctx.fillStyle = "rgba(220,235,255,0.85)";
    ctx.fill();

    // Label
    const fontSize = 11 + Math.sqrt(peak.count) * 0.6;
    ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(220,235,255,0.9)";
    ctx.fillText(peak.displayLabel, peak.x, peak.y - triSize - 8);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  // === Footer area ===
  const footerY = mapHeight;

  // Stats line
  ctx.font = `300 11px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(180,210,240,0.4)";
  ctx.fillText(
    i18n.mapStats(memos.length, tagCounts.size, days),
    width / 2,
    footerY + 25
  );

  // Source distribution bar
  if (hasSourceData) {
    const barY = footerY + 42;
    const barW = Math.min(300, width - 80);
    const barH = 14;
    const barX = (width - barW) / 2;

    ctx.font = `400 9px ${FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(180,210,240,0.28)";
    ctx.fillText(i18n.mapSource, barX, barY - 5);

    const totalSourceCount = [...sourceCounts.values()].reduce((a, b) => a + b, 0);
    let offsetX = barX;
    const entries = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
    const radius = 3;

    for (let i = 0; i < entries.length; i++) {
      const [name, count] = entries[i];
      const w = barW * (count / totalSourceCount);
      ctx.beginPath();
      if (entries.length === 1) {
        ctx.roundRect(offsetX, barY, w, barH, radius);
      } else if (i === 0) {
        ctx.roundRect(offsetX, barY, w, barH, [radius, 0, 0, radius]);
      } else if (i === entries.length - 1) {
        ctx.roundRect(offsetX, barY, w, barH, [0, radius, radius, 0]);
      } else {
        ctx.rect(offsetX, barY, w, barH);
      }
      ctx.fillStyle = sourceColor(name, 0.5);
      ctx.fill();
      offsetX += w;
    }

    // Source labels below bar
    offsetX = barX;
    ctx.font = `400 9px ${FONT_FAMILY}`;
    for (const [name, count] of entries) {
      const w = barW * (count / totalSourceCount);
      if (w > 30) {
        ctx.beginPath();
        ctx.arc(offsetX + 6, barY + barH + 12, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = sourceColor(name, 0.8);
        ctx.fill();

        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(180,210,240,0.45)";
        ctx.fillText(name, offsetX + 14, barY + barH + 15);
      }
      offsetX += w;
    }
  }

  // Watermark
  ctx.font = `300 9px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(180,210,240,0.15)";
  ctx.fillText("Quick Memos", width / 2, totalHeight - 12);

  return totalHeight;
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/elissali/github/quick-memos && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run existing tests to ensure no regressions**

Run: `cd /Users/elissali/github/quick-memos && npx vitest run`
Expected: All tests pass

---

### Task 4: View integration — toolbar button and map toggle

**Files:**
- Modify: `src/view.ts`
- Modify: `styles.css`

- [ ] **Step 1: Add import and state field to `src/view.ts`**

At the top of `src/view.ts`, add after the existing imports:

```typescript
import { renderCognitiveMap } from "./cognitive-map";
import { CognitiveMapExportModal } from "./cognitive-map-export";
```

In the `MemosView` class, add a new field after `highlightedCardEl`:

```typescript
  showingMap = false;
```

- [ ] **Step 2: Add map button to toolbar**

In `renderToolbar(el: HTMLElement)`, add a map button after the existing `canvasBtn` block (before the closing `}` of `renderToolbar`):

```typescript
    const mapBtn = right.createDiv({
      cls: `memos-toolbar-btn${this.showingMap ? " memos-map-btn-active" : ""}`,
      attr: { "aria-label": i18n.cognitiveMapTooltip },
    });
    setIcon(mapBtn, "map");
    mapBtn.addEventListener("click", () => {
      this.showingMap = !this.showingMap;
      void this.refresh();
    });

    if (this.showingMap) {
      const exportBtn = right.createDiv({
        cls: "memos-toolbar-btn",
        attr: { "aria-label": i18n.exportMap },
      });
      setIcon(exportBtn, "share");
      exportBtn.addEventListener("click", () => {
        new CognitiveMapExportModal(this.app, this.plugin, this.memos).open();
      });
    }
```

- [ ] **Step 3: Add map rendering to `refresh()`**

In the `refresh()` method, after the existing toolbar rendering and before the mobile/desktop stats+cards code, add a conditional block. Replace the section starting from `// On mobile:` through to the end of `refresh()` with:

```typescript
    if (this.showingMap) {
      // Cognitive Map mode — replace stats + cards with the map canvas
      const mapContainer = this.contentEl.createDiv("memos-map-container");
      const canvas = mapContainer.createEl("canvas");
      const containerWidth = mapContainer.clientWidth || 380;

      // Use requestAnimationFrame to ensure the container has been laid out
      requestAnimationFrame(() => {
        const actualWidth = mapContainer.clientWidth || containerWidth;
        renderCognitiveMap(canvas, {
          memos: this.memos,
          enableSource: this.plugin.settings.enableSource,
          width: actualWidth,
          mapHeight: Math.round(actualWidth * 1.15),
          pixelRatio: window.devicePixelRatio || 2,
        });
      });
      return;
    }

    // On mobile: stats + cards share a single scroll container so the
    // heatmap scrolls away while the toolbar stays pinned at the top.
    // On desktop: stats stays fixed above the scrollable card list.
    const isMobile = this.contentEl.closest(".is-mobile") !== null;

    if (isMobile) {
      const scrollContainer = this.contentEl.createDiv("memos-cards-container");

      const statsContainer = scrollContainer.createDiv();
      const stats = computeStats(this.memos);
      renderStatsSection(statsContainer, stats, this.plugin.settings.statsCollapsed, {
        onToggle: () => this.handleStatsToggle(),
        onDateClick: (date) => this.handleDateFilter(date),
      });

      this.renderCards(scrollContainer);
    } else {
      const statsContainer = this.contentEl.createDiv();
      const stats = computeStats(this.memos);
      renderStatsSection(statsContainer, stats, this.plugin.settings.statsCollapsed, {
        onToggle: () => this.handleStatsToggle(),
        onDateClick: (date) => this.handleDateFilter(date),
      });

      const cardsContainer = this.contentEl.createDiv("memos-cards-container");
      this.renderCards(cardsContainer);
    }
```

- [ ] **Step 4: Hide map button when no memos**

In `renderToolbar()`, wrap the map button code (from Step 2) in a conditional:

```typescript
    if (this.memos.length > 0) {
      const mapBtn = right.createDiv({
        // ... (the same code from Step 2)
      });
      // ... rest of map button code
    }
```

- [ ] **Step 5: Add CSS for map container and active button**

Append to the end of `styles.css`:

```css
/* =============================================================================
   Cognitive Map
   ============================================================================= */

.memos-map-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 12px;
}

.memos-map-container canvas {
  border-radius: 8px;
  max-width: 100%;
}

.memos-map-btn-active {
  background-color: var(--interactive-accent) !important;
  color: var(--text-on-accent) !important;
}
```

- [ ] **Step 6: Verify build compiles**

Run: `cd /Users/elissali/github/quick-memos && npx tsc --noEmit`
Expected: No errors (the `CognitiveMapExportModal` import will error — that's expected, we create it in Task 5. If you hit this error, temporarily comment out the import and the export button event listener to verify everything else compiles, then uncomment when Task 5 is done.)

---

### Task 5: Export Modal — PNG save and clipboard copy

**Files:**
- Create: `src/cognitive-map-export.ts`

- [ ] **Step 1: Create `src/cognitive-map-export.ts`**

```typescript
import { App, Modal, Notice, Platform } from "obsidian";

import { MemoNote } from "./types";
import { i18n, t } from "./i18n";
import { renderCognitiveMap } from "./cognitive-map";
import type MemosPlugin from "./plugin";

const EXPORT_WIDTH = 390;
const EXPORT_MAP_HEIGHT = 450;
const EXPORT_PIXEL_RATIO = 2;

export class CognitiveMapExportModal extends Modal {
  plugin: MemosPlugin;
  memos: MemoNote[];

  constructor(app: App, plugin: MemosPlugin, memos: MemoNote[]) {
    super(app);
    this.plugin = plugin;
    this.memos = memos;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.addClass("memos-export-modal");

    // Preview
    const previewContainer = contentEl.createDiv("memos-export-preview");
    const canvas = document.createElement("canvas");
    previewContainer.appendChild(canvas);

    renderCognitiveMap(canvas, {
      memos: this.memos,
      enableSource: this.plugin.settings.enableSource,
      width: EXPORT_WIDTH,
      mapHeight: EXPORT_MAP_HEIGHT,
      pixelRatio: EXPORT_PIXEL_RATIO,
    });

    // Scale preview to fit modal
    const maxPreviewWidth = 360;
    if (EXPORT_WIDTH > maxPreviewWidth) {
      const scale = maxPreviewWidth / EXPORT_WIDTH;
      canvas.style.width = `${EXPORT_WIDTH * scale}px`;
      canvas.style.height = "auto";
    }

    // Action buttons
    const btnRow = contentEl.createDiv("memos-export-btn-row");

    const saveBtn = btnRow.createEl("button", {
      cls: "memos-export-btn mod-cta",
      text: i18n.saveAsPng,
    });
    saveBtn.addEventListener("click", () => {
      void this.handleSave();
    });

    const copyBtn = btnRow.createEl("button", {
      cls: "memos-export-btn",
      text: i18n.copyToClipboard,
    });
    copyBtn.addEventListener("click", () => {
      void this.handleCopy();
    });
  }

  private generateBlob(): Promise<Blob> {
    const canvas = document.createElement("canvas");
    renderCognitiveMap(canvas, {
      memos: this.memos,
      enableSource: this.plugin.settings.enableSource,
      width: EXPORT_WIDTH,
      mapHeight: EXPORT_MAP_HEIGHT,
      pixelRatio: EXPORT_PIXEL_RATIO,
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        },
        "image/png"
      );
    });
  }

  private buildFilename(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `cognitive-map-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.png`;
  }

  async handleSave() {
    try {
      const blob = await this.generateBlob();
      const fname = this.buildFilename();

      if (Platform.isMobile) {
        // Try Web Share API first
        const file = new File([blob], fname, { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
            this.close();
            return;
          } catch (shareErr: unknown) {
            if (shareErr instanceof Error && shareErr.name === "AbortError") {
              this.close();
              return;
            }
          }
        }

        // Fallback: save into vault
        const saveFolder = this.plugin.settings.saveFolder;
        const vaultPath = `${saveFolder}/${fname}`;
        const arrayBuf = await blob.arrayBuffer();
        await this.app.vault.createBinary(vaultPath, arrayBuf);
        new Notice(t("mapExportedTo", { path: vaultPath }));
      } else {
        // Desktop: browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        new Notice(i18n.mapExported);
      }

      this.close();
    } catch (err) {
      new Notice(
        t("exportFailed", { err: err instanceof Error ? err.message : String(err) })
      );
    }
  }

  async handleCopy() {
    try {
      const blob = await this.generateBlob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      new Notice(i18n.mapCopied);
      this.close();
    } catch (err) {
      new Notice(
        t("copyFailed", { err: err instanceof Error ? err.message : String(err) })
      );
    }
  }

  onClose() {
    // Let Obsidian handle DOM cleanup
  }
}
```

- [ ] **Step 2: Uncomment the import in view.ts (if it was commented in Task 4)**

Ensure these lines are active at the top of `src/view.ts`:

```typescript
import { renderCognitiveMap } from "./cognitive-map";
import { CognitiveMapExportModal } from "./cognitive-map-export";
```

- [ ] **Step 3: Verify the full build compiles**

Run: `cd /Users/elissali/github/quick-memos && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `cd /Users/elissali/github/quick-memos && npx vitest run`
Expected: All tests pass (including the new cognitive-map tests from Task 2)

---

### Task 6: Build and manual verification

**Files:** (none — verification only)

- [ ] **Step 1: Run the production build**

Run: `cd /Users/elissali/github/quick-memos && npm run build`
Expected: Build succeeds, `main.js` is updated

- [ ] **Step 2: Run linter**

Run: `cd /Users/elissali/github/quick-memos && npm run lint`
Expected: No errors (warnings are acceptable)

- [ ] **Step 3: Run full test suite one final time**

Run: `cd /Users/elissali/github/quick-memos && npm test`
Expected: All tests pass
