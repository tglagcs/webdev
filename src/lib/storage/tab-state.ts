/**
 * Which features are currently applied to which tab.
 *
 * Upstream kept this in chrome.storage.local, under the numeric tab id, as a
 * comma-separated string (common/js/common/storage.js). Two problems came
 * with that. Tab ids are only meaningful for the life of the browser session,
 * so every entry that outlived its tab -- anything the onRemoved listener
 * missed, which includes every tab open at shutdown -- stayed on disk forever
 * as a key that would later collide with an unrelated tab. And the numeric
 * keys shared a namespace with the settings.
 *
 * storage.session fixes both: it is cleared when the browser closes, which is
 * exactly the lifetime of a tab id, and it is a separate namespace. It is
 * also not readable from content scripts by default, which is correct here --
 * only the popup and the worker have any business writing this.
 */

const PREFIX = "tab:";

const key = (tabId: number): string => `${PREFIX}${tabId}`;

export async function getFeaturesOnTab(tabId: number): Promise<string[]> {
  const items = await browser.storage.session.get(key(tabId));

  return (items[key(tabId)] as string[] | undefined) ?? [];
}

export async function isFeatureOnTab(feature: string, tabId: number): Promise<boolean> {
  return (await getFeaturesOnTab(tabId)).includes(feature);
}

/** Adds or removes the feature, and returns the resulting list. */
export async function toggleFeatureOnTab(feature: string, tabId: number): Promise<string[]> {
  const current = await getFeaturesOnTab(tabId);
  const next = current.includes(feature)
    ? current.filter((name) => name !== feature)
    : [...current, feature];

  await setFeaturesOnTab(tabId, next);

  return next;
}

export async function setFeaturesOnTab(tabId: number, features: string[]): Promise<void> {
  if (features.length === 0) {
    await clearTab(tabId);

    return;
  }

  await browser.storage.session.set({ [key(tabId)]: features });
}

export async function clearTab(tabId: number): Promise<void> {
  await browser.storage.session.remove(key(tabId));
}

/**
 * Drops entries for tabs that no longer exist. storage.session already dies
 * with the browser, so this only cleans up within a session -- a tab closed
 * while the worker was asleep, which onRemoved never saw.
 */
export async function pruneClosedTabs(): Promise<void> {
  const [stored, tabs] = await Promise.all([
    browser.storage.session.get(null),
    browser.tabs.query({}),
  ]);

  const live = new Set(tabs.map((tab) => tab.id));
  const stale = Object.keys(stored).filter(
    (name) => name.startsWith(PREFIX) && !live.has(Number(name.slice(PREFIX.length))),
  );

  if (stale.length > 0) {
    await browser.storage.session.remove(stale);
  }
}
