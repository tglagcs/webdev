/**
 * Points the legacy namespace at the ported cookie operations.
 *
 * `common/cookies.js` is gone -- the three delete-everything features it held
 * are popup actions now -- so there is nothing left to import this after. It
 * stays because the add-cookie dialog and the cookie report are still legacy
 * and still reach for these through the namespace.
 */

import { WebDeveloper } from "../globals";
import {
  addCookie,
  canEditLocalCookie,
  cookiesByFrame,
  deleteCookie,
  getDateTomorrow,
  sanitizeHost,
} from "@/lib/cookies";

WebDeveloper.Cookies = WebDeveloper.Cookies || {};

Object.assign(WebDeveloper.Cookies, {
  addCookie,
  canEditLocalCookie,
  cookiesByFrame,
  deleteCookie,
  getDateTomorrow,
  sanitizeHost,
});
