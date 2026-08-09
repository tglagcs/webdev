/**
 * The disable menu.
 *
 * Transcribed from popup/index.html and overlay/disable.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const DISABLE_FEATURES: Feature[] = [
  {
    id: "disable-javascript",
    labelKey: "disableJavaScript",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Disable.toggleJavaScript",
  },
  {
    id: "disable-notifications",
    labelKey: "disableNotifications",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Disable.toggleNotifications",
  },
  {
    id: "disable-popups",
    labelKey: "disablePopups",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Disable.togglePopups",
  },
  {
    id: "reset-disable-features",
    labelKey: "resetDisableFeatures",
    column: 2,
    kind: "action",
    handler: "WebDeveloper.Overlay.Disable.resetFeatures",
  },
];
