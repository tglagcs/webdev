/**
 * Running a feature the popup owns.
 *
 * The whole of what one of the old handlers did: find the tab, refuse the
 * pages an extension cannot touch, resolve the values the feature needs,
 * inject its bundle, call one entry in it, and record the new state.
 *
 * There is exactly one injected closure here, and it is the reason the
 * registry can be data. It must reference `globalThis` and nothing else --
 * `executeScript` serialises it to source, so a module binding the bundler
 * renamed would arrive in the page as an undefined variable. See the closure
 * section of CLAUDE.md.
 */

import type { ContentSetting, Feature, PayloadSource } from "@/features/types";
import type { PlainMessageKey } from "@/lib/i18n-keys";
import { isBlocked, setBlocked } from "@/lib/content-settings";
import type { Payload } from "@/features/entries";
import { get } from "@/lib/storage/settings";
import type { AnySettingKey } from "@/lib/storage/schema";
import { getFeaturesOnTab, toggleFeatureOnTab } from "@/lib/storage/tab-state";
import { log } from "@/lib/log";
import { t } from "@/lib/i18n";

/** The pages where an extension cannot inject, and what to say about them. */
const REFUSED: {
  prefixes: string[];
  message: "internalBrowserPagesError" | "extensionGalleryError";
}[] = [
  {
    prefixes: ["chrome://", "chrome-extension://", "moz-extension://", "about:"],
    message: "internalBrowserPagesError",
  },
  {
    prefixes: [
      "https://addons.mozilla.org/",
      "https://chrome.google.com/extensions/",
      "https://chrome.google.com/webstore/",
      "https://chromewebstore.google.com/",
    ],
    message: "extensionGalleryError",
  },
];

export function refusalFor(url: string | undefined): (typeof REFUSED)[number]["message"] | null {
  if (!url) {
    return null;
  }

  return (
    REFUSED.find((entry) => entry.prefixes.some((prefix) => url.startsWith(prefix)))?.message ??
    null
  );
}

async function resolvePayload(
  sources: Record<string, PayloadSource> | undefined,
  enabled: boolean,
): Promise<Payload> {
  const payload: Payload = {};

  for (const [name, source] of Object.entries(sources ?? {})) {
    if (source.from === "value") {
      payload[name] = source.value;
    } else if (source.from === "enabled") {
      payload[name] = enabled;
    } else if (source.from === "message") {
      payload[name] = t(source.key);
    } else {
      // The stored value as it is, not coerced: Populate Form Fields wants the
      // email address, not whether one is set. Missing becomes false, which is
      // what the boolean settings mean by absent.
      payload[name] = ((await get(source.key as AnySettingKey)) as Payload[string]) ?? false;
    }
  }

  return payload;
}

/**
 * Blocks or unblocks a content type, and says which way it went.
 *
 * Nothing is injected and no tab is involved: the state belongs to the browser
 * and is read back from it, which is why this route records nothing itself.
 * The caller shows the message and marks the item.
 */
export async function runContentSetting(
  setting: ContentSetting,
): Promise<{ blocked: boolean; message: PlainMessageKey }> {
  const blocked = !(await isBlocked(setting.type));

  await setBlocked(setting.type, blocked);

  return { blocked, message: blocked ? setting.disabledMessage : setting.enabledMessage };
}

export interface Injection {
  tabId: number;
  feature: Feature;
}

/**
 * Injects the bundle, then calls the entry named after the feature.
 *
 * Two calls, as upstream: the bundle is a file so it can be a real module
 * graph, and the entry call is a closure because that is the only way to pass
 * arguments. The second is what actually runs the feature.
 */
export async function inject({ tabId, feature }: Injection): Promise<void> {
  const enabled = (await getFeaturesOnTab(tabId)).includes(feature.id);
  const payload = await resolvePayload(feature.inject!.payload, enabled);

  await browser.scripting.executeScript({
    target: { tabId },
    // WXT types this as the set of paths it built. The registry holds a
    // string, and the entries test is what proves it is one of them.
    files: [feature.inject!.bundle as never],
  });

  await browser.scripting.executeScript({
    target: { tabId },
    func: (entry: string, args: Payload) => {
      (
        globalThis as unknown as { WebDeveloper: { run(entry: string, args: Payload): void } }
      ).WebDeveloper.run(entry, args);
    },
    args: [feature.id, payload],
  });
}

/**
 * The result of a click on an injected feature.
 *
 * The state is recorded only after the injection resolves, and a failure to
 * marshal the script's return value counts as success -- the feature has
 * already run in the page by then, and treating it as a failure is what left
 * Display Handheld Styles stuck on. See the note in CLAUDE.md.
 *
 * Only a feature with an on state records anything. Make Images Full Size and
 * Reload Images inject and are finished; upstream ran those through
 * `addFeatureOnTab` rather than `toggleFeatureOnTab` for the same reason.
 */
export async function runInjected(
  feature: Feature,
  tabId: number,
  registry: Feature[] = [],
): Promise<boolean> {
  try {
    // The exclusive partner goes off first, and only when this one is coming
    // on: switching a feature off leaves the other alone.
    const partner = registry.find((candidate) => candidate.id === feature.inject?.exclusiveWith);

    if (partner && !(await getFeaturesOnTab(tabId)).includes(feature.id)) {
      if ((await getFeaturesOnTab(tabId)).includes(partner.id)) {
        await inject({ tabId, feature: partner });
        await toggleFeatureOnTab(partner.id, tabId);
      }
    }

    await inject({ tabId, feature });
  } catch (exception) {
    log("Injected script did not return a usable result.", exception);
  }

  if (!feature.stateful) {
    return false;
  }

  return (await toggleFeatureOnTab(feature.id, tabId)).includes(feature.id);
}
