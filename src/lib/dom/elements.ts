/**
 * Element helpers used by the injected features.
 *
 * The class helpers exist because `classList` is not available on SVG elements
 * in the browsers upstream targeted, so it hand-rolled the string handling and
 * special-cased `SVGAnimatedString`. That is still the reason: the features run
 * on other people's pages, SVG included, and `element.className` on an
 * `<svg>` is an object rather than a string.
 */

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
