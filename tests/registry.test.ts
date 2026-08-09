/**
 * Invariants of the feature registry.
 *
 * The registry is 119 entries transcribed out of the markup and the eleven
 * overlay initialisers. Transcription is exactly the kind of work that goes
 * wrong quietly -- a mistyped message key renders an empty label, a mistyped
 * id orphans the per-tab state the user had switched on, a missing handler
 * does nothing when clicked. None of those throw, and none of them show up in
 * a build.
 *
 * So this is the safety net for the whole phase, and it is deliberately
 * paranoid.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FEATURES, columns, visibleMenus } from "@/features/registry";
import { MENUS } from "@/features/types";
import { MESSAGE_KEYS } from "@/lib/i18n-keys";

/** The ids that shipped, read out of the popup markup and frozen. */
const SHIPPED: string[] = JSON.parse(
  readFileSync(resolve("tests/fixtures/feature-ids.json"), "utf-8"),
);

describe("identity", () => {
  it("has every feature that shipped, and no others", () => {
    expect([...FEATURES.map((feature) => feature.id)].sort()).toEqual([...SHIPPED].sort());
  });

  it("has no duplicate ids", () => {
    const ids = FEATURES.map((feature) => feature.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("labels", () => {
  it("names a message that exists in en_US", () => {
    const missing = FEATURES.filter((feature) => !MESSAGE_KEYS.has(feature.labelKey));

    expect(missing.map((feature) => `${feature.id} -> ${feature.labelKey}`)).toEqual([]);
  });

  it("gives every feature its own label", () => {
    const keys = FEATURES.map((feature) => feature.labelKey);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("handlers", () => {
  it("names a handler under the legacy overlay namespace", () => {
    const wrong = FEATURES.filter(
      (feature) => !feature.handler.startsWith("WebDeveloper.Overlay."),
    );

    expect(wrong.map((feature) => feature.id)).toEqual([]);
  });

  // Four features share a handler and differ only in its argument -- convert
  // form methods each way, and mark links visited or unvisited. Those four are
  // the only allowed collision, so the pair has to be distinct even where the
  // handler is not.
  it("resolves to a distinct action per feature", () => {
    const actions = FEATURES.map((feature) => `${feature.handler}(${feature.argument ?? ""})`);

    expect(new Set(actions).size).toBe(actions.length);
  });

  it("passes an argument only where two features share a handler", () => {
    const shared = FEATURES.filter(
      (feature) => FEATURES.filter((other) => other.handler === feature.handler).length > 1,
    );

    expect(shared.map((feature) => feature.id).sort()).toEqual([
      "convert-form-gets-to-posts",
      "convert-form-posts-to-gets",
      "mark-all-links-unvisited",
      "mark-all-links-visited",
    ]);
    expect(shared.every((feature) => feature.argument !== undefined)).toBe(true);
  });
});

describe("layout", () => {
  it("puts every feature in a menu the popup has", () => {
    expect(visibleMenus().map((menu) => menu.id)).toEqual(
      MENUS.filter((menu) => visibleMenus().some((visible) => visible.id === menu)),
    );
  });

  it("numbers columns from one, with no gaps", () => {
    for (const menu of visibleMenus()) {
      const used = [...new Set(menu.features.map((feature) => feature.column))].sort();

      expect(used).toEqual(used.map((_value, index) => index + 1));
    }
  });

  it("groups a menu into its columns in order", () => {
    const css = visibleMenus().find((menu) => menu.id === "css")!;

    expect(columns(css).map((column) => column.map((feature) => feature.id))).toMatchSnapshot();
  });
});

describe("capabilities", () => {
  const chromium = { contentSettings: true, browsingData: true } as const;
  const firefox = { contentSettings: false, browsingData: true } as const;

  it("shows everything on Chromium", () => {
    expect(visibleMenus(chromium).flatMap((menu) => menu.features)).toHaveLength(SHIPPED.length);
  });

  // Not shipped inert: contentSettings is Chromium-only and has no Firefox
  // equivalent, so the whole tab goes rather than showing four dead items.
  it("drops the Disable menu entirely on Firefox", () => {
    const menus = visibleMenus(firefox);

    expect(menus.map((menu) => menu.id)).not.toContain("disable");
    expect(menus.flatMap((menu) => menu.features).map((feature) => feature.id)).not.toContain(
      "disable-cookies",
    );
  });

  it("keeps the browsing-data features, which Firefox does have", () => {
    const ids = visibleMenus(firefox)
      .flatMap((menu) => menu.features)
      .map((feature) => feature.id);

    expect(ids).toContain("clear-cache");
    expect(ids).toContain("clear-history");
  });
});

// The registry is only useful if it says what the popup did. This checks the
// two facts that are not visible anywhere else once the markup is gone.
describe("against the markup that shipped", () => {
  const html = readFileSync(resolve("src/entrypoints/popup/index.html"), "utf-8");

  it("marks as stateful exactly the items that carried the state icons", () => {
    for (const feature of FEATURES) {
      const item = new RegExp(`<li><a href="#" id="${feature.id}"[^>]*>(.*?)</a></li>`, "s").exec(
        html,
      );

      expect(!!feature.stateful).toBe(item![1].includes("i-check"));
    }
  });

  it("keeps the ids in the order the popup listed them", () => {
    expect(FEATURES.map((feature) => feature.id)).toEqual(SHIPPED);
  });
});
