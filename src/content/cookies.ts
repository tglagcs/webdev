/**
 * Cookie filtering for the two delete features.
 *
 * The cookies arrive from the popup, which has already renamed chrome's
 * `domain` field to `host` -- everything here reads `host`, and a cookie
 * without one is skipped rather than matched.
 *
 * The cookie *report* no longer comes through here: it needs the frames this
 * document cannot reach into, so the popup assembles it from
 * `scripting.executeScript({ allFrames: true })`. See `cookiesByFrame`.
 */

import { getContentWindow } from "@/lib/dom/documents";
import { filterCookies, type Cookie } from "@/lib/cookies";
import { getDocuments } from "./report";

export type { Cookie };

/** Flat across documents, unsorted -- the caller renders it as one list. */
function acrossDocuments(
  allCookies: Cookie[],
  path: (contentDocument: Document) => string,
): Cookie[] {
  return getDocuments(getContentWindow()).flatMap((contentDocument) => {
    try {
      return filterCookies(
        allCookies,
        contentDocument.location.hostname,
        path(contentDocument),
        false,
      );
    } catch {
      return [];
    }
  });
}

export function getDomainCookies(allCookies: Cookie[]): Cookie[] {
  return acrossDocuments(allCookies, () => "/");
}

export function getPathCookies(allCookies: Cookie[]): Cookie[] {
  return acrossDocuments(allCookies, (contentDocument) => contentDocument.location.pathname);
}
