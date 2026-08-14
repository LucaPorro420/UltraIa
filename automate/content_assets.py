#!/usr/bin/env python3
"""ContentLab CLI — busca y descarga assets libres de regalías (música/SFX).

Fuentes (verificadas 14/08/2026, ver learning/truth/truth_content_tools.json):
  - Tunetank MCP (https://mcp.tunetank.com): música y SFX, gratis, SIN api key.
    Requiere header `Accept: application/json, text/event-stream` (sin él → 406);
    la respuesta es SSE (`event: message\ndata: {...}`), no JSON directo.
  - Mixkit (https://mixkit.co): video/música/SFX/templates gratis, sin signup.
    NO tiene API pública (api.mixkit.co no resuelve) — leer con readWeb/curl.

Uso:
    python content_assets.py music "cinematic" --max 5
    python content_assets.py sfx "rain" --max 5
    python content_assets.py download <preview_url> --out assets/music.mp3
    python content_assets.py --check          # prueba la conexión al MCP
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

MCP_URL = "https://mcp.tunetank.com"
MCP_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
}


def log(msg: str) -> None:
    """Print a message to stdout, flushing immediately."""
    print(f"[contentlab] {msg}", flush=True)


def call_mcp(name: str, args: dict) -> list[dict]:
    """Call a Tunetank MCP tool and return the parsed result list (SSE aware)."""
    body = json.dumps(
        {"jsonrpc": "2.0", "id": 1, "method": "tools/call",
         "params": {"name": name, "arguments": args}}
    ).encode("utf-8")
    req = urllib.request.Request(MCP_URL, data=body, headers=MCP_HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    data_line = ""
    for line in raw.splitlines():
        if line.startswith("data:"):
            data_line = line[5:].strip()
            break
    if not data_line:
        raise RuntimeError(f"MCP {name}: no data frame in response")
    parsed = json.loads(data_line)
    contents = parsed.get("result", {}).get("content", [])
    text = "\n".join(c.get("text", "") for c in contents).strip()
    if not text:
        raise RuntimeError(f"MCP {name}: empty result")
    items = json.loads(text)
    return items if isinstance(items, list) else [items]


def cmd_check(_args: argparse.Namespace) -> int:
    """Verify the MCP connection with a tiny query."""
    try:
        items = call_mcp("search_sfx", {"query": "rain", "limit": 1})
        name = items[0].get("name", "?") if items else "?"
        log(f"MCP OK: Tunetank responde ({len(items)} resultado(s), primero: {name})")
        return 0
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"[contentlab] ERROR: {exc}", file=sys.stderr)
        return 1


def cmd_music(args: argparse.Namespace) -> int:
    """Search music tracks and print a compact listing."""
    try:
        items = call_mcp(
            "search_music",
            {"query": args.query, "limit": min(args.max, 20)},
        )
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"[contentlab] ERROR: {exc}", file=sys.stderr)
        return 1
    for it in items:
        artist = it.get("artist") or "?"
        print(f"  [{it.get('id')}] {it.get('name')} — {artist} "
              f"({it.get('duration')}s, {it.get('bpm')} bpm)")
        print(f"      preview: {it.get('preview')}")
    log(f"{len(items)} track(s) encontrado(s). Descarga con: python content_assets.py download <url>")
    return 0


def cmd_sfx(args: argparse.Namespace) -> int:
    """Search sound effects and print a compact listing."""
    try:
        items = call_mcp("search_sfx", {"query": args.query, "limit": min(args.max, 30)})
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"[contentlab] ERROR: {exc}", file=sys.stderr)
        return 1
    for it in items:
        print(f"  [{it.get('id')}] {it.get('name')} ({it.get('duration')}s)")
        print(f"      preview: {it.get('preview')}")
    log(f"{len(items)} SFX encontrado(s). Descarga con: python content_assets.py download <url>")
    return 0


def cmd_download(args: argparse.Namespace) -> int:
    """Download an asset URL to a local file."""
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(args.url, headers={"User-Agent": "UltraIaBot/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp, out.open("wb") as fh:
            fh.write(resp.read())
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"[contentlab] ERROR: {exc}", file=sys.stderr)
        return 1
    log(f"Descargado: {out} ({out.stat().st_size} bytes)")
    return 0


def main(argv: list[str] | None = None) -> int:
    """Parse arguments and dispatch to the requested command."""
    parser = argparse.ArgumentParser(description="ContentLab — assets libres de regalías")
    sub = parser.add_subparsers(dest="command", required=True)

    p_check = sub.add_parser("check", help="probar conexión al MCP Tunetank")
    p_check.set_defaults(func=cmd_check)

    p_music = sub.add_parser("music", help="buscar música")
    p_music.add_argument("query")
    p_music.add_argument("--max", type=int, default=6)
    p_music.set_defaults(func=cmd_music)

    p_sfx = sub.add_parser("sfx", help="buscar efectos de sonido")
    p_sfx.add_argument("query")
    p_sfx.add_argument("--max", type=int, default=8)
    p_sfx.set_defaults(func=cmd_sfx)

    p_dl = sub.add_parser("download", help="descargar un asset por URL")
    p_dl.add_argument("url")
    p_dl.add_argument("--out", required=True)
    p_dl.set_defaults(func=cmd_download)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
