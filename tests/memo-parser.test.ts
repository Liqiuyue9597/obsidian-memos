import { describe, it, expect } from "vitest";
import { parseMemoContent } from "../src/memo-parser";

describe("parseMemoContent", () => {
  const sampleRaw = `---
created: 2025-01-01T00:00:00.000Z
type: memo
tags:
  - frontmatter-tag
---

Hello #world this is a memo`;

  // -----------------------------------------------------------------------
  // Using frontmatterEndOffset
  // -----------------------------------------------------------------------
  describe("with frontmatterEndOffset", () => {
    it("extracts body using offset", () => {
      // The offset points to just after the closing '---\n'
      const closingIndex = sampleRaw.indexOf("---", 3);
      const offset = closingIndex + 4; // past '---\n'
      const { body } = parseMemoContent(sampleRaw, { tags: ["frontmatter-tag"] }, offset);
      expect(body).toBe("Hello #world this is a memo");
    });

    it("extracts inline tags from body", () => {
      const closingIndex = sampleRaw.indexOf("---", 3);
      const offset = closingIndex + 4;
      const { tags } = parseMemoContent(sampleRaw, { tags: ["frontmatter-tag"] }, offset);
      expect(tags).toContain("world");
    });

    it("merges frontmatter and inline tags", () => {
      const closingIndex = sampleRaw.indexOf("---", 3);
      const offset = closingIndex + 4;
      const { tags } = parseMemoContent(sampleRaw, { tags: ["frontmatter-tag"] }, offset);
      expect(tags).toContain("frontmatter-tag");
      expect(tags).toContain("world");
    });
  });

  // -----------------------------------------------------------------------
  // Fallback: manual --- parsing
  // -----------------------------------------------------------------------
  describe("without frontmatterEndOffset (fallback)", () => {
    it("extracts body by finding closing ---", () => {
      const { body } = parseMemoContent(sampleRaw, { tags: ["frontmatter-tag"] });
      expect(body).toBe("Hello #world this is a memo");
    });

    it("extracts tags via fallback", () => {
      const { tags } = parseMemoContent(sampleRaw, { tags: ["frontmatter-tag"] });
      expect(tags).toContain("frontmatter-tag");
      expect(tags).toContain("world");
    });
  });

  // -----------------------------------------------------------------------
  // Tag deduplication
  // -----------------------------------------------------------------------
  describe("tag deduplication", () => {
    it("removes duplicate tags between frontmatter and inline", () => {
      const raw = `---
tags:
  - shared
---

Content with #shared tag`;
      const closingIndex = raw.indexOf("---", 3);
      const offset = closingIndex + 4;
      const { tags } = parseMemoContent(raw, { tags: ["shared"] }, offset);
      // "shared" should appear only once
      expect(tags.filter((t) => t === "shared")).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("handles no frontmatter tags", () => {
      const raw = `---
created: 2025-01-01T00:00:00.000Z
type: memo
---

Just text #hello`;
      const closingIndex = raw.indexOf("---", 3);
      const offset = closingIndex + 4;
      const { tags } = parseMemoContent(raw, {}, offset);
      expect(tags).toEqual(["hello"]);
    });

    it("handles empty body", () => {
      const raw = `---
type: memo
---
`;
      const closingIndex = raw.indexOf("---", 3);
      const offset = closingIndex + 4;
      const { body, tags } = parseMemoContent(raw, {}, offset);
      expect(body).toBe("");
      expect(tags).toEqual([]);
    });

    it("handles non-array frontmatter tags gracefully", () => {
      const raw = `---
tags: not-an-array
---

Body text`;
      const closingIndex = raw.indexOf("---", 3);
      const offset = closingIndex + 4;
      const { tags } = parseMemoContent(raw, { tags: "not-an-array" }, offset);
      // Non-array tags should be ignored, only inline tags extracted
      expect(tags).toEqual([]);
    });

    it("handles content without frontmatter delimiters", () => {
      const raw = "Just plain text #tag1";
      const { body, tags } = parseMemoContent(raw, {});
      expect(body).toBe("Just plain text #tag1");
      expect(tags).toEqual(["tag1"]);
    });
  });
});
