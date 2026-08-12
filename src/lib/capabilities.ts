/**
 * Runtime feature detection for the extension APIs that differ by browser.
 *
 * Replaces upstream's build-time exclusion of overlay/disable.js for Firefox
 * and Opera (common/gulp/build.js), which a bundler cannot express: an ES
 * import is static, so the file either ships or it does not.
 *
 * Detecting at runtime is also the more honest model. `contentSettings` is
 * Chromium-only and there is no Firefox equivalent coming, so the six features
 * that use it are hidden there rather than shipped inert.
 */

const api: object = typeof browser === "undefined" ? {} : browser;

export const capabilities = {
  /** Chromium only. Gates the five Disable features and their reset. */
  contentSettings: "contentSettings" in api,

  /** Firefox has this too; it gates Clear Cache and Clear History. */
  browsingData: "browsingData" in api,
} as const;

/** So the registry can say what a feature needs without importing the values. */
export type Capabilities = typeof capabilities;
