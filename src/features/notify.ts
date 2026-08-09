/**
 * How an injected feature reports its result.
 *
 * The feature runs in the page and has nowhere to draw, so it sends the
 * message key and its substitutions to the popup, which resolves and renders
 * them in its own UI. The wire format is upstream's, because the popup side is
 * still legacy.
 *
 * Note this is not the background contract in lib/messaging: nothing in the
 * worker listens for it. If the popup has already closed, the send has no
 * receiver and rejects -- which is upstream behaviour and is why the result of
 * a feature applied from a closed popup was never seen either.
 */

import type { MessageKey } from "@/lib/i18n";

export interface DisplayNotification {
  type: "display-notification";
  message: MessageKey;
  parameters?: (string | number)[];
}

export function displayNotification(message: MessageKey, parameters?: (string | number)[]): void {
  const notification: DisplayNotification = { type: "display-notification", message, parameters };

  void browser.runtime.sendMessage(notification).catch(() => {
    // No popup listening. Nothing to do, and nothing worth logging: this is
    // the ordinary case for a feature the user triggered and then closed the
    // popup on.
  });
}

/**
 * Picks the singular or plural message for a count and sends it.
 *
 * Upstream wrote this out at each call site as an if/else over `count == 1`,
 * with the singular taking no substitution and the plural taking the count.
 */
export function displayCount(count: number, singular: MessageKey, multiple: MessageKey): void {
  if (count === 1) {
    displayNotification(singular);
  } else {
    displayNotification(multiple, [count]);
  }
}
