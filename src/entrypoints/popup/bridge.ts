/**
 * The seam between the Svelte popup and the handlers that still run the
 * features.
 *
 * Every handler was written as a click listener on its own menu item: it reads
 * `this` for the feature id and hands that element to `toggleFeatureOnTab`,
 * which flips an `active` class on it. There is no such element any more --
 * Svelte owns the state -- so this passes an object with the two things the
 * handlers actually use, `getAttribute("id")` and a `classList`, and routes
 * the class changes into Svelte.
 *
 * That is the whole coupling. It is deliberately small, because it is what
 * each menu drops when its handlers are ported.
 */

import type { Feature } from "@/features/types";

type Overlay = Record<string, unknown>;

/** Resolves "WebDeveloper.Overlay.CSS.disableAllStyles" against the page. */
function resolveHandler(path: string): ((...args: unknown[]) => void) | undefined {
  const parts = path.split(".");
  let current: unknown = globalThis;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    current = (current as Overlay)[part];
  }

  return typeof current === "function" ? (current as (...args: unknown[]) => void) : undefined;
}

export interface FeatureState {
  isActive(id: string): boolean;
  setActive(id: string, active: boolean): void;
}

/**
 * Enough of an element for the legacy handlers.
 *
 * `classList.toggle` is the one that matters: it is called from the callback
 * that runs after the injection succeeded, which is what makes the menu agree
 * with the page.
 */
function featureItem(id: string, state: FeatureState): unknown {
  return {
    getAttribute: (name: string) => (name === "id" ? id : null),
    classList: {
      contains: (className: string) => className === "active" && state.isActive(id),
      add: (className: string) => className === "active" && state.setActive(id, true),
      remove: (className: string) => className === "active" && state.setActive(id, false),
      toggle: (className: string) => {
        if (className === "active") {
          state.setActive(id, !state.isActive(id));
        }
      },
    },
  };
}

/**
 * Runs a feature.
 *
 * A missing handler is reported rather than ignored: it means the registry and
 * the legacy namespace have drifted, which is invisible otherwise -- the item
 * just does nothing when clicked.
 */
export function runFeature(feature: Feature, state: FeatureState): void {
  const handler = feature.handler ? resolveHandler(feature.handler) : undefined;

  if (!handler) {
    console.warn(`WEBDEV LOG: no handler ${feature.handler ?? "?"} for ${feature.id}`);

    return;
  }

  handler.call(featureItem(feature.id, state));
}
