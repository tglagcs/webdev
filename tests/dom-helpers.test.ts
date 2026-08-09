/**
 * The helpers the last of common.js moved into src/lib.
 *
 * Their callers are all still legacy -- the embedded widgets and two report
 * pages -- so nothing else pins their contracts, and two of those contracts
 * are unusual enough to be worth stating: the sibling helpers return `null`
 * rather than an empty array, and getURLContents reports a failure as content
 * rather than as an error.
 *
 * Not covered here: getElementPositionX/Y, which walk the offsetParent chain.
 * happy-dom reports 0 for every offset, so the walk cannot be exercised; the
 * ruler and the line guides are where it shows, and they are checked in a
 * browser.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  appendHTML,
  empty,
  getNextSiblings,
  getPreviousSiblings,
  isAncestor,
} from "@/lib/dom/elements";
import { removeSubstring } from "@/lib/strings";
import { getURLContents, type URLContentRequest } from "@/lib/url-contents";

beforeEach(() => {
  document.documentElement.innerHTML = `<head></head><body>
    <div id="outer">
      <p id="one">one</p>
      <p id="two" class="d-none">two</p>
      <p id="middle">middle</p>
      <p id="three" class="d-none">three</p>
      <p id="four">four</p>
    </div>
    <div id="lonely"></div>
    <div id="solo"><p id="only">x</p></div>
  </body>`;
});

describe("appendHTML and empty", () => {
  it("appends to the end of the element", () => {
    appendHTML("<span>added</span>", document.getElementById("lonely"));

    expect(document.getElementById("lonely")!.innerHTML).toBe("<span>added</span>");
  });

  it("does nothing without both an element and some HTML", () => {
    appendHTML("", document.getElementById("lonely"));
    appendHTML("<span></span>", null);

    expect(document.getElementById("lonely")!.innerHTML).toBe("");
  });

  it("removes every child but keeps the element", () => {
    empty(document.getElementById("outer"));

    expect(document.getElementById("outer")!.childNodes).toHaveLength(0);
    expect(document.getElementById("outer")).not.toBeNull();
  });
});

describe("isAncestor", () => {
  it("is true at any depth, and false for the element itself", () => {
    const outer = document.getElementById("outer");

    expect(isAncestor(document.getElementById("one"), outer)).toBe(true);
    expect(isAncestor(document.getElementById("one"), document.body)).toBe(true);
    expect(isAncestor(outer, outer)).toBe(false);
    expect(isAncestor(document.getElementById("one"), document.getElementById("lonely"))).toBe(
      false,
    );
  });
});

describe("sibling helpers", () => {
  it("returns the siblings on each side, in document order", () => {
    const middle = document.getElementById("middle");

    expect(getPreviousSiblings(middle)!.map((element) => element.id)).toEqual(["one", "two"]);
    expect(getNextSiblings(middle)!.map((element) => element.id)).toEqual(["three", "four"]);
  });

  it("applies the selector when one is given", () => {
    const middle = document.getElementById("middle");

    expect(getPreviousSiblings(middle, ":not(.d-none)")!.map((element) => element.id)).toEqual([
      "one",
    ]);
    expect(getNextSiblings(middle, ":not(.d-none)")!.map((element) => element.id)).toEqual([
      "four",
    ]);
  });

  // Upstream's contract, and the ancestors panel branches on it.
  it("is null rather than empty when there are none", () => {
    expect(getPreviousSiblings(document.getElementById("only"))).toBeNull();
    expect(getNextSiblings(document.getElementById("only"))).toBeNull();
    expect(getNextSiblings(null)).toBeNull();
  });
});

describe("removeSubstring", () => {
  it.each([
    ["a-b-c", "-b", "a-c"],
    ["a-b-a-b", "-b", "a-a-b"],
    ["a-b-c", "zz", "a-b-c"],
    ["", "-b", ""],
    ["a-b-c", "", ""],
  ])("removes the first %s / %s", (string, substring, expected) => {
    expect(removeSubstring(string, substring)).toBe(expected);
  });
});

describe("getURLContents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(responses: Record<string, string | Error>): void {
    vi.stubGlobal("fetch", (url: string) => {
      const response = responses[url];

      return response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve({ text: () => Promise.resolve(response) });
    });
  }

  it("puts each body on its own request and calls back once, at the end", async () => {
    stubFetch({ "/one.css": "a {}", "/two.css": "b {}" });

    const requests: URLContentRequest[] = [{ url: "/one.css" }, { url: "/two.css" }];
    const callback = vi.fn();

    getURLContents(requests, "/* failed */", callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalled());

    expect(callback).toHaveBeenCalledTimes(1);
    expect(requests.map((request) => request.content)).toEqual(["a {}", "b {}"]);
  });

  // A stylesheet on a CDN that refuses the request is ordinary, not
  // exceptional: the report shows the placeholder in place of the file.
  it("uses the error message as the content of a request that failed", async () => {
    stubFetch({ "/one.css": new Error("network"), "/two.css": "b {}" });

    const requests: URLContentRequest[] = [{ url: "/one.css" }, { url: "/two.css" }];
    const callback = vi.fn();

    getURLContents(requests, "/* failed */", callback);
    await vi.waitFor(() => expect(callback).toHaveBeenCalled());

    expect(requests.map((request) => request.content)).toEqual(["/* failed */", "b {}"]);
  });

  // Upstream skipped these without counting them, so a list of only these
  // never fires the callback. Kept, because the reports read the array they
  // passed in rather than waiting on the callback for it.
  it("skips a document written by document.write", async () => {
    stubFetch({ "/two.css": "b {}" });

    const requests: URLContentRequest[] = [{ url: "wyciwyg://0/http://x" }, { url: "/two.css" }];
    const callback = vi.fn();

    getURLContents(requests, "/* failed */", callback);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(callback).not.toHaveBeenCalled();
    expect(requests[0]!.content).toBeUndefined();
    expect(requests[1]!.content).toBe("b {}");
  });
});
