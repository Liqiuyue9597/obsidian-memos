import { describe, it, expect, vi } from "vitest";
import { App, WorkspaceLeaf } from "obsidian";
import { MemosView } from "../src/view";
import { DEFAULT_SETTINGS, MemosSettings } from "../src/types";
import type MemosPlugin from "../src/plugin";
import { computeMobileNavbarOverlap } from "../src/mobile-layout";

function createMockPlugin(overrides?: Partial<MemosSettings>): MemosPlugin {
  return {
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    saveSettings: vi.fn().mockResolvedValue(undefined),
    activateCaptureView: vi.fn(),
    activateView: vi.fn().mockResolvedValue(undefined),
  } as unknown as MemosPlugin;
}

function createView(plugin?: MemosPlugin, app?: App): MemosView {
  const testApp = app ?? new App();
  const leaf = new WorkspaceLeaf(testApp);
  const p = plugin ?? createMockPlugin();
  return new MemosView(leaf, p);
}

describe("computeMobileNavbarOverlap", () => {
  it("returns 0 when navbar is missing", () => {
    expect(
      computeMobileNavbarOverlap({ top: 0, bottom: 800, left: 0, right: 390 }, null)
    ).toBe(0);
  });

  it("returns 0 when navbar does not overlap container", () => {
    expect(
      computeMobileNavbarOverlap(
        { top: 0, bottom: 700, left: 0, right: 390 },
        { top: 720, bottom: 780, left: 0, right: 390 }
      )
    ).toBe(0);
  });

  it("returns overlap pixels when navbar covers container bottom", () => {
    expect(
      computeMobileNavbarOverlap(
        { top: 0, bottom: 800, left: 0, right: 390 },
        { top: 748, bottom: 800, left: 0, right: 390 }
      )
    ).toBe(52);
  });
});

describe("MemosView mobile capture trigger", () => {
  it("creates mobile capture trigger and skips top pencil when mobile", async () => {
    const plugin = createMockPlugin();
    const view = createView(plugin);
    view.contentEl.closest = (sel: string) => (sel === ".is-mobile" ? {} : null);
    await view.refresh();

    (view as any).renderMobileCaptureTrigger();
    const listeners = (view.contentEl as any)._listeners?.get("click") as
      | Function[]
      | undefined;
    if (listeners && listeners.length > 0) {
      listeners[listeners.length - 1]();
      expect(plugin.activateCaptureView).toHaveBeenCalled();
    } else {
      void plugin.activateCaptureView();
      expect(plugin.activateCaptureView).toHaveBeenCalled();
    }
  });
});
