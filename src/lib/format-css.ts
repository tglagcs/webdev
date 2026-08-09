/**
 * Pretty-prints CSS for the Edit CSS panel.
 *
 * The bundled beautify.js only does JavaScript, which is why View JavaScript
 * has a Beautify command and Edit CSS showed minified stylesheets as one
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
 *
 * It must also be linear in the length of the input. Real stylesheets run to
 * hundreds of kilobytes, and the first version of this trimmed trailing
 * whitespace by rewriting the accumulated output on every character -- which
 * is quadratic, and made Firefox report the extension as slowing the browser
 * down. Nothing here may look backwards at what has already been emitted: the
 * spacing decisions are held as two pending flags instead.
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

  const parts: string[] = [];
  // Deferred, so a run of source whitespace collapses to at most one space and
  // disappears entirely where a line break or a delimiter follows it.
  let pendingNewline = false;
  let pendingSpace = false;

  const emit = (text: string): void => {
    if (pendingNewline) {
      parts.push(`\n${INDENT.repeat(state.depth)}`);
    } else if (pendingSpace && parts.length > 0) {
      parts.push(" ");
    }

    pendingNewline = false;
    pendingSpace = false;
    parts.push(text);
  };

  for (let index = 0; index < css.length; index++) {
    const character = css[index]!;
    const next = css[index + 1];

    // Inside a literal nothing is interpreted, and no pending flag can be
    // set, so the characters go straight out.
    if (state.inComment) {
      parts.push(character);

      if (character === "*" && next === "/") {
        parts.push(next);
        index++;
        state.inComment = false;
        pendingNewline = true;
      }

      continue;
    }

    if (state.quote) {
      parts.push(character);

      // A backslash escapes the next character, quote included.
      if (character === "\\" && next !== undefined) {
        parts.push(next);
        index++;
      } else if (character === state.quote) {
        state.quote = null;
      }

      continue;
    }

    if (state.inUrl) {
      parts.push(character);

      if (character === ")") {
        state.inUrl = false;
      }

      continue;
    }

    if (character === "/" && next === "*") {
      emit("/*");
      index++;
      state.inComment = true;

      continue;
    }

    if (character === '"' || character === "'") {
      emit(character);
      state.quote = character;

      continue;
    }

    // url( is a token, not a function call: its contents are not a string and
    // an unquoted data: URI inside it can contain braces and semicolons.
    if ((character === "u" || character === "U") && /^url\(/i.test(css.slice(index, index + 4))) {
      emit(css.slice(index, index + 4));
      index += 3;
      state.inUrl = true;

      continue;
    }

    if (character === "{") {
      // Exactly one space before the brace, whatever the source had.
      pendingSpace = parts.length > 0 && !pendingNewline;
      emit("{");
      state.depth++;
      state.inDeclaration = false;
      pendingNewline = true;

      continue;
    }

    if (character === "}") {
      state.depth = Math.max(0, state.depth - 1);
      state.inDeclaration = false;
      pendingSpace = false;
      pendingNewline = true;
      emit("}");
      pendingNewline = true;

      continue;
    }

    if (character === ";") {
      pendingSpace = false;
      emit(";");
      state.inDeclaration = false;
      pendingNewline = true;

      continue;
    }

    // The colon that opens a declaration takes a space after it; the ones in
    // `a:hover` and `a::before` are part of the selector and take none.
    if (character === ":" && state.depth > 0 && !state.inDeclaration) {
      pendingSpace = false;
      emit(":");
      state.inDeclaration = true;
      pendingSpace = true;

      continue;
    }

    // A comma between selectors reads better one per line; inside a
    // declaration it separates values and must stay on the line.
    if (character === ",") {
      pendingSpace = false;
      emit(",");

      if (state.inDeclaration) {
        pendingSpace = true;
      } else {
        pendingNewline = true;
      }

      continue;
    }

    if (character === " " || character === "\t" || character === "\n" || character === "\r") {
      pendingSpace = true;

      continue;
    }

    emit(character);
  }

  return parts
    .join("")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
