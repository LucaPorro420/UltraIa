# RAZONAMIENTO-AUTOLEARN — Agente de autoaprendizaje de UltraIa

**Fecha**: 20/08/2026 · **Iteración**: 72 · **Capability**: `autolearn` (tool `autolearn_run`)
**Pedido**: "agente de autoaprendizaje que automatice el autoprogramado, buscar nueva
información y mejorar" (+ usar clouds/Docker si aporta). **Estado**: FASE 1 implementada
(dominio puro + wiring); FASE 2-4 pendientes (ver sección Pendiente).

## Contexto

El proyecto ya tenía piezas de aprendizaje dispersas (verdad verificada en
`learning/truth/`, verifier `verify.py`, `LEARNINGS.md`, recuperación semántica
`semantic_memory`, clasificador `enlaces`, biblioteca `libros`, harness `harness`).
Lo que NO existía era un **orquestador de meta-aprendizaje** que cerrara el ciclo:
sensar → buscar → autoprogramar → mejorar → medir. Ese es el agente `autolearn`.

## Diseño del agente (patrón del bucle IA de 4 fases)

| Fase IA | Paso del agente | Función en `autolearn.ts` |
|---|---|---|
| Sensar | Leer lecciones + verdad + backlog + fuentes | `parseLearnings`, `scanTruthStats` |
| Razonamiento | Detectar gaps y priorizar | `detectGaps` (4 kinds), `prioritizeWork` (RICE simplificado) |
| Acción | Autoprogramar: generar el plan de mejora | `buildImprovementPlan` (patrón loop-piv) |
| Ajuste | Medir el ciclo y aprender | `learningMetrics` (KPIs + tasaMejora) |

### El "autoprogramado"

`buildImprovementPlan` produce un `LearnPlan` con la MISMA estructura que los planes
del harness loop-piv: objetivo, pasos, archivos a tocar, criterios (scoped/FULL) y
prioridad. Es decir: el agente NO pide instrucciones — escribe su propio plan de
mejora, listo para que un ciclo piv-build lo ejecute.

### Gaps detectados (4 kinds)

1. `source_sin_analizar` — fuente descargada en `learning/sources/` sin
   `docs/RAZONAMIENTO-<slug>.md` (slug exacto, case-insensitive).
2. `leccion_sin_implementar` — lección sobre un topic conocido (api/web/search/memory/
   sql/video/audio/image/code/docker) sin capability/tool que lo aplique.
3. `tema_sin_truth` — topic recurrente en lecciones sin caso de verdad verificada.
4. `backlog_pendiente` — tareas del backlog en estado pendiente.

### Priorización

Score RICE simplificado: `(impact × confidence) / effort`. Determinista, empates por
id asc. El tool genera candidatos por defecto desde los gaps (impact 4 para backlog,
3 para el resto; effort 2 para fuentes sin analizar, 3 para el resto; confianza 0.8).

## Implementado (FASE 1, commit iter-72)

- `packages/core/src/tools/autolearn.ts` — dominio puro, 0 deps, keyless, sin red.
  - `parseLearnings(text)` → `LearningEntry[]` (fecha ISO o dd/mm/yyyy normalizada,
    ciclo, texto con el título bold conservado — el tema vive en el título).
  - `countRecentLearnings(entries, days=7)`.
  - `scanTruthStats(docs)` → `TruthStats` (total, fuentes, tipos).
  - `detectGaps(inputs)` → `Gap[]` (4 kinds, dedupe por descripción).
  - `prioritizeWork(items)` → `PrioritizedItem[]` ordenados por RICE desc.
  - `buildImprovementPlan({gaps, priorities, fecha?, objetivo?})` → `LearnPlan`.
  - `learningMetrics({entries, truthCount, gaps, sourcesCount, days?})` → KPIs.
  - Namespace `autolearn` con las 7 funciones.
- `packages/core/src/tools/autolearn.test.ts` — **21 tests** deterministas.
- Wiring: capability `autolearn` → tool `autolearn_run` (acciones scan/gaps/plan/
  metrics) en `llm.ts` + export en `tools/index.ts` (namespace, descriptor, unión
  `Capability` + 'autolearn').
- **Fix latente**: rename `MemoryHit` → `SemanticMemoryHit` en `semantic-memory.ts`
  — eliminó el TS2308 preexistente (colisión de re-export con `omag/memory.ts`) que
  estaba latente desde iter-69 y rompía `npm run typecheck` del workspace core.

## Verificación FASE 1

- Scoped: `autolearn.test.ts` 21/21 + `semantic-memory.test.ts` 24/24 PASS.
- Core tsc: exit 0. Gates FULL pendientes (se corren antes del commit).

## Pendiente (FASES 2-4 del plan aprobado)

- **FASE 2 (iter-73)**: merge aditivo de `llm.ts`/`index.ts` — desbloquear el runtime
  para que el dev server exponga `memory_search` + `autolearn_run` + `creativo`
  (WIP ajeno) de una vez; cuarentena byte-exact previa.
- **FASE 3 (iter-74)**: runner `scripts/autolearn.py` — lee STATE.md + LEARNINGS.md +
  enlaces.txt, detecta gaps y **escribe el plan de mejora** en
  `.opencode/plans/autolearn-<fecha>.md` (cierra el ciclo: autoprogramado real).
- **FASE 4 (iter-75)**: memoria externa persistente — adaptador TS a Qdrant (Docker
  `sacd_system` ya levantado) o backup en cloud (R2/LocalCloudAdapter) para las
  lecciones verificadas.

## Reglas reafirmadas

- Los gates FULL se corren sobre el worktree REAL; si el WIP ajeno se restauró
  byte-exact, los archivos tocados vuelven a su versión ajena y el runtime NO expone
  las capabilities nuevas hasta el merge de la FASE 2.
- El título bold de una lección ES el tema — no descartarlo en el parse (lección
  aprendida en esta iteración, fallo real en el primer run de tests).