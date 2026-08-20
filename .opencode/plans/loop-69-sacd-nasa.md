# Plan loop-69 — SACD/NASA (opciones 1+2+3 del usuario)

## Contexto
El usuario pegó un diseño externo de "SACD/NASA" (Sistema Autónomo de Creación Digital:
7 super-agentes + memoria Qdrant/Neo4j + orquestación LangGraph/CrewAI + ciclo de
meta-aprendizaje), probablemente generado por otro modelo que no conoce el repo.
Pidió ejecutar las 3 opciones evaluadas:
1. **Vector store in-process** (TS puro, sin Docker) sobre `learning/truth/` — cierra el
   único gap real (recuperación semántica; hoy la memoria se restaura como ZIP/JSON sin search).
2. **Documentar el análisis** (patrón enlaces.txt): fuente cruda + RAZONAMIENTO con mapeo.
3. **Qdrant/Neo4j de verdad**: Docker Compose + LangGraph/CrewAI como propone el diseño.
   Docker Desktop 29.7.2 con daemon corriendo VERIFICADO (docker info OK).

## Objetivo
Iteración 69: dejar commiteado (a) capability `semantic_memory` (dominio puro determinista,
recuperación semántica keyless sobre truth JSON), (b) docs de la fuente + análisis,
(c) infraestructura `sacd_system/` (compose Qdrant+Neo4j levantada y verificada + scripts
de referencia LangGraph). Sin tocar el núcleo existente más allá del wiring de la capability.

## Pasos
1. Plan file (este).
2. `learning/sources/sacd-nasa.md` — diseño crudo pegado por el usuario (fuente).
3. `docs/RAZONAMIENTO-SACD.md` — índice de secciones + mapeo implementado/pendiente
   (qué ya existía en UltraIa vs qué aporta el diseño).
4. `packages/core/src/tools/semantic-memory.ts` — dominio puro:
   - hash djb2/fnv1a sobre tokens (lowercase, sin stopwords) + bigramas → vector esparcido
   - `embedText(text)` → `HashBag` (Map<hash, weight>)
   - `cosineSimilarity(a, b)`
   - `SemanticMemoryIndex` (add/remove/query top-k con scores normalizados)
   - `loadTruthCorpus(jsons: TruthFile[])` → `TruthDoc[]` (parsea `cases[].prompt/answer/type`)
   - `searchTruth(corpus, query, k)` → ranked `MemoryHit[]` {id, text, answer, score}
   - tool `memory_search` (acciones search / index_stats / corpus_stats)
5. `semantic-memory.test.ts` — determinista, sin red: embeds estables, similitud propia,
   ranking por score, corpus parse, búsqueda real sobre truth_math.json embebido.
6. Wiring: `ai/llm.ts` (import namespace + registro bajo `opts.tools?.includes('semantic_memory')`)
   + `tools/index.ts` (export `semanticMemory`, TOOL_DESCRIPTIONS, union Capability).
7. `sacd_system/`:
   - `docker-compose.yml` (qdrant/qdrant:latest 6333/6334 + neo4j:5.15 7474/7687,
     NEO4J_AUTH=neo4j/sacd_password_2026, plugin apoc, volúmenes locales)
   - `README.md` (levantar/verificar/probar + nota venv)
   - `requirements.txt` (langgraph, langchain-openai, langchain-qdrant, neo4j, requests,
     pydantic, python-dotenv) — INSTALACIÓN en venv aislado `sacd_system/venv`, NO global
   - `nucleo_nasa.py` — port del triángulo de oro del diseño (investigador→programador→
     evaluador→memoria Qdrant), fail-soft sin OPENAI_API_KEY (fallback determinista)
   - `docker compose up -d` REAL + verificación health (6333/dashboard, 7474)
8. Gates FULL en orden CI con cuarentena del WIP ajeno (`%TEMP%\opencode\wip-quarantine-20260820\`):
   typecheck → lint → test → build (matar node + quitar .next antes del build).
9. Commit con pathspec (`git add` explícito, NUNCA `.`) + restaurar cuarentena byte-exacta.

## ARCHIVOS A TOCAR (míos)
- .opencode/plans/loop-69-sacd-nasa.md (nuevo)
- learning/sources/sacd-nasa.md (nuevo)
- docs/RAZONAMIENTO-SACD.md (nuevo)
- packages/core/src/tools/semantic-memory.ts (nuevo)
- packages/core/src/tools/semantic-memory.test.ts (nuevo)
- packages/core/src/ai/llm.ts (wiring — OJO: WIP ajeno `creativo` sin commitear)
- packages/core/src/tools/index.ts (wiring — OJO: WIP ajeno `creativo` sin commitear)
- sacd_system/docker-compose.yml, README.md, requirements.txt, nucleo_nasa.py (nuevos)
- learning/LEARNINGS.md (lección, si aplica)

## NO-hacer
- NO tocar/commitear WIP ajeno: creativo.ts, creativo.test.ts, automation.ts, recorder.ts,
  media-synthesis/*, reach.ts, topics.ts, present.ts, enrutador.ts, motion.test.ts,
  publish.test.ts (D staged), reach.test.ts (D staged), plans loop-67, STATE.md, run-log,
  .env* (raíz), DOCS_TODO.md, docs de #25.
- NO `git add .` ni `-A`. NO push/merge.
- NO instalar deps en el entorno global de Python del proyecto (venv aislado en sacd_system/).
- NO tocar el orquestador OMAG ni el runtime existente.

## Criterios
- Scoped: vitest semantic-memory.test.ts PASS + tsc core parcial sin errores propios.
- FULL: npm run typecheck → npm run lint → npm run test → npm run build, TODOS verdes.
- Docker: `docker compose ps` con qdrant+neo4j Up + HTTP 200 en :6333 y :7474.
- Commit 1 solo, mensaje `feat(core): capability semantic_memory + docs SACD/NASA + infra sacd_system`.

## TOLERANCIAS / RIESGOS
- WIP ajeno en llm.ts/index.ts: cuarentena selectiva (copiar→revertir→gates→restaurar byte-exacto).
  Si la restauración deja el worktree con el WIP encima de mi commit, es el patrón conocido
  (lo resuelve la próxima sesión con merge; documentar en commit/LEARNINGS).
- pip install langgraph en venv: si la red falla, documentar paso pendiente con evidencia
  (requirements.txt + README ya quedan); compose UP es el criterio duro.
- Docker pull qdrant/neo4j: ~200MB+; puede tardar. Timeout generoso.
- Vitest caché stale tras editar → limpiar node_modules/.vite antes de diagnosticar.
- PS 5.1: NO Set-Content sobre archivos del repo (usar tool Write); JSON con BOM rompe.

## Esfuerzo / Prioridad
- Prioridad P1 (pedido explícito del usuario, 3 opciones). Esfuerzo estimado: 1 ciclo.
- Presupuesto: dentro de lo normal de un ciclo (gates FULL dominan).