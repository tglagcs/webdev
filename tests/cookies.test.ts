/**
 * The cookie operations.
 *
 * What is worth pinning is the URL: the API identifies a cookie by one, and
 * both UIs hand over a host, a path and a secure flag instead. Getting that
 * wrong fails silently -- the cookie is simply not found.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import {
  addCookie,
  cookiesByFrame,
  deleteCookie,
  getDateTomorrow,
  sanitizeHost,
} from "@/lib/cookies";

const set = vi.fn();
const remove = vi.fn();

beforeEach(() => {
  fakeBrowser.reset();
  set.mockReset();
  remove.mockReset();

  // fake-browser has no cookie store; the calls are the observable behaviour.
  (fakeBrowser as unknown as { cookies: unknown }).cookies = { set, remove };
});

describe("sanitizeHost", () => {
  it.each([
    [".example.com", "example.com"],
    ["example.com", "example.com"],
    ["", ""],
  ])("turns %s into %s", (host, expected) => {
    expect(sanitizeHost(host)).toBe(expected);
  });
});

describe("addCookie", () => {
  it("builds an http URL from the host and path, and trims what the user typed", () => {
    addCookie({
      host: "  .example.com ",
      name: " session ",
      path: " /admin ",
      value: " abc ",
      session: true,
    });

    expect(set).toHaveBeenCalledWith({
      domain: "example.com",
      name: "session",
      secure: undefined,
      url: "http://example.com/admin",
      value: "abc",
    });
  });

  it("uses https for a secure cookie", () => {
    addCookie({
      host: "example.com",
      name: "a",
      path: "/",
      value: "1",
      secure: true,
      session: true,
    });

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ url: "https://example.com/" }));
  });

  // The API takes seconds; the dialog holds a date string.
  it("converts the expiry to seconds since the epoch", () => {
    vi.useFakeTimers();

    addCookie({
      host: "example.com",
      name: "a",
      path: "/",
      value: "1",
      expires: " Tue, 10 Mar 2026 00:00:00 GMT ",
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ expirationDate: Date.UTC(2026, 2, 10) / 1000 }),
    );

    vi.useRealTimers();
  });

  it("sets no expiry at all for a session cookie", () => {
    addCookie({ host: "example.com", name: "a", path: "/", value: "1", session: true });

    expect(set.mock.calls[0]![0]).not.toHaveProperty("expirationDate");
  });
});

describe("deleteCookie", () => {
  it("identifies the cookie by name and URL", () => {
    deleteCookie({ host: "example.com", name: "a", path: "/admin", value: "1", secure: true });

    expect(remove).toHaveBeenCalledWith({ name: "a", url: "https://example.com/admin" });
  });

  // Upstream behaviour, kept deliberately: a domain cookie's host keeps its
  // leading dot here, unlike in addCookie. Pinned so that fixing it later is a
  // decision with a failing test behind it rather than an accident.
  it("does not strip the leading dot of a domain cookie", () => {
    deleteCookie({ host: ".example.com", name: "a", path: "/", value: "1" });

    expect(remove).toHaveBeenCalledWith({ name: "a", url: "http://.example.com/" });
  });
});

describe("cookiesByFrame", () => {
  const cookies = [
    { host: "www.example.com", name: "top", path: "/", value: "1" },
    { host: ".example.com", name: "shared", path: "/", value: "2" },
    { host: "accounts.example.com", name: "signin", path: "/", value: "3" },
    { host: "widget.other.test", name: "third-party", path: "/", value: "4" },
    { host: "nowhere.test", name: "unrelated", path: "/", value: "5" },
  ];

  // The whole point of the change: a third-party frame is where the cookies
  // are interesting, and it is exactly what the content script cannot see.
  it("reports a section per frame origin, cookies and all", () => {
    const sections = cookiesByFrame(
      [
        "https://www.example.com/search?q=x",
        "https://accounts.example.com/signin",
        "https://widget.other.test/embed",
      ],
      cookies,
    );

    expect(
      sections.map((section) => [section.url, section.cookies.map((cookie) => cookie.name)]),
    ).toEqual([
      ["https://www.example.com/search?q=x", ["shared", "top"]],
      ["https://accounts.example.com/signin", ["shared", "signin"]],
      ["https://widget.other.test/embed", ["third-party"]],
    ]);
  });

  it("collapses several frames of one origin into one section", () => {
    const sections = cookiesByFrame(
      ["https://www.example.com/", "https://www.example.com/frame", "https://www.example.com/two"],
      cookies,
    );

    expect(sections).toHaveLength(1);
    expect(sections[0]!.url).toBe("https://www.example.com/");
  });

  // about:blank and srcdoc frames are common and have no host to match on.
  it("skips frames with no host, and frames that failed to report one", () => {
    expect(
      cookiesByFrame(["about:blank", "", null, undefined, "data:text/html,x"], cookies),
    ).toEqual([]);
  });
});

describe("getDateTomorrow", () => {
  it("is tomorrow, as a UTC string", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00Z"));

    expect(getDateTomorrow()).toBe("Tue, 10 Mar 2026 12:00:00 GMT");

    vi.useRealTimers();
  });
});
