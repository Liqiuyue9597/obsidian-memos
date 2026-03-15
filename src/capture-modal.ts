import { App, Modal, Notice } from "obsidian";

import { extractInlineTags, parseTags } from "./utils";
import type MemosPlugin from "./plugin";

export class CaptureModal extends Modal {
  plugin: MemosPlugin;

  constructor(app: App, plugin: MemosPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("memos-capture-modal");

    const isMobile = document.body.classList.contains("is-mobile");

    // On mobile: put tag input + save button ABOVE textarea so keyboard never covers them
    let topBar: HTMLElement | null = null;
    let tagInput: HTMLInputElement;

    if (isMobile) {
      topBar = contentEl.createDiv("memos-capture-top-bar");

      // Tag input (compact, inline)
      const tagRow = topBar.createDiv("memos-capture-tag-row");
      tagRow.createSpan({ cls: "memos-capture-tag-label", text: "#" });
      tagInput = tagRow.createEl("input", {
        cls: "memos-capture-tag-input",
        attr: {
          type: "text",
          placeholder: "tags",
        },
      }) as HTMLInputElement;

      // Save button (compact, right-aligned)
      const saveBtn = topBar.createEl("button", {
        cls: "memos-capture-save-btn mod-cta",
        text: "Save",
      });
      saveBtn.addEventListener("click", () => {
        this.handleSave(textarea.value, tagInput.value);
      });
    }

    // Textarea
    const textarea = contentEl.createEl("textarea", {
      cls: "memos-capture-textarea",
      attr: {
        placeholder: "What's on your mind?",
      },
    });

    // Desktop: bottom bar with tag input + save button (original layout)
    if (!isMobile) {
      const bottomBar = contentEl.createDiv("memos-capture-bottom-bar");

      const tagRow = bottomBar.createDiv("memos-capture-tag-row");
      tagRow.createSpan({ cls: "memos-capture-tag-label", text: "#" });
      tagInput = tagRow.createEl("input", {
        cls: "memos-capture-tag-input",
        attr: {
          type: "text",
          placeholder: "tags, separated by spaces or commas",
        },
      }) as HTMLInputElement;

      if (this.plugin.settings.useFixedTag && this.plugin.settings.fixedTag) {
        const hint = bottomBar.createDiv({ cls: "memos-capture-hint" });
        hint.setText(`Fixed tag: #${this.plugin.settings.fixedTag.replace(/^#+/, "")}`);
      }

      const saveBtn = bottomBar.createEl("button", {
        cls: "memos-capture-save-btn mod-cta",
        text: "Save",
      });
      saveBtn.addEventListener("click", () => {
        this.handleSave(textarea.value, tagInput!.value);
      });
    } else {
      // Mobile: show fixed tag hint below top bar
      if (this.plugin.settings.useFixedTag && this.plugin.settings.fixedTag) {
        const hint = contentEl.createDiv({ cls: "memos-capture-hint" });
        hint.setText(`Fixed tag: #${this.plugin.settings.fixedTag.replace(/^#+/, "")}`);
        // Move hint before textarea
        contentEl.insertBefore(hint, textarea);
      }
    }

    // Keyboard shortcut
    contentEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.handleSave(textarea.value, tagInput!.value);
      }
    });

    // Auto-focus
    setTimeout(() => textarea.focus(), 50);
  }

  async handleSave(content: string, tagInputValue: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      new Notice("Memo cannot be empty.");
      return;
    }

    const explicitTags = parseTags(tagInputValue);
    const inlineTags = extractInlineTags(trimmed);
    const allTags = Array.from(new Set([...explicitTags, ...inlineTags]));

    try {
      await this.plugin.saveMemo(trimmed, allTags);
      new Notice("Memo saved!");
      this.close();
    } catch (err) {
      new Notice(`Failed to save memo: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
