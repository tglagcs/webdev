/**
 * The CSS formatter.
 *
 * Edit CSS hands its text straight back to the page when the user applies it,
 * so the bar here is higher than "looks nicer": anything the formatter does
 * not understand has to come out semantically unchanged. Most of these cases
 * are the ones that break a naive split on { } and ;.
 */

import { describe, expect, it } from "vitest";

import { formatCSS } from "@/lib/format-css";

/** Everything that is not whitespace, so two forms can be compared. */
const significant = (css: string): string => css.replace(/\s+/g, " ").trim();

describe("formatCSS", () => {
  it("breaks a minified stylesheet into one declaration per line", () => {
    expect(formatCSS("a{color:red;background:blue}b{margin:0}")).toMatchSnapshot();
  });

  it("indents nested at-rules", () => {
    expect(
      formatCSS("@media screen and (max-width:600px){.a{color:red}.b{color:blue}}"),
    ).toMatchSnapshot();
  });

  it("puts each selector in a list on its own line", () => {
    expect(formatCSS("h1,h2,h3{margin:0}")).toMatchSnapshot();
  });

  it("keeps commas inside a declaration value on one line", () => {
    const formatted = formatCSS('a{font-family:"Foo",Bar,sans-serif;color:rgba(1,2,3,.5)}');

    expect(formatted).toMatchSnapshot();
    expect(formatted).toContain('"Foo", Bar, sans-serif');
    expect(formatted).toContain("rgba(1, 2, 3, .5)");
  });

  describe("things that must survive verbatim", () => {
    it("does not split on braces or semicolons inside a string", () => {
      const css = `a::before{content:"}; not a rule {"}`;

      expect(formatCSS(css)).toContain('content: "}; not a rule {"');
    });

    it("handles an escaped quote inside a string", () => {
      const css = `a::before{content:"say \\" here"}`;

      expect(formatCSS(css)).toContain('content: "say \\" here"');
    });

    it("does not touch an unquoted data URI in url()", () => {
      const uri = "url(data:image/svg+xml;base64,PHN2Zz57fTwvc3ZnPg==)";
      const formatted = formatCSS(`a{background:${uri};color:red}`);

      expect(formatted).toContain(uri);
      // The semicolon inside the URI must not have started a new declaration.
      expect(formatted.split("\n").filter((line) => line.includes("base64"))).toHaveLength(1);
    });

    it("leaves comments alone, including commented-out rules", () => {
      const css = "/* a { color: red } ; */ b{color:blue}";

      expect(formatCSS(css)).toContain("/* a { color: red } ; */");
    });

    it("preserves a declaration it cannot interpret", () => {
      const css = "a{--custom:{a:b};color:red}";

      expect(significant(formatCSS(css))).toContain("--custom");
      expect(significant(formatCSS(css))).toContain("color: red");
    });
  });

  it("is idempotent, so re-opening an edited sheet does not reflow it", () => {
    const css = '@media print{h1,h2{margin:0;color:#fff}}a{content:"{;}"}';
    const once = formatCSS(css);

    expect(formatCSS(once)).toBe(once);
  });

  it("preserves every significant character", () => {
    const css = 'a{color:red;font:12px/1.5 "X",Y}@media print{b{margin:0}}/* c */';

    // Whitespace differs by design; nothing else may.
    expect(significant(formatCSS(css)).replace(/\s/g, "")).toBe(
      significant(css).replace(/\s/g, ""),
    );
  });

  it("returns an empty string unchanged", () => {
    expect(formatCSS("")).toBe("");
  });

  /**
   * Real stylesheets are hundreds of kilobytes. The first version of this
   * trimmed trailing whitespace by rewriting the whole accumulated output on
   * every character, which is quadratic: on a page like Google it hung long
   * enough for Firefox to report the extension as slowing the browser down,
   * and Edit CSS opened onto an unstyled page because the CSS never arrived.
   *
   * A quadratic implementation does not fail this test, it exceeds the
   * timeout -- which is the point. Half a megabyte is a realistic sheet.
   */
  it("stays linear on a stylesheet the size of a real one", () => {
    const rule = '.c{color:#fff;background:url(data:image/png;base64,AAAA);content:"x;y"}';
    const large = rule.repeat(8000);

    expect(large.length).toBeGreaterThan(500_000);

    const started = Date.now();
    const formatted = formatCSS(large);

    expect(formatted.length).toBeGreaterThan(large.length);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
