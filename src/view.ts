import {
  Component,
  ItemView,
  Keymap,
  MarkdownRenderer,
  TFile,
  TFolder,
  WorkspaceLeaf,
  normalizePath,
  setIcon,
} from "obsidian";

import { VIEW_TYPE_MEMOS } from "./constants";
import { MemoNote } from "./types";
import { parseMemoContent } from "./memo-parser";
import { computeStats, renderStatsSection } from "./stats";
import type MemosPlugin from "./plugin";
import { ExportModal } from "./export-image";
import { exportToCanvas } from "./canvas-export";
import { i18n } from "./i18n";
import { watchMobileNavbarOverlap } from "./mobile-layout";

export class MemosView extends ItemView {
  plugin: MemosPlugin;
  activeTag: string | null = null;
  activeDateFilter: string | null = null;
  memos: MemoNote[] = [];
  highlightedCardEl: HTMLElement | null = null;
  /** Owns MarkdownRenderer child components; replaced on each refresh. */
  private cardRenderComponent: Component | null = null;
  /** Guards async refresh steps against stale generations. */
  private renderGeneration = 0;

  constructor(leaf: WorkspaceLeaf, plugin: MemosPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_MEMOS;
  }

  getDisplayText(): string {
    return i18n.memosTitle;
  }

  getIcon(): string {
    return "sticky-note";
  }

  private refreshTimer: number | null = null;

  /** Debounced refresh — coalesces rapid vault events into a single refresh. */
  private debouncedRefresh() {
    if (this.refreshTimer) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 300);
  }

  async onOpen() {
    this.contentEl.addClass("memos-view");
    // Measure once for the view lifetime; CSS var is read by mobile trigger / padding.
    watchMobileNavbarOverlap(this, {
      container: this.contentEl,
      workspace: this.app.workspace,
    });
    await this.refresh();

    // Re-render on vault changes within the save folder (debounced)
    const folderPrefix = normalizePath(this.plugin.settings.saveFolder) + "/";
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile && file.path.startsWith(folderPrefix)) this.debouncedRefresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile && file.path.startsWith(folderPrefix)) {
          // If the deleted file is open in an editor tab, navigate back to
          // Memos view.  We do NOT call leaf.detach() ourselves — Obsidian's
          // own delete handling will close / repurpose the leaf internally.
          // Calling detach() here would race with Obsidian and cause
          // "Cannot read properties of null (reading 'children')" because
          // Obsidian's internal handler tries to access leaf.parent.children
          // on a leaf we already detached.
          const hasOpenLeaf = this.app.workspace
            .getLeavesOfType("markdown")
            .some((leaf) => {
              const viewFile = (leaf.view as { file?: TFile }).file;
              return viewFile?.path === file.path;
            });
          if (hasOpenLeaf) {
            void this.plugin.activateView();
          }
          this.debouncedRefresh();
        }
      })
    );
    // Listen to metadataCache "changed" instead of vault "modify".
    // When a memo file is edited and saved, vault "modify" fires before
    // metadataCache has re-parsed the frontmatter, so refresh() would
    // read stale cache data.  The "changed" event fires only after the
    // cache is up-to-date, ensuring we always render the latest content.
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (file instanceof TFile && file.path.startsWith(folderPrefix)) this.debouncedRefresh();
      })
    );
  }

  async onClose() {
    await Promise.resolve();
    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.disposeCardRenderComponent();
  }

  /** Tear down MarkdownRenderer child components from the previous refresh. */
  private disposeCardRenderComponent() {
    if (this.cardRenderComponent) {
      this.removeChild(this.cardRenderComponent);
      this.cardRenderComponent = null;
    }
  }

  async refresh() {
    await this.loadMemos();
    this.disposeCardRenderComponent();
    this.contentEl.empty();
    this.highlightedCardEl = null;

    const generation = ++this.renderGeneration;
    this.cardRenderComponent = new Component();
    this.addChild(this.cardRenderComponent);

    const isMobile = this.contentEl.closest(".is-mobile") !== null;

    const toolbar = this.contentEl.createDiv("memos-toolbar");
    this.renderToolbar(toolbar, isMobile);

    // On mobile: stats + cards share a single scroll container so the
    // heatmap scrolls away while the toolbar stays pinned at the top.
    // On desktop: stats stays fixed above the scrollable card list.
    if (isMobile) {
      const scrollContainer = this.contentEl.createDiv("memos-cards-container");

      const statsContainer = scrollContainer.createDiv();
      const stats = computeStats(this.memos);
      renderStatsSection(statsContainer, stats, this.plugin.settings.statsCollapsed, {
        onToggle: () => this.handleStatsToggle(),
        onDateClick: (date) => this.handleDateFilter(date),
      });

      await this.renderCards(scrollContainer, generation);
      if (generation !== this.renderGeneration) return;

      this.renderMobileCaptureTrigger();
    } else {
      const statsContainer = this.contentEl.createDiv();
      const stats = computeStats(this.memos);
      renderStatsSection(statsContainer, stats, this.plugin.settings.statsCollapsed, {
        onToggle: () => this.handleStatsToggle(),
        onDateClick: (date) => this.handleDateFilter(date),
      });

      const cardsContainer = this.contentEl.createDiv("memos-cards-container");
      await this.renderCards(cardsContainer, generation);
    }
  }

  /** Content-area bottom capture trigger — above Obsidian's system navbar. */
  private renderMobileCaptureTrigger() {
    const trigger = this.contentEl.createDiv({
      cls: "memos-mobile-capture-trigger",
      attr: {
        role: "button",
        tabindex: "0",
        "aria-label": i18n.newMemo,
      },
    });

    trigger.createSpan({
      cls: "memos-mobile-capture-placeholder",
      text: i18n.whatsOnYourMind,
    });

    const btn = trigger.createDiv("memos-mobile-capture-btn");
    setIcon(btn, "pencil");

    const openCapture = () => {
      void this.plugin.activateCaptureView();
    };
    trigger.addEventListener("click", openCapture);
    trigger.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCapture();
      }
    });
  }

  async loadMemos() {
    const folder = normalizePath(this.plugin.settings.saveFolder);
    const abstractFolder = this.app.vault.getAbstractFileByPath(folder);

    // Safety: if folder doesn't exist or isn't a TFolder, return empty
    if (!abstractFolder || !(abstractFolder instanceof TFolder)) {
      this.memos = [];
      return;
    }

    const files = abstractFolder.children.filter(
      (f): f is TFile => f instanceof TFile && f.name.endsWith(".md")
    );

    // Parallel read for better performance with many files
    const results = (
      await Promise.all(
        files.map(async (file) => {
          const cache = this.app.metadataCache.getFileCache(file);
          const fm = cache?.frontmatter;
          if (!fm || fm["type"] !== "memo") return null;

          const raw = await this.app.vault.read(file);
          return this.parseMemo(file, raw, fm, cache);
        })
      )
    ).filter((m): m is MemoNote => m !== null);

    results.sort((a, b) => b.created.localeCompare(a.created));
    this.memos = results;
  }

  parseMemo(
    file: TFile,
    raw: string,
    fm: Record<string, unknown>,
    cache?: ReturnType<typeof this.app.metadataCache.getFileCache>
  ): MemoNote {
    const fmEndOffset = cache?.frontmatterPosition?.end?.offset;
    const { body, tags } = parseMemoContent(raw, fm, fmEndOffset);

    const created =
      typeof fm["created"] === "string"
        ? fm["created"]
        : (file.stat.ctime
          ? new Date(file.stat.ctime).toISOString()
          : new Date().toISOString());

    const dateLabel = created.slice(0, 10);

    const mood = typeof fm["mood"] === "string" ? fm["mood"].replace(/^"|"$/g, "") : "";
    const source = typeof fm["source"] === "string" ? fm["source"].replace(/^"|"$/g, "") : "";

    return { file, content: body, tags, created, dateLabel, mood, source };
  }

  renderToolbar(el: HTMLElement, isMobile: boolean) {
    const left = el.createDiv("memos-toolbar-left");

    const count = this.memos.filter(
      (m) =>
        (!this.activeTag || m.tags.includes(this.activeTag)) &&
        (!this.activeDateFilter || m.dateLabel === this.activeDateFilter)
    ).length;
    left.createSpan({
      cls: "memos-count",
      text: i18n.memoCount(count),
    });

    if (this.activeTag) {
      const pill = left.createSpan({ cls: "memos-active-filter-pill" });
      pill.setText(`#${this.activeTag}`);
      const x = pill.createSpan({ cls: "memos-filter-clear", text: " ×" });
      x.addEventListener("click", () => {
        this.activeTag = null;
        void this.refresh();
      });
    }

    if (this.activeDateFilter) {
      const pill = left.createSpan({ cls: "memos-active-filter-pill memos-date-filter-pill" });
      pill.setText(this.activeDateFilter);
      const x = pill.createSpan({ cls: "memos-filter-clear", text: " ×" });
      x.addEventListener("click", () => {
        this.activeDateFilter = null;
        void this.refresh();
      });
    }

    const right = el.createDiv("memos-toolbar-right");

    // Desktop: compact pencil in toolbar. Mobile uses the bottom capture trigger.
    if (!isMobile) {
      const captureBtn = right.createDiv({
        cls: "memos-toolbar-btn",
        attr: { "aria-label": i18n.newMemo },
      });
      setIcon(captureBtn, "pencil");
      captureBtn.addEventListener("click", () => {
        void this.plugin.activateCaptureView();
      });
    }

    const randomBtn = right.createDiv({
      cls: "memos-toolbar-btn",
      attr: { "aria-label": i18n.randomReview },
    });
    setIcon(randomBtn, "dice");
    randomBtn.addEventListener("click", () => {
      this.handleRandomReview();
    });

    const canvasBtn = right.createDiv({
      cls: "memos-toolbar-btn",
      attr: { "aria-label": i18n.sendToCanvas },
    });
    setIcon(canvasBtn, "layout-dashboard");
    canvasBtn.addEventListener("click", () => {
      const filtered = this.getFilteredMemos();
      void exportToCanvas(this.app, filtered);
    });
  }

  async renderCards(el: HTMLElement, generation: number) {
    const filtered = this.getFilteredMemos();

    if (filtered.length === 0) {
      const empty = el.createDiv("memos-empty");
      empty.createSpan({ text: i18n.noMemosYet });
      return;
    }

    // Group by date — insert shells synchronously to keep order stable
    const groups = new Map<string, MemoNote[]>();
    for (const memo of filtered) {
      const g = groups.get(memo.dateLabel) ?? [];
      g.push(memo);
      groups.set(memo.dateLabel, g);
    }

    const pending: Promise<void>[] = [];
    for (const [date, memos] of groups) {
      const group = el.createDiv("memos-date-group");
      group.createDiv({ cls: "memos-date-header", text: date });
      for (const memo of memos) {
        pending.push(this.renderCard(memo, group, generation));
      }
    }

    await Promise.all(pending);
  }

  async renderCard(memo: MemoNote, el: HTMLElement, generation: number) {
    const card = el.createDiv("memos-card");
    card.dataset["path"] = memo.file.path;

    const contentDiv = card.createDiv("memos-card-content markdown-rendered");
    const renderParent = this.cardRenderComponent ?? this;
    await MarkdownRenderer.render(
      this.app,
      memo.content,
      contentDiv,
      memo.file.path,
      renderParent
    );

    if (generation !== this.renderGeneration) return;

    this.normalizeCardEmbeds(contentDiv);
    this.wireCardInteractions(contentDiv, memo.file.path);

    // Footer
    const footer = card.createDiv("memos-card-footer");

    if (memo.tags.length > 0) {
      const tagsEl = footer.createDiv("memos-card-tags");
      for (const tag of memo.tags) {
        const pill = tagsEl.createSpan({ cls: "memos-tag-pill", text: `#${tag}` });
        pill.addEventListener("click", (e) => {
          e.stopPropagation();
          this.handleTagClick(tag);
        });
      }
    }

    // Right side of footer: mood + source + time + share button
    const footerRight = footer.createDiv("memos-card-footer-right");

    if (memo.mood) {
      footerRight.createSpan({ cls: "memos-card-mood", text: memo.mood });
    }

    if (memo.source) {
      footerRight.createSpan({ cls: "memos-card-source", text: memo.source });
    }

    const time = footerRight.createSpan({ cls: "memos-card-time" });
    const d = new Date(memo.created);
    time.setText(
      `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`
    );

    const shareBtn = footerRight.createDiv({
      cls: "memos-card-share-btn",
      attr: { "aria-label": i18n.exportAsImage },
    });
    setIcon(shareBtn, "share");
    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      new ExportModal(this.app, this.plugin, memo).open();
    });

    // Click card → open file
    card.addEventListener("click", () => {
      this.openMemo(memo.file);
    });
  }

  /**
   * Keep image embeds; restore unresolved images and non-image markdown
   * embeds as plain text so cards don't recursively expand notes.
   */
  private normalizeCardEmbeds(container: HTMLElement) {
    const doc = container.ownerDocument;
    const embeds = container.querySelectorAll(".internal-embed, .media-embed, .markdown-embed");
    embeds.forEach((embed) => {
      if (!embed.instanceOf(HTMLElement)) return;

      const hasImg = !!embed.querySelector("img");
      const isImage =
        hasImg ||
        embed.classList.contains("image-embed") ||
        embed.classList.contains("media-embed");

      if (isImage && hasImg) return;

      const src = embed.getAttribute("src") ?? "";
      const text = src ? `![[${src}]]` : (embed.textContent ?? "");
      embed.replaceWith(doc.createTextNode(text));
    });
  }

  /**
   * Wire interactions that MarkdownRenderer doesn't enable in custom ItemViews:
   * tag filter clicks, internal-link navigation / hover, and stopPropagation so
   * interactive elements don't also open the memo file.
   */
  private wireCardInteractions(container: HTMLElement, sourcePath: string) {
    container.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element) || !target.instanceOf(HTMLElement)) return;

      const tagEl = target.closest("a.tag");
      if (tagEl instanceof Element && tagEl.instanceOf(HTMLElement)) {
        e.preventDefault();
        e.stopPropagation();
        const href = tagEl.getAttribute("href") ?? "";
        let tag = href.replace(/^#/, "");
        try {
          tag = decodeURIComponent(tag);
        } catch {
          // keep raw
        }
        if (!tag) {
          tag = (tagEl.textContent ?? "").replace(/^#/, "").trim();
        }
        if (tag) this.handleTagClick(tag);
        return;
      }

      const linkEl = target.closest("a.internal-link");
      if (linkEl instanceof Element && linkEl.instanceOf(HTMLElement)) {
        e.preventDefault();
        e.stopPropagation();
        const linktext =
          linkEl.getAttribute("data-href") || linkEl.getAttribute("href");
        if (linktext) {
          void this.app.workspace.openLinkText(
            linktext,
            sourcePath,
            Keymap.isModEvent(e)
          );
        }
        return;
      }

      if (target.closest("a, img, button, input, .internal-embed, .media-embed")) {
        e.stopPropagation();
      }
    });

    container.addEventListener("mouseover", (event: Event) => {
      const mouseEvent = event as MouseEvent;
      const target = mouseEvent.target;
      if (!(target instanceof Element) || !target.instanceOf(HTMLElement)) return;
      const linkEl = target.closest("a.internal-link");
      if (!(linkEl instanceof Element) || !linkEl.instanceOf(HTMLElement)) return;
      const linktext =
        linkEl.getAttribute("data-href") || linkEl.getAttribute("href");
      if (!linktext) return;
      this.app.workspace.trigger("hover-link", {
        event: mouseEvent,
        source: VIEW_TYPE_MEMOS,
        hoverParent: this,
        targetEl: linkEl,
        linktext,
        sourcePath,
      });
    });
  }

  handleTagClick(tag: string | null) {
    if (tag === null) {
      this.activeTag = null;
    } else {
      this.activeTag = this.activeTag === tag ? null : tag;
    }
    void this.refresh();
  }

  /** Return memos filtered by the currently active tag and date filters. */
  getFilteredMemos(): MemoNote[] {
    let filtered = this.memos;
    if (this.activeTag) {
      filtered = filtered.filter((m) => m.tags.includes(this.activeTag!));
    }
    if (this.activeDateFilter) {
      filtered = filtered.filter((m) => m.dateLabel === this.activeDateFilter);
    }
    return filtered;
  }

  handleRandomReview() {
    // Remove previous highlight
    if (this.highlightedCardEl) {
      this.highlightedCardEl.removeClass("memos-card-highlighted");
      this.highlightedCardEl = null;
    }

    const filtered = this.getFilteredMemos();

    if (filtered.length === 0) return;

    const idx = Math.floor(Math.random() * filtered.length);
    const target = filtered[idx];

    const cardEl = this.contentEl.querySelector<HTMLElement>(
      `[data-path="${CSS.escape(target.file.path)}"]`
    );

    if (cardEl) {
      cardEl.addClass("memos-card-highlighted");
      this.highlightedCardEl = cardEl;
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  handleDateFilter(date: string) {
    this.activeDateFilter = this.activeDateFilter === date ? null : date;
    void this.refresh();
  }

  handleStatsToggle() {
    this.plugin.settings.statsCollapsed = !this.plugin.settings.statsCollapsed;
    void this.plugin.saveSettings();
    void this.refresh();
  }

  openMemo(file: TFile) {
    // Check if the file is already open in a markdown tab
    const existing = this.app.workspace.getLeavesOfType("markdown").find((leaf) => {
      const viewFile = (leaf.view as { file?: TFile }).file;
      return viewFile?.path === file.path;
    });

    if (existing) {
      void this.app.workspace.revealLeaf(existing);
    } else {
      const leaf = this.app.workspace.getLeaf("tab");
      void leaf.openFile(file);
    }
  }
}
