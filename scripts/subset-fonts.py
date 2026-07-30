#!/usr/bin/env python3
"""
Subset the Geist variable fonts and commit the result to src/fonts/.

The upstream `geist` package ships one variable woff2 per family covering the
full character set — 69KB each, 137KB combined, both of which the browser must
fetch before it can paint real text. This site is English and renders a known,
small repertoire, so almost all of that is glyphs nobody will ever see.

The output is committed rather than generated during `next build`, so the build
needs no Python and no font toolchain. Re-run this only when the geist package
is upgraded:

    pip install fonttools brotli
    python3 scripts/subset-fonts.py

The weight axis is preserved — the design system uses 400 through 700 from a
single file, and instancing it away would mean shipping four files instead.
"""

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "node_modules" / "geist" / "dist" / "fonts"
OUT = ROOT / "src" / "fonts"

# Kept deliberately wider than the current copy. The chat assistant can emit
# text this repo has never seen, and a missing glyph falls back to a system
# font mid-word — which looks like a bug. These ranges cover European Latin,
# the punctuation and currency a technical site actually uses, and the arrows
# and check marks that appear in UI copy.
UNICODES = ",".join(
    [
        "U+0020-007E",  # basic latin
        "U+00A0-00FF",  # latin-1 supplement
        "U+0100-017F",  # latin extended-A (accented names)
        "U+0192",  # florin
        "U+02C6-02DC",  # modifier letters
        "U+2010-2027",  # dashes, quotes, bullet, ellipsis
        "U+2030-2044",  # per-mille, primes, fractions
        "U+20A0-20BF",  # currency incl. naira
        "U+2122",  # trade mark
        "U+2190-2199",  # arrows
        "U+2202-22C5",  # common maths
        "U+2318-2326",  # command, delete
        "U+2713-2718",  # check and cross marks
        "U+25A0-25CF",  # geometric shapes used as bullets
        "U+FB01-FB02",  # fi/fl ligatures
    ]
)

FAMILIES = {
    "geist-sans/Geist-Variable.woff2": "Geist-Variable-subset.woff2",
    "geist-mono/GeistMono-Variable.woff2": "GeistMono-Variable-subset.woff2",
}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)

    for rel, name in FAMILIES.items():
        source = SRC / rel
        if not source.exists():
            print(f"missing {source} — run npm install first", file=sys.stderr)
            return 1

        target = OUT / name
        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.subset",
                str(source),
                f"--unicodes={UNICODES}",
                "--layout-features=kern,liga,calt,ccmp,cv11,ss01,tnum",
                "--flavor=woff2",
                f"--output-file={target}",
            ],
            check=True,
        )

        before = source.stat().st_size
        after = target.stat().st_size
        print(f"{name}: {before / 1024:.1f}KB -> {after / 1024:.1f}KB ({after / before:.0%})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
