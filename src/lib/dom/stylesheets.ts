/**
 * Stylesheet classification, shared by the CSS report and the CSS features.
 *
 * Ported from common/js/common/css.js unchanged in behaviour.
 */

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
