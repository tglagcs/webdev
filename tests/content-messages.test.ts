/**
 * The content script's message dispatch.
 *
 * Upstream was seventeen `else if (message.type == "...")` branches. A typo in
 * one of those strings produced a report that silently returned nothing: the
 * message fell through every branch, sendResponse was never called, and the
 * listener still returned true, so the caller waited on a channel that would
 * never answer. These tests pin the two properties that make that
 * unrepresentable now -- every declared type is reachable, and an unknown type
 * is declined rather than swallowed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { handleContentMessages } from "@/content/messages";

/** Every type the popup and the report pages send. */
const MESSAGE_TYPES = [
  "get-anchors",
  "get-broken-images",
  "get-colors",
  "get-cookies",
  "get-css",
  "get-document-details",
  "get-document-outline",
  "get-domain-cookies",
  "get-duplicate-ids",
  "get-forms",
  "get-images",
  "get-javascript",
  "get-links",
  "get-location-details",
  "get-meta-tags",
  "get-path-cookies",
  "get-window-size",
] as const;

beforeEach(() => {
  fakeBrowser.reset();
  handleContentMessages();
});

/** Delivers a message the way the runtime would, and returns what came back. */
function send(message: object): { responded: boolean; response: unknown; kept: unknown } {
  const sendResponse = vi.fn();
  const returned = fakeBrowser.runtime.onMessage.trigger(message, {}, sendResponse);

  return {
    responded: sendResponse.mock.calls.length > 0,
    response: sendResponse.mock.calls[0]?.[0],
    kept: returned[0],
  };
}

describe("content message dispatch", () => {
  it.each(MESSAGE_TYPES)("answers %s", (type) => {
    const { responded, response } = send({ type, allCookies: [] });

    expect(responded).toBe(true);
    expect(response).toBeDefined();
  });

  it("declines a message it does not handle, rather than holding the channel open", () => {
    const { responded, kept } = send({ type: "get-something-else" });

    expect(responded).toBe(false);
    // Returning undefined releases the channel, so the sender's promise
    // settles instead of hanging.
    expect(kept).toBeUndefined();
  });

  it("ignores a message with no type at all", () => {
    expect(send({}).responded).toBe(false);
  });

  it("passes the cookie payload through to the handler", () => {
    const cookie = { host: "fixture.test", name: "a", path: "/", value: "1" };

    expect(send({ type: "get-domain-cookies", allCookies: [cookie] }).response).toEqual([cookie]);
  });
});
