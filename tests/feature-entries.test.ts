/**
 * The entry contract between the registry and an injected bundle.
 *
 * This is the seam that replaced 119 hand-written closures, and it fails the
 * same way they did: silently. A registry entry naming something the bundle
 * does not export produces a menu item that toggles, counts on the badge, and
 * does nothing to the page. So the pairing is checked here rather than
 * discovered later.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { register, run } from "@/features/entries";
import { CSS_ENTRIES } from "@/features/css";
import { FORMS_ENTRIES } from "@/features/forms";
import { MISCELLANEOUS_ENTRIES } from "@/features/miscellaneous";
import { IMAGES_ENTRIES } from "@/features/images";
import { INFORMATION_ENTRIES } from "@/features/information";
import { OUTLINE_ENTRIES } from "@/features/outline";
import { FEATURES } from "@/features/registry";
import { POPUP_ACTIONS } from "@/entrypoints/popup/actions";

const injected = FEATURES.filter((feature) => feature.inject);

/** Every bundle's table, keyed by the path the registry names. */
const BUNDLES: Record<string, Record<string, unknown>> = {
  "/feature-outline.js": OUTLINE_ENTRIES,
  "/feature-images.js": IMAGES_ENTRIES,
  "/feature-information.js": INFORMATION_ENTRIES,
  "/feature-css.js": CSS_ENTRIES,
  "/feature-forms.js": FORMS_ENTRIES,
  "/feature-miscellaneous.js": MISCELLANEOUS_ENTRIES,
};

beforeEach(() => {
  fakeBrowser.reset();
  document.documentElement.innerHTML =
    "<head></head><body><table><tr><td>x</td></tr></table></body>";
});

describe("the registry against the bundle", () => {
  // The entry is named by the feature id, so this is what stops the two
  // drifting apart when one of them is edited.
  it("has an entry for every injected feature", () => {
    const missing = injected.filter((feature) => !(feature.id in BUNDLES[feature.inject!.bundle]!));

    expect(missing.map((feature) => feature.id)).toEqual([]);
  });

  it("has no entry that no feature names", () => {
    const ids = new Set(injected.map((feature) => feature.id));
    const orphans = Object.entries(BUNDLES).flatMap(([bundle, entries]) =>
      Object.keys(entries)
        .filter((entry) => !ids.has(entry))
        .map((entry) => `${bundle}#${entry}`),
    );

    expect(orphans).toEqual([]);
  });

  it("names a bundle that has a table", () => {
    const unknown = injected.filter((feature) => !BUNDLES[feature.inject!.bundle]);

    expect(unknown.map((feature) => feature.id)).toEqual([]);
  });

  // A feature whose payload names a value nothing provides would arrive as
  // undefined in the page, which reads as "off" and is invisible.
  it("declares where every payload value comes from", () => {
    for (const feature of injected) {
      for (const source of Object.values(feature.inject!.payload ?? {})) {
        expect(["value", "setting", "message", "enabled"]).toContain(source.from);
      }
    }
  });
});

// The same pairing, one route along: an action is named by the feature id too,
// and a feature declaring one that the table does not have is a menu item that
// does nothing when clicked.
describe("the registry against the popup's own actions", () => {
  const actions = FEATURES.filter((feature) => feature.popupAction);

  it("has an action for every feature that declares one", () => {
    const missing = actions.filter((feature) => !(feature.id in POPUP_ACTIONS));

    expect(missing.map((feature) => feature.id)).toEqual([]);
  });

  it("has no action that no feature names", () => {
    const ids = new Set(actions.map((feature) => feature.id));

    expect(Object.keys(POPUP_ACTIONS).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe("exclusive pairs", () => {
  // Display Handheld Styles and Display Print Styles switch each other off. If
  // one named a partner that did not name it back, the popup would switch one
  // off and leave the menu showing both on.
  it("is declared from both sides", () => {
    for (const feature of injected) {
      const partner = feature.inject!.exclusiveWith;

      if (!partner) {
        continue;
      }

      expect(injected.find((candidate) => candidate.id === partner)?.inject?.exclusiveWith).toBe(
        feature.id,
      );
    }
  });

  it("pairs only features that have an on state", () => {
    for (const feature of injected.filter((candidate) => candidate.inject!.exclusiveWith)) {
      expect(feature.stateful).toBe(true);
    }
  });
});

describe("run", () => {
  it("calls the entry the popup names, with its payload", () => {
    const called = vi.fn();

    register({ "test-entry": (payload, documents) => called(payload, documents.length) });
    run("test-entry", { flag: true });

    expect(called).toHaveBeenCalledWith({ flag: true }, 1);
  });

  // The popup and the page hold different copies of the module, so the table
  // lives on globalThis. If that ever became a module binding, the page would
  // look in an empty table and every feature would go quiet.
  it("finds entries registered by a different importer", () => {
    register({ "first-half": () => {} });
    register({ "second-half": () => {} });

    const table = (globalThis as unknown as { __WD_ENTRIES__: Record<string, unknown> })
      .__WD_ENTRIES__;

    expect(Object.keys(table)).toEqual(expect.arrayContaining(["first-half", "second-half"]));
  });

  it("reports an unknown entry rather than throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => run("not-an-entry", {})).not.toThrow();
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe("the entries themselves", () => {
  // Each entry is one call with the arguments its function happens to take --
  // documents first, documents last, or a keyword in front. Getting one wrong
  // outlines the wrong thing, so the marks they leave are asserted.
  it("outlines tables through the entry the registry names", () => {
    register(OUTLINE_ENTRIES);
    run("outline-tables", {});

    expect(document.querySelector("link#web-developer-outline-tables")).not.toBeNull();
  });

  it("passes the tag-name preference through", () => {
    register(OUTLINE_ENTRIES);
    run("outline-headings", { showElementTagNames: true });

    expect(document.querySelector("link#web-developer-outline-headings-before")).not.toBeNull();
  });

  it("leaves the tag-name stylesheet off when the preference is off", () => {
    register(OUTLINE_ENTRIES);
    run("outline-headings", { showElementTagNames: false });

    expect(document.querySelector("link#web-developer-outline-headings-before")).toBeNull();
    expect(document.querySelector("link#web-developer-outline-headings")).not.toBeNull();
  });

  // The two entries that take words. A payload key spelled differently here
  // and in the registry arrives as "undefined" in the page, printed into the
  // label -- which is visible but easy to miss in review.
  // Populate Form Fields is the only entry taking a value the user typed into
  // the options page, and it types it into every field of a real form.
  it("fills in the address the settings gave it", () => {
    document.body.innerHTML =
      "<form><input id='e' type='email' name='email'><input id='t' type='text' name='street'></form>";

    register(FORMS_ENTRIES);
    run("populate-form-fields", { emailAddress: "someone@example.com", password: "Password" });

    expect(document.querySelector<HTMLInputElement>("#e")!.value).toBe("someone@example.com");
    expect(document.querySelector<HTMLInputElement>("#t")!.value).toBe("street");
  });

  it("prints the words the popup resolved", () => {
    document.body.innerHTML = "<table id='t'><tr><td>x</td></tr></table>";

    register(INFORMATION_ENTRIES);
    run("display-table-depth", { enabled: false, depth: "Depth" });

    expect(document.body.textContent).toContain("Depth");
    expect(document.body.textContent).not.toContain("undefined");
  });
});
