/**
 * Points the legacy namespace at the ported cookie operations.
 *
 * Same rule as shims/dom: import this *after* `common/cookies.js`, which still
 * holds the three confirmation flows and would otherwise overwrite these with
 * its own copies.
 */

import { WebDeveloper } from "../globals";
import {
  addCookie,
  canEditLocalCookie,
  deleteCookie,
  getDateTomorrow,
  sanitizeHost,
} from "@/lib/cookies";

WebDeveloper.Cookies = WebDeveloper.Cookies || {};

Object.assign(WebDeveloper.Cookies, {
  addCookie,
  canEditLocalCookie,
  deleteCookie,
  getDateTomorrow,
  sanitizeHost,
});
