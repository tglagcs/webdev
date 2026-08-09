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

function forceStyle(
  contentDocument: Document,
  filter: NodeFilter,
  property: string,
  value: string,
): number {
  const walker = contentDocument.createTreeWalker(
    getDocumentBodyElement(contentDocument),
    NodeFilter.SHOW_ELEMENT,
    filter,
  );

  let count = 0;
  let node: Node | null;

  while ((node = walker.nextNode()) !== null) {
    // !important, because whatever is hiding the element is winning already.
    (node as HTMLElement).style.setProperty(property, value, "important");
    count++;
  }

  return count;
}

/**
 * Reveals everything the page is hiding, by three different mechanisms.
 *
 * `revert` rather than `block`: the element goes back to whatever its own
 * cascade would have given it, so a hidden table row is revealed as a row and
 * not as a block.
 */
export function displayHiddenElements(documents: Document[]): void {
  let displayed = 0;

  for (const contentDocument of documents) {
    // A hidden input is hidden by its type, not by CSS, so removing the type
    // is the only thing that shows it -- and it becomes a text input, which
    // is what makes the value visible and editable.
    for (const input of Array.from(contentDocument.querySelectorAll("input[type=hidden]"))) {
      input.removeAttribute("type");
      displayed++;
    }

    displayed += forceStyle(contentDocument, hiddenNodeFilter, "display", "revert");
    displayed += forceStyle(contentDocument, invisibleNodeFilter, "visibility", "visible");
  }

  displayCount(
    displayed,
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
