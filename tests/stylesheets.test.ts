/**
 * setStyleSheet against toggleStyleSheet.
 *
 * The toggle is only correct while there is exactly one route in and one route
 * out. The dashboard has two ways out -- the popup and the widget's own close
 * button -- and the second one leaving the sheet behind put the toggle out of
 * phase: the next switch-on removed the sheet and the next switch-off put it
 * back. For Element Information that sheet is the crosshair cursor, so the
 * feature read as stuck on.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { setStyleSheet, toggleStyleSheet } from "@/lib/dom/stylesheets";

const URL = "/embedded/css/dashboard/external/element-information.css";
const ID = "web-developer-element-information-styles";

const present = (): boolean => document.getElementById(ID) !== null;

beforeEach(() => {
  fakeBrowser.reset();
  document.documentElement.innerHTML = "<head></head><body></body>";
});

describe("setStyleSheet", () => {
  it("is idempotent in both directions", () => {
    setStyleSheet(URL, ID, document, false, true);
    setStyleSheet(URL, ID, document, false, true);

    expect(document.querySelectorAll(`#${ID}`)).toHaveLength(1);

    setStyleSheet(URL, ID, document, false, false);
    setStyleSheet(URL, ID, document, false, false);

    expect(present()).toBe(false);
  });

  // The regression: an exit that does not go through the same call as the
  // entry must still leave the page clean.
  it("clears a sheet a second exit route left behind", () => {
    setStyleSheet(URL, ID, document, false, true);
    setStyleSheet(URL, ID, document, false, false);
    setStyleSheet(URL, ID, document, false, true);
    setStyleSheet(URL, ID, document, false, false);

    expect(present()).toBe(false);
  });

  it("puts the sheet ahead of the page's own when asked", () => {
    document.head.innerHTML = '<link id="page-sheet" rel="stylesheet" href="/page.css">';

    setStyleSheet(URL, ID, document, true, true);

    expect(document.head.firstElementChild?.id).toBe(ID);
  });
});

describe("toggleStyleSheet", () => {
  it("still inverts whatever it finds", () => {
    toggleStyleSheet(URL, ID, document, false);

    expect(present()).toBe(true);

    toggleStyleSheet(URL, ID, document, false);

    expect(present()).toBe(false);
  });

  // Why the widgets no longer use it: one lost removal inverts every toggle
  // after it, so the feature is on when the page says off.
  it("goes out of phase once the sheet is removed from under it", () => {
    toggleStyleSheet(URL, ID, document, false);
    document.getElementById(ID)?.remove();
    toggleStyleSheet(URL, ID, document, false);

    expect(present()).toBe(true);
  });
});
