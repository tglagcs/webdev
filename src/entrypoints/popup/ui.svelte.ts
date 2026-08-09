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
import type { MenuId } from "@/features/types";
import type { DisplayOverlayWith } from "@/lib/storage/schema";

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

  /** What is already switched on for the tab the popup was opened over. */
  async restoreFeatures(tabId: number): Promise<void> {
    for (const id of await getFeaturesOnTab(tabId)) {
      this.active.add(id);
    }
  }
}

export const ui = new PopupState();
