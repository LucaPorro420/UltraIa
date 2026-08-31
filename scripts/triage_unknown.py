#!/usr/bin/env python3
"""Extract and classify unknown iterations from loop-run-log.md."""
import re
import json
import sys
import io
from pathlib import Path

# Windows cp1252 fix
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

def main():
    log_path = Path(__file__).resolve().parent.parent / "loop-run-log.md"
    if not log_path.exists():
        print("loop-run-log.md not found")
        sys.exit(1)

    content = log_path.read_text(encoding="utf-8", errors="replace")

    # Split into iteration blocks
    blocks = re.split(r"(?=##\s+(?:Iteración|Iteracion)\s+\d+)", content)

    results = {"done": [], "failed": [], "pending": [], "unknown": []}

    for block in blocks:
        m = re.search(r"(?:Iteración|Iteracion)\s+(\d+)", block)
        if not m:
            continue
        num = int(m.group(1))

        # Multiple verdict patterns
        has_done = bool(re.search(
            r"\[R\].*(?:DONE|GREEN|APPROVE|COMPLETED|PASS|VERDE|exito|éxito)",
            block, re.I
        ))
        has_failed = bool(re.search(
            r"\[R\].*(?:FAIL|REJECT|RED|ERROR|BLOQUEADO|crash)",
            block, re.I
        ))
        has_pending = bool(re.search(
            r"\[R\].*(?:PEND|SKIP|WAIT|WIP|EN PROGRESO|activo|pausado)",
            block, re.I
        ))

        # Also check for commit hashes (strong signal of completion)
        has_commit = bool(re.search(r"`[0-9a-f]{7,}`", block))

        # Check for [V] section (verification happened)
        has_v = bool(re.search(r"\[V\]", block))

        # Extract summary
        clean = re.sub(r"\*\*?\[.*?\]\*\*?", "", block)
        clean = re.sub(r"#{1,4}\s+", "", clean)
        clean = re.sub(r"\n+", " ", clean).strip()

        # Find task description (first meaningful line)
        desc_match = re.search(r"(?:Tarea|Objective|Goal|Scope|Implementa|Entrega|Commit)[：:]\s*(.+?)(?:\.|;|\n)", clean, re.I)
        desc = desc_match.group(1).strip()[:150] if desc_match else clean[:150]

        entry = {"num": num, "desc": desc, "has_commit": has_commit, "has_v": has_v}

        if has_done:
            results["done"].append(entry)
        elif has_failed:
            results["failed"].append(entry)
        elif has_pending:
            results["pending"].append(entry)
        else:
            # Try to infer from context
            if has_commit and has_v:
                entry["inferred"] = "likely_done"
                results["done"].append(entry)
            elif has_commit:
                entry["inferred"] = "committed_no_verdict"
                results["unknown"].append(entry)
            else:
                results["unknown"].append(entry)

    # Report
    print(f"=== LOOP TRIAGE ===")
    print(f"Done (explicit):    {len([x for x in results['done'] if not x.get('inferred')])}")
    print(f"Done (inferred):    {len([x for x in results['done'] if x.get('inferred')])}")
    print(f"Failed:             {len(results['failed'])}")
    print(f"Pending:            {len(results['pending'])}")
    print(f"Unknown:            {len(results['unknown'])}")
    total = sum(len(v) for v in results.values())
    resolved = len(results["done"]) + len(results["failed"])
    print(f"Resolution rate:    {resolved}/{total} = {resolved/total*100:.1f}%")
    print()

    if results["unknown"]:
        print("--- UNKNOWN ITERATIONS ---")
        for u in sorted(results["unknown"], key=lambda x: x["num"]):
            inf = f" [{u.get('inferred','')}]" if u.get("inferred") else ""
            commit = " [commit]" if u["has_commit"] else ""
            print(f"  #{u['num']}{inf}{commit}: {u['desc'][:100]}")

    if results["failed"]:
        print("\n--- FAILED ITERATIONS ---")
        for f in sorted(results["failed"], key=lambda x: x["num"]):
            print(f"  #{f['num']}: {f['desc'][:100]}")

    if results["pending"]:
        print("\n--- PENDING ITERATIONS ---")
        for p in sorted(results["pending"], key=lambda x: x["num"]):
            print(f"  #{p['num']}: {p['desc'][:100]}")

    # Save JSON for auto_improve
    out_path = Path(__file__).resolve().parent.parent / "resultTask" / "triage-results.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved to {out_path}")

if __name__ == "__main__":
    main()
