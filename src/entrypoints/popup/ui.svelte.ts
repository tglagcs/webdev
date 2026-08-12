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
import { POPUP_ACTIONS } from "./actions";
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
