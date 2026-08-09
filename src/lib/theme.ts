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

import { getOr } from "./storage/settings";
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

/** Reads the stored preference and applies it, following the system if asked. */
export async function initTheme(root: HTMLElement = document.documentElement): Promise<void> {
  const theme = await getOr("theme", "system");

  applyTheme(theme, root);

  if (theme === "system") {
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      applyTheme("system", root);
    });
  }
}
