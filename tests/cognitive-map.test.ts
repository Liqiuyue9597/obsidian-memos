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
      for (let j = 0; j < 20 - i; j++) {
        memos.push(makeMemo([`tag${i.toString().padStart(2, "0")}`]));
      }
    }
    const result = aggregateTags(memos);
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
    expect(days).toBeLessThanOrEqual(4);
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
    expect(result[0].x).toBeGreaterThan(150);
    expect(result[0].x).toBeLessThan(250);
    expect(result[0].y).toBeGreaterThan(200);
    expect(result[0].y).toBeLessThan(300);
  });

  it("produces non-overlapping peaks for multiple tags", () => {
    const tags = new Map([["a", 40], ["b", 30], ["c", 20], ["d", 10]]);
    const result = layoutPeaks(tags, 400, 500);
    expect(result).toHaveLength(4);
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
    expect(result[0].displayLabel.length).toBeLessThanOrEqual(9);
  });
});
