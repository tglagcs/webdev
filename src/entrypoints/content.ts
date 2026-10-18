// This runs on every page and is what puts WebDeveloper.Common into the
// isolated world. The embedded widgets are injected as separate files later
// and depend on finding it there, so this script is load-bearing beyond the
// extractors: the shim import stays until those widgets are ported and reach
// src/lib directly.
import "@/legacy/globals";
import "@/legacy/shims/dom";

import { mountJsonViewer } from "@/content/json";
import { handleContentMessages } from "@/content/messages";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    handleContentMessages();
    void mountJsonViewer();
  },
});
