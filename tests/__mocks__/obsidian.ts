// Minimal mock of the obsidian module for unit testing.
// Only types/classes referenced by testable code need stubs here.

export class TFile {
  path = "";
  name = "";
  stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder {
  children: unknown[] = [];
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}
