#!/usr/bin/env python3
"""Serve a built extension over HTTP with the browser APIs stubbed.

The extension pages cannot be opened from disk: their module scripts are
referenced with absolute paths, and every page calls chrome.* on load. This
copies a build to a scratch directory, injects a stub of the handful of APIs
the pages touch at startup, and serves it, so a real browser can load the
popup, the options page and the reports and report what breaks.

It verifies wiring, not behaviour -- that the module graph resolves, the
legacy files still evaluate in the right order onto one namespace, and the
locale strings land in the menus. Anything involving a real tab needs the
extension actually installed.

    python tools/smoke-serve.py [--build chrome-mv3] [--port 8730]
"""

import argparse
import functools
import http.server
import pathlib
import shutil
import socketserver

ROOT = pathlib.Path(__file__).resolve().parent.parent

STUB = """
<script>
// Minimal stand-in for the extension APIs the pages call while loading.
(() => {
  const store = {};
  let messages = {};

  try {
    const request = new XMLHttpRequest();
    request.open("GET", "/_locales/en_US/messages.json", false);
    request.send(null);
    messages = JSON.parse(request.responseText);
  } catch (error) {
    console.error("SMOKE: could not load messages.json", error);
  }

  const noop = () => {};
  const callback = (value) => (fn) => typeof fn === "function" && fn(value);

  window.__SMOKE__ = { calls: [] };
  const record = (name) => (...args) => {
    window.__SMOKE__.calls.push(name);
    const fn = args[args.length - 1];
    if (typeof fn === "function") fn(undefined);
  };

  window.chrome = {
    i18n: {
      getMessage: (key, subs) => {
        const entry = messages[key];
        if (!entry) return "";
        let message = entry.message;
        [].concat(subs ?? []).forEach((value, index) => {
          message = message.replace("$" + (index + 1), value);
        });
        return message;
      },
    },
    runtime: {
      getManifest: () => ({ version: "1.0.0" }),
      getURL: (path) => new URL(path, location.origin).href,
      sendMessage: record("runtime.sendMessage"),
      onMessage: { addListener: noop },
      openOptionsPage: noop,
      lastError: undefined,
    },
    storage: {
      local: {
        get: (keys, fn) => callback(store)(fn),
        set: (items, fn) => (Object.assign(store, items), callback()(fn)),
        remove: (keys, fn) => callback()(fn),
      },
      session: { get: (k, fn) => callback({})(fn), set: (i, fn) => callback()(fn) },
      onChanged: { addListener: noop },
    },
    tabs: {
      query: (info, fn) => callback([{ id: 1, index: 0, url: "https://example.com/" }])(fn),
      create: record("tabs.create"),
      onUpdated: { addListener: noop },
      onActivated: { addListener: noop },
      onRemoved: { addListener: noop },
      sendMessage: record("tabs.sendMessage"),
    },
    action: {
      setBadgeText: noop,
      setBadgeBackgroundColor: noop,
      setIcon: noop,
      setTitle: noop,
    },
    scripting: { executeScript: () => Promise.resolve([]) },
    permissions: {
      contains: (p, fn) => callback(true)(fn),
      request: (p, fn) => callback(true)(fn),
    },
    cookies: { getAll: (d, fn) => callback([])(fn) },
    windows: { getCurrent: (fn) => callback({ id: 1 })(fn), update: noop },
    // Firefox has these too; only contentSettings is Chromium-only.
    browsingData: { remove: (o, t, fn) => fn && fn(), removeCache: (o, fn) => fn && fn() },
    history: { deleteAll: (fn) => fn && fn() },
  };

  window.addEventListener("error", (event) =>
    console.error("SMOKE PAGE ERROR:", event.message, event.filename + ":" + event.lineno));
  window.addEventListener("unhandledrejection", (event) =>
    console.error("SMOKE REJECTION:", String(event.reason)));
})();
</script>
"""

# The only API that genuinely does not exist on Firefox.
CHROMIUM_EXTRAS = """
<script>
  chrome.contentSettings = new Proxy({}, {
    get: () => ({ get: (d, fn) => fn && fn({ setting: "allow" }), set: () => {}, clear: () => {} }),
  });
</script>
"""


def stage(build: str, chromium: bool) -> pathlib.Path:
    source = ROOT / ".output" / build
    if not source.exists():
        raise SystemExit(f"no build at {source} -- run `npm run build` first")

    target = ROOT / ".smoke" / build
    if target.exists():
        shutil.rmtree(target)
    target.parent.mkdir(exist_ok=True)
    shutil.copytree(source, target)

    stub = STUB + (CHROMIUM_EXTRAS if chromium else "")

    for page in target.glob("*.html"):
        text = page.read_text(encoding="utf-8")
        page.write_text(text.replace("<head>", "<head>" + stub, 1), encoding="utf-8")

    return target


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--build", default="chrome-mv3")
    parser.add_argument("--port", type=int, default=8730)
    parser.add_argument("--firefox-apis", action="store_true", help="omit the Chromium-only APIs")
    args = parser.parse_args()

    directory = stage(args.build, chromium=not args.firefox_apis)

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as server:
        print(f"serving {directory} at http://127.0.0.1:{args.port}/")
        server.serve_forever()


if __name__ == "__main__":
    main()
