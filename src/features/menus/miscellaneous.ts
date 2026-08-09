/**
 * The miscellaneous menu.
 *
 * Transcribed from popup/index.html and overlay/miscellaneous.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 *
 * Only three of the ten are injected. Two clear browsing data through the
 * extension APIs, two rewrite history to mark links visited or unvisited, and
 * three open an in-page widget -- none of which is a script run against the
 * page, so none is an entry in a bundle.
 */

import type { Feature } from "../types";

export const MISCELLANEOUS_FEATURES: Feature[] = [
  {
    id: "clear-cache",
    labelKey: "clearCache",
    column: 1,
    kind: "action",
    handler: "WebDeveloper.Overlay.Miscellaneous.confirmClearCache",
  },
  {
    id: "clear-history",
    labelKey: "clearHistory",
    column: 1,
    kind: "action",
    handler: "WebDeveloper.Overlay.Miscellaneous.confirmClearHistory",
  },
  {
    id: "display-color-picker",
    labelKey: "displayColorPicker",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Miscellaneous.displayColorPicker",
  },
  {
    id: "display-hidden-elements",
    labelKey: "displayHiddenElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-miscellaneous.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-line-guides",
    labelKey: "displayLineGuides",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Miscellaneous.displayLineGuides",
  },
  {
    id: "display-ruler",
    labelKey: "displayRuler",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Miscellaneous.displayRuler",
  },
  {
    id: "linearize-page",
    labelKey: "linearizePage",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-miscellaneous.js",
    },
  },
  {
    id: "make-frames-resizable",
    labelKey: "makeFramesResizable",
    column: 3,
    kind: "action",
    inject: {
      bundle: "/feature-miscellaneous.js",
    },
  },
  {
    id: "mark-all-links-unvisited",
    labelKey: "markAllLinksUnvisited",
    column: 3,
    kind: "action",
    handler: "WebDeveloper.Overlay.Miscellaneous.toggleVisitedLinks",
    argument: false,
  },
  {
    id: "mark-all-links-visited",
    labelKey: "markAllLinksVisited",
    column: 3,
    kind: "action",
    handler: "WebDeveloper.Overlay.Miscellaneous.toggleVisitedLinks",
    argument: true,
  },
];
