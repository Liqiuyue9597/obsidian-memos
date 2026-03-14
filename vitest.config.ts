import { defineConfig } from "vitest/config";

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
      obsidian: "./tests/__mocks__/obsidian.ts",
    },
  },
});
