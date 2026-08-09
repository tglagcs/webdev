# WebDev

A GPL-3.0 fork of [chrispederick/web-developer](https://github.com/chrispederick/web-developer)
v3.0.1, being rebuilt incrementally. See `notice.md` for attribution and
`readme.md` for user-facing docs.

The fork's own identity lives in `src/branding.ts`. The DOM prefix stays
`web-developer-` deliberately — it is load-bearing across the feature
stylesheets, the injected markup and the code that cleans both up.

## Commands

```bash
npm run build              # Chrome/Edge -> .output/chrome-mv3
npm run build:firefox      # Firefox     -> .output/firefox-mv3
npm test                   # vitest
npm run typecheck          # tsc; excludes src/legacy/js
npm run lint               # eslint
npx prettier --check .
npm run icons              # regenerate icons from brand/logo.png
npm run i18n:keys          # regenerate src/lib/i18n-keys.ts from en_US

python tools/check-injected-closures.py    # see "Injected closures" below
python tools/check-locales.py              # translations must subset en_US
python tools/generate-i18n-keys.py --check # the committed union matches en_US
python tools/smoke-serve.py --build chrome-mv3 --port 8730
python tools/extractor-harness.py          # colours + CSS in a real engine
```

`smoke-serve.py` serves a build over HTTP with the browser APIs stubbed. It
proves the pages load and wire up **without installing the extension** — use
`--firefox-apis` to withhold `chrome.contentSettings` and exercise that path.
Its limits are real: see "Verification" below.

## Layout

```
src/
  branding.ts            fork name, URL, badge colours (replaces config.properties)
  entrypoints/           34 WXT entrypoints
    <page>/index.html    + main.ts importing the legacy files in concat order
    feature-*.ts         6 injected bundles  -> /feature-<name>.js
    embedded-*.ts        6 in-page widgets   -> /embedded-<name>.js
    background.ts  content.ts
  legacy/
    globals.ts           the WebDeveloper namespace, anchored to globalThis
    dom-ready.ts         restores upstream's DOMContentLoaded timing
    shims/               Storage / Locales / dom over the typed core
    js/                  42 files / ~11,100 lines of upstream ES5, being ported
  content/               the extractors feeding all 16 reports, + dispatch
  features/              the injected bundles (Outline, CSS, Miscellaneous, Images)
  lib/
    dom/                 documents, css-values, elements, stylesheets
    i18n.ts              t(); i18n-keys.ts is generated from en_US
    storage/             schema, settings, tab-state, migrations, defaults
    messaging.ts         the typed background message contract
    badge.ts  capabilities.ts  content-settings.ts
  public/                static assets at the URLs the legacy code expects
tools/                   one-shot migrations and CI guards
tests/                   vitest; fixtures/host-page.html is the extractor input
```

## Things that will bite you

These all cost real debugging time. Each has a guard; do not remove them.

### Injected closures must reference `globalThis`

`chrome.scripting.executeScript({ func })` **serialises the function to source**
and runs it in the page — no closure, no imports. Upstream was safe because
gulp-concat left `WebDeveloper` a literal global, spelled the same everywhere.
As a module binding the bundler renames it (the popup minifies it to `t`), so
the serialised body reads `t.CSS.toggleAllStyles(...)` against a page with no
`t`.

This fails **silently**: the menu item toggles, the badge counts, nothing is
logged. It shipped once and broke most of six menus.

Write `globalThis.WebDeveloper.` inside any closure passed to `executeScript`.
Property names are never minified. `tools/check-injected-closures.py` enforces
it.

### Build tokens are no longer substituted

gulp substituted `@name@` / `@url@` / `@version@` / `@color.*@` into every file
it copied, **JavaScript included**. Nothing does now. A survivor ships
literally — as a URL that 404s on install, or a badge colour the browser
rejects. Both happened. Import from `src/branding.ts`; read the version from
`chrome.runtime.getManifest()`. CI greps `src/` for survivors.

### Load-order timing

Fifteen legacy page scripts end with `if (document.readyState === "loading")`.
Upstream concatenated them into one classic script at the end of `<body>`, so
readyState was `"loading"` and every initialiser deferred to `DOMContentLoaded`
— running after all files had evaluated. A module script is deferred, so
readyState is `"interactive"` and each file initialises on import, before its
dependencies exist.

`src/legacy/dom-ready.ts` captures the `DOMContentLoaded` registrations during
the legacy imports and runs them afterwards. It captures rather than
dispatching a synthetic event, because Bootstrap has already handled the real
one and would re-initialise. Import it before the legacy files and call
`flushDomReady()` after them.

### Background listeners register synchronously, at the top level

The MV3 worker is torn down when idle and restarted **by** the event it has to
handle. A listener added from inside a callback — even one awaiting a single
storage read — is not in place when that event is delivered, and the event is
lost. Upstream satisfied this by accident, its registrations being the last
statements of a concatenated script.

So in `entrypoints/background.ts`: every `addListener` at module scope, and
anything else inside `defineBackground`'s `main()`. That split is also load
bearing for `wxt prepare`, which **imports the entrypoint** to read its options
against a fake browser that implements listeners but not `action.setIcon` — a
top-level `updateActionIcon()` fails the build with a `MockNotImplementedError`
pointing into `src/lib`, not into WXT.

Subscribing to `runtime.onStartup` is what makes the browser wake the worker at
launch, which is in turn what restores the badge colour. It does not survive a
restart, so dropping that listener would silently un-colour the badge.

### Feature stylesheets must stay theme-blind

`src/public/features/css/**` is injected into other people's pages. Colours are
hardcoded on purpose: an outline that followed the extension's dark theme would
vanish on a dark site and read as a broken feature. The in-page widgets are the
opposite — they are the extension's own chrome and should follow the theme, via
`data-wd-theme` on the widget root, never `prefers-color-scheme`. CI greps for
violations.

### WXT specifics

- Entrypoints must be flat: `name.ts` or `name/index.ts`. Nested directories
  are silently ignored. This is why injected bundles are `/feature-images.js`
  and not `/features/js/images.js`.
- `publicDir` resolves against the **project root**, not `srcDir`.
- Firefox still defaults to MV2; `manifestVersion: 3` is pinned for both.
- `action.default_title` comes from the popup's `<title>`, so it is
  `__MSG_extensionName__`; the document title is set at runtime instead.
- Entrypoint options come from `<meta name="manifest.*">` tags, e.g.
  `open_in_tab` on the options page. WXT generates `options_ui` itself.

### Per-browser differences

A bundler cannot express upstream's build-time exclusion of
`overlay/disable.js` for Firefox — an ES import is static. `src/lib/
capabilities.ts` detects `chrome.contentSettings` at runtime; the popup imports
`disable.js` dynamically behind that check and marks the document, which drives
a rule in `overlay.css`. `browsingData` **does** exist on Firefox; only
`contentSettings` is Chromium-only.

### Storage has a schema now; the legacy code reaches it through a shim

`src/lib/storage` is the only implementation. `src/legacy/shims/storage.ts`
re-exposes the old callback API (`getItem(key, cb)` and friends) to the ~180
call sites still in `src/legacy/js`, including its habit of calling back with
`null` rather than `undefined` — ported and unported readers have to agree on
what "unset" looks like. Same for `shims/locales.ts` over `lib/i18n`.

Two things follow. Per-tab feature state lives in **`storage.session`** under
`tab:<id>`, not in `storage.local` under the bare numeric id: tab ids are
session-scoped, so entries for tabs open at shutdown used to persist forever
and then collide with a reused id. And the numbered settings (`tool_3_url`,
`resize_1_width`) are still flat, because the legacy options page reads and
writes those exact names; collapsing them to arrays is migration v2, in the
phase that rewrites that page.

### `shims/dom` must be imported _after_ `common.js` and `css.js`

Fourteen DOM helpers moved to `src/lib/dom`, but ~130 call sites in
`src/legacy/js` still reach them through `WebDeveloper.Common` and
`WebDeveloper.CSS`. `src/legacy/shims/dom.ts` overwrites those namespace
entries so one implementation is live, rather than leaving the ported copy
under test and the original running in the features.

Overwriting only works in import order, and ES imports are hoisted — an import
at the top of `common.js` would run _before_ its own definitions and be undone
by them. So every entrypoint loading `common.js` or `css.js` loads the shim on
the line after, and the now-dead originals stay in those files until the
feature bundles are ported and the files are deleted.

Migrations are keyed by the version they produce and run in order, each
awaited — `SCHEMA_VERSION` in `schema.ts` must match the highest key in
`MIGRATIONS`. They must be no-ops on empty storage, because a fresh install
goes through the same path.

## Verification

The smoke server checks wiring, not behaviour. It cannot catch anything that
only appears on install or when a feature is applied to a real page — both
regressions above slipped past it, lint, types and tests.

So: **install the extension and test one feature per mechanism.** Toggle a
stylesheet (Outline Tables), an injected script (Display Image Dimensions), a
one-shot action (Clear Form Fields), a report (View Link Information), a
content setting (Disable JavaScript, Chrome only), and a widget (Display Ruler,
Edit CSS — the highest-risk group).

Golden snapshots in `tests/__snapshots__` pin the extractor output taken from
the legacy implementation. A diff means the port changed behaviour and needs
justifying — regenerating them to make a test pass defeats their purpose.

Two extractor branches are unreachable from vitest and need
`tools/extractor-harness.py`, which bundles `src/content` and serves it beside
a fixture in a real browser. happy-dom fetches a `<link href>` for real, the
fetch fails, and `sheet` stays null — so the whole linked-stylesheet half of
`getDocumentCSS` never runs, `@import` following included. And
`getDocumentColors` reads `getComputedStyle`, which happy-dom implements only
partially, so a colour arriving by cascade or inheritance is invisible to the
snapshots. Both were verified correct after the port; the harness docstring
records the expected output.

`tests/setup/i18n.ts` gives the fake browser a real `getMessage`, resolved
against `en_US` including placeholders, because `@webext-core/fake-browser`
throws for it and a stub returning `""` would let a test pass against a message
key that does not exist.

Note that `smoke-serve.py` refuses to start if the port is already serving. It
used to set `allow_reuse_address`, which on Windows lets a second server bind
over one left running from an earlier session — while the _old_ one keeps
answering. The symptom is a smoke run against a stale build, which reads as a
real failure.

## Status

Phases 0 and 1 are done and verified in-browser: the fork is rebranded, gulp is
gone, both targets build, and all ~119 features work.

Phase 2 has landed the core: typed storage with ordered migrations, per-tab
state in `storage.session`, generated message keys, the typed background
contract, and `background.js`/`storage.js`/`locales.js`/`upgrade.js` deleted in
favour of `src/lib` plus the two shims. Verified in-browser. Still open in this
phase: collapsing the numbered settings (v2,
deferred with the options page) and the spike on whether `chrome.i18n` is
reachable from an injected script's isolated world — if it is, ~40 call sites
stop passing pre-resolved strings through `args`. `hasI18n()` in `lib/i18n.ts`
is there for that check. Verify, do not assume.

`Generated.addItem` takes the target id now. It used to assume `item-N`, which
only the reports built through `Generated.output` use — the cookie and form
reports label their entries `cookie-N` and `form-N`, so every sidebar link on
those two pages pointed at an id that did not exist and silently did nothing.
Upstream bug, and adjacent to PR #36 without being it.

Upstream PRs #40 and #37 landed as-is; #39 only half — `hideImages` really is
`img { display: none }` plus `background-image: none`, so "Remove Images" is
right and was taken.

The other half was rejected on a **wrong reading**, corrected once the golden
snapshot showed what the feature does: `makeImagesInvisible` swaps background
images for a transparent PNG _and_ rewrites every `<img src>` to that PNG,
having first pinned the natural width and height onto the element. So it does
touch `<img>` — the difference from Remove Images is that the layout box
survives, which is the whole point of the feature and what "invisible" says
that "hidden" would not. The current name stays for that reason, not for the
reason first recorded.

Phase 3: `content.js` is ported to `src/content` and confirmed in-browser, and
the Outline bundle is ported to `src/features/outline.ts`. Both were done under
golden snapshots taken from the legacy implementation first, and both left the
`.snap` files byte-identical — that equality is the evidence, not the fact that
the tests pass.

The feature bundles have their own kind of snapshot: they return nothing and
only mutate the DOM, so `tests/outline-features.test.ts` asserts on the
mutation — which `[id^=web-developer-]` elements exist, and which elements
carry a `web-developer-` class. That is the failure mode the executeScript
closure bug had, so it is the one worth pinning. The built bundle was also
loaded in a browser and driven directly, since it is the built artifact that
shipped broken last time.

`WebDeveloper.Common.displayNotification` means two different things by
context and always has: in the popup it renders a notification, in an injected
script it sends one to the popup to render. Upstream defined it twice and never
loaded both. `shims/notify.ts` is the injected half — loading it in the popup
would make the popup message itself.

Still legacy: the Forms and Information bundles, and
`common.js`/`css.js`/`cookies.js`.

Then the Svelte popup behind a typed feature registry. Full plan:
`~/.claude/plans/chrispederick-web-developer-https-githu-adaptive-marble.md`.

`src/legacy/js` shrinks each phase; when it is empty, delete it along with
`globals.ts`, `dom-ready.ts`, the `allowJs` exclusion in `tsconfig.json`, the
`src/types/legacy.d.ts` shim and the closure guard.

`HOMEPAGE_URL` in `src/branding.ts` is confirmed as the intended address; the
repository behind it is not published yet, so the help links in the locales
404 until it is.
