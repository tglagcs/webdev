import { resolve } from "node:path";

import { defineConfig } from "vite";

/**
 * Bundles the extractors into one IIFE that assigns them to window.__WD__,
 * so a real browser can run them against tests/harness/page.html.
 */
export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "../../src") } },
  build: {
    outDir: resolve(import.meta.dirname, "../../.harness"),
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: resolve(import.meta.dirname, "entry.ts"),
      formats: ["iife"],
      name: "__WD__",
      fileName: () => "extractors.js",
    },
  },
});
