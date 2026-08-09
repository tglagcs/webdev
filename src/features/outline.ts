/**
 * The Outline menu.
 *
 * Almost all of it is one operation -- add or remove one of the extension's
 * stylesheets -- so most of this file is the table that says which stylesheet
 * goes with which feature. Upstream wrote each of those out as its own
 * function with its own document loop; the two that genuinely do more, because
 * a selector cannot express what they match, are at the bottom.
 */

import { getDocumentBodyElement } from "@/lib/dom/documents";
import { getCSSText, getPropertyCSSValue } from "@/lib/dom/css-values";
import {
  addClass,
  getDocumentHeadElement,
  removeClass,
  removeMatchingElements,
} from "@/lib/dom/elements";
import { toggleStyleSheet } from "@/lib/dom/stylesheets";
import type { Entry } from "./entries";

const CSS = "features/css/outline";

/** Applied by every feature that can also label elements with their tag name. */
const BEFORE_COMMON = "features/css/before.css";

function toggle(documents: Document[], url: string, id: string): void {
  for (const contentDocument of documents) {
    toggleStyleSheet(url, id, contentDocument, false);
  }
}

/**
 * Toggles the outline, plus the two extra stylesheets that draw the tag name
 * in a ::before, when the user has that option on.
 *
 * The ids matter: each stylesheet is toggled under its own id, so turning the
 * feature off removes exactly what turning it on added.
 */
function toggleWithTagNames(
  documents: Document[],
  name: string,
  showElementTagNames: boolean,
): void {
  for (const contentDocument of documents) {
    toggleStyleSheet(
      `${CSS}/outline-${name}.css`,
      `web-developer-outline-${name}`,
      contentDocument,
      false,
    );

    if (showElementTagNames) {
      toggleStyleSheet(
        BEFORE_COMMON,
        `web-developer-outline-${name}-before-common`,
        contentDocument,
        false,
      );
      toggleStyleSheet(
        `${CSS}/outline-${name}-before.css`,
        `web-developer-outline-${name}-before`,
        contentDocument,
        false,
      );
    }
  }
}

export function outlineBlockLevelElements(
  documents: Document[],
  showElementTagNames: boolean,
): void {
  toggleWithTagNames(documents, "block-level-elements", showElementTagNames);
}

export function outlineDeprecatedElements(
  documents: Document[],
  showElementTagNames: boolean,
): void {
  toggleWithTagNames(documents, "deprecated-elements", showElementTagNames);
}

export function outlineHeadings(documents: Document[], showElementTagNames: boolean): void {
  toggleWithTagNames(documents, "headings", showElementTagNames);
}

export function outlineTableCells(documents: Document[], showElementTagNames: boolean): void {
  toggleWithTagNames(documents, "table-cells", showElementTagNames);
}

export function outlineFrames(documents: Document[]): void {
  toggle(documents, `${CSS}/outline-frames.css`, "web-developer-outline-frames");
}

export function outlineNonSecureElements(documents: Document[]): void {
  toggle(
    documents,
    `${CSS}/outline-non-secure-elements.css`,
    "web-developer-outline-non-secure-elements",
  );
}

export function outlineTableCaptions(documents: Document[]): void {
  toggle(documents, `${CSS}/outline-table-captions.css`, "web-developer-outline-table-captions");
}

export function outlineTables(documents: Document[]): void {
  toggle(documents, `${CSS}/outline-tables.css`, "web-developer-outline-tables");
}

/**
 * Tags every element whose computed value for `property` passes `matches`,
 * then toggles the stylesheet that draws the outline.
 *
 * Float and position cannot be selected for -- an element is floated because
 * of a rule somewhere in the cascade, not because of anything in its markup --
 * so these two walk the tree and mark the matches with a class instead.
 */
function tagByComputedStyle(
  documents: Document[],
  outline: boolean,
  className: string,
  styleSheet: string,
  property: string,
  matches: (value: string) => boolean,
): void {
  for (const contentDocument of documents) {
    if (outline) {
      const walker = contentDocument.createTreeWalker(
        getDocumentBodyElement(contentDocument),
        NodeFilter.SHOW_ELEMENT,
        null,
      );

      let node: Node | null;

      while ((node = walker.nextNode()) !== null) {
        const element = node as Element;
        const value = getCSSText(
          getPropertyCSSValue(
            element.ownerDocument.defaultView!.getComputedStyle(element, null),
            property,
          ),
        );

        if (value && matches(value)) {
          addClass(element, className);
        }
      }
    } else {
      // A live HTMLCollection, so removing the class shortens it -- which is
      // why this drains index 0 rather than iterating.
      const tagged = contentDocument.getElementsByClassName(className);

      while (tagged.length > 0) {
        removeClass(tagged[0]!, className);
      }
    }

    toggleStyleSheet(styleSheet, className, contentDocument, false);
  }
}

export function outlineFloatedElements(outline: boolean, documents: Document[]): void {
  tagByComputedStyle(
    documents,
    outline,
    "web-developer-outline-floated-elements",
    `${CSS}/outline-floated-elements.css`,
    "float",
    (value) => value !== "none",
  );
}

export function outlinePositionedElements(
  positionType: string,
  outline: boolean,
  documents: Document[],
): void {
  tagByComputedStyle(
    documents,
    outline,
    `web-developer-outline-${positionType}-positioned-elements`,
    `${CSS}/outline-positioned-elements.css`,
    "position",
    (value) => value === positionType,
  );
}

/**
 * Outlines links pointing off the document's own host.
 *
 * Generated rather than a static stylesheet because the host is only known at
 * runtime. The second rule cancels the first for links that are not http(s) at
 * all -- mailto:, tel:, bare fragments -- which the first rule's `:not()` pair
 * would otherwise match.
 */
export function outlineExternalLinks(outline: boolean, documents: Document[]): void {
  for (const contentDocument of documents) {
    if (!outline) {
      removeMatchingElements("#web-developer-outline-external-links", contentDocument);

      continue;
    }

    const hostName = contentDocument.location.hostname.replace(/\./gi, "\\.");
    const styleElement = contentDocument.createElement("style");

    styleElement.setAttribute("id", "web-developer-outline-external-links");
    styleElement.appendChild(
      contentDocument.createTextNode(
        `a:not([href^=http\\:\\/\\/${hostName}]):not([href^=https\\:\\/\\/${hostName}]) { outline: 1px solid #b94a48 !important; }`,
      ),
    );
    styleElement.appendChild(
      contentDocument.createTextNode(
        "a:not([href^=http\\:\\/\\/]):not([href^=https\\:\\/\\/]) { outline-style: none !important; }",
      ),
    );

    getDocumentHeadElement(contentDocument).appendChild(styleElement);
  }
}

/**
 * The Outline menu, as entries the popup can name in the registry.
 *
 * One line per feature, and each is the whole of what its old popup handler
 * did: read a value, call one function. The three shapes are the argument
 * lists the functions happen to have -- `documents` first, `documents` last,
 * or a positioning keyword in front -- which is exactly the reason a single
 * generic dispatcher could not call them and this table can.
 *
 * `enabled` in a payload is the feature's state *before* the click, so the
 * ones that take an `outline` flag are handed its opposite, as upstream's
 * closures were.
 */
export const OUTLINE_ENTRIES: Record<string, Entry> = {
  "outline-block-level-elements": (payload, documents) =>
    outlineBlockLevelElements(documents, !!payload.showElementTagNames),
  "outline-deprecated-elements": (payload, documents) =>
    outlineDeprecatedElements(documents, !!payload.showElementTagNames),
  "outline-headings": (payload, documents) =>
    outlineHeadings(documents, !!payload.showElementTagNames),
  "outline-table-cells": (payload, documents) =>
    outlineTableCells(documents, !!payload.showElementTagNames),

  "outline-frames": (_payload, documents) => outlineFrames(documents),
  "outline-non-secure-elements": (_payload, documents) => outlineNonSecureElements(documents),
  "outline-table-captions": (_payload, documents) => outlineTableCaptions(documents),
  "outline-tables": (_payload, documents) => outlineTables(documents),

  "outline-external-links": (payload, documents) =>
    outlineExternalLinks(!payload.enabled, documents),
  "outline-floated-elements": (payload, documents) =>
    outlineFloatedElements(!payload.enabled, documents),

  "outline-absolute-positioned-elements": (payload, documents) =>
    outlinePositionedElements("absolute", !payload.enabled, documents),
  "outline-fixed-positioned-elements": (payload, documents) =>
    outlinePositionedElements("fixed", !payload.enabled, documents),
  "outline-relative-positioned-elements": (payload, documents) =>
    outlinePositionedElements("relative", !payload.enabled, documents),
};
