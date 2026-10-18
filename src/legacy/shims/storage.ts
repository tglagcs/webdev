/**
 * WebDeveloper.Storage, backed by the typed modules.
 *
 * The ~180 remaining call sites in src/legacy/js expect callbacks and a
 * namespace on the global, so the surface is preserved exactly. What is gone
 * is the second implementation behind it: reads and writes now go through
 * lib/storage, and per-tab state through lib/storage/tab-state, so the port
 * can proceed file by file without the two stores drifting.
 *
 * Deliberately not carried over:
 *  - storageId, which was assigned once and never read;
 *  - the tab listeners, which storage.js registered at module scope and so
 *    installed a duplicate set in the popup and the options page every time
 *    either was opened. They belong to the worker; entrypoints/background.ts
 *    owns them now.
 *
 * This file disappears with the last legacy consumer.
 */

import { WebDeveloper } from "../globals";
import { updateBadge } from "@/lib/badge";
import * as settings from "@/lib/storage/settings";
import type { AnySettingKey } from "@/lib/storage/schema";
import * as tabState from "@/lib/storage/tab-state";

type Callback<T> = (value: T) => void;

const key = (item: string | number): AnySettingKey => item.toString() as AnySettingKey;

WebDeveloper.Storage = WebDeveloper.Storage || {};

WebDeveloper.Storage.getItem = function (item: string | number, callback: Callback<unknown>): void {
  // Upstream handed back null rather than undefined for a missing key, and
  // callers test it with `if(item)`. Kept, so a ported and an unported caller
  // cannot disagree about what "unset" looks like.
  void settings.get(key(item)).then((value) => callback(value ?? null));
};

WebDeveloper.Storage.getItems = function (
  items: string[],
  callback: Callback<Record<string, unknown>>,
): void {
  void settings
    .getMany(items as AnySettingKey[])
    .then((values) => callback(values as Record<string, unknown>));
};

WebDeveloper.Storage.setItem = function (
  item: string | number,
  value: unknown,
  callback?: () => void,
): void {
  void settings.set(key(item), value as never).then(() => callback?.());
};

WebDeveloper.Storage.setItemIfNotSet = function (item: string | number, value: unknown): void {
  void settings.setIfUnset(key(item), value as never);
};

WebDeveloper.Storage.removeItem = function (item: string | number): void {
  void settings.remove(key(item));
};

WebDeveloper.Storage.getFeaturesOnTab = function (
  tabId: number,
  callback: Callback<string[]>,
): void {
  void tabState.getFeaturesOnTab(tabId).then(callback);
};

WebDeveloper.Storage.isFeatureOnTab = function (
  feature: string,
  tab: { id: number },
  callback: Callback<boolean>,
): void {
  void tabState.isFeatureOnTab(feature, tab.id).then(callback);
};

WebDeveloper.Storage.toggleFeatureOnTab = function (
  feature: string,
  tab: { id: number },
  callback?: () => void,
): void {
  void tabState
    .toggleFeatureOnTab(feature, tab.id)
    .then(() => updateBadge(tab.id))
    .then(() => callback?.());
};

WebDeveloper.Storage.updateBadgeText = function (tabId: number, callback?: () => void): void {
  void updateBadge(tabId).then(() => callback?.());
};
