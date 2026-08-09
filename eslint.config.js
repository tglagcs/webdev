import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Replaces upstream's .eslintrc.json, which enumerated ~150 rules by hand to
 * enforce a style (Allman braces, double quotes) that Prettier cannot produce
 * and that no longer applies to code being rewritten in TypeScript.
 */
export default tseslint.config(
  {
    ignores: [
      ".output/",
      ".wxt/",
      ".smoke/",
      // Bundled output of tools/extractor-harness.py.
      ".harness/",
      "node_modules/",
      // Upstream JavaScript, carried across unchanged and deleted file by file
      // over Phases 2-7. Linting it would only produce noise about code that
      // is on its way out.
      "src/legacy/js/",
      // Vendored libraries, replaced by npm packages as the UI is rewritten.
      "src/public/lib/",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
    rules: {
      // WXT auto-imports defineBackground, defineContentScript, browser and
      // friends, so they are not undefined despite having no import.
      "no-undef": "off",
    },
  },

  {
    files: ["tools/**", "*.config.ts", "*.config.js"],
    languageOptions: { globals: globals.node },
  },
);
