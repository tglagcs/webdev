/**
 * A short, readable name for a stylesheet, for the Edit CSS tabs.
 *
 * The tabs used to show the URL's last path segment. That is fine for
 * `/css/site.css` and useless for a bundler that encodes its module list in
 * the path, which is what most large sites serve -- Google's is
 * `.../m=X3N0Bf,attn,cdos,gwc,hsm,jsa,mb4ZUb,cEt90b,...`, a tab title wider
 * than the window that says nothing.
 *
 * So the last segment is only used when it actually looks like a stylesheet
 * file. Otherwise the host is a better answer: it is short, and it is the
 * thing the user is really distinguishing between -- their own CSS from the
 * CDN's from the analytics vendor's.
 */

/** Wide enough to read, narrow enough that several tabs fit. */
const MAX_LENGTH = 32;

/** Keeps both ends, which is where a filename carries its meaning. */
function truncate(label: string): string {
  if (label.length <= MAX_LENGTH) {
    return label;
  }

  return `${label.slice(0, MAX_LENGTH - 13)}…${label.slice(-12)}`;
}

export function styleSheetLabel(url: string): string {
  if (!url) {
    return "";
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    // Not absolute -- unusual here, since these come from styleSheet.href,
    // but a relative or malformed URL should still name its tab.
    return truncate(url.split(/[?#]/)[0]!.split("/").pop() || url);
  }

  // A stylesheet inlined into the document has no file to name.
  if (parsed.protocol === "data:") {
    return "inline";
  }

  const segment = parsed.pathname.split("/").filter(Boolean).pop() ?? "";

  if (/\.css$/i.test(segment)) {
    return truncate(segment);
  }

  // Not a filename: a bundler route, a directory, or nothing at all. The host
  // is what distinguishes this sheet from the others.
  return truncate(parsed.host || segment || url);
}

/**
 * Makes a list of labels unique, so tabs that resolve to the same host stay
 * tellable apart.
 *
 * Only the repeats are numbered, and numbering starts at the first one, so a
 * page with three sheets from one CDN reads "cdn.example.com (1..3)" rather
 * than one bare label followed by two numbered ones.
 */
export function uniqueLabels(labels: string[]): string[] {
  const counts = new Map<string, number>();

  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const seen = new Map<string, number>();

  return labels.map((label) => {
    if ((counts.get(label) ?? 0) < 2) {
      return label;
    }

    const position = (seen.get(label) ?? 0) + 1;

    seen.set(label, position);

    return `${label} (${position})`;
  });
}
