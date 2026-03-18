import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TFile } from "obsidian";
import { computeStats, computeStreak, getLevel } from "../src/stats";
import { MemoNote } from "../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal MemoNote for testing. */
function makeMemo(dateLabel: string, content = "test"): MemoNote {
  return {
    file: new TFile(),
    content,
    tags: [],
    created: `${dateLabel}T12:00:00`,
    dateLabel,
    mood: "",
    source: "",
  };
}

/** Set the fake system clock to a specific YYYY-MM-DD date. */
function setToday(dateLabel: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${dateLabel}T12:00:00`));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-15T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// getLevel
// ---------------------------------------------------------------------------
describe("getLevel", () => {
  it("returns 0 for count 0", () => {
    expect(getLevel(0)).toBe(0);
  });

  it("returns 1 for count 1", () => {
    expect(getLevel(1)).toBe(1);
  });

  it("returns 2 for count 2", () => {
    expect(getLevel(2)).toBe(2);
  });

  it("returns 2 for count 3", () => {
    expect(getLevel(3)).toBe(2);
  });

  it("returns 3 for count 4", () => {
    expect(getLevel(4)).toBe(3);
  });

  it("returns 3 for count 6", () => {
    expect(getLevel(6)).toBe(3);
  });

  it("returns 4 for count 7", () => {
    expect(getLevel(7)).toBe(4);
  });

  it("returns 4 for count 100", () => {
    expect(getLevel(100)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// computeStreak
// ---------------------------------------------------------------------------
describe("computeStreak", () => {
  it("returns 0 for empty dailyCounts", () => {
    const counts = new Map<string, number>();
    expect(computeStreak(counts, "2026-03-15")).toBe(0);
  });

  it("returns 1 when only today has memos", () => {
    const counts = new Map([["2026-03-15", 3]]);
    expect(computeStreak(counts, "2026-03-15")).toBe(1);
  });

  it("returns 1 when only yesterday has memos (starts from yesterday)", () => {
    const counts = new Map([["2026-03-14", 1]]);
    expect(computeStreak(counts, "2026-03-15")).toBe(1);
  });

  it("counts consecutive days starting from today", () => {
    const counts = new Map([
      ["2026-03-15", 1],
      ["2026-03-14", 2],
      ["2026-03-13", 1],
    ]);
    expect(computeStreak(counts, "2026-03-15")).toBe(3);
  });

  it("counts consecutive days starting from yesterday when today is empty", () => {
    const counts = new Map([
      ["2026-03-14", 1],
      ["2026-03-13", 2],
      ["2026-03-12", 1],
    ]);
    expect(computeStreak(counts, "2026-03-15")).toBe(3);
  });

  it("stops at a gap", () => {
    const counts = new Map([
      ["2026-03-15", 1],
      ["2026-03-14", 1],
      // gap on 2026-03-13
      ["2026-03-12", 1],
    ]);
    expect(computeStreak(counts, "2026-03-15")).toBe(2);
  });

  it("handles long streak across month boundary", () => {
    const counts = new Map([
      ["2026-03-03", 1],
      ["2026-03-02", 1],
      ["2026-03-01", 1],
      ["2026-02-28", 1],
      ["2026-02-27", 1],
    ]);
    expect(computeStreak(counts, "2026-03-03")).toBe(5);
  });

  it("handles streak across year boundary", () => {
    const counts = new Map([
      ["2026-01-02", 1],
      ["2026-01-01", 1],
      ["2025-12-31", 1],
      ["2025-12-30", 1],
    ]);
    expect(computeStreak(counts, "2026-01-02")).toBe(4);
  });

  it("returns 0 when nearest memo is 2 days ago", () => {
    const counts = new Map([["2026-03-13", 1]]);
    expect(computeStreak(counts, "2026-03-15")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeStats
// ---------------------------------------------------------------------------
describe("computeStats", () => {
  it("returns zeros for empty memos array", () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.today).toBe(0);
    expect(stats.thisMonth).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.dailyCounts.size).toBe(0);
  });

  it("counts a single memo correctly", () => {
    // today is 2026-03-15
    const stats = computeStats([makeMemo("2026-03-15")]);
    expect(stats.total).toBe(1);
    expect(stats.today).toBe(1);
    expect(stats.thisMonth).toBe(1);
    expect(stats.streak).toBe(1);
  });

  it("counts multiple memos on the same day", () => {
    const stats = computeStats([
      makeMemo("2026-03-15"),
      makeMemo("2026-03-15"),
      makeMemo("2026-03-15"),
    ]);
    expect(stats.total).toBe(3);
    expect(stats.today).toBe(3);
    expect(stats.dailyCounts.get("2026-03-15")).toBe(3);
  });

  it("counts memos across multiple days", () => {
    const stats = computeStats([
      makeMemo("2026-03-15"),
      makeMemo("2026-03-14"),
      makeMemo("2026-03-14"),
      makeMemo("2026-03-10"),
    ]);
    expect(stats.total).toBe(4);
    expect(stats.today).toBe(1);
    expect(stats.dailyCounts.size).toBe(3);
    expect(stats.dailyCounts.get("2026-03-14")).toBe(2);
  });

  it("computes thisMonth only for current month", () => {
    // today is 2026-03-15
    const stats = computeStats([
      makeMemo("2026-03-15"),
      makeMemo("2026-03-01"),
      makeMemo("2026-02-28"), // previous month
    ]);
    expect(stats.thisMonth).toBe(2);
    expect(stats.total).toBe(3);
  });

  it("computes streak through computeStats", () => {
    const stats = computeStats([
      makeMemo("2026-03-15"),
      makeMemo("2026-03-14"),
      makeMemo("2026-03-13"),
    ]);
    expect(stats.streak).toBe(3);
  });

  it("streak starts from yesterday when today has no memos", () => {
    const stats = computeStats([
      makeMemo("2026-03-14"),
      makeMemo("2026-03-13"),
    ]);
    expect(stats.streak).toBe(2);
    expect(stats.today).toBe(0);
  });

  it("today is 0 for memos only in the past", () => {
    const stats = computeStats([makeMemo("2026-03-10")]);
    expect(stats.today).toBe(0);
  });

  it("handles memos from different months correctly", () => {
    setToday("2026-01-15");
    const stats = computeStats([
      makeMemo("2026-01-15"),
      makeMemo("2026-01-10"),
      makeMemo("2025-12-31"),
      makeMemo("2025-11-01"),
    ]);
    expect(stats.total).toBe(4);
    expect(stats.thisMonth).toBe(2); // only January
    expect(stats.today).toBe(1);
  });

  it("handles memos on Feb 29 in leap year", () => {
    setToday("2028-02-29");
    const stats = computeStats([
      makeMemo("2028-02-29"),
      makeMemo("2028-02-28"),
    ]);
    expect(stats.total).toBe(2);
    expect(stats.today).toBe(1);
    expect(stats.streak).toBe(2);
  });

  it("dailyCounts map has correct structure", () => {
    const stats = computeStats([
      makeMemo("2026-03-15"),
      makeMemo("2026-03-15"),
      makeMemo("2026-03-10"),
    ]);
    expect(stats.dailyCounts).toBeInstanceOf(Map);
    expect(stats.dailyCounts.get("2026-03-15")).toBe(2);
    expect(stats.dailyCounts.get("2026-03-10")).toBe(1);
    expect(stats.dailyCounts.has("2026-03-11")).toBe(false);
  });

  it("handles large number of memos", () => {
    const memos: MemoNote[] = [];
    for (let i = 1; i <= 31; i++) {
      const day = i.toString().padStart(2, "0");
      memos.push(makeMemo(`2026-03-${day}`));
    }
    // 31 memos, one per day in March (but today is March 15, so future dates don't affect today/streak)
    const stats = computeStats(memos);
    expect(stats.total).toBe(31);
    expect(stats.thisMonth).toBe(31); // all are March
    expect(stats.today).toBe(1);
    expect(stats.streak).toBe(15); // Mar 1–15 consecutive
  });
});
