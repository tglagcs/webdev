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
import { OUTLINE_ENTRIES } from "@/features/outline";
import { FEATURES } from "@/features/registry";

const injected = FEATURES.filter((feature) => feature.inject);

beforeEach(() => {
  fakeBrowser.reset();
  document.documentElement.innerHTML =
    "<head></head><body><table><tr><td>x</td></tr></table></body>";
});

describe("the registry against the bundle", () => {
  // The entry is named by the feature id, so this is what stops the two
  // drifting apart when one of them is edited.
  it("has an entry for every injected feature", () => {
    const missing = injected
      .filter((feature) => feature.inject!.bundle === "/feature-outline.js")
      .filter((feature) => !(feature.id in OUTLINE_ENTRIES));

    expect(missing.map((feature) => feature.id)).toEqual([]);
  });

  it("has no entry that no feature names", () => {
    const ids = new Set(injected.map((feature) => feature.id));

    expect(Object.keys(OUTLINE_ENTRIES).filter((entry) => !ids.has(entry))).toEqual([]);
  });

  it("gives every injected feature a bundle that exists in the build", () => {
    const bundles = new Set(injected.map((feature) => feature.inject!.bundle));

    expect([...bundles]).toEqual(["/feature-outline.js"]);
  });

  // A feature whose payload names a value nothing provides would arrive as
  // undefined in the page, which reads as "off" and is invisible.
  it("declares where every payload value comes from", () => {
    for (const feature of injected) {
      for (const source of Object.values(feature.inject!.payload ?? {})) {
        expect(["value", "setting", "enabled"]).toContain(source.from);
      }
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

describe("the outline entries themselves", () => {
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
});
