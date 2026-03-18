import { describe, it, expect } from "vitest";
import { extractInlineTags, parseTags } from "../src/utils";

// ---------------------------------------------------------------------------
// extractInlineTags
// ---------------------------------------------------------------------------
describe("extractInlineTags", () => {
  it("extracts English tags", () => {
    expect(extractInlineTags("hello #world #test")).toEqual(["world", "test"]);
  });

  it("extracts Chinese tags", () => {
    expect(extractInlineTags("你好 #世界 #测试")).toEqual(["世界", "测试"]);
  });

  it("extracts mixed CJK and Latin tags", () => {
    expect(extractInlineTags("hello #world #你好")).toEqual(["world", "你好"]);
  });

  it("extracts tags with hyphens and slashes", () => {
    expect(extractInlineTags("#my-tag #path/to")).toEqual(["my-tag", "path/to"]);
  });

  it("returns empty array when no tags", () => {
    expect(extractInlineTags("no tags here")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(extractInlineTags("")).toEqual([]);
  });

  it("handles hash without valid tag characters", () => {
    expect(extractInlineTags("# not a tag")).toEqual([]);
  });

  it("extracts tags adjacent to punctuation", () => {
    expect(extractInlineTags("text #tag1, and #tag2.")).toEqual(["tag1", "tag2"]);
  });

  it("handles multiple tags on same line", () => {
    expect(extractInlineTags("#a #b #c")).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------
// parseTags
// ---------------------------------------------------------------------------
describe("parseTags", () => {
  it("splits by spaces", () => {
    expect(parseTags("tag1 tag2 tag3")).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("splits by commas", () => {
    expect(parseTags("tag1,tag2,tag3")).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("splits by Chinese commas", () => {
    expect(parseTags("tag1，tag2，tag3")).toEqual(["tag1", "tag2", "tag3"]);
  });

  it("handles mixed separators", () => {
    expect(parseTags("tag1, tag2 tag3，tag4")).toEqual(["tag1", "tag2", "tag3", "tag4"]);
  });

  it("strips leading # from tags", () => {
    expect(parseTags("#tag1 ##tag2")).toEqual(["tag1", "tag2"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseTags("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseTags("   ")).toEqual([]);
  });

  it("trims whitespace from tags", () => {
    expect(parseTags(" tag1 , tag2 ")).toEqual(["tag1", "tag2"]);
  });
});
