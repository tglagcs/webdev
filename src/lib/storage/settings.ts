/**
 * Promise-based, typed access to chrome.storage.local.
 *
 * Replaces WebDeveloper.Storage's callback helpers. The legacy shim in
 * src/legacy/shims/storage.ts still exposes the old callback names to the
 * ~180 call sites that have not been ported, but they all end up here, so
 * there is one implementation of "read a setting" rather than two.
 */

import type { AnySettingKey, NumberedSettings, RemovedSettingKey, Settings } from "./schema";

export type Store = Settings & NumberedSettings;

/**
 * The storage API, taken at its raw string-keyed shape.
 *
 * WXT types storage.local generically and infers the item type from the
 * calls it can see, which cannot express a pattern index signature like
 * `tool_${number}_url` -- every numbered key is rejected. The schema in
 * schema.ts is the authority on what lives in this store, so the type is
 * asserted once here and the generics below carry it, rather than casting at
 * each of the call sites.
 */
const local = browser.storage.local as unknown as {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

export async function get<K extends AnySettingKey>(key: K): Promise<Store[K] | undefined> {
  const items = await local.get(key);

  return items[key] as Store[K] | undefined;
}

/** Reads a key, falling back when it has never been set. */
export async function getOr<K extends AnySettingKey>(
  key: K,
  fallback: Store[K],
): Promise<Store[K]> {
  return (await get(key)) ?? fallback;
}

export async function getMany<K extends AnySettingKey>(
  keys: readonly K[],
): Promise<Partial<Pick<Store, K>>> {
  return (await local.get([...keys])) as Partial<Pick<Store, K>>;
}

export async function set<K extends AnySettingKey>(key: K, value: Store[K]): Promise<void> {
  await local.set({ [key]: value });
}

export async function setMany(values: Partial<Store>): Promise<void> {
  await local.set(values as Record<string, unknown>);
}

/** Accepts removed keys too, so migrations can delete what the schema no longer names. */
export async function remove(
  keys: AnySettingKey | RemovedSettingKey | readonly (AnySettingKey | RemovedSettingKey)[],
): Promise<void> {
  await local.remove(typeof keys === "string" ? keys : [...keys]);
}

/**
 * Writes only if the key has never been set, so a user who cleared a field
 * back to empty does not get the default handed back on the next update.
 * Matches upstream's setItemIfNotSet, including its treatment of "" and 0 as
 * unset -- changing that would resurrect defaults the user deliberately
 * removed, which is worse than the inconsistency.
 */
export async function setIfUnset<K extends AnySettingKey>(key: K, value: Store[K]): Promise<void> {
  const existing = await get(key);

  if (!existing) {
    await set(key, value);
  }
}
