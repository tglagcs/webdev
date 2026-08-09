/**
 * Removes the first occurrence of a substring.
 *
 * `String.prototype.replace` with a string pattern does the same thing, but
 * not for the empty cases: this returns "" when either argument is missing,
 * and the callers -- which chain `.trim()` onto the result -- depend on
 * getting a string back rather than undefined.
 */
export function removeSubstring(string: string, substring: string): string {
  if (!string || !substring) {
    return "";
  }

  return string.replace(substring, "");
}
