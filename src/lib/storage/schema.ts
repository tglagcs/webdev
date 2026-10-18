/**
 * The shape of chrome.storage.local, as it actually is on disk.
 *
 * Upstream had no schema at all: every read went through an untyped
 * getItem(name, callback) and every default was a setItemIfNotSet call buried
 * in upgrade.js. A typo returned undefined and the setting silently reverted
 * to whatever the reader treated as falsy.
 *
 * The numbered groups (tool_3_url, resize_1_width, ...) are kept flat here on
 * purpose. Collapsing them into arrays is the obviously better shape and is
 * planned, but the legacy options page reads and writes the numbered keys
 * directly; converting the store while that reader is still shipping would
 * mean an adapter that synthesises the old names, which is more throwaway
 * code than the collapse saves. It becomes a migration in the phase that
 * rewrites the options page, when there is only one reader left.
 */

/** Bumped whenever MIGRATIONS gains an entry. */
export const SCHEMA_VERSION = 2;

// Type-only, so no runtime dependency from storage on the registry: the
// popup's menu list is defined once, next to the features it groups.
import type { MenuId } from "@/features/types";

export type Theme = "system" | "light" | "dark";

export interface Settings {
  /** Set once the migrations for that version have run. Absent means v0. */
  schema_version: number;

  /** Last version that ran the install/update hook. */
  version: string;

  /** What Populate Form Fields types into an e-mail field. */
  populate_email_address: string;

  /**
   * Which CodeMirror theme the reports highlight with: "light", "dark" or
   * "none". Upstream defaulted to "none", so View CSS and View JavaScript
   * shipped as plain text and the dropdown that turns highlighting on is easy
   * to miss. It follows the extension's own theme once there is one.
   */
  syntax_highlight_theme: string;

  /** Which menu the popup was last on, so it reopens where the user left it. */
  menu: MenuId;

  /**
   * Whether the outline features also label each element with its tag name.
   *
   * A preference rather than a per-tab feature, and the dots in the key are
   * how it has always been stored -- renaming it would lose the setting of
   * everyone who has one.
   */
  "outline.show.element.tag.names": boolean;

  // General
  /**
   * The extension's own UI theme: "system", "light" or "dark". Only the
   * extension's pages and its in-page widgets follow it -- the feature
   * stylesheets injected into other people's pages stay theme-blind.
   */
  theme: Theme;

  /**
   * Whether the toolbar button opens a standalone window instead of a popup.
   *
   * A popup is closed by the browser the moment focus leaves it, and no API
   * can prevent that -- so "keep the popup open" is only achievable by not
   * using a popup. With this on, the button opens the same page as a small
   * window, which stays put while the user works on the page.
   */
  popup_in_window: boolean;

  // Set by the in-page dashboard as the user drags it.
  dashboard_height: number;

  // Numbered groups, one per user-editable list. `*_count` is the length.
  tool_count: number;
  resize_count: number;
  responsive_layout_count: number;
}

/** The numbered keys, which no fixed interface can enumerate. */
export interface NumberedSettings {
  [key: `tool_${number}_description`]: string;
  [key: `tool_${number}_url`]: string;
  [key: `resize_${number}_description`]: string;
  [key: `resize_${number}_width`]: number;
  [key: `resize_${number}_height`]: number;
  [key: `responsive_layout_${number}_description`]: string;
  [key: `responsive_layout_${number}_width`]: number;
  [key: `responsive_layout_${number}_height`]: number;
}

export type SettingKey = keyof Settings;
export type AnySettingKey = SettingKey | keyof NumberedSettings;

/**
 * Keys nothing writes any more. Named only so a migration can delete them
 * without widening the accessor's key type back to string.
 */
export type RemovedSettingKey = "icon_color" | "overlay_icon" | "display_overlay_with";

/**
 * Defaults applied on install and after every migration, so a key added in a
 * later version lands on existing profiles too. Only the non-numbered ones
 * live here; the lists are seeded by seedDefaultLists(), which needs the
 * locale for its descriptions.
 */
export const DEFAULTS: Pick<
  Settings,
  "populate_email_address" | "syntax_highlight_theme" | "theme" | "popup_in_window"
> = {
  populate_email_address: "example@example.com",
  syntax_highlight_theme: "light",
  theme: "system",
  popup_in_window: false,
};

/**
 * The seeded lists. Descriptions are message keys resolved at seed time --
 * upstream stored the resolved English string, and so do we, because the user
 * can edit them and a stored key would overwrite their edit on every update.
 */
export const DEFAULT_TOOLS = [
  {
    description: "tool_1_description",
    url: "http://jigsaw.w3.org/css-validator/validator?profile=css3&warning=0&uri=",
  },
  { description: "tool_2_description", url: "http://validator.w3.org/feed/check.cgi?url=" },
  { description: "tool_3_description", url: "http://validator.w3.org/check?verbose=1&uri=" },
  { description: "tool_4_description", url: "http://wave.webaim.org/report#/" },
  {
    description: "tool_5_description",
    url: "http://validator.w3.org/checklink?check=Check&hide_type=all&summary=on&uri=",
  },
  { description: "tool_6_description", url: "https://search.google.com/test/rich-results?url=" },
  { description: "tool_7_description", url: "https://www.nslookup.io/dns-records/" },
] as const;

export const DEFAULT_RESIZE = [
  { description: "resize_1_description", width: 1024, height: 768 },
] as const;

export const DEFAULT_RESPONSIVE_LAYOUTS = [
  { description: "responsive_layout_1_description", width: 320, height: 480 },
  { description: "responsive_layout_2_description", width: 480, height: 320 },
  { description: "responsive_layout_3_description", width: 600, height: 800 },
  { description: "responsive_layout_4_description", width: 800, height: 600 },
  { description: "responsive_layout_5_description", width: 768, height: 1024 },
  { description: "responsive_layout_6_description", width: 1024, height: 768 },
] as const;
