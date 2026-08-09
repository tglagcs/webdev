/**
 * The Information menu.
 *
 * Almost every feature here labels elements: it finds the ones carrying some
 * attribute and inserts a span describing it, which a `::before` stylesheet
 * then positions. The variations are what is selected, what the label says,
 * and whether it goes before the element or inside it.
 */

import { getCSSText, getPropertyCSSValue } from "@/lib/dom/css-values";
import { formatDimensions, type DimensionsLocale } from "@/lib/dimensions";
import { getContentWindow, getDocumentBodyElement } from "@/lib/dom/documents";
import { insertAsFirstChild, removeMatchingElements } from "@/lib/dom/elements";
import { toggleStyleSheet } from "@/lib/dom/stylesheets";
import { getDocuments } from "@/content/report";

export type { DimensionsLocale };

const CSS = "/features/css/information";
const BEFORE = "/features/css/before.css";

/** True for the extension's own markup, which must never label itself. */
function isExtensionElement(element: Element): boolean {
  return element.getAttribute("class")?.startsWith("web-developer-") ?? false;
}

function toggle(documents: Document[], id: string, styleSheet?: string): void {
  for (const contentDocument of documents) {
    toggleStyleSheet(BEFORE, styleSheet ? `${id}-before` : id, contentDocument, false);

    if (styleSheet) {
      toggleStyleSheet(styleSheet, id, contentDocument, false);
    }
  }
}

/**
 * The shape almost every feature in this menu takes: select elements, insert
 * a label for each, and toggle the stylesheet that positions them.
 *
 * `place` is what distinguishes Display Div Order and the table information
 * from the rest -- a number describing a box belongs inside it, an attribute
 * describing an element belongs before it.
 */
function labelElements(
  documents: Document[],
  display: boolean,
  className: string,
  select: (contentDocument: Document) => Iterable<Element>,
  describe: (element: Element, index: number, contentDocument: Document) => Node | string | null,
  place: "before" | "inside" = "before",
): void {
  for (const contentDocument of documents) {
    removeMatchingElements(`.${className}`, contentDocument);

    if (!display) {
      continue;
    }

    let index = 0;

    for (const element of Array.from(select(contentDocument))) {
      const content = describe(element, index++, contentDocument);

      if (content === null) {
        continue;
      }

      const span = contentDocument.createElement("span");

      span.setAttribute("class", className);
      span.append(content);

      if (place === "inside") {
        insertAsFirstChild(element, span);
      } else {
        element.parentNode?.insertBefore(span, element);
      }
    }
  }
}

/** An element named the way a CSS selector would name it. */
export function getElementDescription(element: Element): string {
  let description = element.hasAttribute("id") ? `#${element.getAttribute("id")}` : "";

  if (element.hasAttribute("class")) {
    for (const name of element.getAttribute("class")!.split(" ")) {
      description += `.${name.trim()}`;
    }
  }

  return description;
}

/** How many tables this one is nested inside, counting itself as one. */
export function getTableDepth(table: Element | null): number {
  let depth = 1;
  let element: Node | null = table;

  while (element && (element = element.parentNode) !== null) {
    if ((element as Element).tagName?.toLowerCase() === "table") {
      depth++;
    }
  }

  return depth;
}

export function displayAbbreviations(documents: Document[]): void {
  toggle(documents, "web-developer-display-abbreviations", `${CSS}/display-abbreviations.css`);
}

export function displayARIARoles(documents: Document[]): void {
  toggle(documents, "web-developer-display-aria-roles", `${CSS}/display-aria-roles.css`);
}

export function displayLinkDetails(documents: Document[]): void {
  toggle(documents, "web-developer-display-link-details", `${CSS}/display-link-details.css`);
}

export function displayTopographicInformation(documents: Document[]): void {
  for (const contentDocument of documents) {
    toggleStyleSheet(
      `${CSS}/display-topographic-information.css`,
      "web-developer-display-topographic-information",
      contentDocument,
      false,
    );
  }
}

export function displayAccessKeys(display: boolean, documents: Document[]): void {
  labelElements(
    documents,
    display,
    "web-developer-display-access-keys",
    (contentDocument) => contentDocument.querySelectorAll("[accesskey]"),
    (element) => `accesskey="${element.getAttribute("accesskey")}"`,
  );

  toggle(documents, "web-developer-display-access-keys");
}

export function displayTabIndex(display: boolean, documents: Document[]): void {
  labelElements(
    documents,
    display,
    "web-developer-display-tab-index",
    (contentDocument) => contentDocument.querySelectorAll("[tabindex]"),
    (element) => `tabindex="${element.getAttribute("tabindex")}"`,
  );

  toggle(documents, "web-developer-display-tab-index");
}

export function displayTitleAttributes(display: boolean, documents: Document[]): void {
  labelElements(
    documents,
    display,
    "web-developer-display-title-attributes",
    (contentDocument) => contentDocument.querySelectorAll("[title]"),
    (element) => `title="${element.getAttribute("title")}"`,
  );

  toggle(documents, "web-developer-display-title-attributes");
}

/** Each anchor is labelled with the fragment that would reach it. */
export function displayAnchors(display: boolean, documents: Document[]): void {
  labelElements(
    documents,
    display,
    "web-developer-display-anchors",
    (contentDocument) => contentDocument.querySelectorAll("[id], [name]"),
    (element, _index, contentDocument) => {
      if (element === contentDocument.documentElement) {
        return null;
      }

      const location = contentDocument.location;
      let fragment = location.pathname + location.search;

      if (element.hasAttribute("id")) {
        fragment = `#${element.getAttribute("id")}`;
      } else if (element.hasAttribute("name")) {
        fragment = `#${element.getAttribute("name")}`;
      }

      const link = contentDocument.createElement("a");

      link.setAttribute("href", fragment);
      link.append(fragment);

      return link;
    },
  );

  toggle(documents, "web-developer-display-anchors");
}

export function displayIdClassDetails(display: boolean, documents: Document[]): void {
  labelElements(
    documents,
    display,
    "web-developer-id-class-details",
    (contentDocument) => contentDocument.querySelectorAll("[class], [id]"),
    (element, _index, contentDocument) => {
      if (element === contentDocument.documentElement) {
        return null;
      }

      // Skip the extension's own markup: labelling it means the features
      // start describing each other's labels.
      const ownClass = element.getAttribute("class")?.startsWith("web-developer-") ?? false;
      const ownId = element.getAttribute("id")?.startsWith("web-developer-") ?? false;
      const hasOwnAttribute =
        (element.hasAttribute("class") && !ownClass) || (element.hasAttribute("id") && !ownId);

      return hasOwnAttribute ? getElementDescription(element) : null;
    },
  );

  toggle(documents, "web-developer-display-id-class-details");
}

export function displayDivOrder(display: boolean, documents: Document[]): void {
  labelElements(
    documents,
    display,
    "web-developer-display-div-order",
    (contentDocument) => contentDocument.getElementsByTagName("div"),
    (element, index) => `${getElementDescription(element)} ${index + 1}`,
    "inside",
  );

  toggle(documents, "web-developer-display-div-order", `${CSS}/display-div-order.css`);
}

export function displayTableDepth(display: boolean, documents: Document[], depth: string): void {
  labelElements(
    documents,
    display,
    "web-developer-display-table-depth",
    (contentDocument) => contentDocument.getElementsByTagName("table"),
    (table) => `${depth} = ${getTableDepth(table)}`,
  );

  toggle(documents, "web-developer-display-table-depth");
}

/** The accessibility attributes of a table cell, one per line. */
function tableCellInformation(cell: Element, contentDocument: Document): Element | null {
  const container = contentDocument.createElement("div");

  for (const attribute of ["abbr", "axis", "headers", "scope"]) {
    if (!cell.hasAttribute(attribute)) {
      continue;
    }

    const paragraph = contentDocument.createElement("p");

    paragraph.append(`${attribute}="${cell.getAttribute(attribute)}"`);
    container.appendChild(paragraph);
  }

  return container.childNodes.length > 0 ? container : null;
}

export function displayTableInformation(display: boolean, documents: Document[]): void {
  const className = "web-developer-display-table-information";

  for (const contentDocument of documents) {
    removeMatchingElements(`.${className}`, contentDocument);

    if (display) {
      for (const table of Array.from(contentDocument.getElementsByTagName("table"))) {
        if (table.hasAttribute("summary")) {
          const summary = contentDocument.createElement("div");

          summary.setAttribute("class", className);
          summary.append(`summary="${table.getAttribute("summary")}"`);
          table.parentNode?.insertBefore(summary, table);
        }

        for (const cell of [
          ...Array.from(table.getElementsByTagName("th")),
          ...Array.from(table.getElementsByTagName("td")),
        ]) {
          const information = tableCellInformation(cell, contentDocument);

          if (information) {
            information.setAttribute("class", className);
            insertAsFirstChild(cell, information);
          }
        }
      }
    }

    toggleStyleSheet(BEFORE, `${className}-before`, contentDocument, false);
    toggleStyleSheet(`${CSS}/display-table-information.css`, className, contentDocument, false);
  }
}

/** The attributes worth reporting for an <object>, in upstream's order. */
const OBJECT_ATTRIBUTES = [
  "width",
  "height",
  "archive",
  "classid",
  "codebase",
  "codetype",
  "data",
  "standby",
  "type",
];

function attributeList(element: Element, names: string[]): string {
  return names
    .filter((name) => element.hasAttribute(name))
    .map((name) => ` ${name}="${element.getAttribute(name)}"`)
    .join("");
}

/**
 * Shows the markup of each <object> and its <param> children as text.
 *
 * Upstream's inner loop over the params reused `j` and `m` -- the counters of
 * the outer loop over the objects -- so on a page with more than one object
 * the outer loop terminated as soon as the first object's params had been
 * walked, and every object after the first went unlabelled. A `for...of` over
 * each collection cannot express that, so the bug does not survive the port.
 */
export function displayObjectInformation(display: boolean, documents: Document[]): void {
  const className = "web-developer-display-object-information";

  for (const contentDocument of documents) {
    removeMatchingElements(`.${className}`, contentDocument);

    if (display) {
      for (const object of Array.from(contentDocument.getElementsByTagName("object"))) {
        const container = contentDocument.createElement("div");
        const opening = contentDocument.createElement("p");

        opening.append(`<object${attributeList(object, OBJECT_ATTRIBUTES)}>`);
        container.appendChild(opening);

        for (const param of Array.from(object.getElementsByTagName("param"))) {
          const line = contentDocument.createElement("p");

          line.append(`<param${attributeList(param, ["name", "value"])}>`);
          line.setAttribute("class", "web-developer-object-information-param");
          container.appendChild(line);
        }

        const closing = contentDocument.createElement("p");

        closing.append("</object>");
        container.appendChild(closing);

        container.setAttribute("class", className);
        object.parentNode?.insertBefore(container, object);
      }
    }

    toggleStyleSheet(BEFORE, `${className}-before`, contentDocument, false);
    toggleStyleSheet(`${CSS}/display-object-information.css`, className, contentDocument, false);
  }
}

/**
 * Labels every element that takes part in stacking, with its z-index.
 *
 * Only elements with an explicit z-index: `auto` is the default and labelling
 * every element on the page with it would bury the ones that matter.
 */
export function displayStackLevels(display: boolean, documents: Document[]): void {
  const className = "web-developer-display-stack-levels";

  for (const contentDocument of documents) {
    removeMatchingElements(`.${className}`, contentDocument);

    if (display) {
      const walker = contentDocument.createTreeWalker(
        getDocumentBodyElement(contentDocument),
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode(node: Node) {
            const element = node as Element;

            if (isExtensionElement(element)) {
              return NodeFilter.FILTER_SKIP;
            }

            const zIndex = stackLevel(element);

            return zIndex && zIndex !== "auto" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
          },
        },
      );

      let node: Node | null;

      while ((node = walker.nextNode()) !== null) {
        const element = node as Element;
        const span = contentDocument.createElement("span");

        span.setAttribute("class", className);
        span.append(`${getElementDescription(element)} z-index="${stackLevel(element)}"`);
        element.parentNode?.insertBefore(span, element);
      }
    }

    toggleStyleSheet(BEFORE, className, contentDocument, false);
  }
}

function stackLevel(element: Element): string | null {
  return getCSSText(
    getPropertyCSSValue(
      element.ownerDocument.defaultView!.getComputedStyle(element, null),
      "z-index",
    ),
  );
}

/**
 * The div dimension labels follow the layout, so they are redrawn on resize.
 *
 * Anchored on globalThis for the same reason as the image dimensions: the
 * injected bundle is re-evaluated on every invocation, so a handler held per
 * injection is never the one removeEventListener is given.
 */
interface DivDimensionsState {
  locale: DimensionsLocale | null;
  handler: (() => void) | null;
  updating: boolean;
  timeout: number | null;
}

function dimensionsState(): DivDimensionsState {
  const scope = globalThis as { __webDeveloperDivDimensions__?: DivDimensionsState };

  scope.__webDeveloperDivDimensions__ ??= {
    locale: null,
    handler: null,
    updating: false,
    timeout: null,
  };

  return scope.__webDeveloperDivDimensions__;
}

export function displayDivDimensions(
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
    state.handler = resizeDivDimensions;
    window.addEventListener("resize", state.handler, false);
  }

  for (const contentDocument of documents) {
    if (display) {
      updateDivDimensions(contentDocument);
    } else {
      removeMatchingElements(".web-developer-display-div-dimensions", contentDocument);
    }

    toggleStyleSheet(BEFORE, "web-developer-display-div-dimensions-before", contentDocument, false);
    toggleStyleSheet(
      `${CSS}/display-div-dimensions.css`,
      "web-developer-display-div-dimensions",
      contentDocument,
      false,
    );
  }
}

export function resizeDivDimensions(): void {
  const state = dimensionsState();

  if (state.timeout !== null) {
    window.clearTimeout(state.timeout);
    state.timeout = null;
  }

  if (state.updating) {
    state.timeout = window.setTimeout(resizeDivDimensions, 0);

    return;
  }

  for (const contentDocument of getDocuments(getContentWindow())) {
    updateDivDimensions(contentDocument);
  }
}

export function updateDivDimensions(contentDocument: Document): void {
  const state = dimensionsState();

  state.updating = true;

  removeMatchingElements(".web-developer-display-div-dimensions", contentDocument);

  for (const div of Array.from(contentDocument.getElementsByTagName("div"))) {
    const span = contentDocument.createElement("span");
    const size = formatDimensions(
      div.offsetWidth,
      div.offsetHeight,
      state.locale ?? { width: "", height: "" },
    );

    // Positioned absolutely at the div's own corner, so the label sits on the
    // box it measures rather than displacing it.
    span.style.left = `${div.offsetLeft}px`;
    span.style.position = "absolute";
    span.style.top = `${div.offsetTop}px`;

    span.setAttribute("class", "web-developer-display-div-dimensions");
    span.append(`${getElementDescription(div)} ${size}`);

    insertAsFirstChild(div, span);
  }

  state.updating = false;
}
