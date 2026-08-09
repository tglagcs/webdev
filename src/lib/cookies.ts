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
