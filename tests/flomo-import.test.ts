import { describe, it, expect } from "vitest";
import { buildMemoFile, buildFilename, FlomoMemo } from "../src/flomo-import";

// ---------------------------------------------------------------------------
// buildFilename
// ---------------------------------------------------------------------------
describe("buildFilename", () => {
  it("converts standard Flomo timestamp to filename", () => {
    expect(buildFilename("2024-01-15 14:30:22", 0)).toBe("memo-2024-01-15-14-30-22.md");
  });

  it("handles timestamp with seconds", () => {
    expect(buildFilename("2023-12-31 23:59:59", 5)).toBe("memo-2023-12-31-23-59-59.md");
  });

  it("falls back to index-based name for invalid time", () => {
    expect(buildFilename("invalid", 3)).toBe("memo-flomo-import-0003.md");
  });

  it("falls back to index-based name for empty time", () => {
    expect(buildFilename("", 0)).toBe("memo-flomo-import-0000.md");
  });

  it("falls back for short timestamps", () => {
    expect(buildFilename("2024", 7)).toBe("memo-flomo-import-0007.md");
  });

  it("pads index correctly", () => {
    expect(buildFilename("", 42)).toBe("memo-flomo-import-0042.md");
  });
});

// ---------------------------------------------------------------------------
// buildMemoFile
// ---------------------------------------------------------------------------
describe("buildMemoFile", () => {
  it("generates valid frontmatter with tags", () => {
    const memo: FlomoMemo = {
      time: "2024-01-15 14:30:22",
      content: "Hello #world",
      tags: ["world"],
      images: [],
    };
    const result = buildMemoFile(memo);
    expect(result).toContain("---");
    expect(result).toContain("type: memo");
    expect(result).toContain("tags:");
    expect(result).toContain("  - world");
    expect(result).toContain('source: "flomo"');
    expect(result).toContain("status: active");
    expect(result).toContain("Hello #world");
  });

  it("generates created ISO date from Flomo time", () => {
    const memo: FlomoMemo = {
      time: "2024-06-15 10:00:00",
      content: "Test",
      tags: [],
      images: [],
    };
    const result = buildMemoFile(memo);
    expect(result).toMatch(/created: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("uses current time for invalid timestamps", () => {
    const memo: FlomoMemo = {
      time: "not-a-date",
      content: "Test",
      tags: [],
      images: [],
    };
    const result = buildMemoFile(memo);
    // Should still have a valid created field
    expect(result).toMatch(/created: \d{4}-\d{2}-\d{2}T/);
  });

  it("generates empty tags array when no tags", () => {
    const memo: FlomoMemo = {
      time: "2024-01-15 14:30:22",
      content: "No tags here",
      tags: [],
      images: [],
    };
    const result = buildMemoFile(memo);
    expect(result).toContain("tags: []");
  });

  it("appends image embeds to content", () => {
    const memo: FlomoMemo = {
      time: "2024-01-15 14:30:22",
      content: "Some text",
      tags: [],
      images: ["photo.png", "screenshot.jpg"],
    };
    const result = buildMemoFile(memo);
    expect(result).toContain("![[photo.png]]");
    expect(result).toContain("![[screenshot.jpg]]");
  });

  it("does not append image section when no images", () => {
    const memo: FlomoMemo = {
      time: "2024-01-15 14:30:22",
      content: "Just text",
      tags: [],
      images: [],
    };
    const result = buildMemoFile(memo);
    expect(result).not.toContain("![[");
  });
});
