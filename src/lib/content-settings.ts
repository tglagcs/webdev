/**
 * The Chromium-only content settings behind the Disable menu.
 *
 * Firefox has no equivalent and is not getting one, so everything here is
 * guarded by capabilities.contentSettings rather than assumed present.
 */

import { capabilities } from "./capabilities";

export const SETTING_TYPES = [
  "cookies",
  "images",
  "javascript",
  "notifications",
  "popups",
] as const;

export type ContentSettingType = (typeof SETTING_TYPES)[number];

/** The API object for one type, which is a property rather than an argument. */
function typed(type: ContentSettingType) {
  return browser.contentSettings[type];
}

export async function isBlocked(type: ContentSettingType): Promise<boolean> {
  if (!capabilities.contentSettings) {
    return false;
  }

  return (await typed(type).get({ primaryUrl: "http://*/*" })).setting === "block";
}

/**
 * Blocks or unblocks a content type for every site.
 *
 * The clear-then-maybe-set is upstream's and is kept: the rule the extension
 * wrote is cleared first, and a new one is only written if clearing did not
 * already produce the state the user asked for. So switching a feature off
 * usually leaves the browser with no rule at all rather than with an explicit
 * "allow" -- which matters, because an explicit allow overrides whatever the
 * user set for themselves in the browser's own settings.
 *
 * The comparison is against the setting as it was, not against the target,
 * because that is what shipped. The two differ only where clearing lands on a
 * third value -- "ask" or "session_only", both reachable for cookies -- and
 * that case has not been checked against a real profile.
 */
export async function setBlocked(type: ContentSettingType, blocked: boolean): Promise<void> {
  const setting = typed(type);
  const before = (await setting.get({ primaryUrl: "http://*/*" })).setting;

  await setting.clear({});

  if ((await setting.get({ primaryUrl: "http://*/*" })).setting === before) {
    await setting.set({ primaryPattern: "<all_urls>", setting: blocked ? "block" : "allow" });
  }
}

/**
 * Drops every rule the extension has written, whatever it says.
 *
 * Reset Disable Features, and the one place that clears unconditionally --
 * resetAllowedContentSettings below only discards a half-finished toggle.
 */
export async function clearContentSettings(): Promise<void> {
  if (!capabilities.contentSettings) {
    return;
  }

  await Promise.all(SETTING_TYPES.map((type) => typed(type).clear({})));
}

/**
 * Clears any setting the extension has left pinned to "allow".
 *
 * Kept from upstream's fixContentSettings, and kept on the same schedule --
 * every install and update, not once. The settings are extension-scoped, so
 * clearing only discards a rule this extension itself wrote, and "allow" is
 * never a state the Disable menu intends to leave behind: it means a toggle
 * was interrupted part way.
 */
export async function resetAllowedContentSettings(): Promise<void> {
  if (!capabilities.contentSettings) {
    return;
  }

  await Promise.all(
    SETTING_TYPES.map(async (type) => {
      const setting = browser.contentSettings[type];
      const details = await setting.get({ primaryUrl: "http://*/*" });

      if (details.setting === "allow") {
        await setting.clear({});
      }
    }),
  );
}
