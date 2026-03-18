import { INLINE_TAG_RE } from "./constants";

/** Extract inline #tags from text, returning tag names without the leading '#'. */
export function extractInlineTags(text: string): string[] {
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(INLINE_TAG_RE.source, INLINE_TAG_RE.flags);
  while ((m = re.exec(text)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}

/** Parse user-input tag string into an array of clean tag names. */
export function parseTags(input: string): string[] {
  return input
    .split(/[\s,，]+/)
    .map((t) => t.replace(/^#+/, "").trim())
    .filter((t) => t.length > 0);
}
