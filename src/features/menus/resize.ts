/**
 * The resize menu.
 *
 * Transcribed from popup/index.html and overlay/resize.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const RESIZE_FEATURES: Feature[] = [
  {
    id: "display-window-size",
    labelKey: "displayWindowSize",
    column: 1,
    kind: "action",
    handler: "WebDeveloper.Overlay.Resize.displayWindowSize",
  },
  {
    id: "resize-window",
    labelKey: "resizeWindowMenu",
    column: 1,
    kind: "dialog",
    handler: "WebDeveloper.Overlay.Resize.displayResizeDialog",
  },
  {
    id: "edit-resize-dimensions",
    labelKey: "editResizeDimensions",
    column: 2,
    kind: "dialog",
    handler: "WebDeveloper.Overlay.Resize.editResizeDimensions",
  },
  {
    id: "view-responsive-layouts",
    labelKey: "viewResponsiveLayouts",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Resize.viewResponsiveLayouts",
  },
];
