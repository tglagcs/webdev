/**
 * Element helpers used by the injected features.
 *
 * The class helpers exist because `classList` is not available on SVG elements
 * in the browsers upstream targeted, so it hand-rolled the string handling and
 * special-cased `SVGAnimatedString`. That is still the reason: the features run
 * on other people's pages, SVG included, and `element.className` on an
 * `<svg>` is an object rather than a string.
 */

import { getDocumentBodyElement } from "./documents";

export function hasClass(element: Element | null, className: string): boolean {
  return classNames(element).includes(className);
}

export function addClass(element: Element | null, className: string): void {
  if (!element || !className || hasClass(element, className)) {
    return;
  }

  setClassName(element, `${readClassName(element)} ${className}`.trim());
}

export function removeClass(element: Element | null, className: string): void {
  if (!element || !className) {
    return;
  }

  const classes = classNames(element);
  const index = classes.indexOf(className);

  if (index !== -1) {
    classes.splice(index, 1);
    setClassName(element, classes.join(" ").trim());
  }
}

export function toggleClass(element: Element | null, className: string, value: boolean): void {
  if (value) {
    addClass(element, className);
  } else {
    removeClass(element, className);
  }
}

function readClassName(element: Element): string {
  const className = element.className as string | SVGAnimatedString;

  return typeof className === "string" ? className : className.baseVal;
}

function setClassName(element: Element, value: string): void {
  const className = element.className as string | SVGAnimatedString;

  if (typeof className === "string") {
    element.className = value;
  } else {
    className.baseVal = value;
  }
}

function classNames(element: Element | null): string[] {
  return element ? readClassName(element).split(" ") : [];
}

/** `head` is absent on XML documents, where the root element stands in. */
export function getDocumentHeadElement(contentDocument: Document): Element {
  return contentDocument.querySelector("head") ?? contentDocument.documentElement;
}

export function removeMatchingElements(selector: string, contentDocument: Document): void {
  for (const element of Array.from(contentDocument.querySelectorAll(selector))) {
    element.parentNode?.removeChild(element);
  }
}

/** The absolute URL of a file packaged with the extension. */
export function getExtensionURL(path: string): string {
  return browser.runtime.getURL(path as never);
}

/**
 * Escapes text for interpolation into an HTML string.
 *
 * The dashboard builds its markup by concatenation and inserts it with
 * insertAdjacentHTML, and some of what it interpolates -- stylesheet URLs,
 * element attributes -- comes from the page it is running on. A page that
 * serves a stylesheet whose href contains a quote could otherwise close the
 * attribute and write markup into the extension's own UI.
 */
export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Inserts a child at the front, whether or not the element already has any.
 *
 * Both arguments are guarded, and the child guard is load-bearing: callers in
 * the Element Information widget pass a node that may not have been built,
 * and upstream silently did nothing there. Dropping the check turned that into
 * "parameter 1 is not of type Node", thrown inside a mouseover handler --
 * which left the hover outline on the page, because the line that marks the
 * outlined element comes after the throw.
 */
export function appendHTML(html: string, element: Element | null): void {
  if (!html || !element) {
    return;
  }

  element.insertAdjacentHTML("beforeend", html);
}

/** Removes every child, leaving the element itself in place. */
export function empty(element: Element | null): void {
  if (!element) {
    return;
  }

  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/** Whether the element is inside the ancestor, at any depth. */
export function isAncestor(element: Node | null, ancestorElement: Node | null): boolean {
  if (!element || !ancestorElement) {
    return false;
  }

  let parent = element.parentNode;

  while (parent) {
    if (parent === ancestorElement) {
      return true;
    }

    parent = parent.parentNode;
  }

  return false;
}

/**
 * The element siblings on one side of an element, optionally filtered.
 *
 * Returns `null` rather than an empty array when there are none. That is
 * upstream's contract and the callers test for it, so it is kept -- the
 * ancestors panel of Element Information branches on the null.
 */
function siblings(element: Element | null, match: string, previous: boolean): Element[] | null {
  const parent = element?.parentNode;

  if (!element || !parent) {
    return null;
  }

  const all = Array.from(parent.childNodes);
  const index = all.indexOf(element);
  const side = previous ? all.slice(0, index) : all.slice(index + 1);

  const found = side.filter(
    (node): node is Element =>
      node.nodeType === Node.ELEMENT_NODE && (!match || (node as Element).matches(match)),
  );

  return found.length === 0 ? null : found;
}

export function getNextSiblings(element: Element | null, match = ""): Element[] | null {
  return siblings(element, match, false);
}

export function getPreviousSiblings(element: Element | null, match = ""): Element[] | null {
  return siblings(element, match, true);
}

/**
 * Loads one of the extension's scripts into a document.
 *
 * Used to put Bootstrap and the dashboard's own bundle inside the widget
 * iframe, which is why the URL is resolved against the extension rather than
 * the page.
 */
export function includeJavaScript(
  url: string,
  contentDocument: Document,
  callback?: () => void,
): void {
  const scriptElement = contentDocument.createElement("script");

  if (callback) {
    scriptElement.addEventListener(
      "load",
      () => {
        callback();
      },
      { capture: true, once: true },
    );
  }

  scriptElement.setAttribute("src", getExtensionURL(url));
  getDocumentBodyElement(contentDocument).appendChild(scriptElement);
}

export function insertAsFirstChild(element: Element | null, child: Node | null): void {
  if (!element || !child) {
    return;
  }

  if (element.hasChildNodes()) {
    element.insertBefore(child, element.firstChild);
  } else {
    element.appendChild(child);
  }
}
