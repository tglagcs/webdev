/**
 * The images menu.
 *
 * Transcribed from popup/index.html and overlay/images.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const IMAGES_FEATURES: Feature[] = [
  {
    id: "disable-images",
    labelKey: "disableImages",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.toggleImages",
  },
  {
    id: "display-alt-attributes",
    labelKey: "displayAltAttributes",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.displayAltAttributes",
  },
  {
    id: "display-image-dimensions",
    labelKey: "displayImageDimensions",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.displayImageDimensions",
  },
  {
    id: "display-image-paths",
    labelKey: "displayImagePaths",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.displayImagePaths",
  },
  {
    id: "find-broken-images",
    labelKey: "findBrokenImages",
    column: 1,
    kind: "report",
    handler: "WebDeveloper.Overlay.Images.findBrokenImages",
  },
  {
    id: "hide-background-images",
    labelKey: "hideBackgroundImages",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.hideBackgroundImages",
  },
  {
    id: "hide-images",
    labelKey: "hideImages",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.hideImages",
  },
  {
    id: "make-images-full-size",
    labelKey: "makeImagesFullSize",
    column: 2,
    kind: "action",
    handler: "WebDeveloper.Overlay.Images.makeImagesFullSize",
  },
  {
    id: "make-images-invisible",
    labelKey: "makeImagesInvisible",
    column: 2,
    kind: "action",
    handler: "WebDeveloper.Overlay.Images.makeImagesInvisible",
  },
  {
    id: "outline-all-images",
    labelKey: "outlineAllImages",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.outlineAllImages",
  },
  {
    id: "outline-background-images",
    labelKey: "outlineBackgroundImages",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.outlineBackgroundImages",
  },
  {
    id: "outline-images-with-adjusted-dimensions",
    labelKey: "outlineImagesWithAdjustedDimensions",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.outlineImagesWithAdjustedDimensions",
  },
  {
    id: "outline-images-with-empty-alt-attributes",
    labelKey: "outlineImagesWithEmptyAltAttributes",
    column: 2,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.outlineImagesWithEmptyAltAttributes",
  },
  {
    id: "outline-images-with-oversized-dimensions",
    labelKey: "outlineImagesWithOversizedDimensions",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.outlineImagesWithOversizedDimensions",
  },
  {
    id: "outline-images-without-alt-attributes",
    labelKey: "outlineImagesWithoutAltAttributes",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.outlineImagesWithoutAltAttributes",
  },
  {
    id: "outline-images-without-dimensions",
    labelKey: "outlineImagesWithoutDimensions",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.outlineImagesWithoutDimensions",
  },
  {
    id: "reload-images",
    labelKey: "reloadImages",
    column: 3,
    kind: "action",
    handler: "WebDeveloper.Overlay.Images.reloadImages",
  },
  {
    id: "replace-images-with-alt-attributes",
    labelKey: "replaceImagesWithAltAttributes",
    column: 3,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Images.replaceImagesWithAltAttributes",
  },
  {
    id: "view-image-information",
    labelKey: "viewImageInformation",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Images.viewImageInformation",
  },
];
