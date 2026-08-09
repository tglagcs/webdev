/**
 * The cookie operations behind the Cookies menu and the cookie report.
 *
 * Only the operations. The three delete-everything features are a count, a
 * confirmation dialog and a notification, all of which live in the popup, so
 * they stay in the legacy file until the popup is rewritten.
 */

/**
 * A cookie as the two UIs hold it.
 *
 * Not `browser.cookies.Cookie`: the popup renames `domain` to `host` on the
 * way in, and `expires` is whatever the user typed into the date field rather
 * than a number of seconds.
 */
export interface EditableCookie {
  host: string;
  name: string;
  path: string;
  value: string;
  expires?: string;
  secure?: boolean;
  session?: boolean;
}

/**
 * A cookie as the reports hold it.
 *
 * `host` rather than `domain`: the popup renames the field on the way in, and
 * everything downstream reads the renamed one.
 */
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

    const cookieHost = sanitizeHost(cookie.host);
    const hostMatches = host === cookieHost || host.endsWith(`.${cookieHost}`);

    return hostMatches && (path === cookie.path || cookie.path.startsWith(path));
  });

  return sort ? filtered.sort(sortCookies) : filtered;
}

/**
 * One report section per origin the page loaded, in frame order.
 *
 * The cookie report used to ask the content script, which meant it saw the top
 * document and whatever same-origin frames it could reach into -- so a page
 * whose frames are third-party (an embedded sign-in, a widget) reported only
 * the top document's cookies, while devtools listed all of them. The frame
 * URLs come from `scripting.executeScript({ allFrames: true })` instead, which
 * crosses origins and needs no permission the extension does not already have.
 *
 * Frames are collapsed by host: several frames of one origin send the same
 * cookies, and a section each would be noise.
 */
export function cookiesByFrame(
  frameURLs: (string | null | undefined)[],
  allCookies: Cookie[],
): { url: string; cookies: Cookie[] }[] {
  const seen = new Set<string>();
  const sections: { url: string; cookies: Cookie[] }[] = [];

  for (const frameURL of frameURLs) {
    if (!frameURL) {
      continue;
    }

    let host: string;

    try {
      // about:blank, data: and srcdoc frames have no host to match on.
      host = new URL(frameURL).hostname;
    } catch {
      continue;
    }

    if (!host || seen.has(host)) {
      continue;
    }

    seen.add(host);
    sections.push({ url: frameURL, cookies: filterCookies(allCookies, host, "/", true) });
  }

  return sections;
}

/**
 * Drops the leading dot of a domain cookie's host.
 *
 * `.example.com` is how a cookie says "and every subdomain"; it is not a host
 * and cannot go in a URL.
 */
export function sanitizeHost(host: string): string {
  return host && host.charAt(0) === "." ? host.substring(1) : host;
}

/** The URL a cookie belongs to, which is how the API identifies it. */
function cookieURL(host: string, path: string, secure?: boolean): string {
  return `${secure ? "https" : "http"}://${host}${path}`;
}

/** Tomorrow, as the date field of the add-cookie dialog shows it. */
export function getDateTomorrow(): string {
  const date = new Date();

  date.setDate(date.getDate() + 1);

  return date.toUTCString();
}

/**
 * Whether a cookie for a local file may be edited.
 *
 * Always false: there is no host to scope a cookie to, and the extension APIs
 * have no way to set one. Kept as a function because the report asks per
 * cookie and a future engine could differ.
 */
export function canEditLocalCookie(): boolean {
  return false;
}

export function addCookie(cookie: EditableCookie): void {
  const host = sanitizeHost(cookie.host.trim());
  const details = {
    domain: host,
    name: cookie.name.trim(),
    secure: cookie.secure,
    url: cookieURL(host, cookie.path.trim(), cookie.secure),
    value: cookie.value.trim(),
  };

  if (cookie.session) {
    void browser.cookies.set(details);

    return;
  }

  // Seconds since the epoch, from whatever the date field held.
  void browser.cookies.set({
    ...details,
    expirationDate: new Date((cookie.expires ?? "").trim()).getTime() / 1000,
  });
}

export function deleteCookie(cookie: EditableCookie): void {
  // The host is not sanitized here, and upstream did not sanitize it either --
  // so a domain cookie, whose host is ".example.com", is looked up under a URL
  // with a leading dot in the host. Left as found until it is confirmed
  // against a real cookie store; changing it is a behaviour change, not a
  // port.
  void browser.cookies.remove({
    name: cookie.name,
    url: cookieURL(cookie.host, cookie.path, cookie.secure),
  });
}
