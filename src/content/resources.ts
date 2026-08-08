/**
 * Images, scripts and stylesheets.
 */

import { getDocumentImages, removeReloadParameterFromURL } from "@/lib/dom/documents";
import {
  getImportedStyleSheets,
  isAlternateStyleSheet,
  isMediaStyleSheet,
  isValidStyleSheet,
} from "@/lib/dom/stylesheets";
import { perDocument, type Report } from "./report";

export interface ImageDetails {
  alt?: string;
  src: string;
  width: number;
  height: number;
}

export function getImages(): Report<{ url: string; images: ImageDetails[] }> {
  return perDocument((contentDocument) => ({
    images: getDocumentImages(contentDocument).map((image) => {
      const element = image as HTMLImageElement;
      const details: ImageDetails = {
        src: element.src,
        // Natural, not laid out: the report is about the file, so an image
        // scaled down by CSS still reports its real size.
        width: element.naturalWidth,
        height: element.naturalHeight,
      };

      if (element.hasAttribute("alt")) {
        details.alt = element.getAttribute("alt")!;
      }

      return details;
    }),
  }));
}

/**
 * Every image src, not only the broken ones.
 *
 * The test for brokenness needs to load each URL, which a content script
 * cannot do without tripping the page's CSP, so the popup does it. This side
 * only enumerates.
 */
export function getBrokenImages(): Report<{ url: string; images: string[] }> {
  return perDocument((contentDocument) => ({
    images: getDocumentImages(contentDocument).map((image) => image.src),
  }));
}

export function getJavaScript(): Report<{ url: string; javaScript: string[]; embedded?: string }> {
  return perDocument((contentDocument) => {
    const javaScript: string[] = [];
    let embedded = "";

    for (const script of Array.from(contentDocument.getElementsByTagName("script"))) {
      if (script.src) {
        javaScript.push(script.src);
      } else {
        // Branching on src alone means a <script type="application/json">
        // block lands in `embedded` with the real code. Upstream behaviour,
        // pinned by a snapshot; fixing it is a change to what the report
        // shows and belongs in its own commit.
        embedded += `${script.textContent!.trim()}\n\n`;
      }
    }

    return embedded ? { javaScript, embedded } : { javaScript };
  });
}

export interface DocumentCSS {
  url: string;
  styleSheets: string[];
  embedded?: string;
}

/**
 * The stylesheets and embedded styles for one document.
 *
 * `screenOnly` is what the CSS features pass: applying a rewritten stylesheet
 * back to the page must not pull in the print or handheld sheets, which are
 * not what is being displayed.
 */
export function getDocumentCSS(contentDocument: Document, screenOnly?: boolean): DocumentCSS {
  const styleSheets: string[] = [];
  let embedded = "";

  for (const style of Array.from(contentDocument.getElementsByTagName("style"))) {
    const sheet = style.sheet;

    if (isValidStyleSheet(sheet) && (!screenOnly || isMediaStyleSheet(sheet, "screen"))) {
      embedded += `${style.textContent!.trim()}\n\n`;
      styleSheets.push(...getImportedStyleSheets(sheet));
    }
  }

  for (const sheet of Array.from(contentDocument.styleSheets)) {
    const href = sheet.href;

    if (
      !isValidStyleSheet(sheet) ||
      !href ||
      href === contentDocument.documentURI ||
      sheet.disabled
    ) {
      continue;
    }

    // Note the precedence upstream relies on: `!screenOnly || (isMedia && !isAlternate)`,
    // so the alternate-stylesheet test only applies when filtering to screen.
    if (screenOnly && !(isMediaStyleSheet(sheet, "screen") && !isAlternateStyleSheet(sheet))) {
      continue;
    }

    styleSheets.push(removeReloadParameterFromURL(href)!);
    styleSheets.push(...getImportedStyleSheets(sheet));
  }

  const documentCSS: DocumentCSS = { url: contentDocument.documentURI, styleSheets };

  if (embedded) {
    documentCSS.embedded = embedded;
  }

  return documentCSS;
}

export function getCSS(): Report<DocumentCSS> {
  return perDocument((contentDocument) => getDocumentCSS(contentDocument));
}
