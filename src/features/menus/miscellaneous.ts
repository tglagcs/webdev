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
 *
 * Four more arrived from the Disable menu, which is gone. Everything in it was
 * `chrome.contentSettings`, so on Firefox the tab was empty and did not show at
 * all -- and the other two content settings were never in it anyway: Disable
 * Cookies sits in Cookies and Disable Images in Images, each with its subject.
 * JavaScript, notifications and popups have no such tab, so they land in the
 * one that is already the home for what belongs nowhere else, and the reset
 * comes with them.
 *
 * Their `column` is chosen rather than transcribed, unlike every other one
 * here: they never shipped in this menu.
 */

import type { Feature } from "../types";

export const MISCELLANEOUS_FEATURES: Feature[] = [
  {
    id: "clear-cache",
    labelKey: "clearCache",
    column: 1,
    kind: "action",
    popupAction: true,
  },
  {
    id: "clear-history",
    labelKey: "clearHistory",
    column: 1,
    kind: "action",
    popupAction: true,
  },
  {
    id: "disable-javascript",
    labelKey: "disableJavaScript",
    column: 1,
    stateful: true,
    kind: "toggle",
    contentSetting: {
      type: "javascript",
      enabledMessage: "enableJavaScriptResult",
      disabledMessage: "disableJavaScriptResult",
    },
  },
  {
    id: "disable-notifications",
    labelKey: "disableNotifications",
    column: 1,
    stateful: true,
    kind: "toggle",
    contentSetting: {
      type: "notifications",
      enabledMessage: "enableNotificationsResult",
      disabledMessage: "disableNotificationsResult",
    },
  },
  {
    id: "disable-popups",
    labelKey: "disablePopups",
    column: 1,
    stateful: true,
    kind: "toggle",
    contentSetting: {
      type: "popups",
      enabledMessage: "enablePopupsResult",
      disabledMessage: "disablePopupsResult",
    },
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
    popupAction: true,
  },
  {
    id: "mark-all-links-visited",
    labelKey: "markAllLinksVisited",
    column: 3,
    kind: "action",
    popupAction: true,
  },
  {
    id: "reset-disable-features",
    labelKey: "resetDisableFeatures",
    column: 3,
    kind: "action",
    resetsContentSettings: true,
  },
  {
    // WebDeveloper's own, not one that shipped. The dialog is the popup's;
    // the clock it sets is the MAIN-world content script's.
    id: "time-travel",
    labelKey: "timeTravel",
    column: 3,
    kind: "dialog",
    popupAction: true,
  },
];
