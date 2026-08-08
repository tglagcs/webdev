/**
 * Cookie filtering for the three cookie reports.
 *
 * The cookies arrive from the popup, which has already renamed chrome's
 * `domain` field to `host` -- everything here reads `host`, and a cookie
 * without one is skipped rather than matched.
 */

import { getContentWindow } from "@/lib/dom/documents";
import { getDocuments, perDocument, type Report } from "./report";

export interface Cookie {
  host?: string;
  name?: string;
  path?: string;
  value?: string;
  [key: string]: unknown;
}

/** By host, then by name. */
export function sortCookies(one: Cookie, two: Cookie): number {
  if (one.host === two.host && one.name === two.name) {
    return 0;
  }

  const earlier = one.host! < two.host! || (one.host === two.host && one.name! < two.name!);

  return earlier ? -1 : 1;
}

/**
 * The cookies a document would send.
 *
 * Host matching accepts an exact match or a parent domain, which is why a
 * leading dot is stripped first: ".example.com" and "example.com" mean the
 * same thing in a cookie jar. Path matching is a prefix test on the *cookie's*
 * path, so a cookie scoped to /deep is returned when filtering on /.
 */
export function filterCookies(
  allCookies: Cookie[] | null,
  host: string | null,
  path: string,
  sort: boolean,
): Cookie[] {
  if (!allCookies || !host) {
    return [];
  }

  const filtered = allCookies.filter((cookie) => {
    if (!cookie.host || !cookie.path) {
      return false;
    }

    const cookieHost = cookie.host.startsWith(".") ? cookie.host.substring(1) : cookie.host;
    const hostMatches = host === cookieHost || host.endsWith(`.${cookieHost}`);

    return hostMatches && (path === cookie.path || cookie.path.startsWith(path));
  });

  return sort ? filtered.sort(sortCookies) : filtered;
}

export function getCookies(allCookies: Cookie[]): Report<{ url: string; cookies: Cookie[] }> {
  return perDocument((contentDocument) => {
    let host: string | null = null;

    try {
      host = contentDocument.location.hostname;
    } catch {
      // Cross-origin document; no host to filter on.
    }

    return { cookies: filterCookies(allCookies, host, "/", true) };
  });
}

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
