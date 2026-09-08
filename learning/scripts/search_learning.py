#!/usr/bin/env python3
"""Offline rapid search agent for UltraIa learning sources.

Searches the learning/sources/ directory and learning/truth/ data completely offline.
No web dependency. Uses simple token-based search across all markdown files.

Usage:
  python learning/scripts/search_learning.py <query>    # search all sources
  python learning/scripts/search_learning.py -t truth <query>  # search truth only
  python learning/scripts/search_learning.py -s <slug>    # search in a specific source file
  python learning/scripts/search_learning.py --stats       # show stats about the corpus
"""

import sys
import os
import re
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES_DIR = ROOT / "sources"
TRUTH_DIR = ROOT / "truth"
RESPONSES_DIR = ROOT / "responses"
MEMORY_ZIP = ROOT / "memory" / "ultraia_memory.zip"


def search_sources(query, search_in="all", case_sensitive=False):
    """Search all learning sources for a query.
    
    Args:
        query: Search query string
        search_in: "all", "sources", "truth", "responses", or "memory"
        case_sensitive: Whether matching should be case-sensitive
    
    Returns:
        List of dicts with {file, path, matches, context}
    """
    results = []
    query_lower = query.lower() if not case_sensitive else query
    
    def search_file(filepath, content, filename):
        """Search within a single file's content."""
        if not case_sensitive:
            content_search = content.lower()
            query_use = query_lower
        else:
            content_search = content
            query_use = query
        
        # Find all occurrences
        positions = []
        start = 0
        while True:
            idx = content_search.find(query_use, start)
            if idx == -1:
                break
            # Get context: 100 chars before and after
            ctx_start = max(0, idx - 100)
            ctx_end = min(len(content), idx + len(query) + 100)
            context = content[ctx_start:ctx_end]
            # Trim to relevant portion
            if ctx_start > 0:
                context = "..." + context
            if ctx_end < len(content):
                context = context + "..."
            positions.append({
                "position": idx,
                "context": context.strip(),
                "match_text": content[idx:idx + len(query)]
            })
            start = idx + 1
        
        return positions
    
    # Search in sources directory
    if search_in in ("all", "sources"):
        if SOURCES_DIR.exists():
            for root, dirs, files in os.walk(SOURCES_DIR):
                for fname in files:
                    if fname.endswith(".md"):
                        fpath = Path(root) / fname
                        try:
                            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                                content = f.read()
                            positions = search_file(fpath, content, fname)
                            if positions:
                                results.append({
                                    "file": str(fpath.relative_to(ROOT)),
                                    "path": str(fpath),
                                    "matches": len(positions),
                                    "type": "source",
                                    "contexts": positions
                                })
                        except Exception:
                            pass
    
    # Search in truth directory
    if search_in in ("all", "truth"):
        if TRUTH_DIR.exists():
            for root, dirs, files in os.walk(TRUTH_DIR):
                for fname in files:
                    if fname.endswith(".json"):
                        fpath = Path(root) / fname
                        try:
                            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                                data = json.load(f)
                            # Search in JSON string representation
                            content = json.dumps(data, ensure_ascii=False).lower() if not case_sensitive else json.dumps(data, ensure_ascii=False)
                            query_use = query_lower if not case_sensitive else query
                            if query_use in str(content).lower():
                                # Find relevant cases
                                positions = []
                                cases = data.get("cases", [])
                                for i, c in enumerate(cases):
                                    c_str = json.dumps(c, ensure_ascii=False).lower() if not case_sensitive else json.dumps(c, ensure_ascii=False)
                                    if query_use in c_str:
                                        positions.append({
                                            "position": c_str.find(query_use),
                                            "context": json.dumps(c, ensure_ascii=False)[:200],
                                            "match_text": query
                                        })
                                if positions:
                                    results.append({
                                        "file": str(fpath.relative_to(ROOT)),
                                        "path": str(fpath),
                                        "matches": len(cases),
                                        "type": "truth",
                                        "cases": cases[:5]  # first 5 relevant
                                    })
                        except Exception:
                            pass
    
    # Search in responses directory
    if search_in in ("all", "responses"):
        if RESPONSES_DIR.exists():
            for root, dirs, files in os.walk(RESPONSES_DIR):
                for fname in files:
                    if fname.endswith(".json"):
                        fpath = Path(root) / fname
                        try:
                            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                                content = f.read()
                            positions = search_file(fpath, content, fname)
                            if positions:
                                results.append({
                                    "file": str(fpath.relative_to(ROOT)),
                                    "path": str(fpath),
                                    "matches": len(positions),
                                    "type": "responses",
                                    "contexts": positions
                                })
                        except Exception:
                            pass
    
    # Search in memory zip (extract and search)
    if search_in in ("all", "memory"):
        if MEMORY_ZIP.exists():
            try:
                import zipfile
                with zipfile.ZipFile(MEMORY_ZIP, "r") as z:
                    for name in z.namelist():
                        if name.endswith(".md") or name.endswith(".json"):
                            try:
                                content = z.read(name).decode("utf-8", errors="replace")
                                positions = search_file(
                                    Path(name), content, name
                                )
                                if positions:
                                    results.append({
                                        "file": name,
                                        "path": str(MEMORY_ZIP),
                                        "matches": len(positions),
                                        "type": "memory",
                                        "contexts": positions
                                    })
                            except Exception:
                                pass
            except Exception:
                pass
    
    # Sort by relevance (number of matches descending)
    results.sort(key=lambda x: x.get("matches", 0), reverse=True)
    return results


def search_pdfsearch(query):
    """Search using pdfsearch capability (OpenAlex + DDG filetype:pdf)."""
    # This would integrate with the pdfsearch tool, but for offline we just report
    # that this feature requires the pdfsearch tool
    return [{
        "file": "pdfsearch_tool",
        "path": "packages/core/src/tools/pdfsearch.ts",
        "matches": 0,
        "type": "pdfsearch",
        "note": "Requires pdfsearch_search tool: OpenAlex keyless + DDG filetype:pdf search"
    }]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "--stats":
        # Show corpus statistics
        total_files = 0
        total_lines = 0
        source_files = []
        
        if SOURCES_DIR.exists():
            for root, dirs, files in os.walk(SOURCES_DIR):
                for fname in files:
                    if fname.endswith(".md"):
                        fpath = Path(root) / fname
                        try:
                            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                                content = f.read()
                            lines = len(content.splitlines())
                            total_files += 1
                            total_lines += lines
                            source_files.append(f"{fpath.relative_to(ROOT)} ({lines} lines)")
                        except Exception:
                            pass
        
        print(f"=== Learning Corpus Statistics ===")
        print(f"Total source files: {total_files}")
        print(f"Total lines: {total_lines}")
        print()
        print("Files:")
        for f in source_files[:20]:
            print(f"  - {f}")
        if len(source_files) > 20:
            print(f"  ... and {len(source_files) - 20} more")
        print()
        
        # Truth stats
        if TRUTH_DIR.exists():
            truth_files = 0
            truth_cases = 0
            for root, dirs, files in os.walk(TRUTH_DIR):
                for fname in files:
                    if fname.endswith(".json"):
                        truth_files += 1
                        fpath = Path(root) / fname
                        try:
                            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                                data = json.load(f)
                            truth_cases += len(data.get("cases", []))
                        except Exception:
                            pass
            print(f"Truth files: {truth_files}")
            print(f"Truth cases: {truth_cases}")
        
        # Memory zip
        if MEMORY_ZIP.exists():
            import zipfile
            with zipfile.ZipFile(MEMORY_ZIP, "r") as z:
                print(f"Memory bundle: {MEMORY_ZIP.name}")
                print(f"  Files in bundle: {len(z.namelist())}")
        
        return
    
    # Handle -t flag for truth-only search
    search_in = "all"
    if cmd == "-t" or cmd == "--truth":
        if len(sys.argv) < 3:
            print("Usage: python search_learning.py -t <query>")
            sys.exit(1)
        search_in = "truth"
        query = sys.argv[2]
    elif cmd == "-s" or cmd == "--source":
        if len(sys.argv) < 3:
            print("Usage: python search_learning.py -s <slug> [query]")
            sys.exit(1)
        slug = sys.argv[2]
        query = sys.argv[3] if len(sys.argv) > 3 else ""
        # Search in specific source file
        fpath = SOURCES_DIR / f"{slug}.md"
        if fpath.exists():
            try:
                with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                # Simple search
                if query:
                    matches = [m for m in re.findall(rf'.{{0,80}}{re.escape(query)}.{{0,80}}', content, re.IGNORECASE)]
                    print(f"=== {fpath} ===")
                    for m in matches[:10]:
                        print(f"  {m.strip()}")
                    print(f"\nTotal matches: {len(matches)}")
                else:
                    print(f"File: {fpath}")
                    print(f"Lines: {len(content.splitlines())}")
            except Exception as e:
                print(f"Error: {e}")
        else:
            print(f"Source file not found: {fpath}")
        sys.exit(0)
    else:
        query = cmd if len(sys.argv) == 2 else " ".join(sys.argv[1:])
    
    print(f"=== Offline Search: '{query}' ===")
    print(f"Searching in: {search_in}")
    print()
    
    results = search_sources(query, search_in=search_in)
    
    if not results:
        print("No matches found in the learning corpus.")
        return
    
    for i, r in enumerate(results[:20], 1):
        print(f"[{i}] {r['type'].upper()}: {r['file']}")
        if r['type'] == 'source':
            print(f"    Matches: {r['matches']}")
            for j, ctx in enumerate(r['contexts'][:3], 1):
                # Strip problematic chars for display
                ctx_display = ctx['context'].replace('\u200b', '').replace('\u2605', '★').replace('\u2606', '☆')
                try:
                    print(f"      {j}. {ctx_display.encode('ascii', 'replace').decode('ascii')}")
                except Exception:
                    print(f"      {j}. {ctx_display[:100]}...")
        elif r['type'] == 'truth':
            print(f"    Cases: {r.get('cases', [])[:3]}")
        elif r['type'] == 'responses':
            print(f"    Matches: {r['matches']}")
        print()
    
    if len(results) > 20:
        print(f"... and {len(results) - 20} more results.")


if __name__ == "__main__":
    main()