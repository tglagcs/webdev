/**
 * Ordered, versioned migrations of chrome.storage.local.
 *
 * Upstream ran its fix-ups on every version change, guarded only by comparing
 * the stored version string, and then waited 100ms before applying defaults
 * "to make sure all the migration has completed" -- the callbacks were not
 * sequenced, so that timeout was the only thing ordering them. Numbering the
 * migrations and awaiting each in turn removes both the race and the need to
 * re-run work that has already been done.
 *
 * A migration must be safe to run against empty storage: a fresh install goes
 * through the same path, and every one of these is a no-op there.
 */

import { SCHEMA_VERSION } from "./schema";
import * as settings from "./settings";
import { t } from "../i18n";

/**
 * Upstream's migrateTools, unchanged in behaviour. Both branches recognise a
 * specific historical tool list by its exact contents and repair it; anything
 * the user has edited is left alone.
 */
async function migrateTools(): Promise<void> {
  const items = await browser.storage.local.get([
    "tool_count",
    "tool_5_description",
    "tool_5_url",
    "tool_6_description",
    "tool_6_url",
  ]);

  const cynthiaSays =
    items.tool_count === 6 &&
    items.tool_5_description === "Validate Section 508" &&
    items.tool_5_url === "http://www.cynthiasays.com/mynewtester/cynthia.exe?rptmode=-1&url1=" &&
    items.tool_6_description === "Validate WAI" &&
    items.tool_6_url === "http://www.cynthiasays.com/mynewtester/cynthia.exe?rptmode=2&url1=";

  if (cynthiaSays) {
    await settings.remove(["tool_6_description", "tool_6_url"]);
    await settings.setMany({
      tool_4_description: t("tool_4_description"),
      tool_4_url: "http://wave.webaim.org/report#/",
      tool_5_description: t("tool_5_description"),
      tool_5_url: "http://validator.w3.org/checklink?check=Check&hide_type=all&summary=on&uri=",
      tool_count: 5,
    });

    return;
  }

  const structuredData =
    items.tool_count === 7 &&
    items.tool_6_description === "Validate Structured Data" &&
    items.tool_6_url === "https://search.google.com/structured-data/testing-tool/u/0/#url=";

  if (structuredData) {
    await settings.set("tool_6_url", "https://search.google.com/test/rich-results?url=");
  }
}

/**
 * Per-tab feature state used to be written to storage.local under the numeric
 * tab id. It now lives in storage.session, so every numeric key on disk is a
 * leaked entry for a tab that closed at some point over the profile's life.
 * They are also actively harmful: the id gets reused, and the stale list
 * would be read back as the new tab's state.
 */
async function removeLeakedTabState(): Promise<void> {
  const stored = await browser.storage.local.get(null);
  const numeric = Object.keys(stored).filter((key) => /^\d+$/.test(key));

  if (numeric.length > 0) {
    await browser.storage.local.remove(numeric);
  }
}

async function toV1(): Promise<void> {
  await migrateTools();
  await removeLeakedTabState();

  // Deleted setting; upstream removed the option but left the key behind.
  await settings.remove("icon_color");
}

/**
 * Two options taken out: the toolbar icon is always the colour logo, and the
 * popup tabs always show both icon and name.
 */
async function toV2(): Promise<void> {
  await settings.remove(["overlay_icon", "display_overlay_with"]);
}

/**
 * Keyed by the version each one produces. Adding an entry means bumping
 * SCHEMA_VERSION in schema.ts to match.
 *
 * Deliberately absent: upstream's migrateLegacySettings, which copied
 * window.localStorage into storage. It ran inside the background page, and
 * under MV3 that is a service worker with no window -- the try block always
 * threw. It has been dead since the MV3 port and migrated nothing.
 */
const MIGRATIONS: Record<number, () => Promise<void>> = {
  1: toV1,
  2: toV2,
};

/** Runs every migration the profile has not seen, oldest first. */
export async function runMigrations(): Promise<void> {
  const from = (await settings.get("schema_version")) ?? 0;

  for (let version = from + 1; version <= SCHEMA_VERSION; version++) {
    const migration = MIGRATIONS[version];

    if (migration) {
      await migration();
    }

    await settings.set("schema_version", version);
  }
}
