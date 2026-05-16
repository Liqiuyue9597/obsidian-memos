/**
 * Vitest global setup — defines Obsidian runtime globals that are normally
 * injected by the Obsidian app at startup (window, activeWindow, activeDocument,
 * createDiv, createSpan, createEl).
 */

// In Node.js test environment, `window` is not defined. Obsidian patches `window`
// to route timer functions correctly for popout windows. We use a Proxy so that
// fake timers installed by vi.useFakeTimers() are picked up dynamically.
if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = new Proxy(globalThis, {
    get(target, prop) {
      return (target as any)[prop];
    },
  });
}

// Obsidian exposes the active window/document for popout window compatibility.
(globalThis as any).activeWindow = new Proxy(globalThis, {
  get(target, prop) {
    return (target as any)[prop];
  },
});

(globalThis as any).activeDocument = globalThis.document ?? {
  body: { classList: { contains: () => false }, appendChild: () => {}, removeChild: () => {} },
  createTextNode: (text: string) => ({ textContent: text }),
  createElement: (tag: string) => ({ tagName: tag }),
};

// Obsidian DOM helper globals
(globalThis as any).createDiv = (cls?: string) => {
  const el: any = {
    tagName: "DIV",
    className: cls ?? "",
    classList: { add: () => {}, contains: () => false },
    addClass: () => el,
    appendChild: () => el,
    setCssProps: () => {},
    createDiv: () => (globalThis as any).createDiv(),
    createSpan: () => (globalThis as any).createSpan(),
    createEl: () => el,
    empty: () => {},
    setText: () => {},
    textContent: "",
    children: [],
  };
  return el;
};

(globalThis as any).createSpan = (cls?: string) => {
  const el: any = {
    tagName: "SPAN",
    className: cls ?? "",
    classList: { add: () => {}, contains: () => false },
    addClass: () => el,
    appendChild: () => el,
    textContent: "",
  };
  return el;
};

(globalThis as any).createEl = (tag: string) => {
  const el: any = {
    tagName: tag.toUpperCase(),
    className: "",
    classList: { add: () => {}, contains: () => false },
    addClass: () => el,
    appendChild: () => el,
    setAttribute: () => {},
    textContent: "",
    src: "",
    href: "",
    download: "",
    type: "",
    accept: "",
    multiple: false,
    value: "",
    width: 0,
    height: 0,
    getContext: () => ({
      scale: () => {},
      measureText: () => ({ width: 0 }),
      fillText: () => {},
      fillRect: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      clip: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      closePath: () => {},
      fill: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      font: "",
      fillStyle: "",
    }),
    toBlob: (cb: (blob: Blob | null) => void) => cb(new Blob()),
    click: () => {},
  };
  return el;
};
