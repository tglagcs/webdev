// Loads the legacy scripts this page used to pull in with <script src>
// tags, in the order common/gulp/build.js concatenated them.
import "@/legacy/globals";
// Must precede the legacy imports: it makes them defer their
// initialisers instead of running each one on import.
import { flushDomReady } from "@/legacy/dom-ready";
import { AUTHOR } from "@/branding";
import "@/legacy/js/common/locales.js";
import "@/legacy/js/about/about.js";

flushDomReady();

// These three were build tokens, substituted by gulp-filter-java-properties.
// Nothing substitutes tokens now, so fill them at runtime.
document.getElementById("author-value")!.textContent = AUTHOR;
document.getElementById("version-value")!.textContent = browser.runtime.getManifest().version;
document.getElementById("build-date-value")!.textContent = __BUILD_DATE__;
