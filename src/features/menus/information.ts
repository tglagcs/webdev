/**
 * The information menu.
 *
 * Transcribed from popup/index.html and overlay/information.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 *
 * Fifteen of the twenty-four name an entry in the information bundle. What
 * still has a handler is the eight reports, which open a tab, and Display
 * Element Information, which builds the in-page dashboard and goes with the
 * widgets.
 */

import type { Feature } from "../types";

export const INFORMATION_FEATURES: Feature[] = [
  {
    id: "display-abbreviations",
    labelKey: "displayAbbreviations",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
    },
  },
  {
    id: "display-access-keys",
    labelKey: "displayAccessKeys",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-anchors",
    labelKey: "displayAnchors",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-aria-roles",
    labelKey: "displayARIARoles",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
    },
  },
  {
    id: "display-div-dimensions",
    labelKey: "displayDivDimensions",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: {
        enabled: { from: "enabled" },
        height: { from: "message", key: "height" },
        width: { from: "message", key: "width" },
      },
    },
  },
  {
    id: "display-div-order",
    labelKey: "displayDivOrder",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-element-information",
    labelKey: "displayElementInformation",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Information.displayElementInformation",
  },
  {
    id: "display-id-class-details",
    labelKey: "displayIdClassDetails",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-link-details",
    labelKey: "displayLinkDetails",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
    },
  },
  {
    id: "display-object-information",
    labelKey: "displayObjectInformation",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-stack-levels",
    labelKey: "displayStackLevels",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-tab-index",
    labelKey: "displayTabIndex",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-table-depth",
    labelKey: "displayTableDepth",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" }, depth: { from: "message", key: "depth" } },
    },
  },
  {
    id: "display-table-information",
    labelKey: "displayTableInformation",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-title-attributes",
    labelKey: "displayTitleAttributes",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-topographic-information",
    labelKey: "displayTopographicInformation",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-information.js",
    },
  },
  {
    id: "find-duplicate-ids",
    labelKey: "findDuplicateIds",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Information.findDuplicateIds",
  },
  {
    id: "view-anchor-information",
    labelKey: "viewAnchorInformation",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Information.viewAnchorInformation",
  },
  {
    id: "view-color-information",
    labelKey: "viewColorInformation",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Information.viewColorInformation",
  },
  {
    id: "view-document-outline",
    labelKey: "viewDocumentOutline",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Information.viewDocumentOutline",
  },
  {
    id: "view-javascript",
    labelKey: "viewJavaScript",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Information.viewJavaScript",
  },
  {
    id: "view-link-information",
    labelKey: "viewLinkInformation",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Information.viewLinkInformation",
  },
  {
    id: "view-meta-tag-information",
    labelKey: "viewMetaTagInformation",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Information.viewMetaTagInformation",
  },
  {
    id: "view-response-headers",
    labelKey: "viewResponseHeaders",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Information.viewResponseHeaders",
  },
];
