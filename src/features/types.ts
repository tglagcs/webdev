/**
 * What a menu item is.
 *
 * Upstream said the same thing in three places -- an `<li>` in
 * `popup/index.html`, a handler in `overlay/*.js`, and a line of wiring in
 * that file's `initialize()` -- which is why the popup could not have a
 * search box, keyboard shortcuts or a feature list. One entry here replaces
 * all three, and the popup renders itself from the registry.
 *
 * `id` is the identity of the feature everywhere: it labels the per-tab state
 * in `storage.session`, so renaming one silently orphans whatever the user had
 * switched on. The invariant test pins the whole set against a frozen list for
 * that reason.
 */

// PlainMessageKey, not MessageKey: a menu label never takes a substitution,
// and the narrower type is what lets t() be called without one.
import type { PlainMessageKey } from "@/lib/i18n-keys";
import type { Capabilities } from "@/lib/capabilities";
import type { ContentSettingType } from "@/lib/content-settings";

/**
 * The ten tabs, in the order the popup shows them.
 *
 * Upstream had an eleventh, Disable, and everything in it was a
 * `chrome.contentSettings` rule -- so the whole tab was missing on Firefox,
 * while the same mechanism appeared under Cookies and Images with its subject.
 * Those three items moved to Miscellaneous and the tab went; nothing is
 * removed, and the ids are untouched, so the state a user had is still theirs.
 */
export const MENUS = [
  "cookies",
  "css",
  "forms",
  "images",
  "information",
  "miscellaneous",
  "outline",
  "resize",
  "tools",
  "options",
] as const;

export type MenuId = (typeof MENUS)[number];

/**
 * What kind of thing a menu item is.
 *
 * The popup groups each menu by this, because a flat list of up to
 * twenty-four items gave the user nothing to tell a switch from a report --
 * which is a real difference: a toggle stays on and counts on the badge, an
 * action happens once, a report opens a tab, a dialog asks for something
 * first.
 *
 * Derived from the English label when the registry was written: a name ending
 * in an ellipsis opens something to fill in, and View/Find/Validate is the
 * closed set of report verbs.
 */
export type FeatureKind = "toggle" | "action" | "report" | "dialog";

/** In the order the popup stacks the groups. */
export const FEATURE_KINDS: FeatureKind[] = ["toggle", "action", "report", "dialog"];

/**
 * Where a value in an injected feature's payload comes from.
 *
 * Everything the old closures captured, and nothing else: a constant written
 * in the registry, a stored setting, a translated string, or whether the
 * feature is already on for this tab.
 *
 * The messages are resolved in the popup rather than in the page because
 * `WebDeveloper.Locales` is not in the page's isolated world -- see the note
 * in CLAUDE.md about what took Edit CSS out.
 */
export type PayloadSource =
  | { from: "value"; value: string | number | boolean }
  | { from: "setting"; key: string }
  | { from: "message"; key: PlainMessageKey }
  | { from: "enabled" };

/**
 * A feature the popup runs by injecting a bundle and naming an entry in it.
 *
 * Replaces one hand-written closure per feature. The entry name is the
 * feature id, so the registry and the bundle cannot drift apart silently
 * without the entries test noticing.
 */
export interface Injected {
  bundle: string;
  payload?: Record<string, PayloadSource>;

  /**
   * A feature that cannot be on at the same time as this one.
   *
   * Display Handheld Styles and Display Print Styles are the pair: a page
   * cannot be shown as both at once. Switching one on switches the other off
   * first. Upstream did this by reaching for the other menu item's element and
   * toggling that, which is exactly the coupling the registry replaces.
   */
  exclusiveWith?: string;
}

/**
 * A content type the Disable features block, and what to say either way.
 *
 * The messages are spelled out rather than derived from the type: they are
 * checked message keys that way, and greppable from the locale.
 */
export interface ContentSetting {
  type: ContentSettingType;

  /** Shown when the block is lifted. */
  enabledMessage: PlainMessageKey;

  /** Shown when the block goes on. */
  disabledMessage: PlainMessageKey;
}

export interface Feature {
  /** Must match the legacy DOM id: it is the key of the per-tab state. */
  id: string;

  labelKey: PlainMessageKey;

  /** Which of the menu's columns it sits in, 1-based, as the popup laid it out. */
  column: number;

  /**
   * Whether the item has an on state.
   *
   * A toggle shows a tick or a cross and counts towards the badge; a one-shot
   * runs and is done. Taken from which icons the markup carried, because that
   * is what the popup meant by "active".
   */
  stateful?: boolean;

  kind: FeatureKind;

  /**
   * The legacy handler that runs it, as a path under `WebDeveloper.Overlay`.
   *
   * A string rather than a function so the registry stays data -- the popup
   * resolves it at click time. Absent once the feature has an `inject`
   * instead; until then the behaviour is the code that shipped.
   */
  handler?: string;

  /** Set instead of `handler` for a feature the popup runs itself. */
  inject?: Injected;

  /**
   * Set instead of both for a feature that blocks a content type browser-wide.
   *
   * The five of them are the only features that touch no page at all: the
   * browser holds the state, so it is neither per tab nor in settings, and the
   * popup reads it back from `chrome.contentSettings` each time it opens.
   * Chromium only -- `available` hides them everywhere else.
   */
  contentSetting?: ContentSetting;

  /** Reset Disable Features, the one item that drops all five rules at once. */
  resetsContentSettings?: true;

  /**
   * Set instead of the others for a feature the popup carries out itself.
   *
   * The ones that call a browser API rather than run anything in the page --
   * clearing the cache or the history, marking links visited. The
   * implementation is in `popup/actions.ts`, keyed by this feature's id.
   */
  popupAction?: true;

  /**
   * Set instead of both for an item that only flips a stored preference.
   *
   * Show Element Tag Names is the one: it changes what the other outline
   * features draw, touches no page, and so is remembered across tabs rather
   * than per tab like everything else with an on state.
   */
  setting?: string;

  /** Hides the item where the browser cannot support it. */
  available?: (capabilities: Capabilities) => boolean;
}

export interface Menu {
  id: MenuId;
  features: Feature[];
}
