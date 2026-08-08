// Loads the legacy scripts this page used to pull in with <script src>
// tags, in the order common/gulp/build.js concatenated them.
import "@/legacy/globals";
// Must precede the legacy imports: it makes them defer their
// initialisers instead of running each one on import.
import { flushDomReady } from "@/legacy/dom-ready";
import "@/legacy/js/common/common.js";
import "@/legacy/js/common/locales.js";
import "@/legacy/js/common/storage.js";
import "@/legacy/js/options/options.js";

flushDomReady();
