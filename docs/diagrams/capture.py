"""Turn the rendered archify pages into the still images the README embeds.

`archify visual-check` also writes PNGs, but they are screenshots of the whole
viewer: a toolbar, a guided-views bar, a floating zoom control and a ~280px
empty column down the left. None of that can be clicked in a README, and the
buttons promise an interactivity a still image does not have.

So this takes the part that matters. Each delivered page holds the diagram as
one inline ``<svg>`` inside ``<div class="diagram-container">``, and the whole
stylesheet in one ``<style>`` block. Lift both into a minimal page sized to the
SVG's own viewBox, screenshot it with headless Chrome, and trim whatever uniform
border is left.

Both themes of a diagram are cropped with one shared box — the union of what
each needs. Cropped independently they differ by a few pixels, because
antialiasing puts the dark content edge further in, and a pair with different
dimensions makes the page jump when the README's ``<picture>`` swaps one for the
other as the reader's theme changes.

The legend's per-kind counts are injected by the viewer's JavaScript and do not
survive into a static page. Nothing else is lost.

Usage:
    python docs/diagrams/capture.py [name ...]

With no arguments it does both. Requires Chrome and a page already rendered by
`archify deliver`.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent.parent
DIAGRAMS = ROOT / "docs" / "diagrams"
ASSETS = ROOT / "docs" / "assets"
NAMES = ["architecture", "upscale-pipeline"]

# 1.6x the SVG's own coordinates: crisp enough to read at README width without
# doubling the byte count for nothing.
SCALE = 1.6
# Uniform breathing room left around the trimmed content, in output pixels.
PAD = 24

PAGE = """<!doctype html>
<html lang="en" data-theme="{theme}" data-preset="classic">
<head><meta charset="utf-8">
{style}
<style>
  html, body {{ margin:0; padding:0; width:{w}px; height:{h}px; overflow:hidden; }}
  .diagram-container {{ margin:0; padding:0; border:0; border-radius:0;
                        box-shadow:none; width:{w}px; height:{h}px; }}
  .diagram-container > svg {{ display:block; width:{w}px; height:{h}px; }}
</style>
</head>
<body><div class="diagram-container" data-detail-level="read">{svg}</div></body>
</html>
"""

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
    "chromium",
]


def find_chrome() -> str:
    for candidate in CHROME_CANDIDATES:
        if os.path.sep in candidate or "/" in candidate:
            if Path(candidate).exists():
                return candidate
        else:
            from shutil import which
            found = which(candidate)
            if found:
                return found
    raise SystemExit(
        "Chrome not found. Install it, or add its path to CHROME_CANDIDATES."
    )


def standalone_page(html: str, theme: str) -> tuple[str, int, int]:
    """The delivered page reduced to its stylesheet and its diagram."""
    style = re.search(r"<style>.*?</style>", html, re.S)
    svg = re.search(r"<svg viewBox=.*?</svg>", html, re.S)
    if not style or not svg:
        raise SystemExit("Could not find the <style> block or the <svg> in the page.")
    box = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg.group(0))
    width, height = round(float(box.group(1))), round(float(box.group(2)))
    return (
        PAGE.format(theme=theme, style=style.group(0), svg=svg.group(0),
                    w=width, h=height),
        width,
        height,
    )


def content_box(image: Image.Image) -> tuple[int, int, int, int]:
    """Where the drawing actually starts, against a corner-sampled background."""
    background = Image.new("RGB", image.size, image.getpixel((3, 3)))
    mask = ImageChops.difference(image, background).convert("L")
    return mask.point(lambda p: 255 if p > 10 else 0).getbbox()


def capture(name: str, chrome: str, workdir: Path) -> None:
    page = DIAGRAMS / f"{name}.html"
    if not page.exists():
        raise SystemExit(f"{page} is missing — run `archify deliver` for it first.")
    html = page.read_text(encoding="utf-8")

    shots: dict[str, Image.Image] = {}
    for theme in ("light", "dark"):
        markup, width, height = standalone_page(html, theme)
        source = workdir / f"{name}-{theme}.html"
        source.write_text(markup, encoding="utf-8")
        shot = workdir / f"{name}-{theme}.png"
        subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             f"--force-device-scale-factor={SCALE}",
             f"--window-size={width},{height}",
             f"--screenshot={shot}", source.as_uri()],
            check=True, capture_output=True,
        )
        shots[theme] = Image.open(shot).convert("RGB")

    boxes = [content_box(image) for image in shots.values()]
    width, height = next(iter(shots.values())).size
    left = max(0, min(b[0] for b in boxes) - PAD)
    top = max(0, min(b[1] for b in boxes) - PAD)
    right = min(width, max(b[2] for b in boxes) + PAD)
    bottom = min(height, max(b[3] for b in boxes) + PAD)

    for theme, image in shots.items():
        out = ASSETS / (f"{name}.png" if theme == "light" else f"{name}-dark.png")
        image.crop((left, top, right, bottom)).save(out, optimize=True)
    print(f"  {name:18s} {width}x{height} -> {right - left}x{bottom - top}")


def main() -> None:
    names = sys.argv[1:] or NAMES
    unknown = [n for n in names if n not in NAMES]
    if unknown:
        raise SystemExit(f"Unknown diagram(s): {', '.join(unknown)}. Known: {', '.join(NAMES)}")
    chrome = find_chrome()
    ASSETS.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name in names:
            capture(name, chrome, Path(tmp))


if __name__ == "__main__":
    main()
