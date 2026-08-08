import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  // Gives the tests the same aliases and auto-imports the entrypoints get.
  plugins: [WxtVitest()],
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    // fakeBrowser throws for i18n.getMessage; this resolves it against the
    // real en_US catalogue instead.
    setupFiles: ["tests/setup/i18n.ts"],
    environmentOptions: {
      happyDOM: {
        // Pinned because the extractors resolve relative hrefs against it and
        // put documentURI in every payload. Left to default, the snapshots
        // would encode happy-dom's localhost base and differ in CI.
        url: "https://fixture.test/host-page.html",
      },
    },
  },
});
