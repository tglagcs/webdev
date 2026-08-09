/**
 * The css menu.
 *
 * Transcribed from popup/index.html and overlay/css.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 *
 * Ten of the twelve name an entry in the CSS bundle. Edit CSS builds the
 * in-page dashboard and goes with the widgets; View CSS opens a report.
 */

import type { Feature } from "../types";

export const CSS_FEATURES: Feature[] = [
  {
    id: "disable-all-styles",
    labelKey: "disableAllStyles",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "disable-browser-default-styles",
    labelKey: "disableBrowserDefaultStyles",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
    },
  },
  {
    id: "disable-embedded-styles",
    labelKey: "disableEmbeddedStyles",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "disable-inline-styles",
    labelKey: "disableInlineStyles",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "disable-linked-style-sheets",
    labelKey: "disableLinkedStyleSheets",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "disable-print-styles",
    labelKey: "disablePrintStyles",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-handheld-styles",
    labelKey: "displayHandheldStyles",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
      payload: { enabled: { from: "enabled" } },
      exclusiveWith: "display-print-styles",
    },
  },
  {
    id: "display-print-styles",
    labelKey: "displayPrintStyles",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
      payload: { enabled: { from: "enabled" } },
      exclusiveWith: "display-handheld-styles",
    },
  },
  {
    id: "edit-css",
    labelKey: "editCSS",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.CSS.editCSS",
  },
  {
    id: "reload-linked-style-sheets",
    labelKey: "reloadLinkedStyleSheets",
    column: 3,
    kind: "action",
    inject: {
      bundle: "/feature-css.js",
    },
  },
  {
    id: "use-border-box-model",
    labelKey: "useBorderBoxModel",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-css.js",
    },
  },
  {
    id: "view-css",
    labelKey: "viewCSS",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.CSS.viewCSS",
  },
];
