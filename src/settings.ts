import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import type MemosPlugin from "./plugin";
import { importFlomoHtml } from "./flomo-import";

export class MemosSettingTab extends PluginSettingTab {
  plugin: MemosPlugin;

  constructor(app: App, plugin: MemosPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl).setName("Memos Settings").setHeading();

    new Setting(containerEl)
      .setName("Save folder")
      .setDesc("Folder where new memos are saved (relative to vault root).")
      .addText((text) =>
        text
          .setPlaceholder("00-Inbox")
          .setValue(this.plugin.settings.saveFolder)
          .onChange(async (value) => {
            this.plugin.settings.saveFolder = value.trim() || "00-Inbox";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Use fixed tag")
      .setDesc("Automatically add a tag to every memo you capture.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useFixedTag)
          .onChange(async (value) => {
            this.plugin.settings.useFixedTag = value;
            await this.plugin.saveSettings();
            this.display(); // re-render to show/hide tag input
          })
      );

    if (this.plugin.settings.useFixedTag) {
      new Setting(containerEl)
        .setName("Fixed tag value")
        .setDesc("This tag will be added to every memo (without #).")
        .addText((text) =>
          text
            .setPlaceholder("memo")
            .setValue(this.plugin.settings.fixedTag)
            .onChange(async (value) => {
              this.plugin.settings.fixedTag = value.trim().replace(/^#+/, "");
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Quick capture entry note")
      .setDesc(
        "Path to the entry note that triggers the capture modal when opened. " +
        "Use with the iOS widget's \"Open a specific note\" feature."
      )
      .addText((text) =>
        text
          .setPlaceholder("Quick Capture.md")
          .setValue(this.plugin.settings.captureNotePath)
          .onChange(async (value) => {
            this.plugin.settings.captureNotePath = value.trim() || "Quick Capture.md";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Extended metadata").setHeading();

    new Setting(containerEl)
      .setName("Enable mood")
      .setDesc("Show mood picker when capturing memos. Adds a mood field to frontmatter for Dataview queries.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableMood)
          .onChange(async (value) => {
            this.plugin.settings.enableMood = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.enableMood) {
      new Setting(containerEl)
        .setName("Mood options")
        .setDesc("Comma-separated emojis for the mood picker.")
        .addText((text) =>
          text
            .setPlaceholder("💡, 🤔, 😊, 😤, 📖")
            .setValue(this.plugin.settings.moodOptions.join(", "))
            .onChange(async (value) => {
              this.plugin.settings.moodOptions = value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Enable source")
      .setDesc("Show source picker when capturing memos. Adds a source field to frontmatter for Dataview queries.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableSource)
          .onChange(async (value) => {
            this.plugin.settings.enableSource = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.enableSource) {
      new Setting(containerEl)
        .setName("Source options")
        .setDesc("Comma-separated source labels (e.g. thought, kindle, web).")
        .addText((text) =>
          text
            .setPlaceholder("thought, kindle, web, conversation, podcast")
            .setValue(this.plugin.settings.sourceOptions.join(", "))
            .onChange(async (value) => {
              this.plugin.settings.sourceOptions = value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl).setName("Image export").setHeading();

    new Setting(containerEl)
      .setName("Show author name")
      .setDesc("Display your name at the bottom of exported memo images.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showAuthorInExport)
          .onChange(async (value) => {
            this.plugin.settings.showAuthorInExport = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.showAuthorInExport) {
      new Setting(containerEl)
        .setName("Author name")
        .setDesc("Your name or brand to show on exported images.")
        .addText((text) =>
          text
            .setPlaceholder("Your name")
            .setValue(this.plugin.settings.authorName)
            .onChange(async (value) => {
              this.plugin.settings.authorName = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Show branding")
      .setDesc('Display "Quick Memos for Obsidian" at the bottom of exported images.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showBrandingInExport)
          .onChange(async (value) => {
            this.plugin.settings.showBrandingInExport = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Import").setHeading();

    new Setting(containerEl)
      .setName("Import from Flomo")
      .setDesc(
        "Select the HTML file exported from Flomo. " +
        "Each memo will be converted to a .md file with proper frontmatter and saved to the save folder. " +
        "Duplicate imports are automatically skipped."
      )
      .addButton((btn) =>
        btn
          .setButtonText("Choose HTML file")
          .setCta()
          .onClick(() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".html,.htm";
            input.addEventListener("change", async () => {
              const file = input.files?.[0];
              if (!file) return;

              new Notice(`Reading ${file.name}...`);
              try {
                const html = await file.text();
                const count = await importFlomoHtml(
                  this.app,
                  html,
                  this.plugin.settings.saveFolder
                );
                if (count > 0) {
                  new Notice(`Successfully imported ${count} memos from Flomo!`);
                } else {
                  new Notice("No new memos to import (all already exist or file is empty).");
                }
              } catch (err) {
                new Notice(
                  `Import failed: ${err instanceof Error ? err.message : String(err)}`
                );
              }
            });
            input.click();
          })
      );
  }
}
