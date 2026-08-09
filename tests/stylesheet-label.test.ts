/**
 * Tab names for the Edit CSS panel.
 */

import { describe, expect, it } from "vitest";

import { escapeHTML } from "@/lib/dom/elements";
import { styleSheetLabel, uniqueLabels } from "@/lib/stylesheet-label";

describe("styleSheetLabel", () => {
  it("uses the file name when there is one", () => {
    expect(styleSheetLabel("https://example.com/css/site.css")).toBe("site.css");
    expect(styleSheetLabel("https://example.com/css/site.css?v=3")).toBe("site.css");
    expect(styleSheetLabel("https://example.com/css/site.css#x")).toBe("site.css");
  });

  it("keeps a content hash, which is part of the file name", () => {
    expect(styleSheetLabel("https://example.com/main.a1b2c3.css")).toBe("main.a1b2c3.css");
  });

  // The case that prompted this: the last path segment is the bundler's
  // module list, and reading it tells the user nothing.
  it("falls back to the host when the last segment is not a file name", () => {
    const google =
      "https://www.gstatic.com/og/_/ss/k=og.qtm.abc/m=X3N0Bf,attn,cdos,gwc,hsm,jsa,mb4ZUb,cEt90b,SNUn3,qddgKe,sTsDMc,dtl0hd,eHDfl,YV5bee,d,csi";

    expect(styleSheetLabel(google)).toBe("www.gstatic.com");
  });

  it("falls back to the host for a directory URL", () => {
    expect(styleSheetLabel("https://cdn.example.com/assets/")).toBe("cdn.example.com");
    expect(styleSheetLabel("https://cdn.example.com/")).toBe("cdn.example.com");
  });

  it("names an inlined stylesheet rather than printing its payload", () => {
    expect(styleSheetLabel("data:text/css;base64,YSB7Y29sb3I6cmVkfQ==")).toBe("inline");
  });

  it("truncates from the middle, so both ends stay readable", () => {
    const label = styleSheetLabel(
      "https://example.com/a-very-long-generated-stylesheet-name-indeed.css",
    );

    expect(label.length).toBeLessThanOrEqual(32);
    expect(label.startsWith("a-very-long-g")).toBe(true);
    expect(label.endsWith("-indeed.css")).toBe(true);
  });

  it("copes with a URL it cannot parse", () => {
    expect(styleSheetLabel("/relative/path/style.css")).toBe("style.css");
    expect(styleSheetLabel("")).toBe("");
  });
});

describe("uniqueLabels", () => {
  it("leaves distinct labels alone", () => {
    expect(uniqueLabels(["a.css", "b.css"])).toEqual(["a.css", "b.css"]);
  });

  it("numbers every member of a repeated set, including the first", () => {
    expect(uniqueLabels(["cdn.example.com", "a.css", "cdn.example.com"])).toEqual([
      "cdn.example.com (1)",
      "a.css",
      "cdn.example.com (2)",
    ]);
  });

  it("numbers each repeated label independently", () => {
    expect(uniqueLabels(["x", "y", "x", "y", "z"])).toEqual([
      "x (1)",
      "y (1)",
      "x (2)",
      "y (2)",
      "z",
    ]);
  });
});

describe("escapeHTML", () => {
  // The tab title and its tooltip are interpolated into an HTML string that
  // the dashboard inserts with insertAdjacentHTML, and the URL comes from the
  // page being inspected.
  it("neutralises a stylesheet href that tries to break out of the attribute", () => {
    const hostile = 'https://evil.test/a.css" onmouseover="alert(1)';

    expect(escapeHTML(hostile)).not.toContain('"');
    expect(escapeHTML(hostile)).toContain("&quot;");
  });

  it("escapes the five characters that matter, and nothing else", () => {
    expect(escapeHTML(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
    expect(escapeHTML("site.css?v=3")).toBe("site.css?v=3");
  });
});
