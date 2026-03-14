import { extractInlineTags } from "./utils";

/**
 * Parse memo content and extract body text and merged tags.
 *
 * @param raw - Full file content including frontmatter
 * @param fm - Parsed frontmatter object
 * @param frontmatterEndOffset - Character offset after closing '---\n' (from MetadataCache)
 * @returns Object with `body` (content without frontmatter) and `tags` (deduplicated)
 */
export function parseMemoContent(
  raw: string,
  fm: Record<string, unknown>,
  frontmatterEndOffset?: number
): { body: string; tags: string[] } {
  // Strip YAML frontmatter
  let body = raw;
  if (frontmatterEndOffset != null) {
    body = raw.slice(frontmatterEndOffset).trimStart();
  } else if (raw.startsWith("---")) {
    const end = raw.indexOf("---", 3);
    if (end !== -1) {
      body = raw.slice(end + 3).trimStart();
    }
  }

  // Extract inline #tags from body
  const inlineTags = extractInlineTags(body);

  // Merge frontmatter tags + inline tags
  const fmTags: string[] = [];
  if (Array.isArray(fm["tags"])) {
    for (const t of fm["tags"] as unknown[]) {
      if (typeof t === "string") fmTags.push(t);
    }
  }
  const tags = Array.from(new Set([...fmTags, ...inlineTags]));

  return { body, tags };
}
