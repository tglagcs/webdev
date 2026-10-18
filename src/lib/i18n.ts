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
import type { Language } from "./storage/schema";
import { getOr } from "./storage/settings";

export type { MessageKey, PlainMessageKey, SubstitutedMessageKey };
export { MESSAGE_KEYS } from "./i18n-keys";

/**
 * WXT generates one getMessage overload per key, each taking a string
 * literal, so a value typed as the union of keys matches none of them. The
 * widening is only for the call itself -- t()'s own overloads below are what
 * callers see, and they are stricter than WXT's, which make the substitution
 * optional on every message including the ones that need it.
 */
const browserMessage = browser.i18n.getMessage as (
  name: string,
  substitutions?: string | string[],
) => string;

interface Message {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

type Catalogue = Record<string, Message>;

/**
 * The catalogue the user picked in Options, and English under it for the
 * keys a translation does not have yet. Both null while the setting is
 * "auto", which leaves every lookup to the browser.
 *
 * chrome.i18n cannot be pointed at another language: it follows the
 * browser's UI language and nothing else. So a chosen language means reading
 * its messages.json ourselves and resolving it the way getMessage would.
 */
let chosen: Catalogue | null = null;
let english: Catalogue | null = null;

/** The languages there is a catalogue for, by their folder in _locales. */
export const LANGUAGES = ["en_US", "ru", "pt_BR"] as const satisfies readonly Language[];

/** Each language in its own name, which is how a language list should read. */
export const LANGUAGE_NAMES: Record<(typeof LANGUAGES)[number], string> = {
  en_US: "English",
  ru: "Русский",
  pt_BR: "Português (Brasil)",
};

/**
 * Resolves a message as chrome.i18n does: each named placeholder through its
 * positional content ("$count$" -> "$1" -> the first substitution), and "$$"
 * as a literal dollar sign.
 */
export function format(entry: Message, substitutions?: string | string[]): string {
  const values = substitutions === undefined ? [] : [substitutions].flat();
  let text = entry.message;

  for (const [name, { content }] of Object.entries(entry.placeholders ?? {})) {
    const resolved = content.replace(/\$(\d)/g, (_match, index: string) => {
      return values[Number(index) - 1] ?? "";
    });

    // A function replacement, so a "$" in the substituted value is literal.
    text = text.replace(new RegExp(`\\$${name}\\$`, "gi"), () => resolved);
  }

  return text.replaceAll("$$", "$");
}

function getMessage(name: string, substitutions?: string | string[]): string {
  const entry = chosen?.[name] ?? english?.[name];

  return entry ? format(entry, substitutions) : browserMessage(name, substitutions);
}

async function fetchCatalogue(language: string): Promise<Catalogue> {
  // WXT types getURL as the paths it built, and _locales is not among them.
  const path = `/_locales/${language}/messages.json` as Parameters<
    typeof browser.runtime.getURL
  >[0];
  const response = await fetch(browser.runtime.getURL(path));

  return (await response.json()) as Catalogue;
}

/**
 * Loads the language chosen in Options, if one was, before anything is
 * rendered. Every extension page that resolves its own strings awaits this
 * first; the legacy shim does so at its top level, which holds back every
 * module imported after it. A catalogue that fails to load leaves the
 * browser's language in place rather than a page of empty labels.
 */
export async function loadLanguage(): Promise<void> {
  const language = await getOr("language", "auto");

  chosen = null;
  english = null;

  if (!(LANGUAGES as readonly string[]).includes(language)) {
    return;
  }

  try {
    [chosen, english] = await Promise.all([
      fetchCatalogue(language),
      language === "en_US" ? Promise.resolve(null) : fetchCatalogue("en_US"),
    ]);

    document.documentElement.lang = language.replace("_", "-");
  } catch {
    chosen = null;
    english = null;
  }
}

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
