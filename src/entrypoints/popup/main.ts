// The popup.
//
// The menus are rendered by Svelte from the feature registry; the behaviour
// behind each item is still the legacy handler, reached through bridge.ts. So
// the legacy files are loaded for their handlers only -- tools/unwire-menus.py
// took the menu wiring out of their initialisers, since the elements they
// reached for by id no longer exist.
import "@/legacy/globals";
// Must precede the legacy imports: it makes them defer their
// initialisers instead of running each one on import.
import { flushDomReady } from "@/legacy/dom-ready";
import "@/legacy/shims/dom";
import "@/legacy/shims/vendor-globals";
import "@/legacy/shims/cookies";
import "@/legacy/shims/locales";
import "@/legacy/shims/storage";
import "@/legacy/js/overlay/cookies.js";
import "@/legacy/js/overlay/css.js";
import "@/legacy/js/overlay/forms.js";
import "@/legacy/js/overlay/images.js";
import "@/legacy/js/overlay/information.js";
import "@/legacy/js/overlay/miscellaneous.js";
import "@/legacy/js/overlay/options.js";
import "@/legacy/js/overlay/overlay.js";
import "@/legacy/js/overlay/resize.js";
import "@/legacy/js/overlay/tools.js";

import { mount } from "svelte";

import "@/app.css";
import { WebDeveloper } from "@/legacy/globals";
import { capabilities } from "@/lib/capabilities";
import { initTheme } from "@/lib/theme";
import { FEATURES, visibleMenus } from "@/features/registry";
import App from "./App.svelte";
import { ui, type NotificationType } from "./ui.svelte";

// Before the mount, so a dark setup never sees a light frame. MV3's CSP rules
// out the inline script that would otherwise do this.
await initTheme();

// The four places a legacy handler talks back to the popup. Overriding them
// here rather than editing those files keeps the seam in one place, and it has
// to happen after the imports that define them.
const overlay = WebDeveloper.Overlay as Record<string, unknown>;

overlay.displayNotification = (message: string, type?: NotificationType) => {
  ui.notify(message, type ?? "success");
};

overlay.closeNotification = () => {
  ui.notification = null;
};

overlay.displayConfirmation = (
  _title: string,
  message: string,
  buttonText: string,
  buttonIcon: string,
  confirm: () => void,
) => {
  ui.notification = null;
  ui.confirmation = { message, buttonText, buttonIcon, confirm };
};

overlay.closeConfirmation = () => {
  ui.confirmation = null;
};

// The dialogs are still legacy and still find their fields by id, so their
// initialisers run against the markup the Svelte components render.
mount(App, { target: document.getElementById("app")! });

flushDomReady();

await ui.restoreLabels();
await ui.restoreSettings(FEATURES);

// Chromium only, and asked of the browser rather than of our own storage --
// the Disable features are the one group whose state we do not own.
if (capabilities.contentSettings) {
  await ui.restoreContentSettings(FEATURES);
}

await ui.restoreMenu(visibleMenus().map((menu) => menu.id));

// What the popup shows as switched on is per tab, and the popup is opened over
// one specific tab.
const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

ui.tab = tab ?? null;

if (tab?.id !== undefined) {
  await ui.restoreFeatures(tab.id);
}

document.title = browser.i18n.getMessage("extensionName");
