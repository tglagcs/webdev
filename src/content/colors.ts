/**
 * The colours a page renders with.
 *
 * Read from computed style rather than from the stylesheets, so what the
 * report lists is what the user actually sees, cascade and all.
 */

import { getDocumentBodyElement } from "@/lib/dom/documents";
import { getCSSPrimitiveValue, getPropertyCSSValue } from "@/lib/dom/css-values";
import { perDocument, type Report } from "./report";

const COLOUR_PROPERTIES = [
  "background-color",
  "border-bottom-color",
  "border-left-color",
  "border-right-color",
  "border-top-color",
  "color",
];

/**
 * Formats one 0-255 channel as two hex digits.
 *
 * The zero pad is the whole point: without it #010203 collapses to #123, a
 * different colour that still looks like a valid one.
 */
export function formatColor(channel: number): string {
  return channel.toString(16).padStart(2, "0");
}

const RGB = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;

interface RGBColorValue {
  primitiveType?: number;
  getRGBColorValue?(): Record<"red" | "green" | "blue", { getFloatValue(type: number): number }>;
}

/**
 * Appends the node's colour for one property, if it resolves to a colour.
 *
 * Only `rgb()` is matched, so `rgba()` -- which is how every engine reports a
 * transparent background -- is skipped. That is deliberate upstream: listing
 * "transparent" as a colour of the page would swamp the report, since almost
 * every element has a transparent background.
 */
function addColor(node: Element, property: string, colors: string[]): void {
  const computed = node.ownerDocument.defaultView?.getComputedStyle(node, null) ?? null;
  const value = getPropertyCSSValue(computed, property) as string | RGBColorValue | null;

  if (
    !value ||
    (typeof value !== "string" && value.primitiveType === getCSSPrimitiveValue("IDENT"))
  ) {
    return;
  }

  if (typeof value !== "string" && value.primitiveType === getCSSPrimitiveValue("RGBCOLOR")) {
    const number = getCSSPrimitiveValue("NUMBER");
    const rgb = value.getRGBColorValue!();

    colors.push(
      `#${formatColor(rgb.red.getFloatValue(number))}${formatColor(
        rgb.green.getFloatValue(number),
      )}${formatColor(rgb.blue.getFloatValue(number))}`,
    );

    return;
  }

  const match = RGB.exec(String(value));

  if (match) {
    colors.push(
      `#${formatColor(Number(match[1]))}${formatColor(Number(match[2]))}${formatColor(Number(match[3]))}`,
    );
  }
}

/** Removes duplicates and sorts. */
export function tidyColors(colors: string[]): string[] {
  const sorted = [...colors].sort();

  return sorted.filter((color, index) => color !== sorted[index + 1]);
}

export function getDocumentColors(contentDocument: Document): string[] {
  const walker = contentDocument.createTreeWalker(
    getDocumentBodyElement(contentDocument),
    NodeFilter.SHOW_ELEMENT,
    null,
  );
  const colors: string[] = [];

  let node: Node | null;

  while ((node = walker.nextNode()) !== null) {
    for (const property of COLOUR_PROPERTIES) {
      addColor(node as Element, property, colors);
    }
  }

  return tidyColors(colors);
}

export function getColors(): Report<{ url: string; colors: string[] }> {
  return perDocument((contentDocument) => ({ colors: getDocumentColors(contentDocument) }));
}
