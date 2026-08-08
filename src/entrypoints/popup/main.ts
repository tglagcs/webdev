// Loads the legacy scripts this page used to pull in with <script src>
// tags, in the order common/gulp/build.js concatenated them.
import "@/legacy/globals";
// Must precede the legacy imports: it makes them defer their
// initialisers instead of running each one on import.
import { flushDomReady } from "@/legacy/dom-ready";
import "@/legacy/js/common/common.js";
import "@/legacy/js/common/cookies.js";
import "@/legacy/shims/locales";
import "@/legacy/shims/storage";
import "@/legacy/js/overlay/cookies.js";
import "@/legacy/js/overlay/css.js";
import "@/legacy/js/overlay/forms.js";
import "@/legacy/js/overlay/images.js";
import "@/legacy/js/overlay/information.js";
import "@/legacy/js/overlay/miscellaneous.js";
import "@/legacy/js/overlay/options.js";
import "@/legacy/js/overlay/outline.js";
import "@/legacy/js/overlay/overlay.js";
import "@/legacy/js/overlay/resize.js";
import "@/legacy/js/overlay/tools.js";

import { capabilities, markCapabilities } from "@/lib/capabilities";

// Hides what this browser cannot do; replaces the per-browser overlay.css
// override upstream concatenated in at build time.
markCapabilities();

// Imported dynamically because it initialises itself against
// chrome.contentSettings, which only Chromium has. Its initialiser runs on
// DOMContentLoaded or immediately, so arriving late is safe.
if (capabilities.contentSettings) {
  await import("@/legacy/js/overlay/disable.js");
}

flushDomReady();

// The <title> stays as __MSG_extensionName__ because WXT reads it to build
// action.default_title, the toolbar tooltip, which the browser does localise.
// It does not localise HTML, so set the document title here.
document.title = browser.i18n.getMessage("extensionName");
