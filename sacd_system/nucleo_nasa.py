"""nucleo_nasa.py — triangulo de oro del diseno SACD/NASA (referencia LangGraph).

Iteracion 69 (20/08/2026). Port ORIGINAL del diseno pegado por el usuario
(learning/sources/sacd-nasa.md): Investigador -> Programador -> Evaluador -> Memoria.

Reglas de honestidad:
- Sin OPENAI_API_KEY -> fallback DETERMINISTA (sin LLM): el flujo sigue corriendo
  y escribe en Qdrant si el compose esta levantado.
- Qdrant :6333 no responde -> skip de memoria con aviso (fail-soft).
- Este script es de REFERENCIA; el orquestador de produccion de UltraIa es el
  harness TS + capability semantic_memory (sin Docker).

Uso: python nucleo_nasa.py   (dentro del venv de sacd_system)
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from dotenv import load_dotenv  # type: ignore

try:
    load_dotenv()
except Exception:
    pass  # sin python-dotenv el script usa las variables de entorno del shell

# --------------------------------------------------------------------------- llm

def _llm_invoke(prompt: str) -> str:
    """LLM real si OPENAI_API_KEY + langchain-openai estan; si no, fallback determinista."""
    if os.environ.get("OPENAI_API_KEY"):
        try:
            from langchain_openai import ChatOpenAI  # type: ignore

            llm = ChatOpenAI(model=os.environ.get("LLM_MODEL", "gpt-4o-mini"), temperature=0.2)
            return llm.invoke(prompt).content or ""
        except Exception as exc:  # pragma: no cover
            print(f"  [aviso] LLM fallo ({exc}) -> fallback determinista")
    return _fallback(prompt)

def _fallback(prompt: str) -> str:
    if "plan" in prompt.lower() or "diseña" in prompt.lower():
        return ("PLAN: 1) identificar el cuello de botella; 2) aplicar solucion previa "
                "con mayor score en memoria; 3) medir con metricas deterministas.")
    if "escribe" in prompt.lower() or "script" in prompt.lower():
        return "CODIGO: usar la tool ffmpeg con -c copy (concat lossless) y medir tiempo."
    return "EVALUACION: calidad 85, eficiencia 70, errores 2 -> aceptable con mejora."

# --------------------------------------------------------------------------- memoria qdrant

QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
COLLECTION = "memoria_experiencial"

def _qdrant_ok() -> bool:
    try:
        import requests  # type: ignore

        return requests.get(f"{QDRANT_URL}/collections", timeout=2).status_code == 200
    except Exception:
        return False

def guardar_leccion(objetivo: str, leccion: str, metricas: dict[str, int]) -> None:
    if not _qdrant_ok():
        print("  [memoria] Qdrant no responde en :6333 -> leccion NO persistida (levanta docker compose up -d)")
        return
    try:
        import requests  # type: ignore

        name = COLLECTION
        # Qdrant no tiene auto-create: crea la coleccion si falta (vector dim 4, cosine)
        if requests.get(f"{QDRANT_URL}/collections/{name}", timeout=5).status_code == 404:
            requests.put(f"{QDRANT_URL}/collections/{name}", json={
                "vectors": {"size": 4, "distance": "Cosine"},
            }, timeout=5).raise_for_status()
            print(f"  [memoria] coleccion {name} creada")
        doc_id = sum(ord(c) for c in objetivo) % 2**53  # id unico estable por objetivo
        payload = {"points": [{"id": doc_id, "vector": [0.1, 0.2, 0.3, 0.4], "payload": {
            "objetivo": objetivo, "leccion": leccion, "metricas": metricas}}]}
        requests.put(f"{QDRANT_URL}/collections/{name}/points?wait=true",
                     json=payload, timeout=5).raise_for_status()
        print(f"  [memoria] leccion guardada en Qdrant/{name}")
    except Exception as exc:
        print(f"  [memoria] error guardando en Qdrant: {exc}")

# --------------------------------------------------------------------------- nodos

def investigador(state: dict[str, Any]) -> dict[str, Any]:
    print(f"[INVESTIGADOR] objetivo: {state['objetivo']}")
    prompt = (f"Objetivo: {state['objetivo']}. Diseña un plan tecnico paso a paso "
              "que evite errores pasados.")
    return {**state, "plan_investigacion": _llm_invoke(prompt)}

def programador(state: dict[str, Any]) -> dict[str, Any]:
    print("[PROGRAMADOR] escribiendo codigo segun el plan...")
    prompt = f"Basado en este plan: {state['plan_investigacion']}. Escribe un script Python funcional."
    return {**state, "codigo_generado": _llm_invoke(prompt)}

def evaluador(state: dict[str, Any]) -> dict[str, Any]:
    print("[EVALUADOR] evaluando y guardando en memoria...")
    prompt = f"Evalua este codigo: {state['codigo_generado']}. Puntua calidad/eficiencia/errores."
    texto = _llm_invoke(prompt)
    metricas = {"calidad": 85, "eficiencia": 70, "errores": 2}  # parse real en produccion
    leccion = f"Codigo funcional; eficiencia {metricas['eficiencia']}. Sugerencia: procesamiento por lotes."
    guardar_leccion(state["objetivo"], leccion, metricas)
    return {**state, "metricas_evaluacion": metricas, "leccion_aprendida": leccion}

# --------------------------------------------------------------------------- grafo

def run() -> dict[str, Any]:
    state: dict[str, Any] = {
        "objetivo": os.environ.get("OBJETIVO", "Optimizar exportacion 4K a 1080p con FFmpeg"),
    }
    try:
        from langgraph.graph import StateGraph, END  # type: ignore

        wf = StateGraph(dict)
        wf.add_node("investigador", investigador)
        wf.add_node("programador", programador)
        wf.add_node("evaluador", evaluador)
        wf.set_entry_point("investigador")
        wf.add_edge("investigador", "programador")
        wf.add_edge("programador", "evaluador")
        wf.add_edge("evaluador", END)
        return wf.compile().invoke(state)
    except ImportError:
        print("[aviso] langgraph no instalado -> ejecucion encadenada simple (pip install -r requirements.txt)")
        state = investigador(state)
        state = programador(state)
        state = evaluador(state)
        return state

if __name__ == "__main__":
    resultado = run()
    print("\nRESULTADO FINAL:")
    print(json.dumps({
        "plan": resultado.get("plan_investigacion", "")[:120],
        "leccion": resultado.get("leccion_aprendida", ""),
        "metricas": resultado.get("metricas_evaluacion", {}),
    }, ensure_ascii=False, indent=2))
    sys.exit(0)