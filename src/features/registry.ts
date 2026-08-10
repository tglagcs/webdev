/**
 * Every feature the popup offers, in menu order.
 *
 * The menu modules are transcribed from the markup and the handlers that
 * shipped; this file adds the two things that are not in either -- which
 * features a browser cannot support, and the order of the menus themselves.
 */

import { capabilities, type Capabilities } from "@/lib/capabilities";
import { MENUS, type Feature, type Menu, type MenuId } from "./types";
import { COOKIES_FEATURES } from "./menus/cookies";
import { CSS_FEATURES } from "./menus/css";
import { DISABLE_FEATURES } from "./menus/disable";
import { FORMS_FEATURES } from "./menus/forms";
import { IMAGES_FEATURES } from "./menus/images";
import { INFORMATION_FEATURES } from "./menus/information";
import { MISCELLANEOUS_FEATURES } from "./menus/miscellaneous";
import { OPTIONS_FEATURES } from "./menus/options";
import { OUTLINE_FEATURES } from "./menus/outline";
import { RESIZE_FEATURES } from "./menus/resize";
import { TOOLS_FEATURES } from "./menus/tools";

const BY_MENU: Record<MenuId, Feature[]> = {
  disable: DISABLE_FEATURES,
  cookies: COOKIES_FEATURES,
  css: CSS_FEATURES,
  forms: FORMS_FEATURES,
  images: IMAGES_FEATURES,
  information: INFORMATION_FEATURES,
  miscellaneous: MISCELLANEOUS_FEATURES,
  outline: OUTLINE_FEATURES,
  resize: RESIZE_FEATURES,
  tools: TOOLS_FEATURES,
  options: OPTIONS_FEATURES,
};

/**
 * The features that need an API not every browser has.
 *
 * Kept here rather than in the transcribed modules, which are the markup and
 * nothing else. `contentSettings` is Chromium-only and is not coming to
 * Firefox, so the whole Disable menu and Disable Cookies are hidden there
 * rather than shipped inert. `browsingData` exists on both.
 */
const REQUIRES: Record<string, (capabilities: Capabilities) => boolean> = {
  "disable-javascript": (available) => available.contentSettings,
  "disable-notifications": (available) => available.contentSettings,
  "disable-popups": (available) => available.contentSettings,
  "reset-disable-features": (available) => available.contentSettings,
  "disable-cookies": (available) => available.contentSettings,
  // Upstream left this one showing on Firefox, where clicking it threw on an
  // undefined chrome.contentSettings. It is the same mechanism as the rest and
  // is gated with them.
  "disable-images": (available) => available.contentSettings,
  "clear-cache": (available) => available.browsingData,
  "clear-history": (available) => available.browsingData,
};

export const FEATURES: Feature[] = MENUS.flatMap((menu) =>
  BY_MENU[menu].map((feature) => ({ ...feature, available: REQUIRES[feature.id] })),
);

export function featureById(id: string): Feature | undefined {
  return FEATURES.find((feature) => feature.id === id);
}

/**
 * The menus to show, with the features this browser can run.
 *
 * A menu whose features are all unavailable is dropped rather than shown
 * empty -- on Firefox that is the whole Disable tab.
 */
export function visibleMenus(available: Capabilities = capabilities): Menu[] {
  return MENUS.map((menu) => ({
    id: menu,
    features: BY_MENU[menu]
      .map((feature) => ({ ...feature, available: REQUIRES[feature.id] }))
      .filter((feature) => !feature.available || feature.available(available)),
  })).filter((menu) => menu.features.length > 0);
}

/** The features of one menu, grouped into the columns the popup lays out. */
export function columns(menu: Menu): Feature[][] {
  const grouped: Feature[][] = [];

  for (const feature of menu.features) {
    const index = feature.column - 1;

    grouped[index] = grouped[index] ?? [];
    grouped[index].push(feature);
  }

  return grouped.filter(Boolean);
}
