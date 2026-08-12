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

const history = { addUrl: vi.fn(), deleteAll: vi.fn(), deleteUrl: vi.fn() };
const browsingData = { removeCache: vi.fn() };

/** Records what an action asked for, and answers as the popup would. */
function context(overrides: Partial<ActionContext> = {}) {
  const asked: { message: string; run: () => void }[] = [];
  const notified: string[] = [];

  const base: ActionContext = {
    requirePage: () => 7,
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

  Object.assign(fakeBrowser, { browsingData, history });
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
