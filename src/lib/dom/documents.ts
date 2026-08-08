/**
 * Document and element helpers shared by the extractors and the features.
 *
 * Ported from common/js/common/common.js unchanged in behaviour.
 */

import { getCSSURI, getPropertyCSSValue, isCSSURI } from "./css-values";

/**
 * The window and document the code is operating on.
 *
 * Trivial in the content script, where they are the globals -- but every call
 * site goes through these rather than touching `window` directly, because the
 * embedded widgets run inside an iframe they built themselves and need the
 * host document, not their own. Keeping the indirection is what makes those
 * widgets portable to the same helpers.
 */
export function getContentWindow(): Window {
  return window;
}

export function getContentDocument(): Document {
  return document;
}

/** `body` is absent on XML documents, where the root element stands in. */
export function getDocumentBodyElement(contentDocument: Document): Element {
  return (
    contentDocument.body ?? contentDocument.querySelector("body") ?? contentDocument.documentElement
  );
}

/**
 * The element's text with a trailing space after each text node.
 *
 * Not `textContent`: the spacing difference is visible in the reports, since
 * "<b>one</b><b>two</b>" reads as "one two " here and "onetwo" there.
 */
export function getElementText(element: Node | null): string {
  if (!element) {
    return "";
  }

  let text = "";

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      text += getElementText(child);
    } else if (child.nodeType === Node.TEXT_NODE) {
      text += `${child.nodeValue} `;
    }
  }

  return text;
}

/**
 * Features that reload a page add a cache-busting parameter; it is an
 * implementation detail and does not belong in a report.
 */
export function removeReloadParameterFromURL(url: string | null): string | null {
  return url ? url.replace(/(&|\?)web-developer-reload=\d+/, "") : null;
}

interface SourcedImage {
  src: string;
}

/**
 * Every image the document displays, by any means: <img>, image inputs,
 * favicons declared with <link rel=icon>, CSS background images and list
 * markers. De-duplicated by src, sorted by src.
 *
 * Browser-internal images are skipped -- upstream only checked `chrome://`,
 * and that is kept rather than widened, because the URLs a report is expected
 * to show is exactly the kind of thing a "tidy-up" changes invisibly.
 */
export function getDocumentImages(contentDocument: Document | null): SourcedImage[] {
  if (!contentDocument) {
    return [];
  }

  const images: SourcedImage[] = [];
  const walker = contentDocument.createTreeWalker(contentDocument, NodeFilter.SHOW_ELEMENT, null);

  const add = (src: string | null): void => {
    if (src && !src.startsWith("chrome://")) {
      const image = new Image();

      image.src = src;
      images.push(image);
    }
  };

  let node: Node | null;

  while ((node = walker.nextNode()) !== null) {
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === "img") {
      images.push(element as HTMLImageElement);

      continue;
    }

    if (tag === "input") {
      const input = element as HTMLInputElement;

      if (input.src && input.type?.toLowerCase() === "image") {
        add(input.src);
      }

      continue;
    }

    if (tag === "link") {
      const link = element as HTMLLinkElement;

      if (link.href && !link.href.startsWith("chrome://") && link.rel?.includes("icon")) {
        add(link.href);
      }

      continue;
    }

    let computedStyle: CSSStyleDeclaration | null = null;

    try {
      computedStyle = element.ownerDocument.defaultView!.getComputedStyle(element, null);
    } catch {
      // A detached or cross-origin node; nothing to read.
    }

    if (!computedStyle) {
      continue;
    }

    for (const property of ["background-image", "list-style-image"]) {
      const value = getPropertyCSSValue(computedStyle, property);

      if (isCSSURI(value)) {
        add(getCSSURI(value));
      }
    }
  }

  images.sort((one, two) => (one.src === two.src ? 0 : one.src < two.src ? -1 : 1));

  return images.filter((image, index) => image.src !== images[index + 1]?.src);
}
