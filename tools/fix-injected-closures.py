#!/usr/bin/env python3
"""Make the injected closures reference the real global.

chrome.scripting.executeScript({ func }) serialises the function to source and
re-evaluates it in the target page. It carries no closure and no imports, so
every identifier in its body has to resolve against the page's own globals.

Upstream was fine: gulp-concat left WebDeveloper as a literal global, spelled
the same in the popup and in the injected bundle. Once each file imports it as
a module binding, the bundler renames it -- the popup chunk minifies it to `t`
-- and the serialised body reads `t.CSS.toggleAllStyles(...)`. There is no `t`
in the page, so the call throws and the feature silently does nothing.

Property names are never renamed, so `globalThis.WebDeveloper.` survives
minification intact. Rewrite only the bodies of closures passed to the
injection helpers; everything else runs in the popup, where the binding is
correct either way.

Run once. Kept as the record of the change, and paired with the check in
tools/check-injected-closures.py that stops it regressing.
"""

import pathlib
import re

OVERLAY = pathlib.Path(__file__).resolve().parent.parent / "src" / "legacy" / "js" / "overlay"

INJECTORS = ("toggleFeatureOnTab", "addFeatureOnTab", "addScriptsToTab", "addScriptToTab")

# Closure bodies contain no nested braces -- verified across all 82 call sites.
CLOSURE = re.compile(r"function\s*\(([^)]*)\)\s*\{([^{}]*)\}")


def rewrite_line(line: str) -> tuple[str, int]:
    if not any(name + "(" in line for name in INJECTORS):
        return line, 0

    count = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal count
        params, body = match.group(1), match.group(2)
        fixed = re.sub(r"(?<![.\w])WebDeveloper\.", "globalThis.WebDeveloper.", body)
        if fixed != body:
            count += 1
        return f"function({params}){{{fixed}}}"

    return CLOSURE.sub(replace, line), count


def main() -> None:
    total = 0

    for path in sorted(OVERLAY.glob("*.js")):
        lines = path.read_text(encoding="utf-8").split("\n")
        changed = 0
        out = []

        for line in lines:
            fixed, count = rewrite_line(line)
            changed += count
            out.append(fixed)

        if changed:
            path.write_text("\n".join(out), encoding="utf-8", newline="\n")
            print(f"{path.name}: {changed} closure(s)")
            total += changed

    print(f"\n{total} injected closures rewritten")


if __name__ == "__main__":
    main()
