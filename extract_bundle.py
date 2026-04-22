#!/usr/bin/env python3
"""Extract resources from Planner-offline1.html into a planner-src-shaped tree.

Produces ./bundle-extracted/ mirroring ./planner-src/ layout so `diff -ruN`
between the two gives a readable, file-by-file comparison.
"""
from __future__ import annotations

import base64
import gzip
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BUNDLE = ROOT / "Planner-offline1.html"
SRC_TREE = ROOT / "planner-src"
OUT = ROOT / "bundle-extracted"
DIFF_FILE = ROOT / "bundle-diff.txt"

# Ordered names for plain <script src="UUID"> tags in the template — matches
# planner-src/index.html:10-13 (react, react-dom, babel, 01-constants).
PLAIN_SCRIPTS = [
    "vendor/react.development.js",
    "vendor/react-dom.development.js",
    "vendor/babel.min.js",
    "src/01-constants.js",
]

# Ordered names for <script type="text/babel" src="UUID"> tags. The bundle
# predates 11-audit.js, so only 9 entries (02..10, no audit).
BABEL_SCRIPTS = [
    "src/02-icons.js",
    "src/03-hooks.js",
    "src/04-kanban.js",
    "src/05-timeline.js",
    "src/06-task-modal.js",
    "src/07-notifications.js",
    "src/08-sync.js",
    "src/09-settings.js",
    "src/10-app.js",
]


def extract_bundler_block(html: str, kind: str) -> str:
    pattern = rf'<script type="__bundler/{kind}">(.*?)</script>'
    m = re.search(pattern, html, re.S)
    if not m:
        sys.exit(f"error: missing <script type=\"__bundler/{kind}\">")
    return m.group(1)


def decode_entry(entry: dict) -> bytes:
    raw = base64.b64decode(entry["data"])
    return gzip.decompress(raw) if entry.get("compressed") else raw


def build_uuid_map(template: str) -> dict[str, str]:
    """Map each UUID in the template to its target path under bundle-extracted/."""
    mapping: dict[str, str] = {}

    plain_iter = iter(PLAIN_SCRIPTS)
    babel_iter = iter(BABEL_SCRIPTS)

    # <script type="text/babel" src="UUID"> — match BEFORE plain <script src>
    # so the type attribute doesn't get swallowed by the plain pattern.
    for uuid in re.findall(
        r'<script type="text/babel" src="([0-9a-f-]+)"[^>]*></script>',
        template,
    ):
        try:
            mapping[uuid] = next(babel_iter)
        except StopIteration:
            sys.exit(f"error: more text/babel scripts in template than expected; extra uuid={uuid}")

    for uuid in re.findall(
        r'<script src="([0-9a-f-]+)"[^>]*></script>',
        template,
    ):
        if uuid in mapping:
            continue  # already claimed by the babel pass
        try:
            mapping[uuid] = next(plain_iter)
        except StopIteration:
            sys.exit(f"error: more plain scripts in template than expected; extra uuid={uuid}")

    # Fonts: url("UUID") inside @font-face. Use the first 8 hex chars as the
    # basename, matching planner-src/fonts/ convention.
    for uuid in re.findall(r'url\("([0-9a-f-]+)"\)\s*format\([\'"]woff2[\'"]\)', template):
        mapping[uuid] = f"fonts/{uuid.split('-', 1)[0]}.woff2"

    return mapping


def extract_inline_style(template: str) -> str | None:
    m = re.search(r"<style>(.*?)</style>", template, re.S)
    return m.group(1) if m else None


def main() -> int:
    if not BUNDLE.exists():
        sys.exit(f"error: {BUNDLE} not found")
    if not SRC_TREE.exists():
        sys.exit(f"error: {SRC_TREE} not found")

    html = BUNDLE.read_text(encoding="utf-8")
    manifest = json.loads(extract_bundler_block(html, "manifest"))
    template = json.loads(extract_bundler_block(html, "template"))

    uuid_to_path = build_uuid_map(template)

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()

    # Inline <style> → src/style.css
    inline_css = extract_inline_style(template)
    if inline_css is not None:
        css_path = OUT / "src" / "style.css"
        css_path.parent.mkdir(parents=True, exist_ok=True)
        css_path.write_text(inline_css, encoding="utf-8")

    unmapped: list[str] = []
    written = 0
    for uuid, entry in manifest.items():
        data = decode_entry(entry)
        rel = uuid_to_path.get(uuid)
        if rel is None:
            unmapped.append(f"{uuid}  mime={entry.get('mime')}  size={len(data)}")
            rel = f"_unmapped/{uuid}.bin"
        target = OUT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        written += 1

    print(f"extracted {written} assets → {OUT.relative_to(ROOT)}/")
    if inline_css is not None:
        print(f"inline style.css ({len(inline_css)} chars) → src/style.css")
    if unmapped:
        print(f"warning: {len(unmapped)} unmapped uuid(s) — see _unmapped/:")
        for line in unmapped:
            print(f"  {line}")

    # Run diff -ruN for a complete, readable report. Relative paths + cwd=ROOT
    # keep the generated bundle-diff.txt free of absolute system paths.
    try:
        result = subprocess.run(
            ["diff", "-ruN", SRC_TREE.name, OUT.name],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        sys.exit("error: 'diff' command not found — install diffutils to generate the report")
    # diff exits 0 (no differences) or 1 (differences). >1 signals a real error.
    if result.returncode > 1:
        print(f"warning: diff exited {result.returncode}:\n{result.stderr}")
    DIFF_FILE.write_text(result.stdout, encoding="utf-8")
    print(f"\nwrote {DIFF_FILE.relative_to(ROOT)} ({len(result.stdout):,} bytes)")

    # Summary: files that differ vs files only in one side.
    only_src: list[str] = []
    only_bundle: list[str] = []
    differ: list[str] = []
    for line in result.stdout.splitlines():
        if line.startswith("Only in "):
            # "Only in <dir>: <name>"
            m = re.match(r"Only in (.+?): (.+)$", line)
            if not m:
                continue
            where, name = m.group(1), m.group(2)
            path = f"{where}/{name}"
            if where.startswith(SRC_TREE.name):
                only_src.append(path)
            else:
                only_bundle.append(path)
        elif line.startswith("diff -ruN "):
            differ.append(line.split(" ", 3)[3] if len(line.split(" ")) >= 4 else line)

    print("\n=== summary ===")
    print(f"files differing: {len(differ)}")
    for p in differ:
        print(f"  ~ {p}")
    print(f"only in planner-src: {len(only_src)}")
    for p in only_src:
        print(f"  + {p}")
    print(f"only in bundle-extracted: {len(only_bundle)}")
    for p in only_bundle:
        print(f"  + {p}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
