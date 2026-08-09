/**
 * The CSS menu.
 *
 * Everything here works on `document.styleSheets` and inline `style`
 * attributes. Three predicates recur across the functions and are spelled out
 * once at the top, because the differences between them are the whole
 * behaviour: which sheets a feature touches is the feature.
 */

import { removeReloadParameterFromURL } from "@/lib/dom/documents";
import {
  isAlternateStyleSheet,
  isMediaStyleSheet,
  isValidStyleSheet,
  toggleStyleSheet,
} from "@/lib/dom/stylesheets";
import { displayNotification } from "./notify";

/**
 * A sheet the extension may touch: ours and the browser's are excluded, and so
 * is the "sheet" that is really the document's own inline styles.
 */
function isPageStyleSheet(styleSheet: CSSStyleSheet, contentDocument: Document): boolean {
  return (
    isValidStyleSheet(styleSheet) &&
    !!styleSheet.href &&
    styleSheet.href !== contentDocument.documentURI
  );
}

/**
 * Alternate sheets are off by default, so enabling them would turn on styles
 * the user never had -- but disabling them is fine, and is what the user
 * asked for. Hence the asymmetry, which upstream repeats in four places.
 */
function mayToggle(styleSheet: CSSStyleSheet, disable: boolean): boolean {
  return !isAlternateStyleSheet(styleSheet) || disable;
}

function sheetsOf(contentDocument: Document): CSSStyleSheet[] {
  return Array.from(contentDocument.styleSheets);
}

/** Disables or enables every sheet in the document, alternates included. */
function toggleAllStyleSheets(disable: boolean, contentDocument: Document): void {
  for (const styleSheet of sheetsOf(contentDocument)) {
    if (isValidStyleSheet(styleSheet) && mayToggle(styleSheet, disable)) {
      styleSheet.disabled = disable;
    }
  }
}

/**
 * Moves an inline style out of the way, or puts it back.
 *
 * Parked on the element rather than in a map, because the feature has to
 * survive the popup closing and reopening -- the page is the only state there
 * is.
 */
export function toggleElementInlineStyles(node: Node | null, disable: boolean): void {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;

  if (disable && element.hasAttribute("style")) {
    element.setAttribute("web-developer-inline-style", element.getAttribute("style")!);
    element.removeAttribute("style");
  } else if (!disable && element.hasAttribute("web-developer-inline-style")) {
    element.setAttribute("style", element.getAttribute("web-developer-inline-style")!);
    element.removeAttribute("web-developer-inline-style");
  }

  for (const child of Array.from(element.childNodes)) {
    toggleElementInlineStyles(child, disable);
  }
}

export function toggleInlineStyles(disable: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    toggleElementInlineStyles(contentDocument.documentElement, disable);
  }
}

export function toggleAllStyles(disable: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    toggleAllStyleSheets(disable, contentDocument);
    toggleElementInlineStyles(contentDocument.documentElement, disable);
  }
}

export function toggleEmbeddedStyles(disable: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    for (const style of Array.from(contentDocument.getElementsByTagName("style"))) {
      if (isValidStyleSheet(style.sheet)) {
        style.sheet!.disabled = disable;
      }
    }
  }
}

export function toggleLinkedStyleSheets(disable: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    for (const styleSheet of sheetsOf(contentDocument)) {
      if (isPageStyleSheet(styleSheet, contentDocument) && mayToggle(styleSheet, disable)) {
        styleSheet.disabled = disable;
      }
    }
  }
}

export function togglePrintStyles(disable: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    for (const styleSheet of sheetsOf(contentDocument)) {
      if (
        isValidStyleSheet(styleSheet) &&
        mayToggle(styleSheet, disable) &&
        isMediaStyleSheet(styleSheet, "print")
      ) {
        styleSheet.disabled = disable;
      }
    }
  }
}

export function toggleBrowserDefaultStyles(documents: Document[]): void {
  for (const contentDocument of documents) {
    // insertFirst, so the page's own rules still win over the reset.
    toggleStyleSheet(
      "/lib/reset.css",
      "web-developer-disable-browser-default-styles",
      contentDocument,
      true,
    );
  }
}

export function useBorderBoxModel(documents: Document[]): void {
  for (const contentDocument of documents) {
    toggleStyleSheet(
      "/features/css/css/use-border-box-model.css",
      "web-developer-use-border-box-model",
      contentDocument,
      false,
    );
  }
}

/**
 * Re-fetches every linked stylesheet by rewriting its href with a fresh
 * cache-busting parameter. The parameter is stripped again by
 * removeReloadParameterFromURL wherever a URL is shown to the user, so it does
 * not leak into the reports.
 */
export function reloadLinkedStyleSheets(documents: Document[]): void {
  for (const contentDocument of documents) {
    for (const styleSheet of sheetsOf(contentDocument)) {
      if (
        !isPageStyleSheet(styleSheet, contentDocument) ||
        styleSheet.disabled ||
        isAlternateStyleSheet(styleSheet)
      ) {
        continue;
      }

      const ownerNode = styleSheet.ownerNode as HTMLLinkElement | null;

      if (!ownerNode) {
        continue;
      }

      const url = removeReloadParameterFromURL(styleSheet.href)!;

      ownerNode.href = `${url}${url.includes("?") ? "&" : "?"}web-developer-reload=${Date.now()}`;
    }
  }

  displayNotification("reloadLinkedStyleSheetsResult");
}

/**
 * Shows or hides the styles for one media type by editing each sheet's media
 * list in place.
 *
 * There is no way to ask a sheet to apply as though the media matched, so the
 * media list itself is rewritten -- and the marker media
 * (`web-developer-appended-screen`, `web-developer-deleted-screen`) are how
 * the feature remembers, on the page, what it changed so it can undo exactly
 * that. Toggling `disabled` off and on at the end is what makes the engine
 * re-evaluate the sheet.
 */
export function toggleMediaTypeStyles(
  mediaType: string,
  display: boolean,
  documents: Document[],
): void {
  for (const contentDocument of documents) {
    for (const styleSheet of sheetsOf(contentDocument)) {
      if (!isValidStyleSheet(styleSheet) || isAlternateStyleSheet(styleSheet)) {
        continue;
      }

      const media = styleSheet.media;

      if (display) {
        if (isMediaStyleSheet(styleSheet, mediaType)) {
          if (!isMediaStyleSheet(styleSheet, "screen")) {
            media.appendMedium("web-developer-appended-screen");
            media.appendMedium("screen");
          }
        } else if (isMediaStyleSheet(styleSheet, "screen")) {
          if (media.length !== 0) {
            media.deleteMedium("screen");
          }

          media.appendMedium("web-developer-deleted-screen");
        }
      } else if (
        isMediaStyleSheet(styleSheet, "web-developer-appended-screen") &&
        media.length !== 0
      ) {
        media.deleteMedium("web-developer-appended-screen");
        media.deleteMedium("screen");
      } else if (
        isMediaStyleSheet(styleSheet, "web-developer-deleted-screen") &&
        media.length !== 0
      ) {
        media.appendMedium("screen");
        media.deleteMedium("web-developer-deleted-screen");
      }

      styleSheet.disabled = true;
      styleSheet.disabled = false;
    }
  }
}
