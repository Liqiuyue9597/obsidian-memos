import { describe, it, expect } from "vitest";
import {
  extractImageEmbeds,
  stripImageEmbeds,
  fitImage,
  parseContentSegments,
} from "../src/export-image";

// ---------------------------------------------------------------------------
// extractImageEmbeds
// ---------------------------------------------------------------------------
describe("extractImageEmbeds", () => {
  it("extracts single image embed", () => {
    expect(extractImageEmbeds("Hello ![[photo.png]] world")).toEqual(["photo.png"]);
  });

  it("extracts multiple image embeds", () => {
    expect(extractImageEmbeds("![[a.png]] text ![[b.jpg]]")).toEqual(["a.png", "b.jpg"]);
  });

  it("returns empty for no embeds", () => {
    expect(extractImageEmbeds("Just plain text")).toEqual([]);
  });

  it("does not match non-embed wikilinks", () => {
    expect(extractImageEmbeds("See [[note]]")).toEqual([]);
  });

  it("handles embed with path", () => {
    expect(extractImageEmbeds("![[folder/image.webp]]")).toEqual(["folder/image.webp"]);
  });
});

// ---------------------------------------------------------------------------
// stripImageEmbeds
// ---------------------------------------------------------------------------
describe("stripImageEmbeds", () => {
  it("strips a single embed", () => {
    expect(stripImageEmbeds("Hello ![[photo.png]] world")).toBe("Hello  world");
  });

  it("strips multiple embeds", () => {
    expect(stripImageEmbeds("![[a.png]] text ![[b.jpg]]")).toBe("text");
  });

  it("returns same text when no embeds", () => {
    expect(stripImageEmbeds("Just plain text")).toBe("Just plain text");
  });

  it("trims result", () => {
    expect(stripImageEmbeds("![[img.png]]")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// fitImage
// ---------------------------------------------------------------------------
describe("fitImage", () => {
  it("does not upscale smaller images", () => {
    expect(fitImage(100, 50, 200, 200)).toEqual({ w: 100, h: 50 });
  });

  it("scales down by width when width exceeds max", () => {
    expect(fitImage(400, 200, 200, 300)).toEqual({ w: 200, h: 100 });
  });

  it("scales down by height when height exceeds max", () => {
    expect(fitImage(200, 600, 400, 300)).toEqual({ w: 100, h: 300 });
  });

  it("handles square images", () => {
    expect(fitImage(500, 500, 250, 250)).toEqual({ w: 250, h: 250 });
  });

  it("picks the most restrictive dimension", () => {
    // 800x400, max 200x300 → scale by width (0.25): 200x100
    expect(fitImage(800, 400, 200, 300)).toEqual({ w: 200, h: 100 });
  });
});

// ---------------------------------------------------------------------------
// parseContentSegments
// ---------------------------------------------------------------------------
describe("parseContentSegments", () => {
  it("parses plain text line", () => {
    const result = parseContentSegments("Hello world");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([{ text: "Hello world", isTag: false }]);
  });

  it("parses line with inline tag", () => {
    const result = parseContentSegments("Hello #world");
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
    expect(result[0][0]).toEqual({ text: "Hello ", isTag: false });
    expect(result[0][1]).toEqual({ text: "#world", isTag: true });
  });

  it("parses multiple tags on one line", () => {
    const result = parseContentSegments("#tag1 #tag2");
    expect(result[0].filter((s) => s.isTag)).toHaveLength(2);
  });

  it("handles multiple lines", () => {
    const result = parseContentSegments("Line 1\nLine 2\nLine 3");
    expect(result).toHaveLength(3);
  });

  it("handles empty lines", () => {
    const result = parseContentSegments("Line 1\n\nLine 3");
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual([{ text: "", isTag: false }]);
  });

  it("handles empty string", () => {
    const result = parseContentSegments("");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([{ text: "", isTag: false }]);
  });
});
