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

/** The eleven tabs, in the order the popup shows them. */
export const MENUS = [
  "disable",
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

  /**
   * The legacy handler that runs it, as a path under `WebDeveloper.Overlay`.
   *
   * A string rather than a function so the registry stays data -- the popup
   * resolves it at click time. Each one is replaced by a typed implementation
   * as its menu is ported; until then the behaviour is the code that shipped.
   */
  handler: string;

  /**
   * What the handler is given, where two features share one.
   *
   * Convert Form Gets To Posts and its opposite are one handler and a method
   * name; Mark All Links Visited and Unvisited are one handler and a boolean.
   */
  argument?: string | boolean;

  /** Hides the item where the browser cannot support it. */
  available?: (capabilities: Capabilities) => boolean;
}

export interface Menu {
  id: MenuId;
  features: Feature[];
}
