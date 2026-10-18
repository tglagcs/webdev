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
import { runInjected, runContentSetting, refusalFor } from "./run-feature";
import { clearContentSettings, isBlocked } from "@/lib/content-settings";
import { runFeature } from "./bridge";
import { POPUP_ACTIONS, type PopupDialog } from "./actions";
import { t } from "@/lib/i18n";
import type { SettingKey } from "@/lib/storage/schema";

export type NotificationType = "success" | "info" | "warning" | "danger";

export interface Confirmation {
  message: string;
  buttonText: string;
  buttonIcon?: string;
  confirm: () => void;
}

/** A rail tab: one of the menus, or Search, which is not a menu of its own. */
export type Tab = MenuId | "search";

class PopupState {
  /** Search first, every time: it is where a feature is quickest to reach. */
  menu = $state<Tab>("search");
  active = $state(new SvelteSet<string>());
  notification = $state<{ message: string; type: NotificationType } | null>(null);
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

  selectMenu(menu: Tab): void {
    this.menu = menu;
    this.dialog = null;
    this.notification = null;
    this.confirmation = null;
  }

  /** One of the popup's own dialogs, shown over the menus, or none. */
  dialog = $state<PopupDialog | null>(null);

  /** Starred feature ids, oldest first. */
  favorites = $state<string[]>([]);

  isFavorite(id: string): boolean {
    return this.favorites.includes(id);
  }

  /** Drops ids the registry no longer has, so a removed feature leaves no hole. */
  async restoreFavorites(known: Set<string>): Promise<void> {
    this.favorites = (await settings.getOr("favorites", [])).filter((id) => known.has(id));
  }

  async toggleFavorite(id: string): Promise<void> {
    this.favorites = this.isFavorite(id)
      ? this.favorites.filter((favorite) => favorite !== id)
      : [...this.favorites, id];

    await settings.set("favorites", [...this.favorites]);
  }

  /** The tab the popup was opened over, which is what every feature acts on. */
  tab = $state<{ id?: number; url?: string; index: number; windowId: number } | null>(null);

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

    if (feature.contentSetting) {
      const { blocked, message } = await runContentSetting(feature.contentSetting);

      this.setActive(feature.id, blocked);
      this.notify(t(message));

      return;
    }

    if (feature.resetsContentSettings) {
      await clearContentSettings();
      // Every one of the five may have changed, so they are re-read rather
      // than assumed off: the browser's own settings survive the clear.
      await this.restoreContentSettings(FEATURES);
      this.notify(t("resetDisableFeaturesResult"));

      return;
    }

    // Before the refusal check below, which is about the page: Clear Cache and
    // Clear History are browser-wide and work from an internal page, as they
    // did upstream. An action that does need the page asks for it itself.
    if (feature.popupAction) {
      await this.runAction(feature);

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

  /**
   * Runs a feature the popup owns, and reports what it cannot run.
   *
   * A missing action is warned about rather than ignored, for the same reason
   * a missing bundle entry is: the item would look like it worked.
   */
  private async runAction(feature: Feature): Promise<void> {
    const action = POPUP_ACTIONS[feature.id];

    if (!action) {
      console.warn(`WEBDEV LOG: no popup action for ${feature.id}`);

      return;
    }

    await action({
      notify: (message, type) => this.notify(message, type),
      confirm: (message, buttonText, buttonIcon, run) => {
        this.confirmation = { message, buttonText, buttonIcon, confirm: run };
      },
      requirePage: () => {
        const refusal = refusalFor(this.tab?.url);

        if (refusal) {
          this.notify(`${t("extensionName")} ${t(refusal)}`, "danger");

          return undefined;
        }

        return this.tab?.id;
      },
      openDialog: (dialog) => {
        this.notification = null;
        this.dialog = dialog;
      },
      pageTab: () => {
        const tab = this.tab;

        if (!tab || tab.id === undefined || refusalFor(tab.url)) {
          return undefined;
        }

        return { id: tab.id, index: tab.index, windowId: tab.windowId };
      },
    });
  }

  private async syncWithTab(tabId: number): Promise<void> {
    const onTab = new Set(await getFeaturesOnTab(tabId));

    for (const feature of FEATURES) {
      // Neither the preference-backed items nor the content settings are in
      // the per-tab list, and clearing them here would switch Disable
      // JavaScript off in the menu while the browser went on blocking it.
      if (feature.setting || feature.contentSetting) {
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
   * The content settings, which the browser holds rather than the extension.
   *
   * Read at every open, because the user can change any of them from the
   * browser's own settings while the popup is closed -- and because a block
   * applies to every tab, so there is nothing per-tab to remember.
   */
  async restoreContentSettings(features: Feature[]): Promise<void> {
    for (const feature of features.filter((candidate) => candidate.contentSetting)) {
      this.setActive(feature.id, await isBlocked(feature.contentSetting!.type));
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
