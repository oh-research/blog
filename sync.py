#!/usr/bin/env python3
"""Sync notes with `publish: true` from Obsidian vault to Quartz content."""

import re
import shutil
from pathlib import Path

VAULT = Path("/home/osmfirst/Dropbox/obsidian_storage/2ndSeminBrain")
CONTENT = Path("/home/osmfirst/quartz/content")

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
PUBLISH_RE = re.compile(r"^\s*publish\s*:\s*true\s*$", re.MULTILINE)


def has_publish_true(text: str) -> bool:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return False
    return bool(PUBLISH_RE.search(match.group(1)))


def clean_content() -> None:
    """Remove everything in content/ except index.md."""
    for item in CONTENT.iterdir():
        if item.name == "index.md":
            continue
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()


def main() -> None:
    if not VAULT.exists():
        raise SystemExit(f"Vault not found: {VAULT}")
    CONTENT.mkdir(parents=True, exist_ok=True)
    clean_content()

    count = 0
    for md in VAULT.rglob("*.md"):
        rel = md.relative_to(VAULT)
        if any(part.startswith(".") for part in rel.parts):
            continue
        try:
            text = md.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if not has_publish_true(text):
            continue
        dest = CONTENT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(md, dest)
        print(f"  copied: {rel}")
        count += 1

    print(f"\nDone. {count} note(s) published.")


if __name__ == "__main__":
    main()