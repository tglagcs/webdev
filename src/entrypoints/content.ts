// This runs on every page and is what puts WebDeveloper.Common into the
// isolated world. The embedded widgets are injected as separate files later
// and depend on finding it there, so this script is load-bearing beyond the
// extractors, and the legacy imports stay until those widgets are ported.
//
// The shim must follow common.js and css.js: it overwrites the helpers that
// have moved to src/lib/dom, and an import placed earlier would be undone by
// their own definitions.
import "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/js/common/css.js";
import "@/legacy/shims/dom";

import { handleContentMessages } from "@/content/messages";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    handleContentMessages();
  },
});
