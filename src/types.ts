import { TFile } from "obsidian";

export interface MemoNote {
  file: TFile;
  content: string;  // body text (no frontmatter)
  tags: string[];   // merged frontmatter + inline #tags
  created: string;  // ISO datetime string
  dateLabel: string; // "YYYY-MM-DD" for grouping
}

export interface MemosSettings {
  saveFolder: string;        // default: "00-Inbox"
  useFixedTag: boolean;      // default: false
  fixedTag: string;          // default: ""
  captureNotePath: string;   // default: "Quick Capture.md"
}

export const DEFAULT_SETTINGS: MemosSettings = {
  saveFolder: "00-Inbox",
  useFixedTag: false,
  fixedTag: "",
  captureNotePath: "Quick Capture.md",
};
