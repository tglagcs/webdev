// Injected into the page with chrome.scripting.executeScript({ files }).
//
// The popup then runs a second executeScript({ func }) whose body reads
// globalThis.WebDeveloper.Outline.*, so this has to publish onto the namespace
// even though the implementation is a module now -- see the closure note in
// CLAUDE.md for why that spelling is not optional.
//
// common.js is still here because the outline features share the page with
// the embedded widgets, which have not been ported and expect the rest of
// WebDeveloper.Common to exist.
import { WebDeveloper } from "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/shims/dom";
import "@/legacy/shims/notify";

import * as outline from "@/features/outline";

WebDeveloper.Outline = { ...WebDeveloper.Outline, ...outline };

// Upstream appended "void(0);" so the script's completion value stayed
// serialisable. main() returning nothing does the same job here.
export default defineUnlistedScript(() => {});
