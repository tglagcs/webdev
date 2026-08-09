/**
 * The outline menu.
 *
 * Transcribed from popup/index.html and overlay/outline.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const OUTLINE_FEATURES: Feature[] = [
  {
    id: "outline-absolute-positioned-elements",
    labelKey: "outlineAbsolutePositionedElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineAbsolutePositionedElements",
  },
  {
    id: "outline-block-level-elements",
    labelKey: "outlineBlockLevelElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineBlockLevelElements",
  },
  {
    id: "outline-deprecated-elements",
    labelKey: "outlineDeprecatedElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineDeprecatedElements",
  },
  {
    id: "outline-external-links",
    labelKey: "outlineExternalLinks",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineExternalLinks",
  },
  {
    id: "outline-fixed-positioned-elements",
    labelKey: "outlineFixedPositionedElements",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineFixedPositionedElements",
  },
  {
    id: "outline-floated-elements",
    labelKey: "outlineFloatedElements",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineFloatedElements",
  },
  {
    id: "outline-frames",
    labelKey: "outlineFrames",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineFrames",
  },
  {
    id: "outline-headings",
    labelKey: "outlineHeadings",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineHeadings",
  },
  {
    id: "outline-non-secure-elements",
    labelKey: "outlineNonSecureElements",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineNonSecureElements",
  },
  {
    id: "outline-relative-positioned-elements",
    labelKey: "outlineRelativePositionedElements",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineRelativePositionedElements",
  },
  {
    id: "outline-table-captions",
    labelKey: "outlineTableCaptions",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineTableCaptions",
  },
  {
    id: "outline-table-cells",
    labelKey: "outlineTableCells",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineTableCells",
  },
  {
    id: "outline-tables",
    labelKey: "outlineTables",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.outlineTables",
  },
  {
    id: "show-element-tag-names",
    labelKey: "showElementTagNames",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Outline.toggleShowElementTagNames",
  },
];
