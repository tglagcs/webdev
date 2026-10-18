/**
 * The features the popup carries out itself.
 *
 * The third route, beside injecting a bundle and flipping a content setting.
 * None of these runs anything in the page: they call a browser API -- browsing
 * data, history, the cookie store -- and the ones that need to know what is on
 * the page ask the content script first. So there is no bundle entry for any
 * of them.
 *
 * Keyed by feature id, exactly as the bundle entry tables are, so the registry
 * and this file cannot drift apart without the invariant test noticing.
 */

import { sendToContent } from "@/lib/content-messaging";
import { t } from "@/lib/i18n";
import type { PlainMessageKey, SubstitutedMessageKey } from "@/lib/i18n";
import { deleteCookie, fromBrowserCookies, type CookieIdentity } from "@/lib/cookies";
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

  /**
   * The same tab, without the refusal: for an action that still has
   * something to do on a page it cannot read, such as View JSON opening an
   * empty viewer to paste into.
   */
  pageTab(): { id: number; index: number; windowId: number } | undefined;

  /** Shows one of the popup's own dialogs in place of the menus. */
  openDialog(dialog: PopupDialog): void;

  notify(message: string, type?: NotificationType): void;

  /**
   * Asks before doing it. `run` fires only if the user says yes, and the
   * confirmation closes either way.
   */
  confirm(message: string, buttonText: string, buttonIcon: string, run: () => void): void;
}

/** The dialogs the popup renders itself, rather than legacy markup it shows. */
export type PopupDialog = "time-travel";

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

/**
 * What one of the delete-everything cookie features says, at each count.
 *
 * Singular and plural are separate messages rather than one with a number in
 * it, because that is how the catalogue is written and how it translates:
 * several languages need a different sentence, not a different digit.
 */
interface DeletionMessages {
  noneFound: PlainMessageKey;
  singleConfirmation: PlainMessageKey;
  multipleConfirmation: SubstitutedMessageKey;
  singleResult: PlainMessageKey;
  multipleResult: SubstitutedMessageKey;
}

/**
 * Counts, asks, and deletes -- the shape all three delete features share.
 *
 * Nothing happens without an answer, and finding nothing to delete is
 * reported rather than silently doing nothing: a confirmation dialog that
 * says "delete 0 cookies" is worse than a notification saying there are none.
 */
function confirmDelete(
  cookies: CookieIdentity[],
  messages: DeletionMessages,
  { confirm, notify }: ActionContext,
): void {
  const count = cookies.length;

  if (count === 0) {
    notify(t(messages.noneFound));

    return;
  }

  const asked =
    count === 1 ? t(messages.singleConfirmation) : t(messages.multipleConfirmation, String(count));

  confirm(asked, t("delete"), "trash", () => {
    for (const cookie of cookies) {
      deleteCookie(cookie);
    }

    notify(count === 1 ? t(messages.singleResult) : t(messages.multipleResult, String(count)));
  });
}

/**
 * The cookies of the page, as the content script decides they are.
 *
 * The whole store is read here and filtered there, because the filtering is
 * per document: a page's frames each have their own host and path, and the
 * feature means "the cookies this page would send", not the top document's.
 */
async function pageCookies(
  tabId: number,
  type: "get-domain-cookies" | "get-path-cookies",
): Promise<CookieIdentity[]> {
  const allCookies = fromBrowserCookies(await browser.cookies.getAll({}));
  const cookies = await sendToContent(tabId, type, { allCookies });

  // Narrowed to what can be named in the store again. Nothing real is dropped
  // -- filterCookies has already required a host and a path -- but the wire
  // shape says those are optional, and a cookie without them cannot be
  // deleted, only silently missed.
  return cookies.flatMap((cookie) =>
    cookie.host && cookie.name && cookie.path
      ? [
          {
            host: cookie.host,
            name: cookie.name,
            path: cookie.path,
            secure: cookie.secure === true,
          },
        ]
      : [],
  );
}

export const POPUP_ACTIONS: Record<string, PopupAction> = {
  // A dialog, because the time has to be chosen first. It reads and writes the
  // page itself, so it needs a page it may touch.
  "time-travel": ({ requirePage, openDialog }) => {
    if (requirePage() !== undefined) {
      openDialog("time-travel");
    }
  },

  // Opens the viewer in a tab of its own, beside the page. The viewer asks
  // the page's content script for the document itself, so nothing as large
  // as a JSON response is passed through the popup or put in storage.
  "view-json": async ({ pageTab }) => {
    const tab = pageTab();
    const url = browser.runtime.getURL("/json-viewer.html");

    await browser.tabs.create(
      tab ? { url: `${url}?tab=${tab.id}`, index: tab.index + 1, windowId: tab.windowId } : { url },
    );
  },

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

  "delete-domain-cookies": async (context) => {
    const tabId = context.requirePage();

    if (tabId === undefined) {
      return;
    }

    confirmDelete(
      await pageCookies(tabId, "get-domain-cookies"),
      {
        noneFound: "deleteDomainCookiesNoneFound",
        singleConfirmation: "deleteDomainCookiesSingleConfirmation",
        multipleConfirmation: "deleteDomainCookiesMultipleConfirmation",
        singleResult: "deleteDomainCookiesSingleResult",
        multipleResult: "deleteDomainCookiesMultipleResult",
      },
      context,
    );
  },

  "delete-path-cookies": async (context) => {
    const tabId = context.requirePage();

    if (tabId === undefined) {
      return;
    }

    confirmDelete(
      await pageCookies(tabId, "get-path-cookies"),
      {
        noneFound: "deletePathCookiesNoneFound",
        singleConfirmation: "deletePathCookiesSingleConfirmation",
        multipleConfirmation: "deletePathCookiesMultipleConfirmation",
        singleResult: "deletePathCookiesSingleResult",
        multipleResult: "deletePathCookiesMultipleResult",
      },
      context,
    );
  },

  // The only one that needs no page: session cookies are session cookies
  // whatever tab the popup was opened over, and upstream did not ask for a
  // tab here either.
  "delete-session-cookies": async (context) => {
    const allCookies = fromBrowserCookies(await browser.cookies.getAll({}));

    confirmDelete(
      allCookies.filter((cookie) => cookie.session),
      {
        noneFound: "deleteSessionCookiesNoneFound",
        singleConfirmation: "deleteSessionCookiesSingleConfirmation",
        multipleConfirmation: "deleteSessionCookiesMultipleConfirmation",
        singleResult: "deleteSessionCookiesSingleResult",
        multipleResult: "deleteSessionCookiesMultipleResult",
      },
      context,
    );
  },
};
