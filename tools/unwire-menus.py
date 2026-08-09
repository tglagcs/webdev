#!/usr/bin/env python3
"""Takes the menu wiring out of the legacy overlay initialisers.

The Svelte popup renders the menus from the registry: it draws the label from
`labelKey` and dispatches the click itself. The eleven `initialize()` functions
did both against `document.getElementById("<feature-id>")`, which no longer
returns anything -- so every line that reaches for a feature item has to go, or
the initialiser throws on the first one and takes the rest of its file with it.

What stays is everything else those functions do: the add-cookie and resize
dialogs, the options page links, and any listener that is not a menu item.

Run once and check the diff. The files are deleted a menu at a time as their
handlers are ported.

    python tools/unwire-menus.py --write
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OVERLAY = ROOT / "src/legacy/js/overlay"
IDS = json.loads((ROOT / "tests/fixtures/feature-ids.json").read_text(encoding="utf-8"))

DECLARATION = re.compile(r'^\s*var\s+(\w+)\s*=\s*document\.getElementById\("([a-z0-9-]+)"\);\s*$')


def unwire(text: str) -> tuple[str, int]:
    """Drops the declarations of feature items and every line using them."""
    lines = text.split("\n")
    variables: set[str] = set()
    kept: list[str] = []
    removed = 0

    for line in lines:
        declaration = DECLARATION.match(line)

        if declaration and declaration.group(2) in IDS:
            variables.add(declaration.group(1))
            removed += 1

            continue

        # A line mentioning one of those variables is menu wiring: the label,
        # the click listener, or the content-setting state.
        if any(re.search(rf"\b{variable}\b", line) for variable in variables):
            removed += 1

            continue

        kept.append(line)

    # Collapse the blank runs the deletions leave behind.
    collapsed: list[str] = []

    for line in kept:
        if not line.strip() and collapsed and not collapsed[-1].strip():
            continue

        collapsed.append(line)

    return "\n".join(collapsed), removed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    arguments = parser.parse_args()

    for source in sorted(OVERLAY.glob("*.js")):
        text = source.read_text(encoding="utf-8")
        unwired, removed = unwire(text)

        print(f"{source.name:20} {removed:3} lines of menu wiring")

        if arguments.write and removed:
            source.write_text(unwired, encoding="utf-8")


if __name__ == "__main__":
    main()
