WebDev
======

WebDev adds a toolbar button with a large set of web developer tools — inspecting and editing CSS, forms, images, page structure, cookies and more — to Chrome, Edge, and Firefox.

It is a fork of [Web Developer](https://github.com/chrispederick/web-developer) by Chris Pederick, which has not seen a release since July 2024. See [notice.md](notice.md) for attribution.

Status
------

This fork is being rebuilt. The upstream extension is functionally solid but its build system (Gulp 3.9.1) no longer runs on current Node, and the source predates modules, types and any automated tests.

The rebuild is incremental — the extension stays loadable at every step — and covers:

- TypeScript throughout, replacing the global `WebDeveloper.*` namespace and `gulp-concat` bundling
- [WXT](https://wxt.dev/) + Vite in place of Gulp
- Svelte 5 + Tailwind for the popup, options and report pages
- A dark theme
- A typed feature registry, driving menu search and keyboard shortcuts
- Vitest and Playwright coverage, and CI

Progress is tracked against the phases described in the rebuild plan.

Browsers
--------

Chrome, Edge and Firefox are supported. Opera was dropped in this fork.

The Disable menu and _Disable Cookies_ depend on `chrome.contentSettings`, which only Chromium provides — they are hidden on Firefox.

Developers
----------

### Build process

    npm install
    npm run build          # Chrome and Edge, into .output/chrome-mv3
    npm run build:firefox   # Firefox, into .output/firefox-mv3

Load the unpacked extension from `.output/chrome-mv3` via `chrome://extensions`, or `.output/firefox-mv3/manifest.json` via `about:debugging`.

    npm test        # vitest
    npm run typecheck
    npm run lint

`tools/smoke-serve.py` serves a build over HTTP with the browser APIs stubbed, for checking that the pages load and wire themselves up without installing the extension.

### Brand assets

`brand/logo.png` is the master logo. Everything under `src/public/img/logos/` and `src/public/svg/logos/` is generated from it and must not be hand-edited:

    python tools/generate-icons.py

### Included libraries

The following libraries are used by and included in the extension as-is:

- Bootstrap: [https://getbootstrap.com/](https://getbootstrap.com/)
- CodeMirror: [https://codemirror.net/](https://codemirror.net/)
- DOMPurify: [https://github.com/cure53/DOMPurify](https://github.com/cure53/DOMPurify)
- Eric Meyer's Reset CSS: [https://meyerweb.com/eric/tools/css/reset/](https://meyerweb.com/eric/tools/css/reset/)
- JS Beautifier: [https://github.com/beautify-web/js-beautify](https://github.com/beautify-web/js-beautify)
- mustache.js: [https://github.com/janl/mustache.js/](https://github.com/janl/mustache.js/)

These are vendored in `src/public/lib/` and move to npm dependencies as the interface is rewritten.

### Icons

The interface icons are from [Nucleo](https://nucleoapp.com) and carry their own license. New interface icons should come from there for consistency.

### Editor configuration

An [EditorConfig](https://editorconfig.org/) file is included to unify the coding style for different editors.

License
-------

Distributed under the terms of the [GNU General Public License v3](https://www.gnu.org/licenses/gpl-3.0.txt), as required by the upstream project.

This does not apply to the included libraries or icons mentioned above, which have their own individual licenses.
