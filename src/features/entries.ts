/**
 * The one entry point an injected bundle exposes to the popup.
 *
 * `chrome.scripting.executeScript({ func })` serialises the function to source
 * and runs it in the page, so the popup cannot pass it a closure -- only
 * JSON. Upstream answered that with one hand-written closure per feature, 119
 * of them, each naming a function and spelling out its arguments. That is
 * where the bug in CLAUDE.md's first section came from, and it is why the
 * popup could not be generated from data.
 *
 * So each bundle registers a table of entries here instead, every one taking a
 * single serialisable payload and resolving the documents itself. The popup
 * then has exactly one injected closure, in `run-feature.ts`, and the registry
 * says which entry to call with what.
 */

import { getContentDocument } from "@/lib/dom/documents";

/** Whatever the registry declared for the feature, already resolved. */
export type Payload = Record<string, string | number | boolean>;

export type Entry = (payload: Payload, documents: Document[]) => void;

/**
 * The registered entries, keyed by name.
 *
 * On `globalThis` rather than a module binding, for the same reason every
 * injected closure spells `globalThis.WebDeveloper`: the popup's copy of this
 * module and the page's copy are different objects, and it is the page's that
 * has to be reachable from serialised source.
 */
function table(): Record<string, Entry> {
  const namespace = globalThis as unknown as { __WD_ENTRIES__?: Record<string, Entry> };

  namespace.__WD_ENTRIES__ = namespace.__WD_ENTRIES__ ?? {};

  return namespace.__WD_ENTRIES__;
}

export function register(entries: Record<string, Entry>): void {
  Object.assign(table(), entries);
}

/**
 * Runs one entry against the page.
 *
 * The documents are resolved here rather than passed in, because a Document is
 * not serialisable -- which is the whole reason this indirection exists.
 *
 * Just the top document, as every one of upstream's 119 closures passed:
 * `executeScript` without `allFrames` runs in the top frame only, and the
 * features that reach into same-origin frames do it themselves, from the page.
 * Handing `getDocuments()` in here instead would quietly widen every feature
 * that does not.
 */
export function run(entry: string, payload: Payload): void {
  const found = table()[entry];

  if (!found) {
    console.warn(`WEBDEV LOG: no entry ${entry} in this bundle`);

    return;
  }

  found(payload, [getContentDocument()]);
}
