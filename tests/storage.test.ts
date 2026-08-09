/**
 * Tests for the storage core: migrations, defaults, per-tab state.
 *
 * Migrations are the one part of the port with no way back. They run once on
 * a profile that already has the user's settings in it, unattended, and a
 * mistake is discovered later as data that is simply gone. So each one is
 * exercised against the storage shape it is meant to find -- including the
 * shapes it must leave alone, which is the half that would otherwise only be
 * noticed by the user whose edited tool list got reset.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { seedDefaults } from "@/lib/storage/defaults";
import { runMigrations } from "@/lib/storage/migrations";
import { DEFAULT_TOOLS, SCHEMA_VERSION } from "@/lib/storage/schema";
import * as settings from "@/lib/storage/settings";
import * as tabState from "@/lib/storage/tab-state";

const CYNTHIA_508 = "http://www.cynthiasays.com/mynewtester/cynthia.exe?rptmode=-1&url1=";
const CYNTHIA_WAI = "http://www.cynthiasays.com/mynewtester/cynthia.exe?rptmode=2&url1=";

/** A 3.0.1 profile that never saw the tool list change. */
const CYNTHIA_PROFILE = {
  tool_count: 6,
  tool_5_description: "Validate Section 508",
  tool_5_url: CYNTHIA_508,
  tool_6_description: "Validate WAI",
  tool_6_url: CYNTHIA_WAI,
};

beforeEach(() => {
  fakeBrowser.reset();
});

describe("migrations", () => {
  it("stamps the schema version on an empty profile without writing anything else", async () => {
    await runMigrations();

    expect(await browser.storage.local.get(null)).toEqual({ schema_version: SCHEMA_VERSION });
  });

  it("does not re-run a migration the profile has already seen", async () => {
    await browser.storage.local.set({ ...CYNTHIA_PROFILE, schema_version: SCHEMA_VERSION });

    await runMigrations();

    // Untouched: the profile claims to be current, so the repair below must
    // not fire. Re-running a migration is how a later one corrupts data it
    // has already converted.
    expect(await settings.get("tool_count")).toBe(6);
    expect(await settings.get("tool_5_url")).toBe(CYNTHIA_508);
  });

  describe("tool list repair", () => {
    it("replaces the retired Cynthia Says validators", async () => {
      await browser.storage.local.set(CYNTHIA_PROFILE);

      await runMigrations();

      expect(await settings.get("tool_count")).toBe(5);
      expect(await settings.get("tool_4_url")).toBe("http://wave.webaim.org/report#/");
      expect(await settings.get("tool_5_url")).toBe(
        "http://validator.w3.org/checklink?check=Check&hide_type=all&summary=on&uri=",
      );
      expect(await settings.get("tool_6_url")).toBeUndefined();
      expect(await settings.get("tool_6_description")).toBeUndefined();
    });

    it("moves the structured-data tool to its replacement URL", async () => {
      await browser.storage.local.set({
        tool_count: 7,
        tool_6_description: "Validate Structured Data",
        tool_6_url: "https://search.google.com/structured-data/testing-tool/u/0/#url=",
      });

      await runMigrations();

      expect(await settings.get("tool_6_url")).toBe(
        "https://search.google.com/test/rich-results?url=",
      );
    });

    it("leaves a list the user has edited alone", async () => {
      // Same count and the same slot, but a URL the user changed. Upstream
      // matched on exact contents for this reason and so does the port.
      await browser.storage.local.set({
        ...CYNTHIA_PROFILE,
        tool_5_url: "https://example.test/mine",
      });

      await runMigrations();

      expect(await settings.get("tool_count")).toBe(6);
      expect(await settings.get("tool_5_url")).toBe("https://example.test/mine");
      expect(await settings.get("tool_6_url")).toBe(CYNTHIA_WAI);
    });
  });

  it("purges per-tab state left in local storage, and nothing that looks like it", async () => {
    await browser.storage.local.set({
      "42": "outline-tables,display-image-dimensions",
      "1337": "disable-javascript",
      tool_count: 7,
      resize_1_width: 1024,
      populate_email_address: "me@example.test",
    });

    await runMigrations();

    const stored = await browser.storage.local.get(null);

    expect(stored["42"]).toBeUndefined();
    expect(stored["1337"]).toBeUndefined();
    expect(stored.tool_count).toBe(7);
    expect(stored.resize_1_width).toBe(1024);
    expect(stored.populate_email_address).toBe("me@example.test");
  });

  it("removes the deleted icon_color setting", async () => {
    await browser.storage.local.set({ icon_color: "gray" });

    await runMigrations();

    expect(await browser.storage.local.get("icon_color")).toEqual({});
  });
});

describe("seedDefaults", () => {
  it("seeds the full default set on a fresh profile", async () => {
    await seedDefaults();

    expect(await settings.get("populate_email_address")).toBe("example@example.com");
    expect(await settings.get("overlay_icon")).toBe("color");
    // Highlighting is on out of the box; upstream shipped it off.
    expect(await settings.get("syntax_highlight_theme")).toBe("light");
    expect(await settings.get("tool_count")).toBe(DEFAULT_TOOLS.length);
    expect(await settings.get("tool_7_url")).toBe("https://www.nslookup.io/dns-records/");
    expect(await settings.get("resize_count")).toBe(1);
    expect(await settings.get("responsive_layout_count")).toBe(6);
  });

  it("never overwrites a setting the user has changed", async () => {
    await browser.storage.local.set({
      populate_email_address: "me@example.test",
      tool_1_url: "https://example.test/validator",
    });

    await seedDefaults();

    expect(await settings.get("populate_email_address")).toBe("me@example.test");
    expect(await settings.get("tool_1_url")).toBe("https://example.test/validator");
    // Still seeds the keys that were absent.
    expect(await settings.get("tool_2_url")).toBe("http://validator.w3.org/feed/check.cgi?url=");
  });

  // A boolean the user has turned off is a value, not an absence.
  it("does not resurrect a default the user has switched off", async () => {
    await browser.storage.local.set({ popup_in_window: false });

    await seedDefaults();

    expect(await settings.get("popup_in_window")).toBe(false);
  });

  it("seeds a boolean default on a fresh profile", async () => {
    await seedDefaults();

    expect(await settings.get("popup_in_window")).toBe(false);
  });

  it("is idempotent", async () => {
    await seedDefaults();
    const first = await browser.storage.local.get(null);

    await seedDefaults();

    expect(await browser.storage.local.get(null)).toEqual(first);
  });
});

describe("per-tab feature state", () => {
  // The in-page widgets have their own close button now, and cannot reach
  // storage.session themselves, so the worker clears their state for them.
  it("clears only the features a closed widget owned", async () => {
    await tabState.setFeaturesOnTab(7, ["edit-css", "outline-tables", "display-ruler"]);

    const remaining = (await tabState.getFeaturesOnTab(7)).filter(
      (feature) => !["edit-css", "display-element-information"].includes(feature),
    );

    await tabState.setFeaturesOnTab(7, remaining);

    expect(await tabState.getFeaturesOnTab(7)).toEqual(["outline-tables", "display-ruler"]);
  });

  it("reports no features for a tab that has none", async () => {
    expect(await tabState.getFeaturesOnTab(7)).toEqual([]);
    expect(await tabState.isFeatureOnTab("outline-tables", 7)).toBe(false);
  });

  it("toggles a feature on and back off", async () => {
    expect(await tabState.toggleFeatureOnTab("outline-tables", 7)).toEqual(["outline-tables"]);
    expect(await tabState.isFeatureOnTab("outline-tables", 7)).toBe(true);

    expect(await tabState.toggleFeatureOnTab("outline-tables", 7)).toEqual([]);
    expect(await tabState.isFeatureOnTab("outline-tables", 7)).toBe(false);
  });

  it("keeps tabs independent", async () => {
    await tabState.toggleFeatureOnTab("outline-tables", 7);
    await tabState.toggleFeatureOnTab("disable-styles", 8);

    expect(await tabState.getFeaturesOnTab(7)).toEqual(["outline-tables"]);
    expect(await tabState.getFeaturesOnTab(8)).toEqual(["disable-styles"]);
  });

  it("removes the key rather than storing an empty list", async () => {
    await tabState.toggleFeatureOnTab("outline-tables", 7);
    await tabState.toggleFeatureOnTab("outline-tables", 7);

    expect(await browser.storage.session.get(null)).toEqual({});
  });

  it("prunes entries for tabs that no longer exist", async () => {
    const open = await fakeBrowser.tabs.create({ url: "https://example.test/" });
    const closed = open.id! + 1;

    await tabState.setFeaturesOnTab(open.id!, ["outline-tables"]);
    await tabState.setFeaturesOnTab(closed, ["disable-styles"]);

    await tabState.pruneClosedTabs();

    expect(await tabState.getFeaturesOnTab(open.id!)).toEqual(["outline-tables"]);
    expect(await tabState.getFeaturesOnTab(closed)).toEqual([]);
  });
});
