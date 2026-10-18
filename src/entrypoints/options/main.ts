// Loads the legacy scripts this page used to pull in with <script src>
// tags, in the order common/gulp/build.js concatenated them.
import "@/legacy/globals";
// Must precede the legacy imports: it makes them defer their
// initialisers instead of running each one on import.
import { flushDomReady } from "@/legacy/dom-ready";
import "@/legacy/shims/dom";
import "@/legacy/shims/locales";
import "@/legacy/shims/storage";
import "@/legacy/js/options/options.js";

import "./style.css";
import { t } from "@/lib/i18n";
import { getOr, set } from "@/lib/storage/settings";
import { initTheme, setTheme, type Theme } from "@/lib/theme";

// Bootstrap draws the select arrow, the close button and the check mark as
// images and picks them by data-bs-theme, so it has to follow ours. Observed
// rather than set once: following the system means data-wd-theme can change
// while the page is open.
const root = document.documentElement;

new MutationObserver(() => {
  root.dataset.bsTheme = root.dataset.wdTheme;
}).observe(root, { attributeFilter: ["data-wd-theme"] });

await initTheme();

flushDomReady();

// After flushDomReady, not in the markup: localizeColorsTab finds the
// syntax highlighting options by the first [value="dark"] and [value="light"]
// in the document, and this select comes before that one.
const themeSelect = document.getElementById("theme") as HTMLSelectElement;
const THEMES: [Theme, string][] = [
  ["system", t("themeSystem")],
  ["light", t("light")],
  ["dark", t("dark")],
];

document.getElementById("resize-options-heading")!.append(t("windowSizes"));
document.getElementById("responsive-layouts-heading")!.append(t("responsiveLayouts"));

document.querySelector('[for="theme"]')!.append(t("theme"));
themeSelect.append(...THEMES.map(([value, label]) => new Option(label, value)));
themeSelect.value = await getOr("theme", "system");

themeSelect.addEventListener("change", () => {
  void setTheme(themeSelect.value as Theme);
});

// Not in options.js, which predates the JSON viewer.
const jsonViewerAuto = document.getElementById("json_viewer_auto") as HTMLInputElement;

document.querySelector('[for="json_viewer_auto"]')!.append(t("jsonViewerAuto"));
jsonViewerAuto.checked = await getOr("json_viewer_auto", true);
jsonViewerAuto.addEventListener("change", () => {
  void set("json_viewer_auto", jsonViewerAuto.checked);
});
