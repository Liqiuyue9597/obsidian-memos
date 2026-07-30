// Minimal mock of the obsidian module for unit testing.
// Only types/classes referenced by testable code need stubs here.

// ---------------------------------------------------------------------------
// EventRef & Events base class
// ---------------------------------------------------------------------------

export interface EventRef {
  evtName: string;
  callback: Function;
}

export class Events {
  /** Internal handler map — exposed for test inspection. */
  _handlers: Map<string, Function[]> = new Map();

  on(name: string, callback: Function): EventRef {
    const list = this._handlers.get(name) ?? [];
    list.push(callback);
    this._handlers.set(name, list);
    return { evtName: name, callback };
  }

  off(name: string, callback: Function) {
    const list = this._handlers.get(name);
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
  }

  trigger(name: string, ...args: unknown[]) {
    const list = this._handlers.get(name);
    if (!list) return;
    for (const cb of [...list]) {
      cb(...args);
    }
  }
}

// ---------------------------------------------------------------------------
// Component & ItemView
// ---------------------------------------------------------------------------

export class Component {
  _registeredEvents: EventRef[] = [];
  _children: Component[] = [];
  _cleanups: Array<() => void> = [];
  _loaded = false;

  load() {
    this._loaded = true;
    for (const child of this._children) child.load();
  }

  unload() {
    for (const child of [...this._children]) {
      child.unload();
    }
    this._children = [];
    for (const cleanup of this._cleanups.splice(0)) {
      cleanup();
    }
    this._loaded = false;
  }

  addChild<T extends Component>(component: T): T {
    this._children.push(component);
    if (this._loaded) component.load();
    return component;
  }

  removeChild<T extends Component>(component: T): T {
    const idx = this._children.indexOf(component);
    if (idx !== -1) this._children.splice(idx, 1);
    component.unload();
    return component;
  }

  register(cb: () => unknown) {
    this._cleanups.push(cb);
  }

  registerEvent(ref: EventRef) {
    this._registeredEvents.push(ref);
  }

  registerDomEvent(
    el: { addEventListener: Function; removeEventListener?: Function },
    type: string,
    callback: EventListener,
    options?: boolean | AddEventListenerOptions
  ) {
    el.addEventListener(type, callback, options);
    this._cleanups.push(() => {
      el.removeEventListener?.(type, callback, options);
    });
  }
}

function createStubEl(tag = "div"): any {
  const children: any[] = [];
  const listeners = new Map<string, Function[]>();
  const classList = new Set<string>();
  const attrs: Record<string, string> = {};
  const style: Record<string, string> & { setProperty: (k: string, v: string) => void } = {
    setProperty(k: string, v: string) {
      style[k] = v;
    },
  } as any;
  const dataset: Record<string, string> = {};

  const el: any = {
    tagName: tag.toUpperCase(),
    children,
    dataset,
    style,
    textContent: "",
    className: "",
    classList: {
      add: (...cls: string[]) => {
        for (const c of cls) classList.add(c);
        el.className = [...classList].join(" ");
      },
      remove: (...cls: string[]) => {
        for (const c of cls) classList.delete(c);
        el.className = [...classList].join(" ");
      },
      contains: (cls: string) => classList.has(cls),
    },
    addClass: (cls: string) => {
      classList.add(cls);
      el.className = [...classList].join(" ");
      return el;
    },
    removeClass: (cls: string) => {
      classList.delete(cls);
      el.className = [...classList].join(" ");
      return el;
    },
    empty: () => {
      children.length = 0;
      el.textContent = "";
      return el;
    },
    createDiv: (clsOrOpts?: string | { cls?: string; text?: string; attr?: Record<string, string> }) => {
      const child = createStubEl("div");
      applyCreateOpts(child, clsOrOpts);
      children.push(child);
      return child;
    },
    createEl: (
      tagName: string,
      opts?: string | { cls?: string; text?: string; attr?: Record<string, string> }
    ) => {
      const child = createStubEl(tagName);
      applyCreateOpts(child, opts);
      children.push(child);
      return child;
    },
    createSpan: (clsOrOpts?: string | { cls?: string; text?: string; attr?: Record<string, string> }) => {
      const child = createStubEl("span");
      applyCreateOpts(child, clsOrOpts);
      children.push(child);
      return child;
    },
    appendChild: (child: any) => {
      children.push(child);
      return child;
    },
    appendText: (text: string) => {
      el.textContent += text;
      return el;
    },
    setText: (text: string) => {
      el.textContent = text;
      return el;
    },
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
      if (name.startsWith("data-")) {
        dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      }
    },
    getAttribute: (name: string) => attrs[name] ?? null,
    closest: (_sel: string) => null,
    querySelector: (_sel: string) => null,
    querySelectorAll: (_sel: string) => [],
    matches: (_sel: string) => false,
    addEventListener: (type: string, cb: Function) => {
      const list = listeners.get(type) ?? [];
      list.push(cb);
      listeners.set(type, list);
    },
    removeEventListener: (type: string, cb: Function) => {
      const list = listeners.get(type);
      if (!list) return;
      const idx = list.indexOf(cb);
      if (idx !== -1) list.splice(idx, 1);
    },
    setCssProps: (props: Record<string, string>) => {
      Object.assign(style, props);
    },
    getBoundingClientRect: () => ({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    ownerDocument: typeof document !== "undefined" ? document : { querySelector: () => null },
    _listeners: listeners,
    _attrs: attrs,
  };
  return el;
}

function applyCreateOpts(
  el: any,
  opts?: string | { cls?: string; text?: string; attr?: Record<string, string> }
) {
  if (typeof opts === "string") {
    el.addClass(opts);
    return;
  }
  if (!opts) return;
  if (opts.cls) el.addClass(opts.cls);
  if (opts.text) el.setText(opts.text);
  if (opts.attr) {
    for (const [k, v] of Object.entries(opts.attr)) {
      el.setAttribute(k, v);
    }
  }
}

export class ItemView extends Component {
  app: App;
  leaf: WorkspaceLeaf;
  contentEl: any;

  constructor(leaf: WorkspaceLeaf) {
    super();
    this.leaf = leaf;
    this.app = leaf.app ?? ({} as App);
    this.contentEl = createStubEl("div");
    this.load();
  }

  getViewType(): string {
    return "";
  }
  getDisplayText(): string {
    return "";
  }
  getIcon(): string {
    return "";
  }
}

// ---------------------------------------------------------------------------
// File types
// ---------------------------------------------------------------------------

export class TFile {
  path = "";
  name = "";
  basename = "";
  extension = "";
  stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder {
  path = "";
  children: unknown[] = [];
}

// ---------------------------------------------------------------------------
// WorkspaceLeaf
// ---------------------------------------------------------------------------

export class WorkspaceLeaf {
  app: App;
  view: any = null;

  constructor(app?: App) {
    this.app = app ?? ({} as App);
  }

  setViewState(_state: any) {
    return Promise.resolve();
  }

  openFile(_file: TFile) {
    return Promise.resolve();
  }

  detach() {}
}

// ---------------------------------------------------------------------------
// Workspace, Vault, MetadataCache
// ---------------------------------------------------------------------------

export class Workspace extends Events {
  _hoverLinkSources: Array<{ id: string; info: { display: string; defaultMod: boolean } }> = [];

  getLeavesOfType(_type: string): WorkspaceLeaf[] {
    return [];
  }

  getLeaf(_mode?: string): WorkspaceLeaf {
    return new WorkspaceLeaf();
  }

  revealLeaf(_leaf: WorkspaceLeaf) {}

  getActiveFile(): TFile | null {
    return null;
  }

  openLinkText(_linktext: string, _sourcePath: string, _newLeaf?: boolean) {
    return Promise.resolve();
  }

  onLayoutReady(_cb: () => void) {}

  registerHoverLinkSource(id: string, info: { display: string; defaultMod: boolean }) {
    this._hoverLinkSources.push({ id, info });
  }
}

export class Vault extends Events {
  /** Internal file map — test code populates this. */
  _files: Map<string, string> = new Map();
  /** Internal abstract-file map — test code populates this. */
  _abstractFiles: Map<string, TFile | TFolder> = new Map();

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    return this._abstractFiles.get(path) ?? null;
  }

  read(file: TFile): Promise<string> {
    return Promise.resolve(this._files.get(file.path) ?? "");
  }

  getResourcePath(_file: TFile): string {
    return "";
  }

  create(_path: string, _content: string): Promise<TFile> {
    return Promise.resolve(new TFile());
  }

  createBinary(_path: string, _content: ArrayBuffer): Promise<TFile> {
    return Promise.resolve(new TFile());
  }

  createFolder(_path: string): Promise<void> {
    return Promise.resolve();
  }
}

export class MetadataCache extends Events {
  /** Internal cache map — test code populates this. */
  _cache: Map<string, any> = new Map();

  getFileCache(file: TFile): any | null {
    return this._cache.get(file.path) ?? null;
  }

  getFirstLinkpathDest(_linkpath: string, _sourcePath: string): TFile | null {
    return null;
  }
}

export class FileManager {
  getAvailablePathForAttachment(filename: string, _sourcePath?: string): Promise<string> {
    return Promise.resolve(filename);
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export class App {
  vault: Vault;
  metadataCache: MetadataCache;
  workspace: Workspace;
  fileManager: FileManager;

  constructor() {
    this.vault = new Vault();
    this.metadataCache = new MetadataCache();
    this.workspace = new Workspace();
    this.fileManager = new FileManager();
  }
}

// ---------------------------------------------------------------------------
// UI stubs
// ---------------------------------------------------------------------------

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

export class FuzzySuggestModal<T> extends Modal {
  setPlaceholder(_text: string) {}
  getItems(): T[] {
    return [];
  }
  getItemText(_item: T): string {
    return "";
  }
  onChooseItem(_item: T): void {}
}

export class Notice {
  constructor(_message: string) {}
}

export class Platform {
  static isMobile = false;
}

export class Keymap {
  static isModEvent(_evt?: MouseEvent | KeyboardEvent | null): boolean {
    return false;
  }
}

export class MarkdownRenderer {
  static _calls: Array<{
    app: App;
    markdown: string;
    el: any;
    sourcePath: string;
    component: Component;
  }> = [];

  static async render(
    app: App,
    markdown: string,
    el: any,
    sourcePath: string,
    component: Component
  ): Promise<void> {
    this._calls.push({ app, markdown, el, sourcePath, component });
    if (typeof el.appendText === "function") {
      el.appendText(markdown);
    } else if (typeof el.createEl === "function") {
      el.createEl("p", { text: markdown });
    }
  }

  static reset() {
    this._calls = [];
  }
}

export class Plugin extends Component {
  app: App;
  constructor(app?: App) {
    super();
    this.app = app ?? new App();
  }
  loadData(): Promise<any> {
    return Promise.resolve({});
  }
  saveData(_data: any): Promise<void> {
    return Promise.resolve();
  }
  registerView(_type: string, _factory: (leaf: WorkspaceLeaf) => ItemView) {}
  addCommand(_cmd: any) {}
  addRibbonIcon(_icon: string, _title: string, _cb: () => void) {}
  addSettingTab(_tab: any) {}
  registerObsidianProtocolHandler(_action: string, _handler: (params: any) => void) {}
  registerMarkdownPostProcessor(_processor: any) {}
  registerHoverLinkSource(id: string, info: { display: string; defaultMod: boolean }) {
    this.app.workspace.registerHoverLinkSource(id, info);
  }
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function setIcon(_el: unknown, _icon: string): void {
  // no-op for testing
}

export function getLanguage(): string {
  return "en";
}

export function addIcon(_name: string, _svg: string): void {
  // no-op for testing
}
