/**
 * The cookies menu.
 *
 * Transcribed from popup/index.html and overlay/cookies.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type { Feature } from "../types";

export const COOKIES_FEATURES: Feature[] = [
  {
    id: "disable-cookies",
    labelKey: "disableCookies",
    column: 1,
    stateful: true,
    kind: "toggle",
    handler: "WebDeveloper.Overlay.Cookies.toggleCookies",
  },
  {
    id: "add-cookie",
    labelKey: "addCookieMenu",
    column: 1,
    kind: "dialog",
    handler: "WebDeveloper.Overlay.Cookies.addCookie",
  },
  {
    id: "delete-domain-cookies",
    labelKey: "deleteDomainCookies",
    column: 2,
    kind: "action",
    handler: "WebDeveloper.Overlay.Cookies.deleteDomainCookies",
  },
  {
    id: "delete-path-cookies",
    labelKey: "deletePathCookies",
    column: 2,
    kind: "action",
    handler: "WebDeveloper.Overlay.Cookies.deletePathCookies",
  },
  {
    id: "delete-session-cookies",
    labelKey: "deleteSessionCookies",
    column: 3,
    kind: "action",
    handler: "WebDeveloper.Overlay.Cookies.deleteSessionCookies",
  },
  {
    id: "view-cookie-information",
    labelKey: "viewCookieInformation",
    column: 3,
    kind: "report",
    handler: "WebDeveloper.Overlay.Cookies.viewCookieInformation",
  },
];
