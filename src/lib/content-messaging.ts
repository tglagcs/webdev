/**
 * Asking the content script of one tab for something, with the answer typed.
 *
 * The popup's half of `src/content/messages.ts`. The types come from that
 * table and nothing else does: importing them costs no code here, because a
 * type import is erased, so the popup does not pull the extractors into its
 * own bundle just to know their return shapes.
 *
 * A tab with no content script -- an internal page, or one loaded before the
 * extension was -- rejects rather than answering. That is the caller's to
 * handle; every caller here has already refused the pages it cannot touch.
 */

import type { ContentMessageType, ContentResponse } from "@/content/messages";

export async function sendToContent<T extends ContentMessageType>(
  tabId: number,
  type: T,
  payload: Record<string, unknown> = {},
): Promise<ContentResponse<T>> {
  return (await browser.tabs.sendMessage(tabId, { type, ...payload })) as ContentResponse<T>;
}
