/**
 * The Chromium-only content settings behind the Disable menu.
 *
 * Firefox has no equivalent and is not getting one, so everything here is
 * guarded by capabilities.contentSettings rather than assumed present.
 */

import { capabilities } from "./capabilities";

const SETTING_TYPES = ["cookies", "images", "javascript", "notifications", "popups"] as const;

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
