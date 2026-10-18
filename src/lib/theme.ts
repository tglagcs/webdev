/**
 * Which theme the extension's own pages use.
 *
 * `data-wd-theme` on the root rather than `prefers-color-scheme`, because the
 * user's setting has to be able to disagree with the system -- and because the
 * in-page widgets need the same attribute inside an iframe on someone else's
 * page, where a media query would follow that page's preference instead.
 *
 * Applied before the app mounts. MV3's CSP forbids the inline script that
 * would normally close the gap, so the import order in `main.ts` is what stops
 * a light flash on a dark setup.
 */

import { getOr, set } from "./storage/settings";
import type { Theme } from "./storage/schema";

export type { Theme };

function resolve(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.dataset.wdTheme = resolve(theme);
}

/** The preference this page is following, which initTheme's listeners read. */
let preference: Theme = "system";

/**
 * Reads the stored preference and applies it, then keeps following it: the
 * system's while the preference is "system", and the preference itself when
 * another page -- the options page -- changes it while this one is open.
 */
export async function initTheme(root: HTMLElement = document.documentElement): Promise<void> {
  preference = await getOr("theme", "system");

  applyTheme(preference, root);

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (preference === "system") {
      applyTheme("system", root);
    }
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "theme" in changes) {
      preference = (changes.theme!.newValue as Theme | undefined) ?? "system";
      applyTheme(preference, root);
    }
  });
}

/**
 * Changes the preference: applied here at once rather than waiting for the
 * storage event to come back, and stored so every other open page follows.
 */
export async function setTheme(
  theme: Theme,
  root: HTMLElement = document.documentElement,
): Promise<void> {
  preference = theme;
  applyTheme(theme, root);

  await set("theme", theme);
}
