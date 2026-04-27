#!/usr/bin/env python3
"""Sync all notes from Obsidian vault's blog/ folder to Quartz content."""

import shutil
from pathlib import Path

VAULT = Path("/home/osmfirst/Dropbox/obsidian_storage/2ndSeminBrain")
BLOG_DIR = VAULT / "blog"
CONTENT = Path("/home/osmfirst/quartz/content")


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
    if not BLOG_DIR.exists():
        raise SystemExit(f"Blog folder not found: {BLOG_DIR}")
    CONTENT.mkdir(parents=True, exist_ok=True)
    clean_content()

    count = 0
    for md in BLOG_DIR.rglob("*.md"):
        rel = md.relative_to(BLOG_DIR)
        if any(part.startswith(".") for part in rel.parts):
            continue
        dest = CONTENT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(md, dest)
        print(f"  copied: {rel}")
        count += 1

    print(f"\nDone. {count} note(s) published.")


if __name__ == "__main__":
    main()