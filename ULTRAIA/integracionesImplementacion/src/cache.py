"""Caché local SQLite por hash de prompt para ahorrar créditos de API.

Requisito funcional RF-10: las llamadas repetidas (reintentos, pruebas, fallos
de red) NO deben volver a consumir créditos. Todo prompt con su respuesta JSON
se guarda en `ai_cache.db` indexado por SHA-256 del prompt.

Base verificada: `gemini-code-1786584807399.py` (misma lógica, ahora con cierre
de conexión por operación y DB configurable).
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path

_CACHE_DB = Path(__file__).resolve().parent.parent / "ai_cache.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_CACHE_DB)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS prompt_cache (
            hash TEXT PRIMARY KEY,
            response_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return conn


def _prompt_hash(prompt: str) -> str:
    """Hash SHA-256 del prompt (identifica la llamada de forma determinista)."""
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def get_cached(prompt: str) -> dict | None:
    """Devuelve la respuesta JSON cacheada para el prompt, o None si no existe."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT response_json FROM prompt_cache WHERE hash = ?", (_prompt_hash(prompt),)
        ).fetchone()
    if row:
        print("[CACHE HIT] Resultado recuperado sin gastar créditos de API.")
        return json.loads(row[0])
    return None


def set_cached(prompt: str, response: dict) -> None:
    """Guarda la respuesta JSON del prompt en el caché."""
    with _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO prompt_cache (hash, response_json) VALUES (?, ?)",
            (_prompt_hash(prompt), json.dumps(response, ensure_ascii=False)),
        )


def cached_call(prompt: str, generation_function, *args, use_cache: bool = True, **kwargs):
    """Cache-first wrapper: consulta la DB y solo llama a la API en CACHE MISS.

    Args:
        prompt: texto que identifica la llamada (se hashea).
        generation_function: callable que consume la API (recibe *args/**kwargs).
        use_cache: False fuerza la llamada a API (para pruebas).

    Returns:
        Respuesta JSON (de caché o recién generada).
    """
    if use_cache:
        cached = get_cached(prompt)
        if cached is not None:
            return cached
    print("[CACHE MISS] Solicitando nueva generación a la API...")
    result = generation_function(*args, **kwargs)
    if use_cache:
        set_cached(prompt, result)
    return result


def clear_cache() -> int:
    """Vacía la tabla de caché. Devuelve cantidad de entradas eliminadas."""
    with _connect() as conn:
        cur = conn.execute("DELETE FROM prompt_cache")
        return cur.rowcount