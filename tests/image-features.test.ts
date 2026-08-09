/**
 * Golden tests for the Images feature bundle.
 *
 * Taken against the legacy implementation before the port, like the Outline
 * and CSS bundles, and unchanged across it. The assertion is the DOM
 * mutation, because that is all these features produce.
 *
 * What happy-dom cannot reach, and so is not covered here:
 *
 *  - anything reading naturalWidth / naturalHeight, which is 0 for an image
 *    that was never fetched: makeImagesFullSize, and the dimension half of
 *    makeImagesInvisible.
 *  - displayImageDimensions, which measures laid-out images.
 *  - outlineBackgroundImages and the two outlineImagesWith*Dimensions
 *    features, which read computed style.
 *  - reloadImages, which rewrites src to bust the cache.
 *
 * Those need checking against a real page when they are ported.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import * as Images from "@/features/images";

const fixture = readFileSync(resolve("tests/fixtures/images-page.html"), "utf-8");

const documents = (): Document[] => [document];

/** Every attribute of every image and input, plus the injected labels. */
function mutations(): object {
  return {
    elements: Array.from(document.querySelectorAll("img, input"), (element) =>
      Object.fromEntries(
        Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]).sort(),
      ),
    ),
    injected: Array.from(document.querySelectorAll('[class^="web-developer-"]'), (element) => ({
      className: element.className,
      text: element.textContent,
    })),
    styleSheets: Array.from(
      document.querySelectorAll('link[id^="web-developer-"]'),
      (link) => link.id,
    ),
  };
}

beforeEach(() => {
  fakeBrowser.reset();
  document.documentElement.innerHTML = fixture
    .replace(/^[\s\S]*?<html[^>]*>/, "")
    .replace(/<\/html>[\s\S]*$/, "");
});

describe("labels drawn beside images", () => {
  it("shows the alt attribute of every image that has one", () => {
    Images.displayAltAttributes(true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("removes the alt labels again", () => {
    const before = mutations();

    Images.displayAltAttributes(true, documents());
    Images.displayAltAttributes(false, documents());

    expect(mutations()).toEqual(before);
  });

  it("shows the src of every image as a link", () => {
    Images.displayImagePaths(true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("removes the path labels again", () => {
    const before = mutations();

    Images.displayImagePaths(true, documents());
    Images.displayImagePaths(false, documents());

    expect(mutations()).toEqual(before);
  });
});

describe("hideImages", () => {
  // The stylesheet hides <img>; an image input has to be converted, because
  // display: none on a submit button would remove it from the form.
  it("converts image inputs to submit buttons and parks the original type", () => {
    Images.hideImages(true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("converts them back, leaving other inputs untouched", () => {
    const before = mutations();

    Images.hideImages(true, documents());
    Images.hideImages(false, documents());

    expect(mutations()).toEqual(before);
  });
});

describe("makeImagesInvisible", () => {
  it("swaps every src for the transparent placeholder, parking the original", () => {
    Images.makeImagesInvisible(true, documents());

    expect(mutations()).toMatchSnapshot();
  });

  it("puts the sources back", () => {
    const before = mutations();

    Images.makeImagesInvisible(true, documents());
    Images.makeImagesInvisible(false, documents());

    expect(mutations()).toEqual(before);
  });
});

describe("stylesheet-only image features", () => {
  it.each([
    ["hideBackgroundImages", () => Images.hideBackgroundImages(documents())],
    ["outlineAllImages", () => Images.outlineAllImages(documents())],
    [
      "outlineImagesWithEmptyAltAttributes",
      () => Images.outlineImagesWithEmptyAltAttributes(documents()),
    ],
    [
      "outlineImagesWithoutAltAttributes",
      () => Images.outlineImagesWithoutAltAttributes(documents()),
    ],
    ["outlineImagesWithoutDimensions", () => Images.outlineImagesWithoutDimensions(documents())],
  ])("%s toggles its stylesheet on and off", (_name, apply) => {
    apply();

    expect(mutations().styleSheets).toMatchSnapshot();

    apply();

    expect(mutations().styleSheets).toEqual([]);
  });
});
