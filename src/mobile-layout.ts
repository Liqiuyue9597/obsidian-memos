import type { Component, Workspace } from "obsidian";

export interface RectLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MobileNavbarOverlapOptions {
  container: HTMLElement;
  workspace?: Workspace;
  /** Optional document override for tests. Defaults to container.ownerDocument. */
  doc?: Document;
  /** Optional query selector override for tests. Defaults to `.mobile-navbar`. */
  navbarSelector?: string;
}

/**
 * Compute how many CSS pixels of `container` are covered by Obsidian's
 * mobile navbar from the bottom. Returns 0 when the navbar is missing or
 * does not overlap the container.
 */
export function computeMobileNavbarOverlap(
  containerRect: RectLike,
  navbarRect: RectLike | null
): number {
  if (!navbarRect) return 0;
  return Math.max(0, containerRect.bottom - navbarRect.top);
}

/**
 * Measure `.mobile-navbar` overlap against `container` and write
 * `--memos-mobile-navbar-overlap` on the container for CSS to consume.
 *
 * Re-measures on ResizeObserver, window resize, and workspace layout-change.
 * Cleanup is registered on `owner`.
 */
export function watchMobileNavbarOverlap(
  owner: Component,
  options: MobileNavbarOverlapOptions
): void {
  const {
    container,
    workspace,
    doc = container.ownerDocument,
    navbarSelector = ".mobile-navbar",
  } = options;

  let frame = 0;

  const measure = () => {
    frame = 0;
    const navbar = doc.querySelector(navbarSelector);
    const containerRect = container.getBoundingClientRect();
    const navbarRect = navbar ? navbar.getBoundingClientRect() : null;
    const overlap = computeMobileNavbarOverlap(containerRect, navbarRect);
    container.style.setProperty("--memos-mobile-navbar-overlap", `${overlap}px`);
  };

  const schedule = () => {
    if (frame) return;
    const raf =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0);
    frame = raf(() => {
      measure();
    });
  };

  schedule();

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => schedule());
    observer.observe(container);
    const navbar = doc.querySelector(navbarSelector);
    if (navbar instanceof Element) observer.observe(navbar);
  }

  const onResize = () => schedule();
  if (typeof window.addEventListener === "function") {
    window.addEventListener("resize", onResize);
  }

  if (workspace) {
    owner.registerEvent(workspace.on("layout-change", () => schedule()));
  }

  owner.register(() => {
    if (frame) {
      if (typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(frame);
      } else {
        window.clearTimeout(frame);
      }
      frame = 0;
    }
    observer?.disconnect();
    if (typeof window.removeEventListener === "function") {
      window.removeEventListener("resize", onResize);
    }
  });
}
