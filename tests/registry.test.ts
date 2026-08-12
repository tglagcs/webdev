/**
 * Invariants of the feature registry.
 *
 * The registry is 119 entries transcribed out of the markup and the overlay
 * initialisers that shipped. Transcription is exactly the kind of work that goes
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
import { FEATURE_KINDS, MENUS } from "@/features/types";
import { MESSAGE_KEYS } from "@/lib/i18n-keys";

/**
 * What the markup-driven popup offered, frozen.
 *
 * Taken from `popup/index.html` before the Svelte popup replaced it, which is
 * why it is a fixture rather than a parse of the current markup: the markup is
 * gone, and this is now the only record of which items existed and which of
 * them had an on state.
 */
const SHIPPED: { id: string; stateful: boolean }[] = JSON.parse(
  readFileSync(resolve("tests/fixtures/feature-ids.json"), "utf-8"),
);

const SHIPPED_IDS = SHIPPED.map((feature) => feature.id);

describe("identity", () => {
  it("has every feature that shipped, and no others", () => {
    expect([...FEATURES.map((feature) => feature.id)].sort()).toEqual([...SHIPPED_IDS].sort());
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
  // Five routes, and every feature takes exactly one: an entry in a bundle the
  // popup injects, a stored preference, a content setting, the reset that
  // clears all of those, or -- until its menu is ported -- the handler that
  // shipped.
  it("gives every feature exactly one way to run", () => {
    for (const feature of FEATURES) {
      const routes = [
        feature.inject,
        feature.setting,
        feature.contentSetting,
        feature.resetsContentSettings,
        feature.handler,
      ].filter(Boolean);

      expect({ id: feature.id, routes: routes.length }).toEqual({ id: feature.id, routes: 1 });
    }
  });

  it("names a legacy handler under the overlay namespace", () => {
    const wrong = FEATURES.filter(
      (feature) => feature.handler && !feature.handler.startsWith("WebDeveloper.Overlay."),
    );

    expect(wrong.map((feature) => feature.id)).toEqual([]);
  });

  // Four features share a handler and differ only in its argument -- convert
  // form methods each way, and mark links visited or unvisited. Those four are
  // the only allowed collision, so the pair has to be distinct even where the
  // handler is not.
  it("resolves to a distinct action per feature", () => {
    const actions = FEATURES.filter((feature) => feature.handler).map(
      (feature) => `${feature.handler}(${feature.argument ?? ""})`,
    );

    expect(new Set(actions).size).toBe(actions.length);
  });

  // Two features sharing a handler is how upstream expressed "same code,
  // different argument". Only the visited-links pair is left; the form-method
  // pair became two entries when Forms was ported, and the rest go the same
  // way.
  it("passes an argument only where two features share a handler", () => {
    const shared = FEATURES.filter(
      (feature) =>
        feature.handler && FEATURES.filter((other) => other.handler === feature.handler).length > 1,
    );

    expect(shared.map((feature) => feature.id).sort()).toEqual([
      "mark-all-links-unvisited",
      "mark-all-links-visited",
    ]);
    expect(shared.every((feature) => feature.argument !== undefined)).toBe(true);
  });
});

describe("kinds", () => {
  it("gives every feature one of the four", () => {
    const wrong = FEATURES.filter((feature) => !FEATURE_KINDS.includes(feature.kind));

    expect(wrong.map((feature) => `${feature.id} -> ${feature.kind}`)).toEqual([]);
  });

  // The two say the same thing from different directions -- one is what the
  // markup drew, the other is how the popup groups it -- so they have to
  // agree, or an item with an on state ends up in a group that has none.
  it("calls a feature a toggle exactly when it has an on state", () => {
    for (const feature of FEATURES) {
      expect(feature.kind === "toggle").toBe(!!feature.stateful);
    }
  });

  it("puts every menu's features into groups without losing any", () => {
    for (const menu of visibleMenus()) {
      const grouped = FEATURE_KINDS.flatMap((kind) =>
        menu.features.filter((feature) => feature.kind === kind),
      );

      expect(grouped.map((feature) => feature.id).sort()).toEqual(
        menu.features.map((feature) => feature.id).sort(),
      );
    }
  });

  it("groups each menu the way the popup shows it", () => {
    expect(
      Object.fromEntries(
        visibleMenus().map((menu) => [
          menu.id,
          FEATURE_KINDS.map(
            (kind) => `${kind}:${menu.features.filter((feature) => feature.kind === kind).length}`,
          ),
        ]),
      ),
    ).toMatchSnapshot();
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

describe("content settings", () => {
  const withSetting = FEATURES.filter((feature) => feature.contentSetting);

  // Five types, five features, one each. Two features pointing at the same
  // type would fight over one piece of browser state and each show the other's
  // result -- which is the failure the per-tab state cannot express, since the
  // browser holds this state and not the extension.
  it("gives each content type exactly one feature", () => {
    const types = withSetting.map((feature) => feature.contentSetting!.type);

    expect(types.sort()).toEqual(["cookies", "images", "javascript", "notifications", "popups"]);
  });

  it("has an on state, since the block persists", () => {
    for (const feature of withSetting) {
      expect({ id: feature.id, stateful: !!feature.stateful }).toEqual({
        id: feature.id,
        stateful: true,
      });
    }
  });

  // Including Disable Images, which is in the Images menu and which upstream
  // left visible on Firefox, where chrome.contentSettings does not exist.
  it("is hidden wherever the API is missing", () => {
    const routed = FEATURES.filter(
      (feature) => feature.contentSetting || feature.resetsContentSettings,
    );

    for (const feature of routed) {
      const shown = feature.available?.({ contentSettings: false, browsingData: true });

      expect({ id: feature.id, shown }).toEqual({
        id: feature.id,
        shown: false,
      });
    }
  });
});

describe("capabilities", () => {
  const chromium = { contentSettings: true, browsingData: true } as const;
  const firefox = { contentSettings: false, browsingData: true } as const;

  it("shows everything on Chromium", () => {
    expect(visibleMenus(chromium).flatMap((menu) => menu.features)).toHaveLength(SHIPPED.length);
  });

  // Not shipped inert: contentSettings is Chromium-only and has no Firefox
  // equivalent, so the six features that use it are gone there. They live in
  // three different menus, each of which keeps the rest of its items.
  it("drops every content-setting feature on Firefox", () => {
    const menus = visibleMenus(firefox);
    const ids = menus.flatMap((menu) => menu.features).map((feature) => feature.id);

    expect(ids).not.toContain("disable-cookies");
    expect(ids).not.toContain("disable-images");
    expect(ids).not.toContain("disable-javascript");
    expect(ids).not.toContain("reset-disable-features");

    // The menus they were in stay, because none of them was only this.
    expect(menus.map((menu) => menu.id)).toEqual(
      expect.arrayContaining(["cookies", "images", "miscellaneous"]),
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

// The registry is only useful if it says what the popup did. These are the two
// facts nothing else records now that the markup is gone.
describe("against the popup that shipped", () => {
  it("marks as stateful exactly the items that carried the state icons", () => {
    const shipped = Object.fromEntries(SHIPPED.map((feature) => [feature.id, feature.stateful]));

    expect(Object.fromEntries(FEATURES.map((feature) => [feature.id, !!feature.stateful]))).toEqual(
      shipped,
    );
  });

  // The order was the popup's order exactly until the Disable menu was folded
  // into Miscellaneous. Four items moved, and this says which four -- so a
  // fifth cannot move by accident, and the rest are still where they shipped.
  it("keeps the ids in the order the popup listed them, bar the four that moved", () => {
    const moved = [
      "disable-javascript",
      "disable-notifications",
      "disable-popups",
      "reset-disable-features",
    ];
    const without = (ids: string[]) => ids.filter((id) => !moved.includes(id));

    expect(without(FEATURES.map((feature) => feature.id))).toEqual(without(SHIPPED_IDS));
  });
});
