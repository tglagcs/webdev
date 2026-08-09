/**
 * Pretty-prints CSS for the Edit CSS panel and the CSS report.
 *
 * The bundled beautify.js only does JavaScript, which is why View JavaScript
 * has a Beautify command and Edit CSS shows minified stylesheets as one
 * unreadable line.
 *
 * This is a formatter, not a parser: it never interprets a declaration, only
 * decides where the line breaks go. That matters because the output is handed
 * straight back to the page when the user applies their edits, so anything it
 * does not understand has to survive unchanged rather than be dropped.
 *
 * The four things that break a naive split on `{};` are all handled by
 * tracking what the current character is inside of:
 *
 *   - strings, `content: "a; b {"` and `font-family: "Foo}Bar"`
 *   - url() tokens, which may hold an unquoted data: URI full of braces
 *   - comments, which may hold anything at all, including commented-out rules
 *   - nested blocks, `@media`, `@supports` and modern nested selectors
 */

const INDENT = "  ";

interface State {
  /** The quote character we are inside, or null. */
  quote: string | null;
  inComment: boolean;
  inUrl: boolean;
  depth: number;
  /**
   * Whether a colon has opened a declaration that no `;`, `{` or `}` has
   * closed yet.
   *
   * Tracked as we go rather than inferred from the output, because the two
   * questions this answers -- is this colon `color:` or `a::before`, is this
   * comma a value separator or a selector separator -- both depend on where
   * we are, and reconstructing that by scanning backwards gets the custom
   * property `--x: { a: b }` wrong in both directions.
   */
  inDeclaration: boolean;
}

export function formatCSS(css: string): string {
  const state: State = {
    quote: null,
    inComment: false,
    inUrl: false,
    depth: 0,
    inDeclaration: false,
  };
  let out = "";
  // Whether the next non-space character starts a new line.
  let pendingNewline = false;

  const write = (text: string): void => {
    if (pendingNewline) {
      out += `\n${INDENT.repeat(state.depth)}`;
      pendingNewline = false;
    }

    out += text;
  };

  for (let index = 0; index < css.length; index++) {
    const character = css[index]!;
    const next = css[index + 1];

    if (state.inComment) {
      out += character;

      if (character === "*" && next === "/") {
        out += next;
        index++;
        state.inComment = false;
        pendingNewline = true;
      }

      continue;
    }

    if (state.quote) {
      out += character;

      // A backslash escapes the next character, quote included.
      if (character === "\\" && next !== undefined) {
        out += next;
        index++;
      } else if (character === state.quote) {
        state.quote = null;
      }

      continue;
    }

    if (state.inUrl) {
      out += character;

      if (character === ")") {
        state.inUrl = false;
      }

      continue;
    }

    if (character === "/" && next === "*") {
      write("/*");
      index++;
      state.inComment = true;

      continue;
    }

    if (character === '"' || character === "'") {
      write(character);
      state.quote = character;

      continue;
    }

    // url( is a token, not a function call: its contents are not a string and
    // an unquoted data: URI inside it can contain braces and semicolons.
    if (/[uU]/.test(character) && /^url\(/i.test(css.slice(index, index + 4))) {
      write(css.slice(index, index + 4));
      index += 3;
      state.inUrl = true;

      continue;
    }

    if (character === "{") {
      // The source may or may not have had a space here; the layout is ours.
      out = out.replace(/[ \t]+$/, "");
      write(" {");
      state.depth++;
      state.inDeclaration = false;
      pendingNewline = true;

      continue;
    }

    if (character === "}") {
      state.depth = Math.max(0, state.depth - 1);
      state.inDeclaration = false;
      pendingNewline = true;
      write("}");
      pendingNewline = true;

      continue;
    }

    if (character === ";") {
      out = out.replace(/[ \t]+$/, "");
      write(";");
      state.inDeclaration = false;
      pendingNewline = true;

      continue;
    }

    // The colon that opens a declaration takes a space after it; the ones in
    // `a:hover` and `a::before` are part of the selector and take none.
    if (character === ":" && state.depth > 0 && !state.inDeclaration) {
      out = out.replace(/[ \t]+$/, "");
      state.inDeclaration = true;
      write(": ");

      // Swallow the source's own spacing so it does not double up.
      while (/[ \t]/.test(css[index + 1] ?? "")) {
        index++;
      }

      continue;
    }

    // Collapse the run of whitespace the source used; the layout is ours now.
    if (/\s/.test(character)) {
      if (!pendingNewline && out && !/[\s{]$/.test(out)) {
        out += " ";
      }

      continue;
    }

    // A comma at the top of a rule separates selectors, which read better one
    // per line; inside a declaration it separates values and must not.
    if (character === ",") {
      out = out.replace(/[ \t]+$/, "");
      write(",");

      if (state.inDeclaration) {
        write(" ");
      } else {
        pendingNewline = true;
      }

      while (/[ \t]/.test(css[index + 1] ?? "")) {
        index++;
      }

      continue;
    }

    write(character);
  }

  return out
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
