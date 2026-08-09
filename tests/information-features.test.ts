/**
 * Golden tests for the Information feature bundle.
 *
 * Taken against the legacy implementation before the port and unchanged
 * across it. The assertion is the DOM mutation, as for the other bundles.
 *
 * Not reachable from happy-dom, and so not covered here:
 *
 *  - displayStackLevels, which reads the computed z-index.
 *  - displayDivDimensions, which measures laid-out elements through
 *    offsetWidth.
 *  - displayObjectInformation, which needs <object> and its plugin params.
 *
 * Those need checking against a real page when they are ported.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import * as Information from "@/features/information";

const fixture = readFileSync(resolve("tests/fixtures/information-page.html"), "utf-8");

const documents = (): Document[] => [document];

/** The labels the feature inserted, and the stylesheets it toggled. */
function mutations(): object {
  return {
    labels: Array.from(document.querySelectorAll('span[class^="web-developer-"]'), (span) => ({
      className: span.className,
      text: span.textContent,
      before: span.nextElementSibling?.id || span.nextElementSibling?.tagName.toLowerCase() || null,
    })),
    styleSheets: Array.from(
      document.querySelectorAll('link[id^="web-developer-"]'),
      (link) => link.id,
    ),
  };
}

/** The document with every extension-inserted node taken back out. */
function pageMarkup(): string {
  const clone = document.body.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll('[class^="web-developer-"]')
    .forEach((element) => element.parentNode?.removeChild(element));

  return clone.innerHTML;
}

beforeEach(() => {
  fakeBrowser.reset();
  document.documentElement.innerHTML = fixture
    .replace(/^[\s\S]*?<html[^>]*>/, "")
    .replace(/<\/html>[\s\S]*$/, "");
});

describe("labels inserted before the element they describe", () => {
  it.each([
    ["access keys", (on: boolean) => Information.displayAccessKeys(on, documents())],
    ["anchors", (on: boolean) => Information.displayAnchors(on, documents())],
    ["tab indices", (on: boolean) => Information.displayTabIndex(on, documents())],
    ["title attributes", (on: boolean) => Information.displayTitleAttributes(on, documents())],
  ])("displays %s", (_name, apply) => {
    apply(true);

    expect(mutations()).toMatchSnapshot();
  });

  it.each([
    ["access keys", (on: boolean) => Information.displayAccessKeys(on, documents())],
    ["anchors", (on: boolean) => Information.displayAnchors(on, documents())],
    ["tab indices", (on: boolean) => Information.displayTabIndex(on, documents())],
    ["title attributes", (on: boolean) => Information.displayTitleAttributes(on, documents())],
  ])("removes the %s labels again, leaving the page as it was", (_name, apply) => {
    const before = pageMarkup();

    apply(true);
    apply(false);

    expect(pageMarkup()).toBe(before);
  });
});

describe("displayIdClassDetails", () => {
  it("labels every element carrying an id or a class", () => {
    Information.displayIdClassDetails(true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  // Otherwise the features label each other's markup, and turning one off
  // takes the other's labels with it.
  it("skips the extension's own elements", () => {
    Information.displayIdClassDetails(true, documents());

    const labels = Array.from(
      document.querySelectorAll(".web-developer-id-class-details"),
      (span) => span.textContent,
    );

    expect(labels.some((text) => text?.includes("web-developer"))).toBe(false);
  });
});

describe("displayDivOrder", () => {
  // Inserted as the div's first child rather than before it: the number
  // belongs inside the box it numbers.
  it("numbers the divs in document order, from the inside", () => {
    Information.displayDivOrder(true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("removes the numbering again", () => {
    const before = pageMarkup();

    Information.displayDivOrder(true, documents());
    Information.displayDivOrder(false, documents());

    expect(pageMarkup()).toBe(before);
  });
});

describe("stylesheet-only information features", () => {
  it.each([
    ["displayAbbreviations", () => Information.displayAbbreviations(documents())],
    ["displayARIARoles", () => Information.displayARIARoles(documents())],
    ["displayLinkDetails", () => Information.displayLinkDetails(documents())],
    ["displayTopographicInformation", () => Information.displayTopographicInformation(documents())],
  ])("%s toggles its stylesheets on and off", (_name, apply) => {
    apply();

    expect(mutations().styleSheets).toMatchSnapshot();

    apply();

    expect(mutations().styleSheets).toEqual([]);
  });
});

describe("helpers", () => {
  it("describes an element by its id and classes, in CSS selector form", () => {
    expect(Information.getElementDescription(document.getElementById("outer"))).toBe(
      "#outer.one.two",
    );
    expect(Information.getElementDescription(document.getElementById("id-only"))).toBe("#id-only");
    expect(Information.getElementDescription(document.querySelector(".no-id"))).toBe(".no-id");
  });

  it("counts how deeply a table is nested inside other tables", () => {
    expect(Information.getTableDepth(document.getElementById("outer-table"))).toBe(1);
    expect(Information.getTableDepth(document.getElementById("inner-table"))).toBe(2);
  });
});
