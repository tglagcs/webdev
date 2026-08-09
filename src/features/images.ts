/**
 * The Images menu.
 *
 * Three shapes recur: toggle a stylesheet, draw a label beside every image,
 * and tag the images matching some condition with a class the stylesheet
 * then outlines. Each is written once here.
 */

import { getCSSURI, getPropertyCSSValue, isCSSURI } from "@/lib/dom/css-values";
import {
  getContentWindow,
  getDocumentBodyElement,
  removeReloadParameterFromURL,
} from "@/lib/dom/documents";
import { addClass, getExtensionURL, removeClass, removeMatchingElements } from "@/lib/dom/elements";
import { toggleStyleSheet } from "@/lib/dom/stylesheets";
import { getDocuments } from "@/content/report";
import { formatDimensions, type DimensionsLocale } from "@/lib/dimensions";
import { displayCount, displayNotification } from "./notify";

export type { DimensionsLocale };

const CSS = "/features/css/images";
const BEFORE = "/features/css/before.css";

function toggle(documents: Document[], url: string, id: string): void {
  for (const contentDocument of documents) {
    toggleStyleSheet(url, id, contentDocument, false);
  }
}

/**
 * Inserts a label before every element the selector matches.
 *
 * Before rather than inside: an <img> cannot contain anything, and a sibling
 * is also what the ::before stylesheet expects to position.
 */
function label(
  contentDocument: Document,
  elements: Iterable<Element>,
  className: string,
  content: (element: Element) => Node | string | null,
): void {
  for (const element of elements) {
    const text = content(element);

    if (text === null) {
      continue;
    }

    const span = contentDocument.createElement("span");

    span.setAttribute("class", className);
    span.append(text);
    element.parentNode?.insertBefore(span, element);
  }
}

/** Adds or removes a class across every image matching a predicate. */
function tag(
  documents: Document[],
  outline: boolean,
  className: string,
  styleSheet: string,
  matches: (element: Element) => boolean,
  candidates: (contentDocument: Document) => Iterable<Element>,
): void {
  for (const contentDocument of documents) {
    if (outline) {
      for (const element of candidates(contentDocument)) {
        if (matches(element)) {
          addClass(element, className);
        }
      }
    } else {
      // Live collection: removing the class shortens it, so drain index 0.
      const tagged = contentDocument.getElementsByClassName(className);

      while (tagged.length > 0) {
        removeClass(tagged[0]!, className);
      }
    }

    toggleStyleSheet(styleSheet, className, contentDocument, false);
  }
}

export function displayAltAttributes(display: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    if (display) {
      label(
        contentDocument,
        contentDocument.querySelectorAll("img[alt], input[type=image][alt]"),
        "web-developer-display-alt-attributes",
        (image) => `alt="${image.getAttribute("alt")}"`,
      );
    } else {
      removeMatchingElements(".web-developer-display-alt-attributes", contentDocument);
    }

    toggleStyleSheet(BEFORE, "web-developer-display-alt-attributes", contentDocument, false);
  }
}

export function displayImagePaths(display: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    if (display) {
      label(
        contentDocument,
        contentDocument.images,
        "web-developer-display-image-paths",
        (image) => {
          const source = (image as HTMLImageElement).src;
          const link = contentDocument.createElement("a");

          link.setAttribute("href", source);
          link.append(`src="${source}"`);

          return link;
        },
      );
    } else {
      removeMatchingElements(".web-developer-display-image-paths", contentDocument);
    }

    toggleStyleSheet(BEFORE, "web-developer-display-image-paths", contentDocument, false);
  }
}

export function replaceImagesWithAltAttributes(replace: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    if (replace) {
      label(
        contentDocument,
        contentDocument.images,
        "web-developer-replace-images-with-alt-attributes",
        (image) => image.getAttribute("alt") ?? "",
      );
    } else {
      removeMatchingElements(".web-developer-replace-images-with-alt-attributes", contentDocument);
    }

    // The same stylesheet as Remove Images, under its own id, so the two
    // features can be toggled independently.
    toggleStyleSheet(
      `${CSS}/hide-images.css`,
      "web-developer-replace-images-with-alt-attributes",
      contentDocument,
      false,
    );
  }
}

/**
 * An image input cannot simply be hidden: `display: none` would take the
 * submit button out of the form. It is converted to a plain submit instead,
 * with the original type parked on the element so the toggle can undo it.
 */
function convertImageInputs(contentDocument: Document, attribute: string, convert: boolean): void {
  const inputs = contentDocument.querySelectorAll(
    `input[type=image], input[${attribute}]`,
  ) as NodeListOf<HTMLInputElement>;

  for (const input of inputs) {
    if (convert && input.getAttribute("type")?.toLowerCase() === "image") {
      input.setAttribute(attribute, "true");
      input.setAttribute("type", "submit");
    } else if (input.hasAttribute(attribute)) {
      input.removeAttribute(attribute);
      input.setAttribute("type", "image");
    }
  }
}

export function hideImages(hide: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    convertImageInputs(contentDocument, "web-developer-hide-images", hide);

    toggleStyleSheet(`${CSS}/hide-images.css`, "web-developer-hide-images", contentDocument, false);
  }
}

export function hideBackgroundImages(documents: Document[]): void {
  toggle(documents, `${CSS}/hide-background-images.css`, "web-developer-hide-background-images");
}

export function outlineAllImages(documents: Document[]): void {
  toggle(documents, `${CSS}/outline-all-images.css`, "web-developer-outline-all-images");
}

export function outlineImagesWithEmptyAltAttributes(documents: Document[]): void {
  toggle(
    documents,
    `${CSS}/outline-images-with-empty-alt-attributes.css`,
    "web-developer-outline-images-with-empty-alt-attributes",
  );
}

export function outlineImagesWithoutAltAttributes(documents: Document[]): void {
  toggle(
    documents,
    `${CSS}/outline-images-without-alt-attributes.css`,
    "web-developer-outline-images-without-alt-attributes",
  );
}

export function outlineImagesWithoutDimensions(documents: Document[]): void {
  toggle(
    documents,
    `${CSS}/outline-images-without-dimensions.css`,
    "web-developer-outline-images-without-dimensions",
  );
}

/**
 * Leaves the image in the layout but shows nothing of it: the natural size is
 * pinned onto the element first, so the box it occupied survives, and only
 * then is the source swapped for a transparent pixel. That is the difference
 * from Remove Images, which takes the box away with it.
 */
export function makeImagesInvisible(invisible: boolean, documents: Document[]): void {
  const attribute = "web-developer-make-images-invisible";

  for (const contentDocument of documents) {
    convertImageInputs(contentDocument, attribute, invisible);

    for (const image of Array.from(contentDocument.images)) {
      if (invisible) {
        // Only when the image actually loaded: a broken image reports 0, and
        // pinning that would collapse the box rather than preserve it.
        if (!image.hasAttribute("width") && image.naturalWidth) {
          image.setAttribute("width", String(image.naturalWidth));
        }

        if (!image.hasAttribute("height") && image.naturalHeight) {
          image.setAttribute("height", String(image.naturalHeight));
        }

        image.setAttribute(attribute, image.getAttribute("src")!);
        image.setAttribute("src", getExtensionURL("img/transparent.png"));
      } else {
        image.setAttribute("src", image.getAttribute(attribute)!);
        image.removeAttribute(attribute);
      }
    }

    toggleStyleSheet(`${CSS}/make-images-invisible.css`, attribute, contentDocument, false);
  }
}

export function makeImagesFullSize(documents: Document[]): void {
  let altered = 0;

  for (const contentDocument of documents) {
    for (const image of Array.from(contentDocument.images)) {
      if (isResized(image)) {
        image.height = image.naturalHeight;
        image.width = image.naturalWidth;
        altered++;
      }
    }
  }

  displayCount(altered, "makeImagesFullSizeSingleResult", "makeImagesFullSizeMultipleResult");
}

/** Displayed at anything other than its natural size, in either dimension. */
function isResized(image: HTMLImageElement): boolean {
  return (
    (!!image.naturalHeight && image.height !== image.naturalHeight) ||
    (!!image.naturalWidth && image.width !== image.naturalWidth)
  );
}

export function outlineImagesWithAdjustedDimensions(outline: boolean, documents: Document[]): void {
  tag(
    documents,
    outline,
    "web-developer-outline-images-with-adjusted-dimensions",
    `${CSS}/outline-images-with-adjusted-dimensions.css`,
    (image) => isResized(image as HTMLImageElement),
    (contentDocument) => Array.from(contentDocument.images),
  );
}

export function outlineImagesWithOversizedDimensions(
  outline: boolean,
  documents: Document[],
): void {
  tag(
    documents,
    outline,
    "web-developer-outline-images-with-oversized-dimensions",
    `${CSS}/outline-images-with-oversized-dimensions.css`,
    (element) => {
      const image = element as HTMLImageElement;

      return (
        (!!image.naturalHeight && image.height > image.naturalHeight) ||
        (!!image.naturalWidth && image.width > image.naturalWidth)
      );
    },
    (contentDocument) => Array.from(contentDocument.images),
  );
}

export function outlineBackgroundImages(outline: boolean, documents: Document[]): void {
  tag(
    documents,
    outline,
    "web-developer-outline-background-images",
    `${CSS}/outline-background-images.css`,
    (element) =>
      isCSSURI(
        getPropertyCSSValue(
          element.ownerDocument.defaultView!.getComputedStyle(element, null),
          "background-image",
        ),
      ),
    (contentDocument) => walk(contentDocument),
  );
}

function* walk(contentDocument: Document): Generator<Element> {
  const walker = contentDocument.createTreeWalker(
    getDocumentBodyElement(contentDocument),
    NodeFilter.SHOW_ELEMENT,
    null,
  );

  let node: Node | null;

  while ((node = walker.nextNode()) !== null) {
    yield node as Element;
  }
}

/**
 * The dimensions label follows the window, so it is redrawn on resize.
 *
 * The handler is anchored on globalThis rather than held per injection.
 * Upstream referenced it through its namespace, which the injected bundle
 * reassigns every time it runs -- so removeEventListener was passed a
 * different function from the one that had been added, and every toggle left
 * another resize listener attached to the page.
 */
interface ImageDimensionsState {
  locale: DimensionsLocale | null;
  handler: (() => void) | null;
  updating: boolean;
  timeout: number | null;
}

function dimensionsState(): ImageDimensionsState {
  const scope = globalThis as { __webDeveloperImageDimensions__?: ImageDimensionsState };

  scope.__webDeveloperImageDimensions__ ??= {
    locale: null,
    handler: null,
    updating: false,
    timeout: null,
  };

  return scope.__webDeveloperImageDimensions__;
}

export function displayImageDimensions(
  display: boolean,
  documents: Document[],
  locale: DimensionsLocale,
): void {
  const state = dimensionsState();

  if (state.handler) {
    window.removeEventListener("resize", state.handler, false);
    state.handler = null;
  }

  state.locale = display ? locale : null;

  if (display) {
    state.handler = resizeImageDimensions;
    window.addEventListener("resize", state.handler, false);
  }

  for (const contentDocument of documents) {
    if (display) {
      updateImageDimensions(contentDocument);
    } else {
      removeMatchingElements(".web-developer-display-image-dimensions", contentDocument);
    }

    toggleStyleSheet(
      BEFORE,
      "web-developer-display-image-dimensions-before",
      contentDocument,
      false,
    );
    toggleStyleSheet(
      `${CSS}/display-image-dimensions.css`,
      "web-developer-display-image-dimensions",
      contentDocument,
      false,
    );
  }
}

/** Coalesces a burst of resize events into one redraw. */
export function resizeImageDimensions(): void {
  const state = dimensionsState();

  if (state.timeout !== null) {
    window.clearTimeout(state.timeout);
    state.timeout = null;
  }

  if (state.updating) {
    state.timeout = window.setTimeout(resizeImageDimensions, 0);

    return;
  }

  for (const contentDocument of getDocuments(getContentWindow())) {
    updateImageDimensions(contentDocument);
  }
}

export function updateImageDimensions(contentDocument: Document): void {
  const state = dimensionsState();

  state.updating = true;

  removeMatchingElements(".web-developer-display-image-dimensions", contentDocument);

  label(
    contentDocument,
    Array.from(contentDocument.images),
    "web-developer-display-image-dimensions",
    (element) => {
      const image = element as HTMLImageElement;
      const text = formatDimensions(
        image.width,
        image.height,
        state.locale ?? { width: "", height: "" },
      );

      // An image with neither dimension gets no label at all.
      return text || null;
    },
  );

  state.updating = false;
}

/** Appends a fresh cache-busting parameter, replacing any previous one. */
export function updateReloadImageURL(imageURL: string): string {
  const url = removeReloadParameterFromURL(imageURL)!;

  return `${url}${url.includes("?") ? "&" : "?"}web-developer-reload=${Date.now()}`;
}

export function reloadImages(documents: Document[]): void {
  for (const contentDocument of documents) {
    const walker = contentDocument.createTreeWalker(contentDocument, NodeFilter.SHOW_ELEMENT, null);

    let node: Node | null;

    while ((node = walker.nextNode()) !== null) {
      reloadElementImages(node as Element);
    }
  }

  displayNotification("reloadImagesResult");
}

function reloadElementImages(element: Element): void {
  const tag = element.tagName.toLowerCase();
  const sourced = element as HTMLImageElement & HTMLInputElement;

  if (
    tag === "img" ||
    (tag === "input" && sourced.src && sourced.type?.toLowerCase() === "image")
  ) {
    if (!sourced.src.startsWith("chrome://")) {
      sourced.src = updateReloadImageURL(sourced.src);
    }

    return;
  }

  const link = element as HTMLLinkElement;

  if (
    tag === "link" &&
    link.href &&
    !link.href.startsWith("chrome://") &&
    link.rel?.includes("icon")
  ) {
    link.href = updateReloadImageURL(link.href);

    return;
  }

  const computedStyle = element.ownerDocument.defaultView?.getComputedStyle(element, null) ?? null;

  if (!computedStyle) {
    return;
  }

  for (const property of ["background-image", "list-style-image"] as const) {
    const value = getPropertyCSSValue(computedStyle, property);

    if (!isCSSURI(value)) {
      continue;
    }

    const imageURL = getCSSURI(value);

    if (!imageURL || imageURL.startsWith("chrome://")) {
      continue;
    }

    // Assigns a bare URL where the property wants url(...), so the engine
    // discards it and these two never actually reload. Upstream behaviour,
    // preserved deliberately: fixing it changes what the feature does to a
    // page and belongs in its own commit, not smuggled into a port.
    const style = (element as HTMLElement).style;

    if (property === "background-image") {
      style.backgroundImage = updateReloadImageURL(imageURL);
    } else {
      style.listStyleImage = updateReloadImageURL(imageURL);
    }
  }
}
