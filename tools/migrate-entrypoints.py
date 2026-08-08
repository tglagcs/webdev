#!/usr/bin/env python3
"""One-shot Phase 1 migration: turn upstream's pages into WXT entrypoints.

Upstream had no module system -- gulp-concat was the module system, and pages
pulled their code in with a run of <script src> tags. This rewrites each page
to load a single ES module entrypoint that imports the same legacy files in
the same order, so behaviour is unchanged while the build becomes a bundler's
job.

The concat orders are transcribed from common/gulp/build.js (kept in git
history) and must not be reordered casually: several legacy files run
top-level statements, not just definitions.

Run once. Kept in the tree as the record of how the move was made.
"""

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENTRYPOINTS = ROOT / "src" / "entrypoints"

NAME = "WebDev"
DESCRIPTION = "Adds a toolbar button with various web developer tools."
URL = "https://github.com/tglagcs/webdev/"

# Built URL -> path under src/legacy/js. Mirrors where common/gulp/build.js
# copied each file.
SCRIPT_URL = re.compile(r'^\s*<script src="/(common|overlay/js|options/js|generated/js|about/js)/([^"]+)"></script>\s*$')

AREA_TO_LEGACY = {
    "common": "common",
    "overlay/js": "overlay",
    "options/js": "options",
    "generated/js": "generated",
    "about/js": "about",
}

# overlay.js was a concat of common/js/overlay/* in glob (alphabetical) order.
# disable.js is deliberately absent: it self-initialises against
# chrome.contentSettings, so the popup imports it dynamically behind a
# capability check instead. Upstream excluded it at build time for Firefox.
OVERLAY_CONCAT = [
    "cookies",
    "css",
    "forms",
    "images",
    "information",
    "miscellaneous",
    "options",
    "outline",
    "overlay",
    "resize",
    "tools",
]


def legacy_imports_for(page: pathlib.Path) -> tuple[list[str], str]:
    """Strip the legacy <script> tags from a page, returning the import list."""
    text = page.read_text(encoding="utf-8")
    imports: list[str] = []
    output: list[str] = []
    placeholder_written = False

    for line in text.split("\n"):
        match = SCRIPT_URL.match(line)
        if not match:
            output.append(line)
            continue

        area, filename = match.groups()
        stem = filename.removesuffix(".js")

        if area == "overlay/js" and stem == "overlay":
            imports.extend(f"overlay/{name}" for name in OVERLAY_CONCAT)
        else:
            imports.append(f"{AREA_TO_LEGACY[area]}/{stem}")

        if not placeholder_written:
            output.append('<script type="module" src="./main.ts"></script>')
            placeholder_written = True

    return imports, "\n".join(output)


def substitute_tokens(text: str) -> str:
    return (
        text.replace("@url@@browser@/", URL)
        .replace("@url@", URL)
        .replace("@name@", NAME)
        .replace("@description@", DESCRIPTION)
    )


def write_main(directory: pathlib.Path, imports: list[str], extra: str = "") -> None:
    lines = [
        "// Loads the legacy scripts this page used to pull in with <script src>",
        "// tags, in the order common/gulp/build.js concatenated them.",
        'import "@/legacy/globals";',
    ]
    lines += [f'import "@/legacy/js/{name}.js";' for name in imports]

    if extra:
        lines.append("")
        lines.append(extra.strip())

    (directory / "main.ts").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


POPUP_EXTRA = """
import { capabilities, markCapabilities } from "@/lib/capabilities";

// Hides what this browser cannot do; replaces the per-browser overlay.css
// override upstream concatenated in at build time.
markCapabilities();

// Imported dynamically because it initialises itself against
// chrome.contentSettings, which only Chromium has. Its initialiser runs on
// DOMContentLoaded or immediately, so arriving late is safe.
if (capabilities.contentSettings) {
  await import("@/legacy/js/overlay/disable.js");
}
"""


def main() -> None:
    for directory in sorted(ENTRYPOINTS.iterdir()):
        page = directory / "index.html"
        if not page.is_dir() and not page.exists():
            continue

        imports, html = legacy_imports_for(page)
        page.write_text(substitute_tokens(html), encoding="utf-8", newline="\n")

        extra = POPUP_EXTRA if directory.name == "popup" else ""
        write_main(directory, imports, extra)

        print(f"{directory.name}: {len(imports)} legacy imports")


if __name__ == "__main__":
    main()
