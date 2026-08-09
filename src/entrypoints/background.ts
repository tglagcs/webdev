/**
 * The service worker.
 *
 * Every listener here is registered synchronously at the top level. Under MV3
 * the worker is torn down when idle and restarted by the event it needs to
 * handle, so a listener added from inside a callback -- even one awaiting
 * something as quick as a storage read -- is not there yet when that event
 * arrives, and the event is dropped. Upstream satisfied this by accident,
 * because its registrations were the last statements of a concatenated
 * script; here it is deliberate.
 */

import { setBadgeColour, updateActionIcon, updateBadge } from "@/lib/badge";
import { resetAllowedContentSettings } from "@/lib/content-settings";
import { handleBackgroundMessages } from "@/lib/messaging";
import { seedDefaults } from "@/lib/storage/defaults";
import { runMigrations } from "@/lib/storage/migrations";
import * as settings from "@/lib/storage/settings";
import { getOr } from "@/lib/storage/settings";
import {
  clearTab,
  getFeaturesOnTab,
  pruneClosedTabs,
  setFeaturesOnTab,
} from "@/lib/storage/tab-state";

/**
 * Announced by the API rather than assumed, because the widget that captures
 * the screen throttles itself against it. The fallback only applies where the
 * constant is missing.
 */
const maximumPerSecond = browser.tabs.MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND ?? 1000;

async function fetchUrl(
  url: string,
  errorMessage: string,
): Promise<{ url: string; content: string }> {
  try {
    const response = await fetch(url);

    return { url, content: response.ok ? await response.text() : errorMessage };
  } catch {
    // Upstream had no catch here, so a network-level failure -- an offline
    // machine, a blocked request -- rejected the promise and left the whole
    // Promise.all unresolved, so the report never rendered at all.
    return { url, content: errorMessage };
  }
}

handleBackgroundMessages({
  "get-storage-item": async ({ item }) => ({ value: (await settings.get(item)) ?? null }),

  "set-storage-item": async ({ item, value }) => {
    await settings.set(item, value as never);

    return {};
  },

  "get-url-contents": async ({ urls, errorMessage }) =>
    Promise.all(urls.map((url) => fetchUrl(url, errorMessage))),

  "feature-closed": async ({ features }, sender) => {
    const tabId = sender.tab?.id;

    if (tabId !== undefined) {
      const remaining = (await getFeaturesOnTab(tabId)).filter(
        (feature) => !features.includes(feature),
      );

      await setFeaturesOnTab(tabId, remaining);
      await updateBadge(tabId);
    }

    return {};
  },

  "get-visible-tab": async () => ({
    dataUrl: await browser.tabs.captureVisibleTab(),
    maximumPerSecond,
  }),
});

/**
 * Where the last standalone popup window went, so a second click focuses it
 * rather than opening another. Session-scoped, like the window itself.
 */
const POPUP_WINDOW = "popup-window";

/**
 * Points the toolbar button at either the popup or the onClicked handler.
 *
 * A popup is dismissed by the browser as soon as focus leaves it, and there
 * is no API to prevent that. The only way to have the UI stay put while the
 * user works on the page is not to use a popup: clearing default_popup makes
 * action.onClicked fire instead, and that opens the same page as a window.
 */
async function applyPopupMode(): Promise<void> {
  const inWindow = await getOr("popup_in_window", false);

  await browser.action.setPopup({ popup: inWindow ? "" : "/popup.html" });
}

async function openPopupWindow(): Promise<void> {
  const stored = await browser.storage.session.get(POPUP_WINDOW);
  const existing = stored[POPUP_WINDOW] as number | undefined;

  if (existing !== undefined) {
    try {
      await browser.windows.update(existing, { focused: true });

      return;
    } catch {
      // Closed since; fall through and open a new one.
    }
  }

  const created = await browser.windows.create({
    url: browser.runtime.getURL("/popup.html"),
    type: "popup",
    width: 840,
    height: 660,
  });

  await browser.storage.session.set({ [POPUP_WINDOW]: created?.id });
}

// Only ever fires while the setting is on, because default_popup is set
// otherwise and a popup suppresses onClicked.
browser.action.onClicked.addListener(() => {
  void openPopupWindow();
});

// So the setting takes effect when the user changes it, not at the next
// browser start.
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "popup_in_window" in changes) {
    void applyPopupMode();
  }
});

/**
 * Features live on the rendered document, so a navigation drops all of them.
 * The guard matches upstream: an update with no status, or status "loading",
 * is a navigation; updates carrying only a title or favicon change are not.
 */
function isNavigation(info: { status?: string }): boolean {
  return !info.status || info.status === "loading";
}

browser.tabs.onActivated.addListener(({ tabId }) => {
  void updateBadge(tabId);
});

browser.tabs.onRemoved.addListener((tabId) => {
  void clearTab(tabId);
});

browser.tabs.onUpdated.addListener((tabId, info) => {
  if (isNavigation(info)) {
    void clearTab(tabId).then(() => updateBadge(tabId));
  }
});

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install" && details.reason !== "update") {
    return;
  }

  void (async () => {
    await resetAllowedContentSettings();
    await runMigrations();
    await seedDefaults();
    await settings.set("version", browser.runtime.getManifest().version);
    await updateActionIcon();
  })();
});

/**
 * Also load-bearing for the badge: subscribing to onStartup is what makes the
 * browser wake the worker at launch, and so what makes main() below run and
 * restore the badge colour, which does not survive a restart.
 */
browser.runtime.onStartup.addListener(() => {
  void pruneClosedTabs();
});

export default defineBackground(() => {
  // Neither of these survives a browser restart, and the badge colour does
  // not survive a worker restart either, so they run on every worker wake
  // rather than only on install.
  //
  // In main() rather than at module scope because WXT imports this file
  // during `wxt prepare` to read the entrypoint's options, against a fake
  // browser that implements listeners but not setIcon. Listeners still have
  // to be registered above, at the top level, or the worker misses the event
  // that woke it.
  void setBadgeColour();
  void updateActionIcon();
  void applyPopupMode();
});
