/**
 * The toolbar button: badge count, tooltip and icon.
 *
 * Split out of the old storage.js, which owned both the per-tab state and
 * everything that displayed it. The tooltip was assembled from hardcoded
 * English there ("2 active features on this tab") regardless of locale; it
 * goes through the catalogue now.
 */

import { BADGE_COLOUR, NAME } from "@/branding";
import { t } from "./i18n";
import { getFeaturesOnTab } from "./storage/tab-state";
import { getOr } from "./storage/settings";
import type { OverlayIcon } from "./storage/schema";

const ICON_SIZES = [16, 32, 48, 64, 128, 256] as const;

/** Reflects the number of features applied to a tab onto its button. */
export async function updateBadge(tabId: number): Promise<void> {
  const features = await getFeaturesOnTab(tabId);
  const count = features.length;

  const text = count === 0 ? "" : count.toString();
  const title =
    count === 0
      ? NAME
      : `${NAME}\n${count === 1 ? t("badgeTooltipSingle") : t("badgeTooltipMultiple", count.toString())}`;

  await Promise.all([
    browser.action.setBadgeText({ text, tabId }),
    browser.action.setTitle({ title, tabId }),
  ]);
}

/** Applies the icon variant the user picked in the options. */
export async function updateActionIcon(): Promise<void> {
  const variant = await getOr("overlay_icon", "color" as OverlayIcon);
  const path = Object.fromEntries(
    ICON_SIZES.map((size) => [size, `/img/logos/${variant}/${size}.png`]),
  );

  await browser.action.setIcon({ path });
}

export async function setBadgeColour(): Promise<void> {
  await browser.action.setBadgeBackgroundColor({ color: BADGE_COLOUR.success });
}
