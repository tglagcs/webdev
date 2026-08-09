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
    setupFiles: ["tests/setup/i18n.ts", "tests/setup/dom.ts"],
    environmentOptions: {
      happyDOM: {
        // Pinned because the extractors resolve relative hrefs against it and
        // put documentURI in every payload. Left to default, the snapshots
        // would encode happy-dom's localhost base and differ in CI.
        url: "https://fixture.test/host-page.html",
        // The features inject <link href="chrome-extension://...">, which
        // happy-dom tries to fetch and then reports as an unsupported scheme,
        // once per injected stylesheet. The tests assert on the element being
        // in the document, not on the sheet loading, so the fetch is pure
        // noise -- and it cannot succeed for any of these fixtures anyway.
        // handleDisabledFileLoadingAsSuccess is the half that matters: with
        // loading merely disabled, happy-dom still fires an error event per
        // link and prints the stack.
        settings: {
          disableCSSFileLoading: true,
          disableJavaScriptFileLoading: true,
          handleDisabledFileLoadingAsSuccess: true,
        },
      },
    },
  },
});
