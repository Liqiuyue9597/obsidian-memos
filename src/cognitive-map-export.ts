import { App, Modal, Notice, Platform } from "obsidian";

import { MemoNote } from "./types";
import { i18n, t } from "./i18n";
import { renderCognitiveMap } from "./cognitive-map";
import type MemosPlugin from "./plugin";

const EXPORT_WIDTH = 390;
const EXPORT_MAP_HEIGHT = 450;
const EXPORT_PIXEL_RATIO = 2;

export class CognitiveMapExportModal extends Modal {
  plugin: MemosPlugin;
  memos: MemoNote[];

  constructor(app: App, plugin: MemosPlugin, memos: MemoNote[]) {
    super(app);
    this.plugin = plugin;
    this.memos = memos;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("memos-export-modal");

    const previewContainer = contentEl.createDiv("memos-export-preview");
    const canvas = document.createElement("canvas");
    previewContainer.appendChild(canvas);

    renderCognitiveMap(canvas, {
      memos: this.memos,
      enableSource: this.plugin.settings.enableSource,
      width: EXPORT_WIDTH,
      mapHeight: EXPORT_MAP_HEIGHT,
      pixelRatio: EXPORT_PIXEL_RATIO,
    });

    const maxPreviewWidth = 360;
    if (EXPORT_WIDTH > maxPreviewWidth) {
      const scale = maxPreviewWidth / EXPORT_WIDTH;
      canvas.setCssProps({
        "--export-map-width": `${EXPORT_WIDTH * scale}px`,
      });
      canvas.addClass("memos-map-export-scaled");
    }

    const btnRow = contentEl.createDiv("memos-export-btn-row");

    const saveBtn = btnRow.createEl("button", {
      cls: "memos-export-btn mod-cta",
      text: i18n.saveAsPng,
    });
    saveBtn.addEventListener("click", () => {
      void this.handleSave();
    });

    const copyBtn = btnRow.createEl("button", {
      cls: "memos-export-btn",
      text: i18n.copyToClipboard,
    });
    copyBtn.addEventListener("click", () => {
      void this.handleCopy();
    });
  }

  private generateBlob(): Promise<Blob> {
    const canvas = document.createElement("canvas");
    renderCognitiveMap(canvas, {
      memos: this.memos,
      enableSource: this.plugin.settings.enableSource,
      width: EXPORT_WIDTH,
      mapHeight: EXPORT_MAP_HEIGHT,
      pixelRatio: EXPORT_PIXEL_RATIO,
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        },
        "image/png"
      );
    });
  }

  private buildFilename(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `cognitive-map-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.png`;
  }

  async handleSave() {
    try {
      const blob = await this.generateBlob();
      const fname = this.buildFilename();

      if (Platform.isMobile) {
        const file = new File([blob], fname, { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
            this.close();
            return;
          } catch (shareErr: unknown) {
            if (shareErr instanceof Error && shareErr.name === "AbortError") {
              this.close();
              return;
            }
          }
        }

        const saveFolder = this.plugin.settings.saveFolder;
        const vaultPath = `${saveFolder}/${fname}`;
        const arrayBuf = await blob.arrayBuffer();
        await this.app.vault.createBinary(vaultPath, arrayBuf);
        new Notice(t("mapExportedTo", { path: vaultPath }));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        new Notice(i18n.mapExported);
      }

      this.close();
    } catch (err) {
      new Notice(
        t("exportFailed", { err: err instanceof Error ? err.message : String(err) })
      );
    }
  }

  async handleCopy() {
    try {
      const blob = await this.generateBlob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      new Notice(i18n.mapCopied);
      this.close();
    } catch (err) {
      new Notice(
        t("copyFailed", { err: err instanceof Error ? err.message : String(err) })
      );
    }
  }

  onClose() {
    // Let Obsidian handle DOM cleanup
  }
}
