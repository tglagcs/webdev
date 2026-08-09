#!/usr/bin/env python3
"""Run the colour and CSS extractors in a real browser engine.

Two branches of the extractors cannot be reached from the vitest suite, and
they are not small ones:

  * getDocumentCSS's linked-stylesheet path. happy-dom fetches a <link> href
    for real, the fetch fails against a fixture URL, and `sheet` stays null --
    so the whole second half of that function never runs, including @import
    following and the screen-only filtering that Edit CSS depends on.
  * getDocumentColors. It reads getComputedStyle, which happy-dom implements
    only partially, so a colour arriving through the cascade or by
    inheritance is invisible to the snapshots.

This bundles src/content into one IIFE on window.__WD__ and serves it beside
a fixture built to exercise exactly those paths: a linked stylesheet, an
@import inside it, a print sheet, an alternate sheet, an embedded block, a
colour inherited rather than set, and rgb(1, 2, 3) -- whose hex form is the
one that loses a digit if the zero padding regresses.

    python tools/extractor-harness.py [--port 8790]

Then open the URL it prints and run in the console:

    __WD__.getColors()
    __WD__.getCSS()
    __WD__.getDocumentCSS(document, true)   // screen only, as Edit CSS calls it

Expected, as of the port:

    colors        #000000 #0000ff #010203 #112233 #46505a #ee6600
    getCSS        site.css imported.css print.css alt.css
    screen only   site.css imported.css
"""

import argparse
import functools
import http.server
import pathlib
import shutil
import socket
import socketserver
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
HARNESS = ROOT / "tests" / "harness"
BUILD = ROOT / ".harness"


def require_free(port: int) -> None:
    with socket.socket() as probe:
        if probe.connect_ex(("127.0.0.1", port)) == 0:
            raise SystemExit(f"port {port} is already serving; stop it or pass --port")


def build() -> None:
    # vite rather than esbuild: vite is already a dependency, and vite 8
    # bundles with rolldown, so esbuild is not present to call directly.
    subprocess.run(
        ["npx", "vite", "build", "--config", str(HARNESS / "vite.config.ts")],
        cwd=ROOT,
        check=True,
        shell=True,
    )

    for asset in HARNESS.glob("*.css"):
        shutil.copy(asset, BUILD / asset.name)

    shutil.copy(HARNESS / "page.html", BUILD / "page.html")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8790)
    args = parser.parse_args()

    require_free(args.port)
    BUILD.mkdir(exist_ok=True)
    build()

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(BUILD))

    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as server:
        print(f"\nopen http://127.0.0.1:{args.port}/page.html and run __WD__.getColors()")
        server.serve_forever()


if __name__ == "__main__":
    main()
