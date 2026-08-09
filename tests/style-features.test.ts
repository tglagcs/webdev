/**
 * Golden tests for the CSS and Miscellaneous feature bundles.
 *
 * Same reasoning as the Outline bundle: these mutate the page and return
 * nothing, so the mutation is the assertion. The snapshots were taken against
 * the legacy implementation before the port and are unchanged across it.
 *
 * What is *not* reachable here, and needs tools/extractor-harness.py or a real
 * install instead:
 *
 *  - anything acting on a linked stylesheet. happy-dom does not load them, so
 *    document.styleSheets contains only the embedded ones and every linked
 *    branch is skipped -- that covers toggleLinkedStyleSheets,
 *    reloadLinkedStyleSheets, and the linked half of toggleAllStyles.
 *  - toggleMediaTypeStyles, which calls MediaList.appendMedium /
 *    deleteMedium.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import * as CSS from "@/features/css";
import * as Miscellaneous from "@/features/miscellaneous";

const fixture = readFileSync(resolve("tests/fixtures/styles-page.html"), "utf-8");

const documents = (): Document[] => [document];

/**
 * Notifications go to the popup by runtime message, and that message is the
 * feature's only output -- the count in it is the whole result. Registering a
 * listener both captures it and stops fake-browser rejecting a sendMessage
 * that nothing is listening for.
 */
const notifications: unknown[] = [];

/** The attributes these features move around, per element that has any. */
function styleState(): object {
  return Array.from(document.querySelectorAll("[id]"), (element) => ({
    id: element.id,
    style: element.getAttribute("style"),
    saved: element.getAttribute("web-developer-inline-style"),
    type: element.getAttribute("type"),
    noresize: element.hasAttribute("noresize"),
  })).filter((entry) => entry.style || entry.saved || entry.type || entry.noresize);
}

function embeddedSheetsDisabled(): boolean[] {
  return Array.from(document.getElementsByTagName("style"), (style) => !!style.sheet?.disabled);
}

beforeEach(() => {
  fakeBrowser.reset();
  notifications.length = 0;
  fakeBrowser.runtime.onMessage.addListener((message) => {
    notifications.push(message);

    return undefined;
  });
  document.documentElement.innerHTML = fixture
    .replace(/^[\s\S]*?<html[^>]*>/, "")
    .replace(/<\/html>[\s\S]*$/, "");
});

describe("inline styles", () => {
  it("parks every inline style under a holding attribute", () => {
    CSS.toggleInlineStyles(true, documents());

    expect(styleState()).toMatchSnapshot();
  });

  it("puts them back exactly", () => {
    const before = styleState();

    CSS.toggleInlineStyles(true, documents());
    CSS.toggleInlineStyles(false, documents());

    expect(styleState()).toEqual(before);
  });

  it("reaches nested elements, not just the top level", () => {
    CSS.toggleInlineStyles(true, documents());

    expect(document.getElementById("inline-inner")!.hasAttribute("style")).toBe(false);
    expect(
      document.getElementById("inline-inner")!.getAttribute("web-developer-inline-style"),
    ).toBe("color: blue");
  });
});

describe("embedded stylesheets", () => {
  it("disables and re-enables them", () => {
    CSS.toggleEmbeddedStyles(true, documents());

    expect(embeddedSheetsDisabled()).toEqual([true, true]);

    CSS.toggleEmbeddedStyles(false, documents());

    expect(embeddedSheetsDisabled()).toEqual([false, false]);
  });
});

describe("stylesheet-only CSS features", () => {
  // Upstream spells these paths with a leading slash and the outline ones
  // without; getURL normalises both, so the difference never mattered and is
  // preserved rather than tidied.
  it("adds the border-box stylesheet", () => {
    CSS.useBorderBoxModel(documents());

    expect(
      document.getElementById("web-developer-use-border-box-model")?.getAttribute("href"),
    ).toBe("chrome-extension://test-extension-id/features/css/css/use-border-box-model.css");
  });

  // insertFirst, so the page's own rules still win over the reset.
  it("inserts the browser-default reset before the page's own styles", () => {
    CSS.toggleBrowserDefaultStyles(documents());

    const head = document.querySelector("head")!;

    expect(head.firstElementChild!.id).toBe("web-developer-disable-browser-default-styles");
  });
});

describe("displayHiddenElements", () => {
  it("reveals elements hidden by CSS, by inline style and by input type", () => {
    Miscellaneous.displayHiddenElements(true, documents());

    expect(styleState()).toMatchSnapshot();
  });

  // Upstream was a one-shot action, so the only way back was a page reload.
  //
  // Compared attribute by attribute rather than on innerHTML: restoring a
  // hidden input means removeAttribute("type") then setAttribute("type"),
  // which moves it to the end of the attribute list. Nothing can observe
  // that, and preserving it would mean rebuilding the element.
  it("puts everything back", () => {
    const snapshot = () =>
      Array.from(document.querySelectorAll("*"), (element) =>
        Object.fromEntries(
          Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]).sort(),
        ),
      );
    const before = snapshot();

    Miscellaneous.displayHiddenElements(true, documents());
    Miscellaneous.displayHiddenElements(false, documents());

    expect(snapshot()).toEqual(before);
  });

  it("restores an element's own inline value rather than dropping it", () => {
    // hidden-inline carries `display: none` of its own, so undoing has to put
    // that back -- not merely remove what the feature added.
    Miscellaneous.displayHiddenElements(true, documents());
    Miscellaneous.displayHiddenElements(false, documents());

    expect(document.getElementById("hidden-inline")!.getAttribute("style")).toBe("display: none");
  });

  it("leaves the extension's own elements alone", () => {
    Miscellaneous.displayHiddenElements(true, documents());

    // Both node filters skip ids starting web-developer, so this one keeps
    // its display: none rather than being revealed by the feature.
    expect(document.getElementById("web-developer-something")!.getAttribute("style")).toBe(
      "display: none",
    );
  });

  it("reports how many it displayed", () => {
    Miscellaneous.displayHiddenElements(true, documents());

    expect(notifications).toMatchSnapshot();
  });
});

describe("makeFramesResizable", () => {
  it("removes noresize and reports the count", () => {
    Miscellaneous.makeFramesResizable(documents());

    expect(document.getElementById("frame-locked")!.hasAttribute("noresize")).toBe(false);
    expect(notifications).toEqual([
      {
        type: "display-notification",
        message: "makeFramesResizableSingleResult",
        parameters: undefined,
      },
    ]);
  });
});

describe("linearizePage", () => {
  it("toggles its stylesheet", () => {
    Miscellaneous.linearizePage(documents());

    expect(document.getElementById("web-developer-linearize-page")).not.toBeNull();

    Miscellaneous.linearizePage(documents());

    expect(document.getElementById("web-developer-linearize-page")).toBeNull();
  });
});
