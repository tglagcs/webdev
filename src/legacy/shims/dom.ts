/**
 * Points the legacy namespace at the ported DOM helpers.
 *
 * `content.js` is gone, but the fourteen helpers it shared with the feature
 * bundles are called from ~130 places still in `src/legacy/js`. Rather than
 * leave two implementations to drift -- the ported one under test, the
 * original one running in the features -- this overwrites the namespace so
 * there is exactly one at runtime.
 *
 * **Import this after `common.js` and `css.js`, never before.** Module
 * imports are hoisted, so an import placed at the top of those files would
 * run first and then be overwritten by their own definitions, which is the
 * wrong way round. The redundant definitions stay in place in the legacy
 * files, dead, until those files are deleted with the feature bundles.
 *
 * Also republishes the two `Content` functions that outlived content.js:
 * `getDocuments` (features/images.js, features/information.js) and
 * `getDocumentCSS` (embedded/dashboard/edit-css.js).
 */

import { WebDeveloper } from "../globals";
import {
  getCSSPrimitiveValue,
  getCSSText,
  getCSSURI,
  getPropertyCSSValue,
  isCSSURI,
} from "@/lib/dom/css-values";
import {
  addClass,
  getDocumentHeadElement,
  getExtensionURL,
  hasClass,
  removeClass,
  removeMatchingElements,
  toggleClass,
} from "@/lib/dom/elements";
import {
  getContentDocument,
  getContentWindow,
  getDocumentBodyElement,
  getDocumentImages,
  getElementText,
  removeReloadParameterFromURL,
} from "@/lib/dom/documents";
import {
  getImportedStyleSheets,
  isAlternateStyleSheet,
  isMediaStyleSheet,
  isValidStyleSheet,
  toggleStyleSheet,
} from "@/lib/dom/stylesheets";
import { getDocuments } from "@/content/report";
import { getDocumentCSS } from "@/content/resources";

WebDeveloper.Common = WebDeveloper.Common || {};
WebDeveloper.CSS = WebDeveloper.CSS || {};
WebDeveloper.Content = WebDeveloper.Content || {};

Object.assign(WebDeveloper.Common, {
  addClass,
  getCSSText,
  // Renamed on the way across: it returns any extension URL, and only Chromium
  // ever called the scheme "chrome".
  getChromeURL: getExtensionURL,
  getContentDocument,
  getContentWindow,
  getCSSPrimitiveValue,
  getCSSURI,
  getDocumentBodyElement,
  getDocumentImages,
  getElementText,
  getPropertyCSSValue,
  getDocumentHeadElement,
  hasClass,
  isCSSURI,
  removeClass,
  removeMatchingElements,
  removeReloadParameterFromURL,
  toggleClass,
  toggleStyleSheet,
});

Object.assign(WebDeveloper.CSS, {
  getImportedStyleSheets,
  isAlternateStyleSheet,
  isMediaStyleSheet,
  isValidStyleSheet,
});

Object.assign(WebDeveloper.Content, { getDocumentCSS, getDocuments });
