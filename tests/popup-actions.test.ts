/**
 * The features the popup carries out itself.
 *
 * Two of them destroy something the user cannot get back -- the cache and the
 * whole history -- and both are meant to ask first. That is the property worth
 * pinning: a confirmation that stopped being awaited would still look right in
 * the menu and would clear the history on the first click.
 *
 * The other two edit the history entry by entry, and which way round they go
 * is invisible from the outside: marking links unvisited when the user asked
 * for visited leaves the page looking untouched.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { POPUP_ACTIONS, type ActionContext } from "@/entrypoints/popup/actions";
import { t } from "@/lib/i18n";

const history = { addUrl: vi.fn(), deleteAll: vi.fn(), deleteUrl: vi.fn() };
const browsingData = { removeCache: vi.fn() };
const cookies = { getAll: vi.fn(), remove: vi.fn() };

/** As chrome hands them over: `domain` and `expirationDate`, not our names. */
function storedCookie(name: string, overrides: Record<string, unknown> = {}) {
  return {
    domain: "example.com",
    expirationDate: 1_800_000_000,
    httpOnly: false,
    name,
    path: "/",
    secure: false,
    session: false,
    value: "v",
    ...overrides,
  };
}

/** Records what an action asked for, and answers as the popup would. */
function context(overrides: Partial<ActionContext> = {}) {
  const asked: { message: string; run: () => void }[] = [];
  const notified: string[] = [];

  const base: ActionContext = {
    requirePage: () => 7,
    pageTab: () => ({ id: 7, index: 2, windowId: 1 }),
    openDialog: () => {},
    notify: (message) => notified.push(message),
    confirm: (message, _buttonText, _buttonIcon, run) => asked.push({ message, run }),
    ...overrides,
  };

  return { ...base, asked, notified };
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.clearAllMocks();

  history.addUrl.mockResolvedValue(undefined);
  history.deleteAll.mockResolvedValue(undefined);
  history.deleteUrl.mockResolvedValue(undefined);
  browsingData.removeCache.mockResolvedValue(undefined);
  cookies.getAll.mockResolvedValue([]);
  cookies.remove.mockResolvedValue(undefined);

  Object.assign(fakeBrowser, { browsingData, cookies, history });
});

describe("clearing", () => {
  it("asks before clearing the cache, and clears only when told to", async () => {
    const ui = context();

    await POPUP_ACTIONS["clear-cache"]!(ui);

    expect(ui.asked).toHaveLength(1);
    expect(browsingData.removeCache).not.toHaveBeenCalled();

    ui.asked[0]!.run();

    expect(browsingData.removeCache).toHaveBeenCalledWith({ since: 0 });
  });

  it("asks before clearing the history, and clears only when told to", async () => {
    const ui = context();

    await POPUP_ACTIONS["clear-history"]!(ui);

    expect(ui.asked).toHaveLength(1);
    expect(history.deleteAll).not.toHaveBeenCalled();

    ui.asked[0]!.run();

    expect(history.deleteAll).toHaveBeenCalled();
  });
});

describe("deleting cookies", () => {
  // Nothing to delete is a notification, not a dialog offering to delete none.
  it("says so when the page has no cookies", async () => {
    vi.spyOn(fakeBrowser.tabs, "sendMessage").mockResolvedValue([]);

    const ui = context();

    await POPUP_ACTIONS["delete-domain-cookies"]!(ui);

    expect(ui.asked).toEqual([]);
    expect(ui.notified).toHaveLength(1);
    expect(cookies.remove).not.toHaveBeenCalled();
  });

  it("asks first, then deletes every one it counted", async () => {
    vi.spyOn(fakeBrowser.tabs, "sendMessage").mockResolvedValue([
      { host: "example.com", name: "a", path: "/" },
      { host: "example.com", name: "b", path: "/deep", secure: true },
    ]);

    const ui = context();

    await POPUP_ACTIONS["delete-path-cookies"]!(ui);

    expect(ui.asked).toHaveLength(1);
    expect(cookies.remove).not.toHaveBeenCalled();

    ui.asked[0]!.run();

    // The URL is how the API names a cookie, and the scheme comes from the
    // secure flag rather than from the page.
    expect(cookies.remove.mock.calls.map(([argument]) => argument)).toEqual([
      { name: "a", url: "http://example.com/" },
      { name: "b", url: "https://example.com/deep" },
    ]);
  });

  // Singular and plural are separate messages, and crossing them is invisible
  // in review: both read fine, just at the wrong count.
  it("asks in the singular for one cookie and the plural for more", async () => {
    const send = vi.spyOn(fakeBrowser.tabs, "sendMessage");
    const one = context();
    const two = context();

    send.mockResolvedValue([{ host: "example.com", name: "a", path: "/" }]);
    await POPUP_ACTIONS["delete-domain-cookies"]!(one);

    send.mockResolvedValue([
      { host: "example.com", name: "a", path: "/" },
      { host: "example.com", name: "b", path: "/" },
    ]);
    await POPUP_ACTIONS["delete-domain-cookies"]!(two);

    expect(one.asked[0]!.message).toBe(t("deleteDomainCookiesSingleConfirmation"));
    expect(two.asked[0]!.message).toBe(t("deleteDomainCookiesMultipleConfirmation", "2"));
    expect(two.asked[0]!.message).toContain("2");
  });

  // The whole store, filtered here rather than by the page: a session cookie
  // is one wherever it came from, and upstream asked for no tab at all.
  it("takes session cookies from the store without asking the page", async () => {
    cookies.getAll.mockResolvedValue([
      storedCookie("kept"),
      storedCookie("gone", { session: true }),
    ]);

    const sendMessage = vi.spyOn(fakeBrowser.tabs, "sendMessage");
    const ui = context({
      requirePage: () => {
        throw new Error("should not ask for the page");
      },
    });

    await POPUP_ACTIONS["delete-session-cookies"]!(ui);
    ui.asked[0]!.run();

    expect(sendMessage).not.toHaveBeenCalled();
    expect(cookies.remove).toHaveBeenCalledTimes(1);
    expect(cookies.remove).toHaveBeenCalledWith({ name: "gone", url: "http://example.com/" });
  });
});

describe("marking links", () => {
  const links = {
    documents: [
      { url: "https://example.com/", links: ["https://example.com/a", "https://example.com/b"] },
      { url: "https://example.com/frame", links: ["https://example.com/c"] },
    ],
  };

  beforeEach(() => {
    vi.spyOn(fakeBrowser.tabs, "sendMessage").mockResolvedValue(links);
  });

  // Every frame, not just the top document: the extractor returns one entry per
  // document and upstream walked all of them.
  it("adds every link in every document to the history", async () => {
    const ui = context();

    await POPUP_ACTIONS["mark-all-links-visited"]!(ui);

    expect(history.addUrl.mock.calls.map(([argument]) => argument)).toEqual([
      { url: "https://example.com/a" },
      { url: "https://example.com/b" },
      { url: "https://example.com/c" },
    ]);
    expect(history.deleteUrl).not.toHaveBeenCalled();
  });

  it("removes them again for the opposite feature", async () => {
    const ui = context();

    await POPUP_ACTIONS["mark-all-links-unvisited"]!(ui);

    expect(history.deleteUrl).toHaveBeenCalledTimes(3);
    expect(history.addUrl).not.toHaveBeenCalled();
  });

  // The page it cannot touch is refused by the popup, and the action stops --
  // rather than sending a message to a tab with no content script in it, which
  // rejects with an error the user never sees.
  it("does nothing where the page is refused", async () => {
    const ui = context({ requirePage: () => undefined });

    await POPUP_ACTIONS["mark-all-links-visited"]!(ui);

    expect(fakeBrowser.tabs.sendMessage).not.toHaveBeenCalled();
    expect(history.addUrl).not.toHaveBeenCalled();
  });
});
