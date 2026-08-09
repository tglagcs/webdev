/**
 * Seeds settings that have never been set.
 *
 * Replaces upstream's setupDefaultOptions, which was 50 consecutive
 * setItemIfNotSet calls with the tool and layout lists spelled out inline.
 * The lists come from schema.ts now, so adding an eighth default tool is one
 * entry rather than three call sites and a count to remember to bump.
 *
 * Runs on every install and update, after the migrations, so a default added
 * in a later version reaches existing profiles.
 */

import {
  DEFAULTS,
  DEFAULT_RESIZE,
  DEFAULT_RESPONSIVE_LAYOUTS,
  DEFAULT_TOOLS,
  type NumberedSettings,
} from "./schema";
import * as settings from "./settings";
import type { Store } from "./settings";
import { t, type PlainMessageKey } from "../i18n";

type Numbered = Partial<NumberedSettings> & Record<string, string | number>;

/** Seeded values are whatever the schema says; only the lists are numbered. */
type Seedable = string | number | boolean;

/**
 * The description is stored resolved rather than as a message key, matching
 * upstream. These entries are user-editable, and storing the key would mean
 * re-resolving -- and so overwriting the user's edit -- on every update.
 */
function seedList(
  prefix: string,
  entries: readonly { description: string; url?: string; width?: number; height?: number }[],
): Numbered {
  const values: Numbered = {};

  entries.forEach((entry, index) => {
    const number = index + 1;

    values[`${prefix}_${number}_description`] = t(entry.description as PlainMessageKey);

    if (entry.url !== undefined) {
      values[`${prefix}_${number}_url`] = entry.url;
    }

    if (entry.width !== undefined) {
      values[`${prefix}_${number}_width`] = entry.width;
      values[`${prefix}_${number}_height`] = entry.height as number;
    }
  });

  return values;
}

export async function seedDefaults(): Promise<void> {
  const wanted: Record<string, Seedable> = {
    ...DEFAULTS,
    ...seedList("tool", DEFAULT_TOOLS),
    tool_count: DEFAULT_TOOLS.length,
    ...seedList("resize", DEFAULT_RESIZE),
    resize_count: DEFAULT_RESIZE.length,
    ...seedList("responsive_layout", DEFAULT_RESPONSIVE_LAYOUTS),
    responsive_layout_count: DEFAULT_RESPONSIVE_LAYOUTS.length,
  };

  // One read and one write, where upstream did 50 of each and then needed a
  // 100ms timeout to be sure they had landed before the next step ran.
  const existing = await browser.storage.local.get(Object.keys(wanted));
  // Compared against undefined, not for truthiness. setItemIfNotSet treats ""
  // and 0 as unset, which is upstream's behaviour and fine for the strings it
  // was written for -- but a boolean the user has deliberately turned off is a
  // value, and would be reset to its default on every update if this asked
  // whether it was falsy. (`key in existing` does not work either: the storage
  // API returns the requested keys with undefined values.)
  const missing = Object.fromEntries(
    Object.entries(wanted).filter(([key]) => existing[key] === undefined),
  );

  if (Object.keys(missing).length > 0) {
    await settings.setMany(missing as Partial<Store>);
  }
}
