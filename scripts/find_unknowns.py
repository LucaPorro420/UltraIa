#!/usr/bin/env python3
"""Find remaining unknown iterations."""
import re
import io
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

content = Path("loop-run-log.md").read_text(encoding="utf-8", errors="replace")
blocks = re.split(r"(?=##\s+(?:Iteraci[oó]n)\s+\d+)", content)

for block in blocks:
    m = re.search(r"(?:Iteraci[oó]n)\s+(\d+)", block)
    if not m:
        continue
    num = int(m.group(1))

    has_r = "**[R]" in block
    done_text = bool(re.search(r"\bDONE\b", block, re.I))
    pending_text = bool(re.search(r"\b(?:EN CURSO|CEDIDA|PAUSADA|WIP)\b", block, re.I))
    has_hash = bool(re.search(r"`[0-9a-f]{7,}`", block))

    if not has_r and not done_text and not pending_text:
        clean = re.sub(r"\*\*?\[.*?\]\*\*?", "", block)
        clean = re.sub(r"#{1,4}\s+", "", clean)
        clean = re.sub(r"\n+", " ", clean).strip()[:200]
        print(f"#{num} [hash={has_hash}]: {clean}")
