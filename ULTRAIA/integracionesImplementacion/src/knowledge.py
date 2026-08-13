"""Solución 1 (high-demand): GraphRAG — Knowledge Graph + RAG sobre documentos.

Requisito funcional RF-14: más allá de búsqueda vectorial simple, mapear una
base documental (políticas de RRHH, documentación de código, precedentes
legales) como grafo de conocimiento: documentos → chunks → entidades → vínculos.
La recuperación combina similitud semántica (embeddings OpenAI, opcional) con
propagación por vecinos del grafo (graph traversal), y las respuestas finales
se generan con el LLM usando el contexto recuperado (RAG).

Diseño:
    knowledge.db (SQLite)
    ├── documents(id, title, source, added_at)
    ├── chunks(id, doc_id, chunk_index, text)          -- fragmentos de 800 chars
    ├── entities(id, name)                             -- entidades extraídas
    └── edges(chunk_id, entity_id, count)              -- ocurrencias (grafo)

Uso:
    python graphrag.py add <archivo.txt> [--title X]
    python graphrag.py query "¿Qué dice la política de vacaciones?"
    python graphrag.py graph "entidad"                  # vecinos del grafo
"""
from __future__ import annotations

import json
import re
import sqlite3
import unicodedata
from pathlib import Path

import requests

from .config import Settings, require_key

_KB_DB = Path(__file__).resolve().parent.parent / "knowledge.db"
_EMBED_URL = "https://api.openai.com/v1/embeddings"
_EMBED_MODEL = "text-embedding-3-small"
_CHUNK_SIZE = 800
_CHUNK_OVERLAP = 120

# Palabras vacías multi-idioma (es/en/ar) para la extracción de entidades.
_STOPWORDS = set(
    """
    el la los las un una unos unas de del al y e o u que como en para por con
    sin sobre entre según mediante desde hasta durante hacia contra segun mas
    más muy poco mucho todo todos todas cada cualquier quien donde cuando
    what when where which who whom this that these those the a an and or but
    of in on for to with without from at by into during about against
    في من على إلى عن مع هذا هذه ذلك تلك التي الذي الذين ما هو هي
    """.split()
)
_ENTITY_RE = re.compile(
    r"[A-ZÁÉÍÓÚÑ][\w-]{2,}"
    r"|[\u0600-\u06FF]{3,}"
    r"|\b\d+(?:\.\d+)?(?:%|€|\$)?\b"
)

# Palabras funcionales adicionales que no aportan al grafo (minúsculas).
_FUNCTION_WORDS = set(
    """
    todo toda todos todas cada quien quienes donde cuando como cual cuales
    that this those these with have from your they will their there here
    also then than were been into over after before through being between
    dentro fuera sobre entre mientras mientras aunque porque porque sino
    puede pueden debe deben tiene tienen hacer hacer hace hace ya si no
    """.split()
)


# ------------------------------------------------------------ base de datos

def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_KB_DB)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            source TEXT,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_id INTEGER NOT NULL REFERENCES documents(id),
            chunk_index INTEGER NOT NULL,
            text TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS edges (
            chunk_id INTEGER NOT NULL REFERENCES chunks(id),
            entity_id INTEGER NOT NULL REFERENCES entities(id),
            count INTEGER DEFAULT 1,
            PRIMARY KEY (chunk_id, entity_id)
        );
        """
    )
    return conn


# --------------------------------------------------------------- extracción

def _chunk_text(text: str) -> list[str]:
    """Divide el texto en fragmentos superpuestos de ~800 caracteres."""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= _CHUNK_SIZE:
        return [text] if text else []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + _CHUNK_SIZE, len(text))
        if end < len(text):
            # cortar en el último espacio para no partir palabras
            cut = text.rfind(" ", start, end)
            if cut > start + _CHUNK_SIZE // 2:
                end = cut
        chunks.append(text[start:end].strip())
        start = max(end - _CHUNK_OVERLAP, start + 1)
    return chunks


def extract_entities(text: str) -> dict[str, int]:
    """Extrae entidades (términos significativos) y su frecuencia de un texto.

    Captura: nombres propios (mayúsculas), árabe (3+ chars), números y
    palabras en minúscula de 4+ letras que no sean funcionales ni vacías.
    """
    counts: dict[str, int] = {}
    for token in _ENTITY_RE.findall(text):
        if token.lower() in _STOPWORDS:
            continue
        counts[token] = counts.get(token, 0) + 1

    for token in re.findall(r"(?<![A-Za-zÁÉÍÓÚÑáéíóúñ])[a-záéíóúñ]{4,}(?![a-záéíóúñ])", text):
        if token in _STOPWORDS or token in _FUNCTION_WORDS or token.endswith("mente"):
            continue
        counts[token] = counts.get(token, 0) + 1

    normalized: dict[str, int] = {}
    for name, count in counts.items():
        name = unicodedata.normalize("NFKD", name).strip("()[]{},.:;")
        name = re.sub(r"[^\w\u0600-\u06FF-]", "", name)
        if not name or len(name) < 3:
            continue
        normalized[name] = normalized.get(name, 0) + count
    return normalized


def _embed(text: str, settings: Settings) -> list[float] | None:
    """Embedding vía OpenAI (opcional). Devuelve None si no hay key o falla."""
    if not settings.openai_api_key:
        return None
    res = requests.post(
        _EMBED_URL,
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json={"model": _EMBED_MODEL, "input": text[:8000]},
        timeout=60,
    )
    if res.status_code != 200:
        return None
    return res.json()["data"][0]["embedding"]


def _cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b)) / (
        (sum(x * x for x in a) ** 0.5) * (sum(y * y for y in b) ** 0.5) + 1e-9
    )


# ----------------------------------------------------------------- ingestión

def ingest_document(
    content: str,
    settings: Settings,
    title: str = "document",
    source: str | None = None,
) -> int:
    """Indexa un documento completo en el grafo de conocimiento.

    Proceso: normaliza → chunkea → guarda chunks → extrae entidades → arma
    aristas chunk↔entidad. Devuelve el id del documento.
    """
    chunks = _chunk_text(content)
    if not chunks:
        raise ValueError("El documento no contiene texto indexable.")

    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO documents (title, source) VALUES (?, ?)", (title, source)
        )
        doc_id = cur.lastrowid
        chunk_ids: list[int] = []
        for idx, chunk in enumerate(chunks):
            cur = conn.execute(
                "INSERT INTO chunks (doc_id, chunk_index, text) VALUES (?, ?, ?)",
                (doc_id, idx, chunk),
            )
            chunk_ids.append(cur.lastrowid)

        for chunk_id, chunk in zip(chunk_ids, chunks):
            for entity, count in extract_entities(chunk).items():
                conn.execute("INSERT OR IGNORE INTO entities (name) VALUES (?)", (entity,))
                ent_id = conn.execute(
                    "SELECT id FROM entities WHERE name = ?", (entity,)
                ).fetchone()[0]
                conn.execute(
                    "INSERT INTO edges (chunk_id, entity_id, count) VALUES (?, ?, ?) "
                    "ON CONFLICT(chunk_id, entity_id) DO UPDATE SET count = count + ?",
                    (chunk_id, ent_id, count, count),
                )
    return doc_id


# ------------------------------------------------------------------ consulta

def graph_neighbors(entity: str, limit: int = 10) -> list[dict]:
    """Vecinos del grafo: entidades que co-ocurren en los mismos chunks."""
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT e.name, SUM(e1.count) AS weight
            FROM entities t
            JOIN edges e1 ON e1.entity_id = t.id AND t.name = ?
            JOIN edges e2 ON e2.chunk_id = e1.chunk_id AND e2.entity_id != e1.entity_id
            JOIN entities e ON e.id = e2.entity_id
            GROUP BY e.name
            ORDER BY weight DESC
            LIMIT ?
            """,
            (entity, limit),
        ).fetchall()
    return [{"entity": name, "weight": weight} for name, weight in rows]


def retrieve_context(
    query: str,
    settings: Settings,
    top_k: int = 4,
    graph_boost: int = 3,
) -> list[dict]:
    """Recupera los chunks más relevantes para la consulta.

    Estrategia híbrida (RAG):
    1. Embeddings: si hay OPENAI_API_KEY, rankea por similitud coseno.
    2. Lexical fallback: solape de tokens/entidades entre consulta y chunk.
    3. Graph boost: los chunks conectados a las entidades de la consulta se
       promocionan (multi-hop sobre el grafo).
    """
    query_entities = set(extract_entities(query).keys())
    query_embedding = _embed(query, settings) if settings.openai_api_key else None

    with _connect() as conn:
        chunks = conn.execute(
            "SELECT id, doc_id, chunk_index, text FROM chunks"
        ).fetchall()

    scored: list[dict] = []
    for cid, doc_id, idx, text in chunks:
        score = 0.0
        if query_embedding is not None:
            emb = _embed(text, settings)
            if emb:
                score += _cosine(query_embedding, emb) * 2.0
        # lexical
        overlap = len(query_entities & set(extract_entities(text).keys()))
        score += overlap * 0.5
        # graph: propagar peso desde entidades de la consulta
        graph_hits = conn.execute(
            "SELECT COUNT(*) FROM edges WHERE chunk_id = ?", (cid,)
        ).fetchone()[0]
        if graph_hits and overlap:
            score += min(graph_hits, graph_boost) * 0.2
        if score > 0:
            scored.append({"chunk_id": cid, "doc_id": doc_id, "index": idx,
                           "text": text, "score": round(score, 3)})

    scored.sort(key=lambda c: c["score"], reverse=True)
    return scored[:top_k]


def answer_with_rag(question: str, settings: Settings) -> dict:
    """RAG completo: recupera contexto del grafo y responde con el LLM.

    Returns:
        {"question", "context", "entities", "answer"}
    """
    context = retrieve_context(question, settings)
    context_text = "\n---\n".join(c["text"] for c in context)

    url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.llm_model,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Responde en el idioma de la pregunta. Usa SOLO el contexto "
                    "proporcionado. Si el contexto no contiene la respuesta, di "
                    "que no está documentado. Devuelve JSON: "
                    '{"answer": "...", "sources": ["doc:chunk", ...]}'
                ),
            },
            {
                "role": "user",
                "content": f"Contexto:\n{context_text}\n\nPregunta: {question}",
            },
        ],
    }
    res = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=90,
    )
    if res.status_code != 200:
        raise RuntimeError(f"Error LLM en RAG ({res.status_code}): {res.text[:500]}")

    raw = res.json()["choices"][0]["message"]["content"]
    return {
        "question": question,
        "context": [c["text"] for c in context],
        "entities": sorted(extract_entities(question).keys()),
        "answer": json.loads(raw),
    }


def list_documents() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, title, source, added_at FROM documents ORDER BY id"
        ).fetchall()
    return [{"id": r[0], "title": r[1], "source": r[2], "added_at": r[3]} for r in rows]