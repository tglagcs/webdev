#!/usr/bin/env python3
"""Generate the extension icon sets and logo SVGs from the master logo.

Source of truth is brand/logo.png. Everything under common/img/logos/ and
common/svg/logos/ is derived and should never be edited by hand -- re-run
this script instead:

    python tools/generate-icons.py

One variant is produced, the logo as authored. The gray and monochrome ones
went with the option that chose between them; the toolbar button is always
the colour logo.

The SVGs are redrawn parametrically rather than traced, because the raster
logo is a soft-shaded render and a trace of it would carry that shading into
a mark that has to stay legible at 16px. GEAR holds the measured geometry of
brand/logo.png -- the redraw covers 97% of the source silhouette, the
remainder being its drop shadow.
"""

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "brand" / "logo.png"
OUTPUT = ROOT / "common" / "img" / "logos"
SVG_OUTPUT = ROOT / "common" / "svg" / "logos"

SIZES = (16, 32, 48, 64, 128, 256)

# Gear geometry, measured off brand/logo.png and expressed against a 64x64
# viewBox. Radii are from the centre; the tooth angle is the half-width of a
# tooth measured at its mid radius.
GEAR = {
    "teeth": 8,
    "outer_radius": 31.84,
    "root_radius": 23.97,
    "hole_radius": 11.33,
    "tooth_half_angle": 14.0,
    "corner_radius": 2.22,
}

# Vertical gradient approximating the shading of the raster logo.
FILLS = {
    "color": ("#b8e63c", "#86c21f"),
}


def load_source() -> Image.Image:
    image = Image.open(SOURCE).convert("RGBA")

    if image.width != image.height:
        raise SystemExit(f"expected a square logo, got {image.width}x{image.height}")

    return image


def write_variant(name: str, image: Image.Image) -> None:
    directory = OUTPUT / name
    directory.mkdir(parents=True, exist_ok=True)

    for size in SIZES:
        # Downscale from the master every time rather than chaining resizes,
        # so 16px is not compounding the blur of 256px.
        resized = image.resize((size, size), Image.LANCZOS)
        resized.save(directory / f"{size}.png", optimize=True)

    print(f"{name}: {', '.join(f'{size}.png' for size in SIZES)}")


def gear_svg(variant: str) -> str:
    centre = 32.0
    outer = GEAR["outer_radius"]
    root = GEAR["root_radius"]
    half_width = ((outer + root) / 2) * math.sin(math.radians(GEAR["tooth_half_angle"]))

    # Teeth run from the outer radius to well inside the root circle, so the
    # two shapes merge without leaving a notch at the tooth's corners.
    top = centre - outer
    height = outer - root * 0.83

    teeth = "\n".join(
        f'      <rect x="{centre - half_width:.2f}" y="{top:.2f}" '
        f'width="{half_width * 2:.2f}" height="{height:.2f}" '
        f'rx="{GEAR["corner_radius"]:.2f}" '
        f'transform="rotate({index * 360 / GEAR["teeth"]:.0f} {centre} {centre})"/>'
        for index in range(GEAR["teeth"])
    )

    light, dark = FILLS[variant]

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="logo-{variant}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{light}"/>
      <stop offset="1" stop-color="{dark}"/>
    </linearGradient>
    <mask id="logo-{variant}-hole">
      <g fill="#fff">
        <circle cx="{centre}" cy="{centre}" r="{root:.2f}"/>
{teeth}
      </g>
      <circle cx="{centre}" cy="{centre}" r="{GEAR["hole_radius"]:.2f}" fill="#000"/>
    </mask>
  </defs>
  <rect width="64" height="64" fill="url(#logo-{variant})" mask="url(#logo-{variant}-hole)"/>
</svg>
"""


def write_svg(variant: str) -> None:
    directory = SVG_OUTPUT / variant
    directory.mkdir(parents=True, exist_ok=True)

    (directory / "logo.svg").write_text(gear_svg(variant), encoding="utf-8", newline="\n")

    print(f"{variant}: logo.svg")


def main() -> None:
    source = load_source()
    print(f"source: {SOURCE.relative_to(ROOT)} ({source.width}x{source.height})")

    write_variant("color", source)

    for variant in FILLS:
        write_svg(variant)


if __name__ == "__main__":
    main()
