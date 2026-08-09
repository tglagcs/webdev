// Injected into the page with chrome.scripting.executeScript({ files }).
//
// The popup then runs a second executeScript({ func }) whose body reads
// globalThis.WebDeveloper.CSS.*, so this has to publish onto the namespace
// even though the implementation is a module now -- see the closure note in
// CLAUDE.md for why that spelling is not optional.
//
// The shim imports stay because the embedded widgets share the page and reach
// WebDeveloper.Common and .CSS for helpers that now live in src/lib; they go
// when those widgets are ported.
import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";

import * as css from "@/features/css";
import { register, run } from "@/features/entries";

WebDeveloper.CSS = { ...WebDeveloper.CSS, ...css };

register(css.CSS_ENTRIES);
WebDeveloper.run = run;

// Upstream appended "void(0);" so the script's completion value stayed
// serialisable. main() returning nothing does the same job here.
export default defineUnlistedScript(() => {});
