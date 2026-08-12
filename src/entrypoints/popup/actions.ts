/**
 * The features the popup carries out itself.
 *
 * The third route, beside injecting a bundle and flipping a content setting.
 * These four touch no page: they call a browser API -- browsing data, history
 * -- and the two that mark links only ask the page which links it has before
 * doing so. There is nothing to run in the page, so there is no bundle entry.
 *
 * Keyed by feature id, exactly as the bundle entry tables are, so the registry
 * and this file cannot drift apart without the invariant test noticing.
 */

import { sendToContent } from "@/lib/content-messaging";
import { t } from "@/lib/i18n";
import type { NotificationType } from "./ui.svelte";

/**
 * What an action is given.
 *
 * An interface rather than the popup state itself, so the actions do not
 * import the state that imports them -- and so a test can run one against a
 * recording context.
 */
export interface ActionContext {
  /**
   * The tab the popup was opened over, if the extension may touch it.
   *
   * Undefined for an internal browser page or the extension gallery, having
   * said so in the popup. Clearing the cache does not ask -- it is
   * browser-wide and works from anywhere, as it did upstream -- so the check
   * belongs to the actions that need a page rather than to the route.
   */
  requirePage(): number | undefined;

  notify(message: string, type?: NotificationType): void;

  /**
   * Asks before doing it. `run` fires only if the user says yes, and the
   * confirmation closes either way.
   */
  confirm(message: string, buttonText: string, buttonIcon: string, run: () => void): void;
}

export type PopupAction = (context: ActionContext) => void | Promise<void>;

/**
 * Marks every link on the page visited or unvisited, by editing the history.
 *
 * There is no other way: `:visited` is decided by the history and, since the
 * 2010 leak fixes, is deliberately unreadable and unstyleable from a page. So
 * the feature really does add or remove history entries, which is why upstream
 * put it behind a menu item and not a toggle.
 */
async function markLinks(visited: boolean, { requirePage, notify }: ActionContext): Promise<void> {
  const tabId = requirePage();

  if (tabId === undefined) {
    return;
  }

  const report = await sendToContent(tabId, "get-links");

  for (const entry of report.documents) {
    for (const url of entry.links) {
      if (visited) {
        await browser.history.addUrl({ url });
      } else {
        await browser.history.deleteUrl({ url });
      }
    }
  }

  notify(t(visited ? "markAllLinksVisitedResult" : "markAllLinksUnvisitedResult"));
}

export const POPUP_ACTIONS: Record<string, PopupAction> = {
  "clear-cache": ({ confirm, notify }) => {
    confirm(t("clearCacheConfirmation"), t("clear"), "trash", () => {
      // since: 0 is everything, not nothing -- the argument is the point in
      // time to clear from.
      void browser.browsingData.removeCache({ since: 0 }).then(() => {
        notify(t("clearCacheResult"));
      });
    });
  },

  "clear-history": ({ confirm, notify }) => {
    confirm(t("clearHistoryConfirmation"), t("clear"), "trash", () => {
      void browser.history.deleteAll().then(() => {
        notify(t("clearHistoryResult"));
      });
    });
  },

  "mark-all-links-visited": (context) => markLinks(true, context),
  "mark-all-links-unvisited": (context) => markLinks(false, context),
};
