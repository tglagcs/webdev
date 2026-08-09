/**
 * Golden tests for the content-script extractors.
 *
 * These are 1,100 lines of DOM-to-JSON feeding all sixteen report pages, and
 * the part of the port most likely to break silently: a subtly different array
 * order or a dropped field produces a report that still renders and is simply
 * wrong.
 *
 * The snapshots were taken against the legacy implementation *before* the
 * port; this file now runs the same assertions against src/content, and the
 * snapshots are unchanged. That equality is the evidence the port preserved
 * behaviour. Regenerating one to make a test pass throws that away -- a diff
 * here means behaviour changed and needs justifying.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { filterCookies, getCookies, getDomainCookies, getPathCookies } from "@/content/cookies";
import { formatColor, getColors, tidyColors } from "@/content/colors";
import { getForms } from "@/content/forms";
import {
  getDocumentDetails,
  getLinks,
  getLocationDetails,
  getMetaTags,
  getWindowSize,
} from "@/content/page";
import { getBrokenImages, getCSS, getImages, getJavaScript } from "@/content/resources";
import { getAnchors, getDocumentOutline, getDuplicateIds } from "@/content/structure";

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
    expect(getAnchors()).toMatchSnapshot();
  });

  it("reports only ids that appear more than once", () => {
    expect(getDuplicateIds()).toMatchSnapshot();
  });

  it("builds the heading outline, including the skipped level", () => {
    expect(getDocumentOutline()).toMatchSnapshot();
  });
});

describe("page contents", () => {
  it("extracts forms with their fields", () => {
    expect(getForms()).toMatchSnapshot();
  });

  it("extracts images with alt text and dimensions", () => {
    expect(getImages()).toMatchSnapshot();
  });

  it("extracts links", () => {
    expect(getLinks()).toMatchSnapshot();
  });

  it("extracts meta tags", () => {
    expect(getMetaTags()).toMatchSnapshot();
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
    expect(formatColor(input)).toBe(expected);
  });

  // The rgb() string a real engine reports goes through the same padding, on
  // the way into getDocumentColors. Covered there and in the harness rather
  // than here: legacy's formatStyleValue, which this used to assert against,
  // had no caller left and went with css.js.

  it("de-duplicates and sorts colours", () => {
    expect(tidyColors(["#ffffff", "#000000", "#ffffff", "#ee6600"])).toMatchSnapshot();
  });
});

describe("cookie filtering", () => {
  // `host`, not `domain`: the popup's convertCookies renames the field on the
  // way in, and filterCookies reads only `host`. The first version of this
  // fixture used `domain`, so every assertion below pinned an empty array and
  // proved nothing -- a port returning [] unconditionally would have passed.
  const cookies = [
    { host: "fixture.test", name: "b-exact", path: "/", value: "2" },
    { host: "fixture.test", name: "a-exact", path: "/", value: "1" },
    // Leading dot is stripped before comparing, so this matches too.
    { host: ".fixture.test", name: "c-dotted", path: "/", value: "3" },
    // Matches by suffix: the document host ends with "." + cookie host.
    { host: "test", name: "d-parent-domain", path: "/", value: "4" },
    // A deeper path still matches a request for "/", since the test is a
    // prefix match on the *cookie* path.
    { host: "fixture.test", name: "e-deep-path", path: "/deep", value: "5" },
    // Only reachable from getPathCookies, whose path is the document's.
    { host: "fixture.test", name: "f-page-path", path: "/host-page.html", value: "6" },
    { host: "other.test", name: "g-other-host", path: "/", value: "7" },
    // No host, so skipped entirely rather than matched.
    { name: "h-hostless", path: "/", value: "8" },
  ];

  it("keeps only cookies matching the host and path, sorted", () => {
    expect(filterCookies(cookies, "fixture.test", "/", true)).toMatchSnapshot();
  });

  // The three report-level entry points differ only in which path they filter
  // on and whether they wrap the result per document. Pinning all three is
  // what stops the port collapsing them into one and quietly changing which
  // cookies a report shows.
  it("wraps the document's cookies with its title and URL", () => {
    expect(getCookies(cookies)).toMatchSnapshot();
  });

  it("collects domain cookies across documents, unsorted and unwrapped", () => {
    expect(getDomainCookies(cookies)).toMatchSnapshot();
  });

  it("collects path cookies against the document's own path", () => {
    expect(getPathCookies(cookies)).toMatchSnapshot();
  });
});

/**
 * What these snapshots do *not* cover, so the port does not mistake a green
 * run for proof:
 *
 *  - getDocuments' frame traversal and its same-origin guards. Every snapshot
 *    below therefore has exactly one entry in `documents`.
 *  - getDocumentCSS's linked-stylesheet branch: happy-dom fetches <link> hrefs
 *    for real, the fetch fails, and the sheet never registers -- so only the
 *    embedded <style> branch runs here.
 *  - getDocumentColors depends on getComputedStyle, which happy-dom implements
 *    partially. Colours reachable only through cascade or inheritance may be
 *    missing from the snapshot without that being a bug in the extractor.
 *
 * Those three need checking in a real browser when they are ported.
 */
describe("page resources", () => {
  it("collects every image src, leaving the broken-image test to the caller", () => {
    expect(getBrokenImages()).toMatchSnapshot();
  });

  it("separates linked scripts from embedded source", () => {
    // Note the non-JavaScript <script type="application/json">: upstream
    // branches on src alone, so its body lands in `embedded` with the rest.
    // Pinned as behaviour, not endorsed as correct.
    expect(getJavaScript()).toMatchSnapshot();
  });

  it("extracts stylesheets and embedded styles", () => {
    expect(getCSS()).toMatchSnapshot();
  });

  it("collects the colours used on the page", () => {
    expect(getColors()).toMatchSnapshot();
  });
});

describe("document and window details", () => {
  it("reports the document title and URL", () => {
    expect(getDocumentDetails()).toMatchSnapshot();
  });

  it("reports the location host and path", () => {
    expect(getLocationDetails()).toMatchSnapshot();
  });

  it("reports the window size", () => {
    expect(getWindowSize()).toMatchSnapshot();
  });
});
