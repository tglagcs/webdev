/**
 * The popup's own state: which menu is open, what is switched on, and the
 * notification or confirmation showing.
 *
 * A module rather than component state, because the legacy handlers report
 * their results by calling `WebDeveloper.Overlay.displayNotification` from
 * outside any component. main.ts points those functions here.
 */

import { SvelteSet } from "svelte/reactivity";

import { getFeaturesOnTab } from "@/lib/storage/tab-state";
import * as settings from "@/lib/storage/settings";
import type { Feature, MenuId } from "@/features/types";
import { FEATURES } from "@/features/registry";
import { runInjected, refusalFor } from "./run-feature";
import { runFeature } from "./bridge";
import { t } from "@/lib/i18n";
import type { DisplayOverlayWith, SettingKey } from "@/lib/storage/schema";

export type NotificationType = "success" | "info" | "warning" | "danger";

export interface Confirmation {
  message: string;
  buttonText: string;
  buttonIcon?: string;
  confirm: () => void;
}

class PopupState {
  menu = $state<MenuId>("cookies");
  active = $state(new SvelteSet<string>());
  notification = $state<{ message: string; type: NotificationType } | null>(null);

  /** Whether the tabs show their icon, their name, or both. */
  labels = $state<DisplayOverlayWith>("icons_text");
  confirmation = $state<Confirmation | null>(null);

  isActive(id: string): boolean {
    return this.active.has(id);
  }

  setActive(id: string, active: boolean): void {
    if (active) {
      this.active.add(id);
    } else {
      this.active.delete(id);
    }
  }

  notify(message: string, type: NotificationType = "success"): void {
    this.confirmation = null;
    this.notification = { message, type };
  }

  async restoreLabels(): Promise<void> {
    this.labels = await settings.getOr("display_overlay_with", "icons_text");
  }

  /** The menu the user was last on, so the popup reopens where they left it. */
  async restoreMenu(menus: MenuId[]): Promise<void> {
    // Stored as "cookies-toolbar" by the markup-driven popup, which keyed it
    // by the tab element's id. The suffix is dropped on the way in rather than
    // migrated, since it is a preference and costs nothing to reinterpret.
    const stored = (await settings.get("menu"))?.replace(/-toolbar$/, "") as MenuId | undefined;

    this.menu = stored && menus.includes(stored) ? stored : menus[0]!;
  }

  async selectMenu(menu: MenuId): Promise<void> {
    this.menu = menu;
    this.notification = null;
    this.confirmation = null;

    await settings.set("menu", menu);
  }

  /** The tab the popup was opened over, which is what every feature acts on. */
  tab = $state<{ id?: number; url?: string } | null>(null);

  /**
   * Runs a feature, by whichever route it declares.
   *
   * The two are the phase boundary: `inject` is a feature the popup owns, and
   * `handler` is one still living in overlay/*.js behind the bridge. A menu
   * moves from one to the other as it is ported.
   */
  async run(feature: Feature): Promise<void> {
    if (feature.setting) {
      const next = !this.isActive(feature.id);

      this.setActive(feature.id, next);

      await settings.set(feature.setting as SettingKey, next);

      return;
    }

    if (!feature.inject) {
      runFeature(feature, this);

      return;
    }

    const tabId = this.tab?.id;

    if (tabId === undefined) {
      return;
    }

    const refusal = refusalFor(this.tab?.url);

    if (refusal) {
      this.notify(`${t("extensionName")} ${t(refusal)}`, "danger");

      return;
    }

    await runInjected(feature, tabId, FEATURES);

    // The per-tab list is re-read rather than assumed, because a feature can
    // change more than its own state: switching Display Handheld Styles on
    // switches Display Print Styles off. The preference-backed items are not
    // in that list and are kept as they are.
    await this.syncWithTab(tabId);
  }

  private async syncWithTab(tabId: number): Promise<void> {
    const onTab = new Set(await getFeaturesOnTab(tabId));

    for (const feature of FEATURES) {
      if (feature.setting) {
        continue;
      }

      this.setActive(feature.id, onTab.has(feature.id));
    }
  }

  /** What is already switched on for the tab the popup was opened over. */
  async restoreFeatures(tabId: number): Promise<void> {
    for (const id of await getFeaturesOnTab(tabId)) {
      this.active.add(id);
    }
  }

  /**
   * The preference-backed items, which are not per tab.
   *
   * Read from settings rather than from the tab, so Show Element Tag Names
   * comes back on wherever the user opens the popup next.
   */
  async restoreSettings(features: Feature[]): Promise<void> {
    for (const feature of features.filter((candidate) => candidate.setting)) {
      if (await settings.get(feature.setting as SettingKey)) {
        this.active.add(feature.id);
      }
    }
  }
}

export const ui = new PopupState();
