// Minimal mock of the obsidian module for unit testing.
// Only types/classes referenced by testable code need stubs here.

export class TFile {
  path = "";
  name = "";
  basename = "";
  extension = "";
  stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder {
  children: unknown[] = [];
}

export class Modal {
  app: unknown;
  constructor(app: unknown) {
    this.app = app;
  }
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class Notice {
  constructor(_message: string) {}
}

export class Platform {
  static isMobile = false;
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function setIcon(_el: unknown, _icon: string): void {
  // no-op for testing
}

export function getLanguage(): string {
  return "en";
}
