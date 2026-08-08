/**
 * Gives the fake browser a real i18n.getMessage.
 *
 * @webext-core/fake-browser throws for this one rather than stubbing it, and
 * a stub returning "" would let a test pass while the message it depends on
 * does not exist. Resolving against the actual en_US catalogue means a test
 * asserting on a label is also asserting the key is real -- the same check
 * the generated MessageKey union gives the source.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fakeBrowser } from "wxt/testing/fake-browser";

interface Message {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

const messages = JSON.parse(
  readFileSync(resolve(__dirname, "../../src/public/_locales/en_US/messages.json"), "utf-8"),
) as Record<string, Message>;

function getMessage(name: string, substitutions?: string | string[]): string {
  const entry = messages[name];

  if (!entry) {
    return "";
  }

  const values = substitutions === undefined ? [] : [substitutions].flat();
  let text = entry.message;

  // A placeholder maps a name used in the message to a positional argument,
  // so "$count$" is resolved through placeholders.count.content === "$1".
  for (const [placeholder, { content }] of Object.entries(entry.placeholders ?? {})) {
    const index = Number(content.replace("$", "")) - 1;

    text = text.replaceAll(`$${placeholder}$`, values[index] ?? "");
  }

  return text;
}

fakeBrowser.i18n.getMessage = getMessage as typeof fakeBrowser.i18n.getMessage;
