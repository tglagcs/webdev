/**
 * The JSON viewer's model: parsing, paths, depth, search and tokens.
 *
 * Kept free of the DOM and of Svelte so the parts that decide what the tree
 * shows are under test on their own. The components only render what these
 * return.
 */

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** One step into a value: an object key or an array index. */
export type Segment = string | number;

export type ParseResult =
  | { ok: true; value: JsonValue; prefix: string }
  | { ok: false; message: string; line?: number; column?: number };

/**
 * Anti-hijacking prefixes some APIs put before their JSON, so a `<script src>`
 * pointing at the response throws instead of evaluating it. Google's `)]}'`
 * is the common one. They are stripped before parsing and reported, rather
 * than making a perfectly good response read as invalid.
 */
const XSSI_PREFIXES = [")]}',", ")]}'", "while(1);", "for(;;);", "{}&&"];

/** How many children a container shows before it asks to show more. */
export const PAGE_SIZE = 200;

export function parseJson(text: string): ParseResult {
  const leading = text.length - text.trimStart().length;
  const trimmed = text.slice(leading);
  const prefix = XSSI_PREFIXES.find((candidate) => trimmed.startsWith(candidate)) ?? "";
  const offset = leading + prefix.length;
  const body = text.slice(offset);

  try {
    return { ok: true, value: JSON.parse(body) as JsonValue, prefix };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { ok: false, message, ...errorLocation(text, body, offset, message) };
  }
}

/**
 * Where a parse failed, as a line and column in the original text.
 *
 * Engines word it differently and not always with a place: SpiderMonkey says
 * "at line 1 column 13", V8 used to say "at position 12" and now often quotes
 * the input instead. So the message is read when it has a place, and the body
 * is scanned for the first bad character when it does not.
 */
function errorLocation(
  text: string,
  body: string,
  offset: number,
  message: string,
): { line?: number; column?: number } {
  const lineColumn = /line (\d+) column (\d+)/.exec(message);

  if (lineColumn) {
    // Counted within the body, so the lines before it are added back.
    const skipped = text.slice(0, offset).split("\n").length - 1;

    return { line: Number(lineColumn[1]) + skipped, column: Number(lineColumn[2]) };
  }

  const position = /position (\d+)/.exec(message);
  const index = position ? Number(position[1]) : firstErrorIndex(body);

  if (index === undefined) {
    return {};
  }

  const before = text.slice(0, Math.min(offset + index, text.length)).split("\n");

  return { line: before.length, column: before.at(-1)!.length + 1 };
}

/**
 * The index of the first character a JSON parser would reject, or undefined
 * if the text is valid. Only used to place an error the engine did not place,
 * so it validates and does not build anything.
 */
export function firstErrorIndex(text: string): number | undefined {
  let index = 0;

  class Stop {
    constructor(readonly at: number) {}
  }

  const fail = (): never => {
    throw new Stop(index);
  };

  const space = (): void => {
    while (" \t\n\r".includes(text[index] ?? "x")) {
      index++;
    }
  };

  const literal = (word: string): void => {
    for (const character of word) {
      if (text[index] !== character) {
        fail();
      }

      index++;
    }
  };

  const string = (): void => {
    index++;

    while (text[index] !== '"') {
      if (index >= text.length || text.charCodeAt(index) < 0x20) {
        fail();
      }

      if (text[index] === "\\") {
        index++;

        if (text[index] === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(index + 1, index + 5))) {
            fail();
          }

          index += 4;
        } else if (!'"\\/bfnrt'.includes(text[index] ?? "x")) {
          fail();
        }
      }

      index++;
    }

    index++;
  };

  const number = (): void => {
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(index));

    if (!match) {
      fail();
    }

    index += match![0].length;
  };

  const value = (): void => {
    space();

    const character = text[index];

    if (character === "{") {
      index++;
      space();

      if (text[index] === "}") {
        index++;

        return;
      }

      for (;;) {
        space();

        if (text[index] !== '"') {
          fail();
        }

        string();
        space();

        if (text[index] !== ":") {
          fail();
        }

        index++;
        value();
        space();

        if (text[index] === ",") {
          index++;
        } else if (text[index] === "}") {
          index++;

          return;
        } else {
          fail();
        }
      }
    } else if (character === "[") {
      index++;
      space();

      if (text[index] === "]") {
        index++;

        return;
      }

      for (;;) {
        value();
        space();

        if (text[index] === ",") {
          index++;
        } else if (text[index] === "]") {
          index++;

          return;
        } else {
          fail();
        }
      }
    } else if (character === '"') {
      string();
    } else if (character === "t") {
      literal("true");
    } else if (character === "f") {
      literal("false");
    } else if (character === "n") {
      literal("null");
    } else {
      number();
    }
  };

  try {
    value();
    space();

    return index < text.length ? index : undefined;
  } catch (error) {
    if (error instanceof Stop) {
      return error.at;
    }

    throw error;
  }
}

export function isContainer(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
  return value !== null && typeof value === "object";
}

export function children(value: JsonValue): [Segment, JsonValue][] {
  if (Array.isArray(value)) {
    return value.map((child, index) => [index, child]);
  }

  return isContainer(value) ? Object.entries(value) : [];
}

export function childCount(value: JsonValue): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  return isContainer(value) ? Object.keys(value).length : 0;
}

/**
 * A path as a set member. JSON of the segments, so `["a.b"]` and `["a", "b"]`
 * stay apart, which a dotted string would not keep them.
 */
export function pathKey(path: readonly Segment[]): string {
  return JSON.stringify(path);
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * A path as the user copies it: `$.items[0].name`, quoting the keys that are
 * not identifiers. The same spelling works in JavaScript after `$` is replaced
 * by the variable, and reads as JSONPath.
 */
export function formatPath(path: readonly Segment[]): string {
  return path.reduce<string>((accumulated, segment) => {
    if (typeof segment === "number") {
      return `${accumulated}[${segment}]`;
    }

    return IDENTIFIER.test(segment)
      ? `${accumulated}.${segment}`
      : `${accumulated}[${JSON.stringify(segment)}]`;
  }, "$");
}

/** The containers to open so the tree shows `depth` levels below the root. */
export function pathsToDepth(value: JsonValue, depth: number): Set<string> {
  const open = new Set<string>();

  const walk = (node: JsonValue, path: Segment[], level: number): void => {
    if (!isContainer(node) || level >= depth) {
      return;
    }

    open.add(pathKey(path));

    for (const [segment, child] of children(node)) {
      walk(child, [...path, segment], level + 1);
    }
  };

  walk(value, [], 0);

  return open;
}

/** How deep the deepest container goes, which bounds the depth buttons. */
export function maxDepth(value: JsonValue): number {
  if (!isContainer(value)) {
    return 0;
  }

  let deepest = 0;

  for (const [, child] of children(value)) {
    if (isContainer(child)) {
      deepest = Math.max(deepest, maxDepth(child));
    }
  }

  return deepest + 1;
}

export interface SearchResult {
  /** The matching nodes, in document order. */
  matches: Segment[][];

  /** Every container that has to be open for all the matches to show. */
  open: Set<string>;

  /**
   * How many children each container must show so that its matches are not
   * hidden behind "show more". Keyed like `open`.
   */
  limits: Map<string, number>;
}

/**
 * Finds keys and primitive values containing `query`, ignoring case.
 *
 * A container matches by its key only -- matching on its contents too would
 * light up every ancestor of every hit and say nothing.
 */
export function search(value: JsonValue, query: string): SearchResult {
  const needle = query.toLowerCase();
  const result: SearchResult = { matches: [], open: new Set(), limits: new Map() };

  if (needle === "") {
    return result;
  }

  const walk = (node: JsonValue, path: Segment[], segment: Segment | undefined): boolean => {
    const keyHit = typeof segment === "string" && segment.toLowerCase().includes(needle);
    let hit = keyHit;

    if (!isContainer(node)) {
      hit ||= displayText(node).toLowerCase().includes(needle);
    }

    if (hit) {
      result.matches.push(path);
    }

    if (!isContainer(node)) {
      return hit;
    }

    let below = false;

    children(node).forEach(([childSegment, child], index) => {
      if (walk(child, [...path, childSegment], childSegment)) {
        below = true;

        const key = pathKey(path);

        result.limits.set(key, Math.max(result.limits.get(key) ?? 0, index + 1));
      }
    });

    if (below) {
      result.open.add(pathKey(path));
    }

    return hit || below;
  };

  walk(value, [], undefined);

  return result;
}

/** A primitive as the tree shows it, without the quotes a string gets. */
export function displayText(value: JsonValue): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * A value as Copy Value puts it on the clipboard: a string bare, since that
 * is what one wants to paste, and anything else as JSON.
 */
export function copyText(value: JsonValue): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

/** Splits text around every occurrence of `query`, ignoring case. */
export function splitMatches(text: string, query: string): { text: string; match: boolean }[] {
  if (query === "") {
    return [{ text, match: false }];
  }

  const parts: { text: string; match: boolean }[] = [];
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  let from = 0;

  for (let index = lower.indexOf(needle); index !== -1; index = lower.indexOf(needle, from)) {
    if (index > from) {
      parts.push({ text: text.slice(from, index), match: false });
    }

    parts.push({ text: text.slice(index, index + needle.length), match: true });
    from = index + needle.length;
  }

  if (from < text.length) {
    parts.push({ text: text.slice(from), match: false });
  }

  return parts;
}

export type TokenKind = "key" | "string" | "number" | "literal" | "punctuation";

const TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;

/**
 * Colours pretty-printed JSON. Only ever given JSON.stringify output, which is
 * why a regular expression is enough: it never sees a comment, a trailing
 * comma or a string broken across lines.
 */
export function tokenize(text: string): { text: string; kind?: TokenKind }[] {
  const tokens: { text: string; kind?: TokenKind }[] = [];
  let last = 0;

  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) {
      tokens.push({ text: text.slice(last, match.index) });
    }

    if (match[1] !== undefined) {
      tokens.push({ text: match[1], kind: match[2] !== undefined ? "key" : "string" });

      if (match[2] !== undefined) {
        tokens.push({ text: match[2], kind: "punctuation" });
      }
    } else if (match[3] !== undefined) {
      tokens.push({ text: match[3], kind: "number" });
    } else if (match[4] !== undefined) {
      tokens.push({ text: match[4], kind: "literal" });
    } else {
      tokens.push({ text: match[0], kind: "punctuation" });
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) {
    tokens.push({ text: text.slice(last) });
  }

  return tokens;
}

/** A file name for Download, from the last path segment of the address. */
export function downloadName(url: string | undefined): string {
  let name = "";

  try {
    name = decodeURIComponent(new URL(url ?? "").pathname.split("/").filter(Boolean).at(-1) ?? "");
  } catch {
    name = "";
  }

  name = name.replace(/[\\/:*?"<>|]+/g, "_");

  if (name === "") {
    return "data.json";
  }

  return /\.json$/i.test(name) ? name : `${name}.json`;
}

/**
 * Whether a document's content type is JSON: `application/json`,
 * `text/json`, or any `+json` type such as `application/ld+json` or
 * `application/problem+json`.
 */
export function isJsonContentType(contentType: string | undefined): boolean {
  return /^(application|text)\/([\w.-]+\+)?json$/i.test((contentType ?? "").split(";")[0]!.trim());
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
