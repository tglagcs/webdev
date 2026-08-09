/**
 * Golden tests for the Outline feature bundle.
 *
 * These features are injected into other people's pages and their only output
 * is a DOM mutation -- a <link> appended to <head>, a class added to matching
 * elements, a generated <style>. There is nothing to return and nothing that
 * throws when they go wrong, which is exactly how the executeScript closure
 * bug shipped: the menu toggled, the badge counted, and no stylesheet was ever
 * added.
 *
 * So the assertion is the mutation. Each snapshot was taken against the legacy
 * implementation before the port, the same way the extractor snapshots were;
 * this file now runs them against src/features/outline and the .snap file is
 * unchanged, which is the evidence the port preserved behaviour.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import * as Outline from "@/features/outline";

const fixture = readFileSync(resolve("tests/fixtures/features-page.html"), "utf-8");

/**
 * What the feature did to the page.
 *
 * Only the extension's own additions and the classes it applies -- the rest of
 * the document is fixture noise and would make every snapshot unreadable.
 */
function mutations(): object {
  return {
    injected: Array.from(document.querySelectorAll('[id^="web-developer-"]'), (element) => ({
      tag: element.tagName.toLowerCase(),
      id: element.id,
      rel: element.getAttribute("rel"),
      href: element.getAttribute("href"),
      css: element.tagName === "STYLE" ? element.textContent : undefined,
    })),
    tagged: Array.from(document.querySelectorAll('[class*="web-developer-"]'), (element) => ({
      tag: element.tagName.toLowerCase(),
      className: element.className,
    })),
  };
}

const documents = (): Document[] => [document];

beforeEach(() => {
  fakeBrowser.reset();
  document.documentElement.innerHTML = fixture
    .replace(/^[\s\S]*?<html[^>]*>/, "")
    .replace(/<\/html>[\s\S]*$/, "");
});

describe("stylesheet-only outlines", () => {
  it("outlines tables", () => {
    Outline.outlineTables(documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("outlines table captions", () => {
    Outline.outlineTableCaptions(documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("outlines frames", () => {
    Outline.outlineFrames(documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("outlines non-secure elements", () => {
    Outline.outlineNonSecureElements(documents());

    expect(mutations()).toMatchSnapshot();
  });

  // Calling twice is how the popup turns a feature off, so the second call
  // must leave the document exactly as it found it.
  it("removes its stylesheet when toggled a second time", () => {
    Outline.outlineTables(documents());
    Outline.outlineTables(documents());

    expect(mutations()).toEqual({ injected: [], tagged: [] });
  });
});

describe("outlines with an optional tag-name overlay", () => {
  it.each([
    [
      "block level elements",
      (show: boolean) => Outline.outlineBlockLevelElements(documents(), show),
    ],
    [
      "deprecated elements",
      (show: boolean) => Outline.outlineDeprecatedElements(documents(), show),
    ],
    ["headings", (show: boolean) => Outline.outlineHeadings(documents(), show)],
    ["table cells", (show: boolean) => Outline.outlineTableCells(documents(), show)],
  ])("outlines %s without tag names", (_name, apply) => {
    apply(false);

    expect(mutations()).toMatchSnapshot();
  });

  it.each([
    [
      "block level elements",
      (show: boolean) => Outline.outlineBlockLevelElements(documents(), show),
    ],
    [
      "deprecated elements",
      (show: boolean) => Outline.outlineDeprecatedElements(documents(), show),
    ],
    ["headings", (show: boolean) => Outline.outlineHeadings(documents(), show)],
    ["table cells", (show: boolean) => Outline.outlineTableCells(documents(), show)],
  ])("outlines %s with tag names", (_name, apply) => {
    apply(true);

    expect(mutations()).toMatchSnapshot();
  });
});

describe("outlines that tag elements by computed style", () => {
  it("adds a class to floated elements and a stylesheet", () => {
    Outline.outlineFloatedElements(true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("removes the class again, preserving classes it did not add", () => {
    Outline.outlineFloatedElements(true, documents());
    Outline.outlineFloatedElements(false, documents());

    expect(mutations()).toEqual({ injected: [], tagged: [] });
    expect(document.querySelector(".existing-class")!.className).toBe(
      "floated-left existing-class",
    );
  });

  it.each(["absolute", "relative", "fixed"])("adds a class to %s elements", (positionType) => {
    Outline.outlinePositionedElements(positionType, true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("removes positioned classes again", () => {
    Outline.outlinePositionedElements("absolute", true, documents());
    Outline.outlinePositionedElements("absolute", false, documents());

    expect(mutations()).toEqual({ injected: [], tagged: [] });
  });
});

describe("external links", () => {
  it("generates a stylesheet scoped to the document host", () => {
    Outline.outlineExternalLinks(true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("removes the generated stylesheet", () => {
    Outline.outlineExternalLinks(true, documents());
    Outline.outlineExternalLinks(false, documents());

    expect(mutations()).toEqual({ injected: [], tagged: [] });
  });
});
