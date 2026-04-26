import { MemoNote } from "./types";
import { i18n } from "./i18n";

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

export interface Peak {
  label: string;
  displayLabel: string;
  count: number;
  x: number;
  y: number;
}

/* ---------------------------------------------------------------------------
   Constants
   --------------------------------------------------------------------------- */

const MAX_TAGS = 15;
const LABEL_MAX_LEN = 8;
const LAYOUT_PADDING = 0.08;
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
  if (otherCount > 0) result.set("__other__", otherCount);
  return result;
}

export function aggregateSources(memos: MemoNote[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const memo of memos) {
    if (memo.source) {
      counts.set(memo.source, (counts.get(memo.source) ?? 0) + 1);
    }
  }
  return counts;
}

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

export function layoutPeaks(
  tagCounts: Map<string, number>,
  canvasW: number,
  canvasH: number
): Peak[] {
  if (tagCounts.size === 0) return [];
  const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
  let combinedSeed = 0;
  for (const [tag] of sorted) combinedSeed = (combinedSeed + hashString(tag)) | 0;
  const rng = mulberry32(combinedSeed);
  const padX = canvasW * LAYOUT_PADDING;
  const padY = canvasH * LAYOUT_PADDING;
  const innerW = canvasW - padX * 2;
  const innerH = canvasH - padY * 2;

  const peaks: Peak[] = sorted.map(([tag, count], idx) => {
    const centerBias = 1 - idx / sorted.length;
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

  for (let iter = 0; iter < LAYOUT_ITERATIONS; iter++) {
    const cooling = 1 - iter / LAYOUT_ITERATIONS;
    for (let i = 0; i < peaks.length; i++) {
      let fx = 0, fy = 0;
      for (let j = 0; j < peaks.length; j++) {
        if (i === j) continue;
        const dx = peaks[i].x - peaks[j].x;
        const dy = peaks[i].y - peaks[j].y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const minDist = (Math.sqrt(peaks[i].count) + Math.sqrt(peaks[j].count)) * 14;
        if (dist < minDist) {
          const force = ((minDist - dist) / dist) * 2 * cooling;
          fx += dx * force;
          fy += dy * force;
        }
      }
      const cx = canvasW / 2;
      const cy = canvasH / 2;
      fx += (cx - peaks[i].x) * 0.01 * cooling;
      fy += (cy - peaks[i].y) * 0.01 * cooling;
      peaks[i].x += fx;
      peaks[i].y += fy;
      peaks[i].x = Math.max(padX + 20, Math.min(canvasW - padX - 20, peaks[i].x));
      peaks[i].y = Math.max(padY + 20, Math.min(canvasH - padY - 20, peaks[i].y));
    }
  }
  return peaks;
}

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
  width: number;
  mapHeight: number;
  pixelRatio: number;
}

export function renderCognitiveMap(
  canvas: HTMLCanvasElement,
  opts: RenderOptions
): number {
  const { memos, enableSource, width, mapHeight, pixelRatio } = opts;
  const tagCounts = aggregateTags(memos);
  const sourceCounts = enableSource ? aggregateSources(memos) : new Map<string, number>();
  const days = computeDaysSince(memos);
  const peaks = layoutPeaks(tagCounts, width, mapHeight);

  const hasSourceData = sourceCounts.size > 0;
  const footerHeight = hasSourceData ? 110 : 60;
  const totalHeight = mapHeight + footerHeight;

  canvas.width = width * pixelRatio;
  canvas.height = totalHeight * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${totalHeight}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(pixelRatio, pixelRatio);

  // Background
  ctx.fillStyle = MAP_BG;
  ctx.fillRect(0, 0, width, totalHeight);

  // Stars
  const starRng = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(starRng() * width, starRng() * mapHeight, starRng() * 1 + 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,210,240,${starRng() * 0.2 + 0.05})`;
    ctx.fill();
  }

  // Contour lines
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

  // Peak markers + labels
  for (const peak of peaks) {
    const triSize = 5 + Math.sqrt(peak.count) * 0.8;
    ctx.beginPath();
    ctx.moveTo(peak.x, peak.y - triSize);
    ctx.lineTo(peak.x - triSize * 0.65, peak.y + triSize * 0.3);
    ctx.lineTo(peak.x + triSize * 0.65, peak.y + triSize * 0.3);
    ctx.closePath();
    ctx.fillStyle = "rgba(220,235,255,0.85)";
    ctx.fill();

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

  // Footer
  const footerY = mapHeight;
  ctx.font = `300 11px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(180,210,240,0.4)";
  ctx.fillText(i18n.mapStats(memos.length, tagCounts.size, days), width / 2, footerY + 25);

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
