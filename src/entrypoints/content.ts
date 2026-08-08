// Concat order from common/gulp/build.js buildContent.
//
// This runs on every page and is what puts WebDeveloper.Common into the
// isolated world. The embedded widgets are injected as separate files later
// and depend on finding it there, so this script is load-bearing beyond its
// own extractors.
import "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/js/common/css.js";
import "@/legacy/js/content/content.js";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {},
});
