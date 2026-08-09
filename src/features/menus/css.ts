/**
 * The css menu.
 *
 * Transcribed from popup/index.html and overlay/css.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const CSS_FEATURES: Feature[] = [
  {
    id: "disable-all-styles",
    labelKey: "disableAllStyles",
    column: 1,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.disableAllStyles",
  },
  {
    id: "disable-browser-default-styles",
    labelKey: "disableBrowserDefaultStyles",
    column: 1,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.disableBrowserDefaultStyles",
  },
  {
    id: "disable-embedded-styles",
    labelKey: "disableEmbeddedStyles",
    column: 1,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.disableEmbeddedStyles",
  },
  {
    id: "disable-inline-styles",
    labelKey: "disableInlineStyles",
    column: 1,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.disableInlineStyles",
  },
  {
    id: "disable-linked-style-sheets",
    labelKey: "disableLinkedStyleSheets",
    column: 2,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.disableLinkedStyleSheets",
  },
  {
    id: "disable-print-styles",
    labelKey: "disablePrintStyles",
    column: 2,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.disablePrintStyles",
  },
  {
    id: "display-handheld-styles",
    labelKey: "displayHandheldStyles",
    column: 2,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.displayHandheldStyles",
  },
  {
    id: "display-print-styles",
    labelKey: "displayPrintStyles",
    column: 2,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.displayPrintStyles",
  },
  {
    id: "edit-css",
    labelKey: "editCSS",
    column: 3,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.editCSS",
  },
  {
    id: "reload-linked-style-sheets",
    labelKey: "reloadLinkedStyleSheets",
    column: 3,
    handler: "WebDeveloper.Overlay.CSS.reloadLinkedStyleSheets",
  },
  {
    id: "use-border-box-model",
    labelKey: "useBorderBoxModel",
    column: 3,
    stateful: true,
    handler: "WebDeveloper.Overlay.CSS.useBorderBoxModel",
  },
  {
    id: "view-css",
    labelKey: "viewCSS",
    column: 3,
    handler: "WebDeveloper.Overlay.CSS.viewCSS",
  },
];
