# SACD/NASA — infraestructura de memoria de referencia (Qdrant + Neo4j)

> Iteración 69 (20/08/2026): opción 3 del análisis SACD/NASA
> (`docs/RAZONAMIENTO-SACD.md`, fuente `learning/sources/sacd-nasa.md`).
> Infra PARALELA de referencia — el core de UltraIa NO depende de esto
> (la capability `semantic_memory` funciona sin Docker).

## Qué es

Stack de memoria propuesto por el diseño externo SACD/NASA, montado como referencia
para experimentar:

- **Qdrant** (`localhost:6333` REST, `6334` gRPC) — memoria vectorial (búsqueda semántica).
- **Neo4j** (`localhost:7474` web, `7687` Bolt) — grafo de conocimiento (memoria procedimental).

## Levantar

```bash
docker compose up -d
```

Verificar:

- Qdrant: http://localhost:6333/dashboard (o `curl http://localhost:6333/collections`)
- Neo4j: http://localhost:7474 — usuario `neo4j`, contraseña `sacd_password_2026`
  (solo desarrollo local; NUNCA usar en producción)

Datos persistentes en `qdrant_storage/` y `neo4j_data/` (gitignored).

## Orquestador Python (referencia LangGraph)

El diseño propone LangGraph/CrewAI. Referencia en `nucleo_nasa.py` (triángulo de oro:
investigador → programador → evaluador → memoria Qdrant), con **fail-soft sin API key**
(fallback determinista si `OPENAI_API_KEY` no está seteada).

```bash
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # opcional: OPENAI_API_KEY + LLM_MODEL
python nucleo_nasa.py
```

El venv es AISLADO (no toca el entorno del proyecto). Si la instalación de pip falla
por red, el compose + los archivos quedan igual; solo falta repetir `pip install`.

## Integración con UltraIa (cómo se conecta, si se quiere)

- La capability `semantic_memory` (TS puro) es el reemplazo sin-infra: misma idea,
  sin Docker. Usar esa para producción.
- Qdrant se puede alimentar desde el corpus `learning/truth/*.json` con un script
  futuro (pendiente: decisión humana — ver RAZONAMIENTO-SACD.md §5).
- Neo4j como grafo persistente del world graph de OMAG: pendiente, requiere integración.

## Reglas

- Credenciales de ejemplo SOLO locales. No exponer puertos fuera de 127.0.0.1 en producción.
- `qdrant_storage/` y `neo4j_data/` NO se commitean (ver .gitignore raíz si cambia el layout).