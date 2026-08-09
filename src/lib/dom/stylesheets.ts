/**
 * Stylesheet classification and injection, shared by the CSS report and the
 * injected features.
 *
 * Ported from common/js/common/css.js unchanged in behaviour.
 */

import { getDocumentHeadElement, getExtensionURL, removeMatchingElements } from "./elements";

/** Schemes whose stylesheets belong to the browser or the extension itself. */
const INTERNAL_SCHEMES = [
  "about:",
  "chrome://",
  "chrome-extension://",
  "data:",
  "moz-extension://",
  "resource://",
];

export function isValidStyleSheet(styleSheet: CSSStyleSheet | null | undefined): boolean {
  if (!styleSheet) {
    return false;
  }

  const href = styleSheet.href;

  return !href || !INTERNAL_SCHEMES.some((scheme) => href.startsWith(scheme));
}

/** A sheet with no media list applies everywhere, so it counts as a match. */
export function isMediaStyleSheet(styleSheet: CSSStyleSheet | null, mediaType: string): boolean {
  if (!styleSheet || !mediaType) {
    return false;
  }

  const media = styleSheet.media;

  if (media.length === 0) {
    return true;
  }

  for (let index = 0; index < media.length; index++) {
    const type = media.item(index)?.toLowerCase();

    if (type === "all" || type === mediaType) {
      return true;
    }
  }

  return false;
}

export function isAlternateStyleSheet(styleSheet: CSSStyleSheet | null): boolean {
  const ownerNode = styleSheet?.ownerNode;

  if (!ownerNode) {
    return false;
  }

  if (ownerNode.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    return (ownerNode as ProcessingInstruction).data.includes('alternate="yes"');
  }

  const element = ownerNode as Element;

  return element.getAttribute?.("rel")?.toLowerCase() === "alternate stylesheet";
}

/**
 * The hrefs of every sheet reached through @import, depth first.
 *
 * Reading cssRules throws for a cross-origin sheet, which is ordinary rather
 * than exceptional -- any page with a stylesheet on a CDN hits it. Upstream
 * logged and moved on, and so does this.
 */
export function getImportedStyleSheets(styleSheet: CSSStyleSheet | null): string[] {
  if (!styleSheet) {
    return [];
  }

  let rules: CSSRuleList;

  try {
    rules = styleSheet.cssRules;
  } catch (error) {
    console.log(`Could not access the style sheet rules for ${styleSheet.href}.`, error);

    return [];
  }

  const imported: string[] = [];

  for (const rule of Array.from(rules ?? [])) {
    if (rule.type !== CSSRule.IMPORT_RULE) {
      continue;
    }

    const sheet = (rule as CSSImportRule).styleSheet;

    if (sheet && isValidStyleSheet(sheet)) {
      imported.push(sheet.href!);
      imported.push(...getImportedStyleSheets(sheet));
    }
  }

  return imported;
}

/**
 * Adds one of the extension's stylesheets to a document, or removes it if it
 * is already there.
 *
 * This single toggle is what most of the outline and CSS features are: the
 * behaviour lives in the stylesheet, and the feature only decides whether it
 * is present. `id` doubles as the feature's identity in the page, which is why
 * it is also what the popup stores as the per-tab state.
 *
 * `insertFirst` puts the sheet ahead of the page's own, so the page can still
 * override it -- used where the feature sets a baseline rather than an
 * overlay.
 */
export function toggleStyleSheet(
  url: string,
  id: string,
  contentDocument: Document,
  insertFirst: boolean,
): void {
  setStyleSheet(url, id, contentDocument, insertFirst, !contentDocument.getElementById(id));
}

/**
 * The same, for a caller that knows which state it wants.
 *
 * A toggle is only correct while every route in and out of the feature goes
 * through it. The dashboard has two ways out -- the popup switching it off and
 * the widget's own close button -- and the second one used to leave the
 * Element Information stylesheet behind. That stylesheet is
 * `* { cursor: crosshair !important }`, so the page kept a crosshair over it,
 * and the toggle was then out of phase: the next switch-on removed the sheet
 * and the next switch-off put it back.
 *
 * Anything a widget can leave by more than one route sets the state it wants
 * rather than inverting whatever it finds.
 */
export function setStyleSheet(
  url: string,
  id: string,
  contentDocument: Document,
  insertFirst: boolean,
  enabled: boolean,
): void {
  const existing = contentDocument.getElementById(id);

  if (!enabled) {
    if (existing) {
      removeMatchingElements(`#${id}`, contentDocument);
    }

    return;
  }

  if (existing) {
    return;
  }

  const headElement = getDocumentHeadElement(contentDocument);
  const linkElement = contentDocument.createElement("link");

  linkElement.setAttribute("href", getExtensionURL(url));
  linkElement.setAttribute("id", id);
  linkElement.setAttribute("rel", "stylesheet");

  if (insertFirst && headElement.firstChild) {
    headElement.insertBefore(linkElement, headElement.firstChild);
  } else {
    headElement.appendChild(linkElement);
  }
}
