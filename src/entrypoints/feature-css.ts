// Injected into the page with chrome.scripting.executeScript({ files }).
// Concat order from common/gulp/build.js buildFeatures.
//
// Upstream appended "void(0);" so the script's completion value stayed
// serialisable. main() returning nothing does the same job here.
import "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/js/common/css.js";
import "@/legacy/shims/dom";
import "@/legacy/js/features/common.js";
import "@/legacy/js/features/css.js";

export default defineUnlistedScript(() => {});
