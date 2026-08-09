#!/usr/bin/env python3
"""Transcribes the popup's menus into the typed feature registry.

The registry has to say, for every one of the ~119 features, which menu and
column it belongs to, which message key labels it, whether it is a toggle or a
one-shot, and which handler runs it. All four already exist -- spread across
`popup/index.html` and the eleven `overlay/*.js` initialisers -- so they are
read from there rather than retyped, which is the part of this phase most
likely to go wrong by hand.

Run once, check the output, commit it. This is not a build step, and it can no
longer be re-run: `popup/index.html` was replaced by the Svelte app it made
possible, so the registry is the source of truth now and this file is the
record of where it came from.

    python tools/extract-registry.py            # print a summary
    python tools/extract-registry.py --write    # write src/features/menus/*.ts
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

import json

ROOT = pathlib.Path(__file__).resolve().parent.parent
POPUP = ROOT / "src/entrypoints/popup/index.html"
OVERLAY = ROOT / "src/legacy/js/overlay"
OUTPUT = ROOT / "src/features/menus"
MESSAGES = ROOT / "src/public/_locales/en_US/messages.json"

# <div id="css-menu" ...> ... </div> for each tab pane, in document order.
MENU_PANE = re.compile(r'<div id="([a-z-]+)-menu"[^>]*class="[^"]*tab-pane[^"]*"[^>]*>')
COLUMN = re.compile(r'<div class="col-auto">')
ITEM = re.compile(r'<li><a href="#" id="([a-z0-9-]+)"[^>]*>(.*?)</a></li>', re.S)

# var fooMenu = document.getElementById("feature-id");
DECLARATION = re.compile(r'var\s+(\w+)\s*=\s*document\.getElementById\("([a-z0-9-]+)"\);')
# fooMenu.append(WebDeveloper.Locales.getString("labelKey"));
# disable.js spells the same thing appendChild(createTextNode(...)), so both.
LABEL = re.compile(
    r'(\w+)\.(?:append|appendChild)\((?:document\.createTextNode\()?'
    r'WebDeveloper\.Locales\.getString\("(\w+)"\)'
)
# fooMenu.addEventListener("click", WebDeveloper.Overlay.Css.disableAllStyles);
# Four items wrap the call to pass an argument, so the argument is captured
# with it: those handlers differ only in what they are given.
HANDLER = re.compile(
    r'(\w+)\.addEventListener\("click",\s*'
    r'(?:function\(\)\s*\{\s*)?'
    r'(WebDeveloper\.Overlay\.[\w.]+)'
    r'(?:\((("[^"]*"|true|false)?)\))?'
)


# Verbs that open a report tab rather than change the page.
REPORT_VERBS = {"View", "Find", "Validate"}


def classify(label: str, stateful: bool) -> str:
    """What kind of thing the item is, from what it says it does.

    Four kinds, and the popup groups each menu by them -- the long menus were
    a flat list of up to 24 items with nothing to tell a switch from a report.

    Read from the English label because that is where the distinction is
    already written: a name ending in an ellipsis opens something the user
    then fills in, and the three report verbs are a closed set.
    """
    if stateful:
        return "toggle"

    if label.endswith("..."):
        return "dialog"

    return "report" if label.split()[0] in REPORT_VERBS else "action"


def parse_popup() -> list[dict]:
    """Every menu item, with its menu, column and whether it is a toggle.

    A toggle carries the two state icons the popup swaps between; a one-shot
    carries an empty span. That distinction is what the menu means by "active",
    so it is read from the markup rather than guessed from the handler.
    """
    html = POPUP.read_text(encoding="utf-8")
    panes = list(MENU_PANE.finditer(html))
    items: list[dict] = []

    for index, pane in enumerate(panes):
        menu = pane.group(1)
        end = panes[index + 1].start() if index + 1 < len(panes) else len(html)
        body = html[pane.end() : end]

        # Column boundaries inside this pane, so each item knows its column.
        columns = [match.start() for match in COLUMN.finditer(body)]

        for item in ITEM.finditer(body):
            column = sum(1 for start in columns if start < item.start())

            items.append(
                {
                    "id": item.group(1),
                    "menu": menu,
                    "column": max(column, 1),
                    "stateful": "i-check" in item.group(2),
                }
            )

    return items


def parse_overlay() -> tuple[dict[str, str], dict[str, str]]:
    """id -> message key, and id -> (handler, argument)."""
    labels: dict[str, str] = {}
    handlers: dict[str, tuple[str, str]] = {}

    for source in sorted(OVERLAY.glob("*.js")):
        text = source.read_text(encoding="utf-8")
        variables = {name: element for name, element in DECLARATION.findall(text)}

        for variable, key in LABEL.findall(text):
            if variable in variables:
                labels[variables[variable]] = key

        for variable, handler, argument, _ in HANDLER.findall(text):
            if variable in variables:
                handlers[variables[variable]] = (handler, argument)

    return labels, handlers


def menu_module(menu: str, items: list[dict]) -> str:
    entries = []

    for item in items:
        fields = [
            f'    id: "{item["id"]}",',
            f'    labelKey: "{item["labelKey"]}",',
            f"    column: {item['column']},",
        ]

        if item["stateful"]:
            fields.append("    stateful: true,")

        fields.append(f'    kind: "{item["kind"]}",')

        fields.append(f'    handler: "{item["handler"]}",')

        # Four items share a handler and differ only in what it is passed.
        if item["argument"]:
            fields.append(f'    argument: {item["argument"]},')
        entries.append("  {\n" + "\n".join(fields) + "\n  },")

    body = "\n".join(entries)

    return f'''/**
 * The {menu} menu.
 *
 * Transcribed from popup/index.html and overlay/{menu}.js by
 * tools/extract-registry.py -- the ids, columns and message keys are the ones
 * that shipped, and the per-tab state is stored under the id, so none of them
 * may be renamed.
 */

import type {{ Feature }} from "../types";

export const {menu.upper().replace("-", "_")}_FEATURES: Feature[] = [
{body}
];
'''


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    arguments = parser.parse_args()

    items = parse_popup()
    labels, handlers = parse_overlay()
    messages = json.loads(MESSAGES.read_text(encoding="utf-8"))
    missing: list[str] = []

    for item in items:
        item["labelKey"] = labels.get(item["id"], "")
        item["handler"], item["argument"] = handlers.get(item["id"], ("", ""))

        item["kind"] = (
            classify(messages[item["labelKey"]]["message"], item["stateful"])
            if item["labelKey"] in messages
            else ""
        )

        if not item["labelKey"] or not item["handler"]:
            missing.append(
                f"{item['id']}: label={item['labelKey'] or '?'} handler={item['handler'] or '?'}"
            )

    by_menu: dict[str, list[dict]] = {}
    for item in items:
        by_menu.setdefault(item["menu"], []).append(item)

    for menu, menu_items in by_menu.items():
        print(f"{menu:16} {len(menu_items):3} features")

    print(f"{'total':16} {len(items):3}")

    if missing:
        print("\nunresolved:", file=sys.stderr)
        for line in missing:
            print(f"  {line}", file=sys.stderr)

    if not arguments.write:
        return

    if missing:
        raise SystemExit("refusing to write with unresolved entries")

    OUTPUT.mkdir(parents=True, exist_ok=True)

    for menu, menu_items in by_menu.items():
        path = OUTPUT / f"{menu}.ts"
        path.write_text(menu_module(menu, menu_items), encoding="utf-8")
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
