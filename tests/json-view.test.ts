/**
 * The JSON viewer's model.
 *
 * What the tree shows is decided here -- which containers a depth button
 * opens, what a search expands and how far a long array has to page -- so the
 * failure worth pinning is a match the user is told about and cannot see.
 */

import { describe, expect, it } from "vitest";

import {
  copyText,
  downloadName,
  firstErrorIndex,
  formatPath,
  isJsonContentType,
  maxDepth,
  parseJson,
  pathKey,
  pathsToDepth,
  search,
  splitMatches,
  tokenize,
  type JsonValue,
} from "@/lib/json-view";

describe("parseJson", () => {
  it("parses a document", () => {
    expect(parseJson('{"a": [1, 2]}')).toEqual({ ok: true, value: { a: [1, 2] }, prefix: "" });
  });

  it("strips an anti-hijacking prefix and says which", () => {
    expect(parseJson(")]}'\n[1]")).toEqual({ ok: true, value: [1], prefix: ")]}'" });
    expect(parseJson("while(1);{}")).toEqual({ ok: true, value: {}, prefix: "while(1);" });
  });

  it("reports where a document breaks, as a line and column", () => {
    const result = parseJson('{\n  "a": 1,\n  "b": }');

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.line).toBe(3);
      expect(result.column).toBeGreaterThan(1);
    }
  });

  it("places the error on the character a parser rejects", () => {
    expect(firstErrorIndex('{"a": }')).toBe(6);
    expect(firstErrorIndex("[1, 2,]")).toBe(6);
    expect(firstErrorIndex('{"a": 1} x')).toBe(9);
    expect(firstErrorIndex('{"a": [1, {"b": "\u00e9"}]}')).toBeUndefined();
  });

  it("calls empty input invalid rather than throwing", () => {
    expect(parseJson("   ").ok).toBe(false);
  });
});

describe("formatPath", () => {
  it("dots identifiers, brackets indices and quotes everything else", () => {
    expect(formatPath([])).toBe("$");
    expect(formatPath(["items", 0, "name"])).toBe("$.items[0].name");
    expect(formatPath(["content-type", "a b", "$ok"])).toBe('$["content-type"]["a b"].$ok');
  });

  it("keeps a dotted key apart from two keys", () => {
    expect(pathKey(["a.b"])).not.toBe(pathKey(["a", "b"]));
  });
});

const DOCUMENT: JsonValue = {
  user: { name: "Ada", roles: ["admin", "editor"] },
  items: [{ id: 1 }, { id: 2 }],
  empty: {},
};

describe("depth", () => {
  it("opens the root and nothing else at level 1", () => {
    expect([...pathsToDepth(DOCUMENT, 1)]).toEqual([pathKey([])]);
  });

  it("opens two levels at level 2", () => {
    expect([...pathsToDepth(DOCUMENT, 2)].sort()).toEqual(
      [pathKey([]), pathKey(["user"]), pathKey(["items"]), pathKey(["empty"])].sort(),
    );
  });

  it("knows how deep the document goes", () => {
    expect(maxDepth(DOCUMENT)).toBe(3);
    expect(maxDepth(42)).toBe(0);
  });
});

describe("search", () => {
  it("finds keys and values, ignoring case, in document order", () => {
    const result = search(DOCUMENT, "ADMIN");

    expect(result.matches).toEqual([["user", "roles", 0]]);
    expect([...result.open].sort()).toEqual(
      [pathKey([]), pathKey(["user"]), pathKey(["user", "roles"])].sort(),
    );
  });

  it("matches a container by its key", () => {
    expect(search(DOCUMENT, "roles").matches).toEqual([["user", "roles"]]);
  });

  it("finds numbers by their text", () => {
    expect(search(DOCUMENT, "2").matches).toEqual([["items", 1, "id"]]);
  });

  // The reason limits exist: the tree pages long arrays, and a match at index
  // 450 would otherwise be counted and highlighted behind "show more".
  it("asks a long array to show far enough to reach its match", () => {
    const long = Array.from({ length: 500 }, (_value, index) => (index === 450 ? "needle" : index));

    expect(search(long, "needle").limits.get(pathKey([]))).toBe(451);
  });

  it("finds nothing for an empty query", () => {
    expect(search(DOCUMENT, "").matches).toEqual([]);
  });
});

describe("text", () => {
  it("copies a string bare and anything else as JSON", () => {
    expect(copyText("hello")).toBe("hello");
    expect(copyText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("splits around every match", () => {
    expect(splitMatches("Ada and ADA", "ada")).toEqual([
      { text: "Ada", match: true },
      { text: " and ", match: false },
      { text: "ADA", match: true },
    ]);
  });

  it("tells keys from string values when colouring", () => {
    const kinds = tokenize('{\n  "a": "b",\n  "n": -1.5e3,\n  "t": null\n}')
      .filter((token) => token.kind && token.kind !== "punctuation")
      .map((token) => `${token.kind}:${token.text}`);

    expect(kinds).toEqual([
      'key:"a"',
      'string:"b"',
      'key:"n"',
      "number:-1.5e3",
      'key:"t"',
      "literal:null",
    ]);
  });

  it("loses no characters when colouring", () => {
    const text = JSON.stringify({ a: [1, 'x\\"y', true] }, null, 2);

    expect(
      tokenize(text)
        .map((token) => token.text)
        .join(""),
    ).toBe(text);
  });
});

describe("files and types", () => {
  it("names the download after the address", () => {
    expect(downloadName("https://api.test/v1/users?page=2")).toBe("users.json");
    expect(downloadName("https://api.test/data.json")).toBe("data.json");
    expect(downloadName("https://api.test/")).toBe("data.json");
    expect(downloadName(undefined)).toBe("data.json");
  });

  it("recognises JSON content types, +json included", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType("application/problem+json")).toBe(true);
    expect(isJsonContentType("text/json")).toBe(true);
    expect(isJsonContentType("text/html")).toBe(false);
    expect(isJsonContentType("application/jsonp")).toBe(false);
  });
});
