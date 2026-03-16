import { ItemView, WorkspaceLeaf, Notice, setIcon, FuzzySuggestModal, TFile, App } from "obsidian";

import { VIEW_TYPE_CAPTURE } from "./constants";
import { extractInlineTags, parseTags } from "./utils";
import type MemosPlugin from "./plugin";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

/** Modal that lets the user pick an image file from the vault. */
export class ImageSuggestModal extends FuzzySuggestModal<TFile> {
  private onChoose: (file: TFile) => void;

  constructor(app: App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("搜索图片文件…");
  }

  getItems(): TFile[] {
    return this.app.vault.getFiles().filter((f) =>
      IMAGE_EXTENSIONS.includes(f.extension.toLowerCase())
    );
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

export class CaptureItemView extends ItemView {
  plugin: MemosPlugin;
  private textarea!: HTMLTextAreaElement;
  private tagInput!: HTMLInputElement;

  constructor(leaf: WorkspaceLeaf, plugin: MemosPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CAPTURE;
  }

  getDisplayText(): string {
    return "Quick Capture";
  }

  getIcon(): string {
    return "pencil";
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.addClass("memos-capture-view-container");

    // ── Top bar: back button + save button ──
    const topBar = container.createDiv("memos-capture-top-bar");

    const backBtn = topBar.createEl("button", {
      cls: "memos-capture-back-btn clickable-icon",
    });
    setIcon(backBtn, "arrow-left");
    backBtn.addEventListener("click", async () => {
      await this.plugin.activateView();
      this.leaf.detach();
    });

    const saveBtn = topBar.createEl("button", {
      cls: "memos-capture-save-btn mod-cta",
      text: "Save",
    });
    saveBtn.addEventListener("click", () => {
      this.handleSave();
    });

    // ── Tag row ──
    const tagRow = container.createDiv("memos-capture-tag-row");
    tagRow.createSpan({ cls: "memos-capture-tag-label", text: "#" });
    this.tagInput = tagRow.createEl("input", {
      cls: "memos-capture-tag-input",
      attr: {
        type: "text",
        placeholder: "tags, separated by spaces or commas",
      },
    }) as HTMLInputElement;

    // Fixed tag hint
    if (this.plugin.settings.useFixedTag && this.plugin.settings.fixedTag) {
      const hint = container.createDiv({ cls: "memos-capture-hint" });
      hint.setText(
        `Fixed tag: #${this.plugin.settings.fixedTag.replace(/^#+/, "")}`
      );
    }

    // ── Action row (image button) ──
    const actionRow = container.createDiv("memos-capture-action-row");
    const imageBtn = actionRow.createEl("button", {
      cls: "memos-capture-action-btn clickable-icon",
      attr: { "aria-label": "插入图片" },
    });
    setIcon(imageBtn, "image");
    imageBtn.addEventListener("click", () => {
      new ImageSuggestModal(this.app, (file) => {
        this.insertAtCursor(`![[${file.name}]]`);
      }).open();
    });

    // ── Textarea ──
    this.textarea = container.createEl("textarea", {
      cls: "memos-capture-textarea",
      attr: {
        placeholder: "What's on your mind?",
      },
    });

    // Keyboard shortcut: Ctrl/Cmd + Enter to save
    container.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.handleSave();
      }
    });

    // Delay focus slightly so the initial layout is stable before keyboard appears
    setTimeout(() => this.textarea.focus(), 100);
  }

  async onClose() {
    this.contentEl.empty();
  }

  /** Insert text at the current cursor position in the textarea. */
  private insertAtCursor(text: string) {
    const ta = this.textarea;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + text + after;
    const newPos = start + text.length;
    ta.selectionStart = newPos;
    ta.selectionEnd = newPos;
    ta.focus();
  }

  private async handleSave() {
    const trimmed = this.textarea.value.trim();
    if (!trimmed) {
      new Notice("Memo cannot be empty.");
      return;
    }

    const explicitTags = parseTags(this.tagInput.value);
    const inlineTags = extractInlineTags(trimmed);
    const allTags = Array.from(new Set([...explicitTags, ...inlineTags]));

    try {
      await this.plugin.saveMemo(trimmed, allTags);
      new Notice("Memo saved!");
      await this.plugin.activateView();
      this.leaf.detach();
    } catch (err) {
      new Notice(
        `Failed to save memo: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
