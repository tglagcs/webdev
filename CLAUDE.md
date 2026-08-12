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
    shims/               Storage / Locales / dom / cookies over the typed core
    js/                  38 files / ~10,600 lines of upstream ES5, being ported
  content/               the extractors feeding all 16 reports, + dispatch
  features/              all six injected bundles
  lib/
    dom/                 documents, css-values, elements, position, stylesheets
    i18n.ts              t(); i18n-keys.ts is generated from en_US
    storage/             schema, settings, tab-state, migrations, defaults
    messaging.ts         the typed background message contract
    badge.ts  capabilities.ts  content-settings.ts  cookies.ts
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

### An injected widget owns listeners the page keeps

`removeMatchingElements("#web-developer-dashboard")` takes the iframe out of
the page. It does not take out the `mouseover` handler Element Information put
on the _host_ document, so the hover outline went on following the mouse over
a page with no dashboard on it.

Anything a widget attaches outside its own iframe has to be undone explicitly,
and from **both** routes: the popup switching the feature off, and the widget's
own close button. `ElementInformation.teardown()` exists so the two share one
implementation, and `Dashboard.close()` calls it.

The same applies to `window` listeners in the injected bundles. Upstream
referenced its resize handlers through the namespace, which the bundle
reassigns on every injection, so `removeEventListener` was given a different
function from the one added and each toggle left another listener behind. The
handler is anchored on `globalThis` for that reason.

### A second exit route means `setStyleSheet`, not `toggleStyleSheet`

`toggleStyleSheet` inverts whatever it finds. That is correct only while there
is exactly one way in and one way out — true of the ~25 features where the
toggle _is_ the feature, and false of every widget since the close button.

The close button did not remove `element-information.css`, which is
`* { cursor: crosshair !important }`. The page kept a crosshair, and the toggle
was then out of phase for the rest of the session: the next switch-on removed
the sheet and the next switch-off put it back — so the symptom read as "the
cursor stays after turning the feature off".

`setStyleSheet(url, id, doc, insertFirst, enabled)` takes the state the caller
wants; the widgets use it, and `teardown()` clears the sheet before its own
"never initialised" guard, since the sheet is what the user sees.

The same button broke `closeDashboardTab`, which recognised its last tab by
counting `<li>` against a constant — the button was a new item in that list, so
switching the feature off from the popup left an empty dashboard bar behind.
Tabs are counted by their `-tab` suffix now. Chrome that shares a container
with content must not be counted as content.

### The page's globals are not the popup's

`src/entrypoints/content.ts` puts `WebDeveloper.Common` and `.CSS` into the
isolated world and nothing else. `WebDeveloper.Locales` is **not** there, and a
widget reaching for it throws — which took Edit CSS out entirely, since the
throw happened while building the dashboard template. Use `chrome.i18n`
directly in page-side code, or have the popup pass the resolved strings in
`args`, which is what the existing widgets do.

This is also why the smoke server cannot catch it: its pages are the popup and
the report pages, where the locales shim _is_ loaded. Widget checks have to
load only what the content script loads.

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
capabilities.ts` detects `chrome.contentSettings` at runtime instead, and the
registry says which features need it; `visibleMenus()` drops them, and a menu
left with nothing loses its tab. `browsingData` **does** exist on Firefox; only
`contentSettings` is Chromium-only.

There is no Disable menu now. All six content-setting features — JavaScript,
notifications, popups and the reset in Miscellaneous, Disable Cookies in
Cookies, Disable Images in Images — sit with their subject, so no tab is
Chromium-only and Firefox is missing items rather than a whole section. Their
state is the one kind the extension does not own: the browser holds it, so it
is neither per tab nor in settings and is re-read from `contentSettings` at
every open. Keep it out of `syncWithTab`, which would otherwise clear it.

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

### A shim must be imported _after_ the legacy file it overwrites

Fourteen DOM helpers moved to `src/lib/dom`, but ~130 call sites in
`src/legacy/js` still reach them through `WebDeveloper.Common` and
`WebDeveloper.CSS`. `src/legacy/shims/dom.ts` overwrites those namespace
entries so one implementation is live, rather than leaving the ported copy
under test and the original running in the features. `shims/cookies.ts` does
the same for the five cookie operations over what is left of `cookies.js`.

Overwriting only works in import order, and ES imports are hoisted — an import
at the top of `common.js` would run _before_ its own definitions and be undone
by them. So every entrypoint loading a legacy file loads its shim on the line
after, and the now-dead originals stay in that file until it is deleted.

`toggleAllStyleSheets` is the case that shows why this matters: it lived in
both `css.js` and, privately, in `features/css.ts`. The widgets got one copy
and Disable All Styles the other, and neither was under test.

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
phase: collapsing the numbered settings (v2, deferred with the options page).

The `chrome.i18n` spike is half answered. `chrome.i18n.getMessage` **is**
reachable from the page-side widgets — `Dashboard.closeLabel()` uses it in
Chrome, behind a try/catch fallback — but it has not been confirmed on Firefox
and the ~40 call sites still pass pre-resolved strings through `args`.
Converting them is a Phase 4 job, once the registry owns the payloads.
`hasI18n()` in `lib/i18n.ts` is there for that check.

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

The Forms bundle is ported too, under the same discipline and with the
snapshots unchanged, and driven in a real browser for the values happy-dom
cannot judge — the date, time, week and month strings a real input accepts.
That run showed the colour branch of Populate Form Fields is dead: an
`<input type="color">` reports `#000000` rather than `""`, so the caller's
"is it empty" test is never true for one. Upstream's, kept, and commented.

`css.js` is gone. Of `cookies.js` only the three delete-everything features
remain — a count, a confirmation dialog and a notification, which are popup UI
and are rewritten with the popup; the five operations are in `src/lib/cookies`.
One inconsistency there is pinned rather than fixed: `deleteCookie` leaves the
leading dot on a domain cookie's host where `addCookie` strips it, so the URL
it looks the cookie up by is `http://.example.com/`. It needs checking against
a real cookie store before it is called a bug.

`common.js` is gone too, and with it `src/legacy/js/features` and most of
`src/legacy/js/common`. Seven of its helpers had no caller anywhere and were
deleted rather than moved; `contains` and `inArray` were
`Array.prototype.includes` with looser equality, so their three string call
sites use the native. `getURLContents` is `fetch` now, keeping the contract the
two heavy reports depend on: it mutates the request objects with their content,
puts the error message in as content when a fetch fails, and calls back once
after the last one.

Still legacy: the three confirmation flows in `cookies.js`, plus the widgets,
the report pages, the options page and the popup — each in its own phase.

Four things landed ahead of their phase because in-browser testing asked for
them, and each cost a regression worth remembering — all of them in the seam
between a new affordance and code that assumed the old shape:

- A close button on the dashboard. Its two regressions are the section above.
- `popup_in_window`: the popup reopened as a standalone window, so it survives
  clicking the page. A popup cannot be made to stay open, and an extension
  cannot make a window always-on-top; the window is as far as this goes and the
  user accepted that.
- CSS beautified in Edit CSS and in the CSS report, through
  `lib/format-css.ts`. The first implementation was O(n²) — it rewrote the
  accumulated output per character — which only showed on a real minified
  sheet. It emits into an array behind pending-space/newline flags now and
  never reads back what it emitted; the 500KB test fails by timeout if that
  changes.
- Line wrapping and syntax highlighting in the JavaScript and CSS reports, both
  defaulted on. Highlighting shipped defaulting to off.

Fixed along the way, all upstream bugs rather than port regressions:
`Generated.addItem` linked to `#item-N` on pages labelling their entries
`cookie-N` and `form-N`, so those two reports' sidebars did nothing;
`displayObjectInformation` reused the outer loop's counters in its inner one,
so only the first `<object>` on a page was ever labelled; Display Hidden
Elements had no way back short of a reload and is a toggle now; syntax
highlighting defaulted to off and the reports had no line wrapping, so a
minified file was one row behind a horizontal scrollbar; Display Handheld and
Display Print Styles could not be switched off, because `addScriptToTab` ran
its callback only on a resolved `executeScript`, and a script returning
something non-clonable rejects — the callback is what records the state, so the
menu item stuck on.

Not upstream bugs but mine, both from the same habit and both invisible to
lint, types and tests: a guard dropped in a port (`insertAsFirstChild` checked
only its first argument, and the throw took Element Information's whole
mouseover handler with it), and a toggle used where the state was known (the
section above). The pattern to distrust is a defensive check that looks
redundant in isolation.

The cookie report is the one report that no longer goes through the content
script. It could only see same-origin frames, so a page whose frames are
third-party reported one section where devtools lists several; the popup builds
it from `scripting.executeScript({ allFrames: true })` instead, one section per
frame host. `localStorage` and `sessionStorage` come from the same call and the
same grouping, and are queued for phase 8 — see the plan.

Then the Svelte popup behind a typed feature registry. Full plan:
`~/.claude/plans/chrispederick-web-developer-https-githu-adaptive-marble.md`.

`src/legacy/js` shrinks each phase; when it is empty, delete it along with
`globals.ts`, `dom-ready.ts`, the `allowJs` exclusion in `tsconfig.json`, the
`src/types/legacy.d.ts` shim and the closure guard.

`HOMEPAGE_URL` in `src/branding.ts` is confirmed as the intended address; the
repository behind it is not published yet, so the help links in the locales
404 until it is.
