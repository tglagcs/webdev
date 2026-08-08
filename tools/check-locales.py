#!/usr/bin/env python3
"""Check every translation against the default locale.

A key present in a translation but not in en_US is dead weight at best and a
typo at worst -- chrome.i18n just falls back, so nothing tells you. Missing
keys are only reported, since falling back to English is a reasonable state
for a translation that has not caught up yet.

Placeholders are checked too: $1 dropped in translation breaks the
substitution silently.
"""

import json
import pathlib
import re
import sys

LOCALES = pathlib.Path(__file__).resolve().parent.parent / "src" / "public" / "_locales"
DEFAULT = "en_US"

PLACEHOLDER = re.compile(r"\$\d")


def load(name: str) -> dict[str, dict[str, str]]:
    return json.loads((LOCALES / name / "messages.json").read_text(encoding="utf-8"))


def main() -> int:
    default = load(DEFAULT)
    failed = False

    for directory in sorted(LOCALES.iterdir()):
        if not directory.is_dir() or directory.name == DEFAULT:
            continue

        messages = load(directory.name)
        extra = sorted(set(messages) - set(default))
        missing = sorted(set(default) - set(messages))

        if extra:
            print(f"{directory.name}: {len(extra)} key(s) not in {DEFAULT}: {', '.join(extra)}")
            failed = True

        if missing:
            print(f"{directory.name}: {len(missing)} key(s) missing, will fall back to {DEFAULT}")

        for key in sorted(set(messages) & set(default)):
            wanted = set(PLACEHOLDER.findall(default[key]["message"]))
            got = set(PLACEHOLDER.findall(messages[key]["message"]))
            if wanted != got:
                print(f"{directory.name}: {key} placeholders {sorted(got)} != {sorted(wanted)}")
                failed = True

        if not extra and not missing:
            print(f"{directory.name}: matches {DEFAULT} ({len(messages)} keys)")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
