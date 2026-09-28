#!/usr/bin/env python3
"""Create a checksummed manifest and versioned TRUSS repository archive."""

from __future__ import annotations

import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
MANIFEST = ROOT / "manifest.json"
ARCHIVE = ROOT / "dist" / f"TRUSS_Sales_Intelligence_Repository_v{VERSION}.zip"


def included_files():
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if path == ARCHIVE or path == MANIFEST or "__pycache__" in relative.parts:
            continue
        yield path


def digest(path):
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(block)
    return hasher.hexdigest()


def main():
    files = list(included_files())
    manifest = {
        "name": "TRUSS Sales Intelligence Repository",
        "version": VERSION,
        "built_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "file_count_excluding_manifest": len(files),
        "files": [
            {
                "path": path.relative_to(ROOT).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": digest(path),
            }
            for path in files
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(MANIFEST, MANIFEST.relative_to(ROOT).as_posix())
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())
    print(ARCHIVE)


if __name__ == "__main__":
    main()
