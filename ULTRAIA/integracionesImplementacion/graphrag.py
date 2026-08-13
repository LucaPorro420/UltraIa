"""CLI de GraphRAG (Solución 1 high-demand): Knowledge Graph + RAG local.

Uso:
    python graphrag.py add docs/politicas.txt --title "Políticas RRHH"
    python graphrag.py query "¿Cuántos días de vacaciones?"
    python graphrag.py graph "vacaciones"          # vecinos del grafo
    python graphrag.py list                        # documentos indexados

Requisito funcional RF-14: base documental mapeada como grafo (documentos →
chunks → entidades → vínculos) con recuperación híbrida (embeddings +
propagación por grafo) y respuesta LLM con contexto.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src import knowledge
from src.config import get_settings, require_key


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="GraphRAG: grafo de conocimiento + RAG")
    sub = parser.add_subparsers(dest="command", required=True)

    p_add = sub.add_parser("add", help="Indexar un documento de texto")
    p_add.add_argument("path", help="Ruta del archivo .txt/.md a indexar")
    p_add.add_argument("--title", default=None, help="Título opcional del documento")

    p_query = sub.add_parser("query", help="Preguntar con RAG")
    p_query.add_argument("question", help="Pregunta sobre la base documental")
    p_query.add_argument("--no-cache-rag", action="store_true", help="Omitir caché")

    p_graph = sub.add_parser("graph", help="Ver vecinos de una entidad en el grafo")
    p_graph.add_argument("entity", help="Entidad a explorar")
    p_graph.add_argument("--limit", type=int, default=10)

    sub.add_parser("list", help="Listar documentos indexados")

    args = parser.parse_args(argv)
    settings = get_settings()

    if args.command == "add":
        path = Path(args.path)
        if not path.exists():
            print(f"[ERROR] No existe: {path}")
            return 1
        title = args.title or path.stem
        doc_id = knowledge.ingest_document(
            path.read_text(encoding="utf-8", errors="replace"), settings, title=title, source=str(path)
        )
        print(f"Documento indexado: id={doc_id} título={title}")

    elif args.command == "query":
        require_key("OPENAI_API_KEY", settings.openai_api_key)
        result = knowledge.answer_with_rag(args.question, settings)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "graph":
        neighbors = knowledge.graph_neighbors(args.entity, args.limit)
        if not neighbors:
            print(f"Sin vecinos para '{args.entity}'. Prueba: graphrag.py list")
        for n in neighbors:
            print(f"  {n['entity']}  (peso {n['weight']})")

    elif args.command == "list":
        for doc in knowledge.list_documents():
            print(f"  [{doc['id']}] {doc['title']}  ({doc['added_at']})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())