/**
 * The images menu.
 *
 * Transcribed from popup/index.html and overlay/images.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 *
 * Sixteen of the nineteen name an entry in the images bundle. What still has a
 * handler is the two reports, which open a tab, and Disable Images, which is a
 * content setting rather than anything injected.
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
    inject: {
      bundle: "/feature-images.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "display-image-dimensions",
    labelKey: "displayImageDimensions",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
      payload: {
        enabled: { from: "enabled" },
        height: { from: "message", key: "height" },
        width: { from: "message", key: "width" },
      },
    },
  },
  {
    id: "display-image-paths",
    labelKey: "displayImagePaths",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
      payload: { enabled: { from: "enabled" } },
    },
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
    inject: {
      bundle: "/feature-images.js",
    },
  },
  {
    id: "hide-images",
    labelKey: "hideImages",
    column: 1,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "make-images-full-size",
    labelKey: "makeImagesFullSize",
    column: 2,
    kind: "action",
    inject: {
      bundle: "/feature-images.js",
    },
  },
  {
    id: "make-images-invisible",
    labelKey: "makeImagesInvisible",
    column: 2,
    kind: "action",
    inject: {
      bundle: "/feature-images.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-all-images",
    labelKey: "outlineAllImages",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
    },
  },
  {
    id: "outline-background-images",
    labelKey: "outlineBackgroundImages",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-images-with-adjusted-dimensions",
    labelKey: "outlineImagesWithAdjustedDimensions",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-images-with-empty-alt-attributes",
    labelKey: "outlineImagesWithEmptyAltAttributes",
    column: 2,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
    },
  },
  {
    id: "outline-images-with-oversized-dimensions",
    labelKey: "outlineImagesWithOversizedDimensions",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "outline-images-without-alt-attributes",
    labelKey: "outlineImagesWithoutAltAttributes",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
    },
  },
  {
    id: "outline-images-without-dimensions",
    labelKey: "outlineImagesWithoutDimensions",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
    },
  },
  {
    id: "reload-images",
    labelKey: "reloadImages",
    column: 3,
    kind: "action",
    inject: {
      bundle: "/feature-images.js",
    },
  },
  {
    id: "replace-images-with-alt-attributes",
    labelKey: "replaceImagesWithAltAttributes",
    column: 3,
    stateful: true,
    kind: "toggle",
    inject: {
      bundle: "/feature-images.js",
      payload: { enabled: { from: "enabled" } },
    },
  },
  {
    id: "view-image-information",
    labelKey: "viewImageInformation",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Images.viewImageInformation",
  },
];
