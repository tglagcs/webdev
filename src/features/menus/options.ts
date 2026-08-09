/**
 * The options menu.
 *
 * Transcribed from popup/index.html and overlay/options.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const OPTIONS_FEATURES: Feature[] = [
  {
    id: "reset-page",
    labelKey: "resetPage",
    column: 1,
    kind: "action",
    handler: "WebDeveloper.Overlay.Options.resetPage",
  },
  {
    id: "options",
    labelKey: "optionsMenu",
    column: 2,
    kind: "dialog",
    handler: "WebDeveloper.Overlay.Options.options",
  },
  {
    id: "about",
    labelKey: "aboutMenu",
    column: 3,
    kind: "dialog",
    handler: "WebDeveloper.Overlay.Options.about",
  },
];
