# RAZONAMIENTO-SACD — Análisis y mapeo del diseño SACD/NASA (20/08/2026)

> Fuente: `learning/sources/sacd-nasa.md` (diseño pegado por el usuario, iteración 69).
> Patrón enlaces.txt: fuente cruda → análisis → mapeo implementado/pendiente → acciones.

## Índice
1. Resumen ejecutivo
2. Mapeo: lo que el diseño propone vs lo que UltraIa YA tiene
3. Lo único genuinamente nuevo
4. Decisiones de implementación (opciones 1+2+3 del usuario)
5. Mapeo implementado / pendiente
6. Lecciones

---

## 1. Resumen ejecutivo

El diseño SACD/NASA es un blueprint genérico de sistema multiagente con memoria
vectorial+grafo y ciclo de meta-aprendizaje. Fue generado por un modelo que **no conocía
UltraIa**: ~80% de lo que propone ya existe aquí con más madurez (tests verificados,
dominio puro determinista, keyless-first). El único gap funcional real es la
**recuperación semántica sobre la memoria de aprendizaje** (hoy se restaura como
ZIP/JSON sin búsqueda). Infraestructura pesada (Qdrant/Neo4j/LangGraph) es opcional
y paralela; se montó como referencia (opción 3 del usuario) sin reemplazar nada.

## 2. Mapeo: propuesta del diseño vs estado real de UltraIa (verificado 20/08/2026)

| Propuesta SACD | Equivalente en UltraIa (con evidencia) | Estado |
|---|---|---|
| Director Ejecutivo / orquestación jerárquica | `OmagOrchestrator` (packages/core/src/omag/orchestrator.ts), `createHarness` (tools/harness.ts, port deepseek-harness), agents `bp-*` (seed-admin), skill pipeline Plan→Build→Test→Review→Ship→Simplify | ✅ ya existía |
| Triángulo de oro Investigador→Programador→Evaluador | Ciclo PIVR del harness + `critics.ts` (TemporalSync/Identity/Causal/Multimodal + `fuseCritiques`) | ✅ ya existía |
| Loop de retry condicional ("score < X → reintentar") | Correction loop del orquestador: máx 5 iteraciones, thresholds fast .5 / balanced .6 / high .75 | ✅ ya existía |
| Memoria experiencial | `learning/` con verdad verificada APARTE (`learning/truth/` + `verify.py` 16/16), `LEARNINGS.md`, `MemoryManager` runtime (importancia/confianza/eviction), `MemoryCheckpointStore` + `LongTermMemory` (omag) | ✅ ya existía (más estricto: la verdad se verifica, no se cree) |
| Memoria procedimental / grafo | World graph de `MediaField` (relations) + `WorldTransitionEngine` | ✅ parcial (en memoria, no persistente como grafo) |
| Matriz de priorización de experimentos | `growth.ts`: `planExperiments` (peor KPI primero, regla +5), `buildPlaybook` (peso acumulado por victoria) | ✅ ya existía |
| QA con métricas y decisión APROBAR/RECHAZAR | `media-score.ts` (0-100, PASS ≥20), `videoqa` (MAE/MSE/PSNR/SSIM + veredicto), self-eval de EDL, gates FULL del harness | ✅ ya existía |
| Meta-aprendizaje ("LoRA > Fine-Tuning en 200 proyectos") | `learning/verify.py` + lecciones; puente `publicationSignals` → `growth` (commit eb3a4cd) | ✅ ya existía |
| Integración ComfyUI/Blender | providers keyless (pollinations/meigen), gen-engine (edge-tts, :8100), `video_edit.ts` (argv ffmpeg), `travel.ts` (zoompan+xfade), `screenflow` (gdigrab) | ✅ ya existía (ComfyUI/Blender como providers futuros del gen-engine) |
| **Memoria VECTORIAL (Qdrant/Chroma) para búsqueda semántica** | NADA: la memoria se restaura como ZIP/JSON sin search | 🆕 GAP REAL |
| **Grafo persistente (Neo4j)** | World graph en memoria solamente | 🆕 gap menor |
| **Orquestador Python LangGraph/CrewAI** | Orquestación en TS/Node (harness/OMAG); un segundo orquestador = duplicación | 🆕 opcional (referencia) |

## 3. Lo único genuinamente nuevo

1. **Recuperación semántica** sobre lecciones/verdades — resuelto en esta iteración con
   capability `semantic_memory` (TS puro, sin deps, determinista): hash de n-gramas +
   coseno, corpus desde `learning/truth/*.json`, ranking top-k.
2. **Qdrant + Neo4j en Docker** — montado como referencia `sacd_system/` (opción 3),
   para experimentar con búsqueda semántica real y grafos, sin integrarse al core.
3. **Referencia LangGraph** (`sacd_system/nucleo_nasa.py`) — triángulo de oro portado
   con fail-soft sin API key; NO es el orquestador de producción (el de producción es
   el harness TS).

## 4. Decisiones de implementación

- **Dominio puro determinista** (patrón UltraIa): sin red, sin LLM, sin deps nuevas.
  El hash de n-gramas produce vectores esparcidos con similitud de coseno estable —
  suficiente para recuperar verdades por tema sin instalar Qdrant.
- **Wiring** como capability `semantic_memory` → tool `memory_search` (acciones
  search / corpus_stats), registrada en `ai/llm.ts` + `tools/index.ts`.
- **Docker**: `sacd_system/docker-compose.yml` con Qdrant y Neo4j, levantado y
  verificado (health 200 en :6333 y :7474). Credenciales de ejemplo (nunca producción).
- **LangGraph/CrewAI**: requirements.txt + venv aislado documentado; la instalación
  real de pip deps queda como paso documentado (no se instala en el entorno del proyecto).

## 5. Mapeo implementado / pendiente

### Implementado en esta iteración (commit loop-69)
- [x] `packages/core/src/tools/semantic-memory.ts` + tests (dominio puro determinista)
- [x] Wiring capability `semantic_memory` en llm.ts/index.ts
- [x] `learning/sources/sacd-nasa.md` (fuente cruda)
- [x] `docs/RAZONAMIENTO-SACD.md` (este documento)
- [x] `sacd_system/` (compose Qdrant+Neo4j levantado + README + requirements + nucleo_nasa.py)

### Pendiente (decisiones humanas / futuro)
- [ ] Conectar `memory_search` al flujo de los agentes `bp-*` (promoción automática
      vía signals — ya hay puente growth; falta decidir qué agente consulta la memoria)
- [ ] Neo4j como grafo persistente del world graph de OMAG (requiere integración real)
- [ ] Instalar venv LangGraph (`sacd_system/venv`) cuando se quiera ejecutar
      `nucleo_nasa.py` con LLM real (requiere OPENAI_API_KEY o endpoint local)
- [ ] Embeddings reales (modelo local tipo MiniLM) si la búsqueda por hash no alcanza

## 6. Lecciones

1. **Regla de oro confirmada**: antes de adoptar un diseño externo, mapear contra el
   repo. ~80% del SACD ya existía; reconstruirlo habría sido duplicación pura.
2. **El gap real no era infraestructura, era una función**: la recuperación semántica
   se resuelve en 1 archivo TS puro + tests; Docker/Qdrant son opcionales de referencia.
3. **Meta-aprendizaje de UltraIa es MÁS estricto que el del diseño**: la verdad se
   verifica aparte (`learning/truth/` + verify.py) antes de entrar a la memoria; el
   diseño del otro modelo guarda lecciones sin verificar ("simulación de extracción").
4. Coordinación: llm.ts/index.ts tenían WIP ajeno sin commitear (capability `creativo`
   de la sesión del 19/08) → cuarentena selectiva + commit con pathspec + restauración
   byte-exacta (patrón iteraciones previas).