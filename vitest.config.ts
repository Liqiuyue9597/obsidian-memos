import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    pool: "forks",
  },
  server: {
    host: "127.0.0.1",
  },
  resolve: {
    alias: {
      // Mock the obsidian module so tests don't need the Obsidian runtime
      obsidian: path.resolve(__dirname, "tests/__mocks__/obsidian.ts"),
    },
  },
});
