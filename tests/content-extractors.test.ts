/**
 * Golden tests for the content-script extractors.
 *
 * WebDeveloper.Content is 1,100 lines of DOM-to-JSON that feeds all sixteen
 * report pages. It is the part of the port most likely to break silently: a
 * subtly different array order or a dropped field produces a report that still
 * renders and is simply wrong.
 *
 * These snapshots are taken against the legacy implementation *before* it is
 * ported, so Phase 3 can rewrite it in TypeScript and prove the output is
 * unchanged. Regenerating a snapshot to make a test pass defeats the purpose;
 * a diff here means the port changed behaviour and needs justifying.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import "@/legacy/globals";
import "@/legacy/js/common/common.js";
import "@/legacy/js/common/css.js";
import "@/legacy/js/content/content.js";

interface ContentApi {
  filterCookies(all: unknown[], host: string, path: string, sort: boolean): unknown[];
  /** Formats a single 0-255 channel as two hex digits. */
  formatColor(channel: number): string;
  getAnchors(): unknown;
  getDocumentOutline(): unknown;
  getDuplicateIds(): unknown;
  getForms(): unknown;
  getImages(): unknown;
  getLinks(): unknown;
  getMetaTags(): unknown;
  tidyColors(colors: string[]): string[];
}

interface CssApi {
  formatStyleValue(value: string): string;
}

const legacy = (globalThis as { WebDeveloper?: { CSS: CssApi; Content: ContentApi } })
  .WebDeveloper!;
const Content = legacy.Content;
const CSS = legacy.CSS;

const fixture = readFileSync(resolve("tests/fixtures/host-page.html"), "utf-8");

/** The document URL is pinned in vitest.config.ts, not here. */
function loadFixture(): void {
  document.documentElement.innerHTML = fixture
    .replace(/^[\s\S]*?<html[^>]*>/, "")
    .replace(/<\/html>[\s\S]*$/, "");
}

beforeEach(loadFixture);

describe("document structure", () => {
  it("collects unique anchors, collapsing the repeated name", () => {
    expect(Content.getAnchors()).toMatchSnapshot();
  });

  it("reports only ids that appear more than once", () => {
    expect(Content.getDuplicateIds()).toMatchSnapshot();
  });

  it("builds the heading outline, including the skipped level", () => {
    expect(Content.getDocumentOutline()).toMatchSnapshot();
  });
});

describe("page contents", () => {
  it("extracts forms with their fields", () => {
    expect(Content.getForms()).toMatchSnapshot();
  });

  it("extracts images with alt text and dimensions", () => {
    expect(Content.getImages()).toMatchSnapshot();
  });

  it("extracts links", () => {
    expect(Content.getLinks()).toMatchSnapshot();
  });

  it("extracts meta tags", () => {
    expect(Content.getMetaTags()).toMatchSnapshot();
  });
});

describe("colour formatting", () => {
  // formatColor takes one channel, not a whole colour, and zero-pads it. The
  // padding is the interesting part: drop it and #010203 silently becomes
  // #123, so pin the single-digit boundaries.
  it.each([
    [0, "00"],
    [1, "01"],
    [15, "0f"],
    [16, "10"],
    [102, "66"],
    [238, "ee"],
    [255, "ff"],
  ])("formats channel %i as %s", (input, expected) => {
    expect(Content.formatColor(input)).toBe(expected);
  });

  // This is what turns a computed style into the hex shown in the colour
  // report, and it does its own padding.
  it.each([
    ["rgb(0, 0, 0)", "#000000"],
    ["rgb(255, 255, 255)", "#ffffff"],
    ["rgb(238, 102, 0)", "#ee6600"],
    ["rgb(1, 2, 3)", "#010203"],
    ["none", "none"],
  ])("converts %s to %s", (input, expected) => {
    expect(CSS.formatStyleValue(input)).toBe(expected);
  });

  it("de-duplicates and sorts colours", () => {
    expect(Content.tidyColors(["#ffffff", "#000000", "#ffffff", "#ee6600"])).toMatchSnapshot();
  });
});

describe("cookie filtering", () => {
  const cookies = [
    { domain: "fixture.test", name: "b", path: "/", value: "2" },
    { domain: "fixture.test", name: "a", path: "/", value: "1" },
    { domain: "other.test", name: "c", path: "/", value: "3" },
    { domain: "fixture.test", name: "d", path: "/deep", value: "4" },
  ];

  it("keeps only cookies matching the host and path, sorted", () => {
    expect(Content.filterCookies(cookies, "fixture.test", "/", true)).toMatchSnapshot();
  });
});
