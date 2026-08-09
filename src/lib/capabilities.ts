/**
 * Runtime feature detection for the extension APIs that differ by browser.
 *
 * Replaces upstream's build-time exclusion of overlay/disable.js for Firefox
 * and Opera (common/gulp/build.js), which a bundler cannot express: an ES
 * import is static, so the file either ships or it does not.
 *
 * Detecting at runtime is also the more honest model. `contentSettings` is
 * Chromium-only and there is no Firefox equivalent coming, so the Disable menu
 * and Disable Cookies are hidden there rather than shipped inert.
 */

const api: object = typeof browser === "undefined" ? {} : browser;

export const capabilities = {
  /** Chromium only. Gates the whole Disable menu and Disable Cookies. */
  contentSettings: "contentSettings" in api,

  /** Firefox has this too; it gates Clear Cache and Clear History. */
  browsingData: "browsingData" in api,
} as const;

/** So the registry can say what a feature needs without importing the values. */
export type Capabilities = typeof capabilities;

/**
 * Marks the document with the capabilities it has, so stylesheets can hide
 * what is unavailable without a per-browser CSS file.
 */
export function markCapabilities(root: HTMLElement = document.documentElement): void {
  for (const [name, available] of Object.entries(capabilities)) {
    if (available) {
      root.dataset[name] = "";
    }
  }
}
