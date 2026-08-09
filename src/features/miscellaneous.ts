/**
 * The Miscellaneous menu.
 */

import { getCSSText, getPropertyCSSValue } from "@/lib/dom/css-values";
import { getDocumentBodyElement } from "@/lib/dom/documents";
import { toggleStyleSheet } from "@/lib/dom/stylesheets";
import { displayCount } from "./notify";

/**
 * The extension's own injected markup, which every walk must skip.
 *
 * Without this the features fight each other: Display Hidden Elements would
 * reveal the ruler's internals, and the dashboard's hidden panels would be
 * forced visible on top of the page.
 */
function isExtensionElement(element: Element): boolean {
  return element.getAttribute("id")?.startsWith("web-developer") ?? false;
}

function computedValue(element: Element, property: string): string | null {
  const computedStyle = element.ownerDocument.defaultView?.getComputedStyle(element, null) ?? null;

  return getCSSText(getPropertyCSSValue(computedStyle, property));
}

/**
 * `script` and `style` are display: none by definition, so accepting them
 * would mean forcing the page's own source into view.
 */
const hiddenNodeFilter: NodeFilter = {
  acceptNode(node: Node) {
    const element = node as Element;
    const tagName = element.tagName?.toLowerCase();

    if (isExtensionElement(element) || tagName === "script" || tagName === "style") {
      return NodeFilter.FILTER_SKIP;
    }

    return computedValue(element, "display") === "none"
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_SKIP;
  },
};

const invisibleNodeFilter: NodeFilter = {
  acceptNode(node: Node) {
    const element = node as Element;

    if (isExtensionElement(element)) {
      return NodeFilter.FILTER_SKIP;
    }

    const visibility = computedValue(element, "visibility");

    return visibility === "collapse" || visibility === "hidden"
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_SKIP;
  },
};

/**
 * Attributes recording what displayHiddenElements changed, so it can be undone.
 *
 * Parked on the elements themselves rather than held in a module-level map,
 * for the same reason toggleElementInlineStyles does it: the injected script
 * is re-evaluated on every invocation and keeps no state between them. The
 * page is the only memory there is.
 *
 * The whole `style` attribute is stored as text rather than the one property
 * being changed, because putting a property back through the CSSOM rewrites
 * the attribute -- "display: none" comes back as "display: none;" -- and the
 * page's own markup should survive a toggle untouched.
 */
const PARKED_STYLE = "web-developer-hidden-style";
const PARKED_INPUT = "web-developer-hidden-input";

function force(element: HTMLElement, property: string, value: string): void {
  // An element can match both filters; only the first visit is the original.
  if (!element.hasAttribute(PARKED_STYLE)) {
    element.setAttribute(PARKED_STYLE, element.getAttribute("style") ?? "");
  }

  // !important, because whatever is hiding the element is winning already.
  element.style.setProperty(property, value, "important");
}

function restoreStyle(element: HTMLElement): void {
  const original = element.getAttribute(PARKED_STYLE)!;

  if (original) {
    element.setAttribute("style", original);
  } else {
    element.removeAttribute("style");
  }

  element.removeAttribute(PARKED_STYLE);

  // Belt and braces: an element that had no style attribute must not come
  // back with an empty one. Removing the attribute is enough in isolation,
  // but the element's CSSStyleDeclaration has been touched, and engines
  // differ on whether that re-materialises the attribute.
  if (element.getAttribute("style") === "") {
    element.removeAttribute("style");
  }
}

function reveal(contentDocument: Document): number {
  let count = 0;

  // A hidden input is hidden by its type, not by CSS, so removing the type is
  // the only thing that shows it -- and it becomes a text input, which is
  // what makes the value visible and editable.
  for (const input of Array.from(contentDocument.querySelectorAll("input[type=hidden]"))) {
    input.setAttribute(PARKED_INPUT, "");
    input.removeAttribute("type");
    count++;
  }

  for (const [filter, property, value] of [
    [hiddenNodeFilter, "display", "revert"],
    [invisibleNodeFilter, "visibility", "visible"],
  ] as const) {
    const walker = contentDocument.createTreeWalker(
      getDocumentBodyElement(contentDocument),
      NodeFilter.SHOW_ELEMENT,
      filter,
    );

    let node: Node | null;

    while ((node = walker.nextNode()) !== null) {
      force(node as HTMLElement, property, value);
      count++;
    }
  }

  return count;
}

function hideAgain(contentDocument: Document): number {
  let count = 0;

  for (const input of Array.from(contentDocument.querySelectorAll(`[${PARKED_INPUT}]`))) {
    input.setAttribute("type", "hidden");
    input.removeAttribute(PARKED_INPUT);
    count++;
  }

  for (const element of Array.from(contentDocument.querySelectorAll(`[${PARKED_STYLE}]`))) {
    restoreStyle(element as HTMLElement);
    count++;
  }

  return count;
}

/**
 * Reveals everything the page is hiding, by three different mechanisms -- or
 * puts it all back.
 *
 * `revert` rather than `block`: the element goes back to whatever its own
 * cascade would have given it, so a hidden table row is revealed as a row and
 * not as a block.
 *
 * Upstream had no way back from this: it was a one-shot action, so the only
 * way to un-see a page's hidden markup was to reload. It is a toggle now.
 */
export function displayHiddenElements(display: boolean, documents: Document[]): void {
  let affected = 0;

  for (const contentDocument of documents) {
    affected += display ? reveal(contentDocument) : hideAgain(contentDocument);
  }

  if (!display) {
    return;
  }

  displayCount(
    affected,
    "displayHiddenElementsSingleResult",
    "displayHiddenElementsMultipleResult",
  );
}

export function linearizePage(documents: Document[]): void {
  for (const contentDocument of documents) {
    toggleStyleSheet(
      "/features/css/miscellaneous/linearize-page.css",
      "web-developer-linearize-page",
      contentDocument,
      false,
    );
  }
}

export function makeFramesResizable(documents: Document[]): void {
  let resizable = 0;

  for (const contentDocument of documents) {
    for (const frame of Array.from(contentDocument.getElementsByTagName("frame"))) {
      if (frame.hasAttribute("noresize")) {
        frame.removeAttribute("noresize");
        resizable++;
      }
    }
  }

  displayCount(resizable, "makeFramesResizableSingleResult", "makeFramesResizableMultipleResult");
}
