/**
 * Anchors, duplicate ids and the heading outline.
 */

import { getElementText } from "@/lib/dom/documents";
import { perDocument, sortedUnique, type Report } from "./report";

/** Both `id` attributes and the legacy `<a name>` form count as anchors. */
export function getAnchors(): Report<{ url: string; anchors: string[] }> {
  return perDocument((contentDocument) => {
    const ids = Array.from(contentDocument.querySelectorAll("[id]"), (element) =>
      element.getAttribute("id"),
    );
    const names = Array.from(contentDocument.querySelectorAll("a[name]"), (element) =>
      element.getAttribute("name"),
    );

    return { anchors: sortedUnique([...ids, ...names] as string[]) };
  });
}

export function getDuplicateIds(): Report<{ url: string; ids: string[] }> {
  return perDocument((contentDocument) => {
    const all = Array.from(contentDocument.querySelectorAll("[id]"), (element) =>
      element.getAttribute("id"),
    ).sort();

    // Reported once each, however many times they repeat -- so this is the
    // inverse of sortedUnique: keep only what has a duplicate before it, and
    // only the first such occurrence.
    const ids = all.filter(
      (id, index) => id === all[index - 1] && id !== all[index - 2],
    ) as string[];

    return { ids };
  });
}

export interface Heading {
  level: number;
  text: string;
}

export function getDocumentOutline(): Report<{ url: string; headings: Heading[] }> {
  return perDocument((contentDocument) => ({
    headings: Array.from(contentDocument.querySelectorAll("h1, h2, h3, h4, h5, h6"), (heading) => ({
      level: Number(heading.tagName.substring(1)),
      text: headingText(heading),
    })),
  }));
}

/**
 * A heading that is an image falls back to its alt text, parenthesised so the
 * report shows it is not literal text on the page.
 */
function headingText(heading: Element): string {
  const text = getElementText(heading).trim();

  if (text) {
    return text;
  }

  const alt = Array.from(heading.querySelectorAll("img[alt]"), (image) => image.getAttribute("alt"))
    .join(" ")
    .trim();

  return alt ? `(${alt})` : "";
}
