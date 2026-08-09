/**
 * The outline menu.
 *
 * Transcribed from popup/index.html and overlay/outline.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 *
 * The first menu whose handlers are gone: thirteen of the fourteen name an
 * entry in the outline bundle and the popup runs them itself. The fourteenth
 * is not a feature of the page at all -- it is the stored preference the other
 * four read, so it only flips a setting.
 */

import type { Feature } from "../types";

export const OUTLINE_FEATURES: Feature[] = [
  {
    id: "outline-absolute-positioned-elements",
    labelKey: "outlineAbsolutePositionedElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-block-level-elements",
    labelKey: "outlineBlockLevelElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { showElementTagNames: { from: "setting", key: "outline.show.element.tag.names" } },
    },
  },
  {
    id: "outline-deprecated-elements",
    labelKey: "outlineDeprecatedElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { showElementTagNames: { from: "setting", key: "outline.show.element.tag.names" } },
    },
  },
  {
    id: "outline-external-links",
    labelKey: "outlineExternalLinks",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-fixed-positioned-elements",
    labelKey: "outlineFixedPositionedElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-floated-elements",
    labelKey: "outlineFloatedElements",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-frames",
    labelKey: "outlineFrames",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
    },
  },
  {
    id: "outline-headings",
    labelKey: "outlineHeadings",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { showElementTagNames: { from: "setting", key: "outline.show.element.tag.names" } },
    },
  },
  {
    id: "outline-non-secure-elements",
    labelKey: "outlineNonSecureElements",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
    },
  },
  {
    id: "outline-relative-positioned-elements",
    labelKey: "outlineRelativePositionedElements",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-table-captions",
    labelKey: "outlineTableCaptions",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
    },
  },
  {
    id: "outline-table-cells",
    labelKey: "outlineTableCells",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
      payload: { showElementTagNames: { from: "setting", key: "outline.show.element.tag.names" } },
    },
  },
  {
    id: "outline-tables",
    labelKey: "outlineTables",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-outline.js",
    },
  },
  {
    id: "show-element-tag-names",
    labelKey: "showElementTagNames",
    column: 3,
    stateful: true,
    kind: "toggle",
    setting: "outline.show.element.tag.names",
  },
];
