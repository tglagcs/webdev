/**
 * The message contract with the background worker.
 *
 * The wire format is unchanged from upstream -- a `type` discriminator and
 * whatever fields that type needs -- because the injected widgets are still
 * legacy JavaScript and send these by hand. What is new is that both ends
 * agree on it in the type system, instead of the worker checking
 * `message.type ==` against string literals and reading fields nobody
 * declared.
 *
 * Responses go through sendResponse rather than a returned promise: Chrome's
 * onMessage does not await a promise the listener returns, so returning one
 * closes the channel and the caller gets undefined. `return true` on a
 * synchronous listener body is what keeps it open.
 */

import type { AnySettingKey } from "./storage/schema";

export interface UrlContent {
  url: string;
  content: string;
}

/** request/response pairs, keyed by the `type` field on the wire. */
export interface BackgroundMessages {
  "get-storage-item": {
    request: { item: AnySettingKey };
    response: { value: unknown };
  };
  "set-storage-item": {
    request: { item: AnySettingKey; value: unknown };
    response: Record<string, never>;
  };
  "get-url-contents": {
    request: { urls: string[]; errorMessage: string };
    response: UrlContent[];
  };
  "get-visible-tab": {
    request: Record<string, never>;
    response: { dataUrl: string; maximumPerSecond: number };
  };
  /**
   * An in-page widget was dismissed from its own close button rather than
   * from the popup.
   *
   * The widget cannot clear the per-tab state itself -- storage.session is
   * not reachable from a content script -- and if nothing cleared it the
   * popup would go on showing the feature as active and the badge would keep
   * counting it. The tab is taken from the sender, not the message, so a page
   * cannot clear state for a tab that is not its own.
   */
  "feature-closed": {
    request: { features: string[] };
    response: Record<string, never>;
  };
}

export type BackgroundMessageType = keyof BackgroundMessages;

type Request<T extends BackgroundMessageType> = BackgroundMessages[T]["request"];
type Response<T extends BackgroundMessageType> = BackgroundMessages[T]["response"];

export async function sendToBackground<T extends BackgroundMessageType>(
  type: T,
  request: Request<T>,
): Promise<Response<T>> {
  return (await browser.runtime.sendMessage({ type, ...request })) as Response<T>;
}

export type BackgroundHandlers = {
  [T in BackgroundMessageType]: (
    request: Request<T>,
    sender: Browser.runtime.MessageSender,
  ) => Promise<Response<T>>;
};

/**
 * Registers the worker's side of the contract. Must be called synchronously
 * at the top level of the entrypoint -- a listener registered from inside an
 * awaited callback is not in place when the worker is woken by a message, and
 * that message is lost.
 */
export function handleBackgroundMessages(handlers: BackgroundHandlers): void {
  browser.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse: (response?: unknown) => void): boolean | undefined => {
      const type = (message as { type?: string } | null)?.type;

      if (!type || !(type in handlers)) {
        return undefined;
      }

      const handler = handlers[type as BackgroundMessageType] as (
        request: unknown,
        sender: Browser.runtime.MessageSender,
      ) => Promise<unknown>;

      handler(message, sender).then(sendResponse, (error: unknown) => {
        console.error(`[background] ${type} failed`, error);
        sendResponse(undefined);
      });

      // Keeps the channel open for the async handler above.
      return true;
    },
  );
}
