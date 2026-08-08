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

python tools/check-injected-closures.py   # see "Injected closures" below
python tools/check-locales.py             # translations must subset en_US
python tools/smoke-serve.py --build chrome-mv3 --port 8730
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
    js/                  52 files / ~16,800 lines of upstream ES5, being ported
  lib/capabilities.ts    runtime browser feature detection
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

## Status

Phases 0 and 1 are done and verified in-browser: the fork is rebranded, gulp is
gone, both targets build, and all ~119 features work.

Upstream PRs #40 and #37 landed as-is; #39 only half — `hideImages` really is
`img { display: none }` so "Remove Images" is right, but renaming
`makeImagesInvisible` to "Hide Images" is wrong: it does not touch `<img>` at
all, it swaps background images for a transparent PNG.

Next is Phase 2 (typed storage with migrations, i18n key codegen, typed
messaging), then content.js and the feature bundles, then the Svelte popup
behind a typed feature registry. Full plan:
`~/.claude/plans/chrispederick-web-developer-https-githu-adaptive-marble.md`.

`src/legacy/js` shrinks each phase; when it is empty, delete it along with
`globals.ts`, `dom-ready.ts`, the `allowJs` exclusion in `tsconfig.json`, the
`src/types/legacy.d.ts` shim and the closure guard.

**Open:** `HOMEPAGE_URL` in `src/branding.ts` is a guess derived from the git
config. It feeds `homepage_url` and the help links in the locales.
