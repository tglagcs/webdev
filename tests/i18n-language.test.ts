/**
 * The language chosen in Options, in place of the browser's.
 *
 * chrome.i18n cannot be told which language to use, so lib/i18n reads the
 * chosen catalogue itself. What is worth pinning is that it resolves a
 * message exactly as getMessage would -- a placeholder lost here is a label
 * reading "$count$" in Russian only -- and that a missing key or a failed
 * load falls back rather than going blank.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { LANGUAGES, format, loadLanguage, t } from "@/lib/i18n";
import * as settings from "@/lib/storage/settings";

const catalogue = (language: string) =>
  JSON.parse(
    readFileSync(resolve(`src/public/_locales/${language}/messages.json`), "utf-8"),
  ) as Record<string, { message: string; placeholders?: Record<string, { content: string }> }>;

describe("format", () => {
  it("resolves named placeholders through their positions", () => {
    const entry = {
      message: "Line $line$, column $column$",
      placeholders: { line: { content: "$1" }, column: { content: "$2" } },
    };

    expect(format(entry, ["3", "14"])).toBe("Line 3, column 14");
  });

  it("matches placeholder names without regard to case, as chrome.i18n does", () => {
    expect(format({ message: "$Count$!", placeholders: { count: { content: "$1" } } }, "5")).toBe(
      "5!",
    );
  });

  it("keeps a dollar sign in a substituted value literal", () => {
    expect(format({ message: "$v$", placeholders: { v: { content: "$1" } } }, "$1 $$")).toBe(
      "$1 $",
    );
  });

  it('turns "$$" into a dollar sign', () => {
    expect(format({ message: "costs $$5" })).toBe("costs $5");
  });
});

describe("loadLanguage", () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const language = /_locales\/([^/]+)\//.exec(url)![1]!;

        return { json: async () => catalogue(language) };
      }),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await settings.remove("language");
    await loadLanguage();
  });

  it("follows the browser while the setting is unset", async () => {
    await loadLanguage();

    expect(t("cancel")).toBe("Cancel");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the chosen catalogue, placeholders included", async () => {
    await settings.set("language", "ru");
    await loadLanguage();

    expect(t("cancel")).toBe("Отмена");
    expect(t("jsonErrorAt", ["3", "14"])).toBe("Строка 3, столбец 14");
    expect(document.documentElement.lang).toBe("ru");
  });

  it("falls back to English for a key the translation lacks", async () => {
    await settings.set("language", "pt_BR");
    await loadLanguage();

    const portuguese = catalogue("pt_BR");
    const missing = Object.keys(catalogue("en_US")).find((key) => !(key in portuguese))!;

    expect(missing).toBeDefined();
    expect(t(missing as "cancel")).toBe(catalogue("en_US")[missing]!.message);
  });

  it("stays on the browser's language when the catalogue cannot load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await settings.set("language", "ru");
    await loadLanguage();

    expect(t("cancel")).toBe("Cancel");
  });
});

describe("the Russian catalogue", () => {
  const english = catalogue("en_US");
  const russian = catalogue("ru");

  // Not "translates every key": a key added in English shows in English until
  // it is translated, which check-locales.py allows and loadLanguage handles.
  it("keeps every placeholder the English message uses", () => {
    const translated = Object.entries(english).filter(([key]) => key in russian);
    const lost = translated.flatMap(([key, entry]) =>
      Object.keys(entry.placeholders ?? {})
        .filter((name) => !russian[key]?.message.toLowerCase().includes(`$${name.toLowerCase()}$`))
        .map((name) => `${key}: $${name}$`),
    );

    expect(lost).toEqual([]);
  });

  it("is a language Options offers", () => {
    expect(LANGUAGES).toContain("ru");
  });
});
