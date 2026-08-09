/**
 * The tools menu.
 *
 * Transcribed from popup/index.html and overlay/tools.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const TOOLS_FEATURES: Feature[] = [
  {
    id: "edit-tools",
    labelKey: "editTools",
    column: 1,
    kind: "dialog",
    handler: "WebDeveloper.Overlay.Tools.editTools",
  },
  {
    id: "validate-local-css",
    labelKey: "validateLocalCSS",
    column: 2,
    kind: "report",
    handler: "WebDeveloper.Overlay.Tools.validateLocalCSS",
  },
  {
    id: "validate-local-html",
    labelKey: "validateLocalHTML",
    column: 2,
    kind: "report",
    handler: "WebDeveloper.Overlay.Tools.validateLocalHTML",
  },
  {
    id: "view-source",
    labelKey: "viewSource",
    column: 2,
    kind: "report",
    handler: "WebDeveloper.Overlay.Tools.viewSource",
  },
];
