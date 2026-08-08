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
import socket
import socketserver

ROOT = pathlib.Path(__file__).resolve().parent.parent

STUB = """
<script>
// Minimal stand-in for the extension APIs the pages call while loading.
(() => {
  // A never-installed profile is a state that does not occur: the worker
  // seeds the defaults on install, and there is no worker here. Without at
  // least the two the options page reads back into form controls, it crashes
  // on getElementById("overlay_icon_" + null) -- a false positive that says
  // nothing about the build.
  const store = { overlay_icon: "color", display_overlay_with: "icons_text" };
  const session = {};
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

  // The real MV3 APIs resolve a promise when no callback is passed, and the
  // ported TypeScript awaits them. The legacy files still pass callbacks, so
  // both shapes have to work off the same stub.
  const settle = (value) => (fn) => {
    if (typeof fn === "function") {
      fn(value);
      return undefined;
    }
    return Promise.resolve(value);
  };
  const callback = settle;

  // Reads the subset of a store that `keys` asks for, matching the real API:
  // a string, an array of strings, or null for everything.
  const select = (store, keys) => {
    if (keys === null || keys === undefined) return { ...store };
    const wanted = [].concat(keys);
    const result = {};
    wanted.forEach((key) => {
      if (key in store) result[key] = store[key];
    });
    return result;
  };

  const area = (store) => ({
    get: (keys, fn) => settle(select(store, keys))(fn),
    set: (items, fn) => (Object.assign(store, items), settle(undefined)(fn)),
    remove: (keys, fn) => ([].concat(keys).forEach((key) => delete store[key]), settle(undefined)(fn)),
    clear: (fn) => (Object.keys(store).forEach((key) => delete store[key]), settle(undefined)(fn)),
  });

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
        const values = [].concat(subs ?? []);
        let message = entry.message;
        // A placeholder maps a name used in the message to a positional
        // argument, so "$count$" resolves via placeholders.count.content.
        Object.entries(entry.placeholders ?? {}).forEach(([name, { content }]) => {
          const index = Number(content.replace("$", "")) - 1;
          message = message.replaceAll("$" + name + "$", values[index] ?? "");
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
      local: area(store),
      session: area(session),
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


def require_free(port: int) -> None:
    """Refuses to start if something is already listening on the port."""
    with socket.socket() as probe:
        if probe.connect_ex(("127.0.0.1", port)) == 0:
            raise SystemExit(
                f"port {port} is already serving -- an earlier run is still up.\n"
                f"Stop it, or pass --port with a free one."
            )


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

    require_free(args.port)

    directory = stage(args.build, chromium=not args.firefox_apis)

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    # Deliberately not allow_reuse_address: on Windows that is SO_REUSEADDR
    # in its permissive form, so a second server binds successfully over a
    # server left running from an earlier session -- and the *old* one keeps
    # answering. The result is a smoke run against a stale build that looks
    # like a real failure. Cost an hour once; the probe above is the fix.

    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as server:
        print(f"serving {directory} at http://127.0.0.1:{args.port}/")
        server.serve_forever()


if __name__ == "__main__":
    main()
