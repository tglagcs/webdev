/**
 * The content script's side of the message contract.
 *
 * Upstream was a chain of seventeen `else if(message.type == "...")` branches;
 * a typo in one of those strings is a report that silently returns nothing,
 * because an unmatched message just falls through and the listener still
 * returns true. A table keyed by the message name cannot have that failure:
 * the key *is* the name, and the union below is what the sender is checked
 * against.
 *
 * Every handler is synchronous -- they all read the DOM and return -- so
 * sendResponse is called in the same turn and the channel need not stay open.
 */

import { getColors } from "./colors";
import { getDomainCookies, getPathCookies, type Cookie } from "./cookies";
import { getForms } from "./forms";
import { getJson } from "./json";
import {
  getDocumentDetails,
  getLinks,
  getLocationDetails,
  getMetaTags,
  getWindowSize,
} from "./page";
import { getBrokenImages, getCSS, getImages, getJavaScript } from "./resources";
import { getAnchors, getDocumentOutline, getDuplicateIds } from "./structure";

/**
 * Handlers take the whole message, so the ones needing a payload can read
 * their own fields from it.
 */
const HANDLERS = {
  "get-anchors": getAnchors,
  "get-broken-images": getBrokenImages,
  "get-colors": getColors,
  "get-css": getCSS,
  "get-document-details": getDocumentDetails,
  "get-document-outline": getDocumentOutline,
  "get-domain-cookies": (message: { allCookies: Cookie[] }) => getDomainCookies(message.allCookies),
  "get-duplicate-ids": getDuplicateIds,
  "get-forms": getForms,
  "get-images": getImages,
  "get-javascript": getJavaScript,
  "get-json": getJson,
  "get-links": getLinks,
  "get-location-details": getLocationDetails,
  "get-meta-tags": getMetaTags,
  "get-path-cookies": (message: { allCookies: Cookie[] }) => getPathCookies(message.allCookies),
  "get-window-size": getWindowSize,
} as const;

export type ContentMessageType = keyof typeof HANDLERS;

export type ContentResponse<T extends ContentMessageType> = ReturnType<(typeof HANDLERS)[T]>;

/** Registers the listener. Call once, from the content script entrypoint. */
export function handleContentMessages(): void {
  browser.runtime.onMessage.addListener(
    (
      message: unknown,
      _sender,
      sendResponse: (response?: unknown) => void,
    ): boolean | undefined => {
      const type = (message as { type?: string } | null)?.type;

      if (!type || !(type in HANDLERS)) {
        return undefined;
      }

      const handler = HANDLERS[type as ContentMessageType] as (message: unknown) => unknown;

      sendResponse(handler(message));

      return undefined;
    },
  );
}
