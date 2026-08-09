// Injected into the page with chrome.scripting.executeScript({ files }).
//
// The popup then runs a second executeScript({ func }) whose body reads
// globalThis.WebDeveloper.CSS.*, so this has to publish onto the namespace
// even though the implementation is a module now -- see the closure note in
// CLAUDE.md for why that spelling is not optional.
//
// The legacy imports stay because the other bundles and the embedded widgets
// share the page and expect the rest of WebDeveloper.Common and .CSS to exist;
// they go when those are ported.
import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/js/common/css.js";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";

import * as css from "@/features/css";

WebDeveloper.CSS = { ...WebDeveloper.CSS, ...css };

// Upstream appended "void(0);" so the script's completion value stayed
// serialisable. main() returning nothing does the same job here.
export default defineUnlistedScript(() => {});
