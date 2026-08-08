/**
 * Typed access to the message catalogue.
 *
 * Replaces WebDeveloper.Locales, which wrapped chrome.i18n.getMessage in two
 * untyped helpers across 465 call sites. The wrapper stays -- getMessage is
 * synchronous, which a bundled TS catalogue would not be, and the popup would
 * flash untranslated while it awaited an import -- but the key is now checked.
 *
 * The overloads make a substitution required exactly where the message needs
 * one. getMessage silently leaves "$count$" in the output when you forget, so
 * the failure is a label that reads literally rather than an error.
 */

import type { MessageKey, PlainMessageKey, SubstitutedMessageKey } from "./i18n-keys";

export type { MessageKey, PlainMessageKey, SubstitutedMessageKey };
export { MESSAGE_KEYS } from "./i18n-keys";

/**
 * WXT generates one getMessage overload per key, each taking a string
 * literal, so a value typed as the union of keys matches none of them. The
 * widening is only for the call itself -- t()'s own overloads below are what
 * callers see, and they are stricter than WXT's, which make the substitution
 * optional on every message including the ones that need it.
 */
const getMessage = browser.i18n.getMessage as (
  name: string,
  substitutions?: string | string[],
) => string;

export function t(key: PlainMessageKey): string;
export function t(key: SubstitutedMessageKey, substitutions: string | string[]): string;
export function t(key: MessageKey, substitutions?: string | string[]): string {
  return getMessage(key, substitutions);
}

/**
 * For the legacy shim only. Its callers pass a computed string, so there is
 * no key to check; keeping the escape hatch named makes the unchecked call
 * sites greppable as the port shrinks them.
 */
export function tUnchecked(key: string, substitutions?: string | string[]): string {
  return getMessage(key, substitutions);
}

/**
 * True where the i18n API is reachable. Scripts injected with executeScript
 * run in an isolated world that does have it, but the injected bundles have
 * historically been handed pre-resolved strings through `args`, so anything
 * relying on the API being present there should check rather than assume.
 */
export function hasI18n(): boolean {
  return typeof browser !== "undefined" && typeof browser.i18n?.getMessage === "function";
}

/**
 * The handful of strings the generated report pages need for their own chrome.
 * Kept as a unit because it is passed across a context boundary; it collapses
 * into ordinary component-level t() calls when the reports become Svelte.
 */
export function generatedLocale(): Record<string, string> {
  return {
    collapseAll: t("collapseAll"),
    documents: t("documents"),
    expandAll: t("expandAll"),
    extensionName: t("extensionName"),
    from: t("from"),
  };
}
