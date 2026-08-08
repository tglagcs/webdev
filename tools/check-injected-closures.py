#!/usr/bin/env python3
"""Fail if an injected closure references the module binding.

chrome.scripting.executeScript({ func }) serialises the function to source and
runs it in the target page, with no closure and no imports. A reference to the
imported WebDeveloper binding is minified to something like `t`, which does not
exist in the page: the call throws and the feature silently does nothing. The
popup shows no error, the menu item still toggles, and nothing happens.

That shipped once already. The fix is to spell it globalThis.WebDeveloper,
which minifies intact because property names are not renamed.

This checks the source rather than the bundle, so the failure names the line to
fix. See tools/fix-injected-closures.py for the original migration.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OVERLAY = ROOT / "src" / "legacy" / "js" / "overlay"

INJECTORS = ("toggleFeatureOnTab", "addFeatureOnTab", "addScriptsToTab", "addScriptToTab")

CLOSURE = re.compile(r"function\s*\([^)]*\)\s*\{([^{}]*)\}")
BARE = re.compile(r"(?<![.\w])WebDeveloper\.")


def main() -> int:
    if not OVERLAY.exists():
        print("no legacy overlay directory; nothing to check")
        return 0

    failures = []

    for path in sorted(OVERLAY.glob("*.js")):
        for number, line in enumerate(path.read_text(encoding="utf-8").split("\n"), start=1):
            if not any(name + "(" in line for name in INJECTORS):
                continue

            for body in CLOSURE.findall(line):
                if BARE.search(body):
                    failures.append(f"{path.relative_to(ROOT)}:{number}: {body.strip()[:90]}")

    for failure in failures:
        print(f"injected closure uses the module binding, needs globalThis.WebDeveloper\n  {failure}")

    if failures:
        return 1

    print("ok: every injected closure references globalThis")
    return 0


if __name__ == "__main__":
    sys.exit(main())
