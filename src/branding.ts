/**
 * Fork identity.
 *
 * Replaces upstream's common/config/config.properties, whose @name@ / @url@
 * tokens were substituted into JS, CSS, HTML, JSON and locale files by
 * gulp-filter-java-properties at build time. Nothing substitutes tokens any
 * more -- import these instead.
 *
 * The version is not here: it lives in package.json, which WXT reads into the
 * manifest. Read it back with `browser.runtime.getManifest().version`.
 */

export const NAME = "WebDev";

export const DESCRIPTION = "Adds a toolbar button with various web developer tools.";

export const HOMEPAGE_URL = "https://github.com/tglagcs/webdev/";

/** Action badge colours, previously color.success / color.danger. */
export const BADGE_COLOUR = {
  success: "#198754",
  danger: "#dc3545",
} as const;

/**
 * Prefix for every element, id and class the extension injects into a host
 * page. Deliberately unchanged from upstream: it is load-bearing across the
 * feature stylesheets, the injected markup and the code that cleans both up,
 * and renaming it buys nothing a user can see.
 */
export const DOM_PREFIX = "web-developer";

/** Shown on the about page; was the @author@ build token. */
export const AUTHOR = "WebDev contributors";
