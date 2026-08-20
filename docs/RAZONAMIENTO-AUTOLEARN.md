# RAZONAMIENTO-AUTOLEARN — Agente de autoaprendizaje de UltraIa

**Fecha**: 20/08/2026 · **Iteración**: 73 · **Capability**: `autolearn` (tool `autolearn_run`)
**Pedido**: "agente de autoaprendizaje que automatice el autoprogramado, buscar nueva
información y mejorar" (+ usar clouds/Docker si aporta). **Estado**: FASE 1 (dominio puro
+ wiring) y **FASE 3 (runner real + motor META-IA)** implementadas; FASE 2 (merge wiring
WIP) y FASE 4 (memoria externa) pendientes (ver sección Pendiente).

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

## Pendiente (FASES 2 y 4 del plan aprobado)

- **FASE 2**: merge aditivo de `llm.ts`/`index.ts` — desbloquear el runtime
  para que el dev server exponga `memory_search` + `autolearn_run` + `creativo`
  (WIP ajeno) de una vez; cuarentena byte-exact previa.
- **FASE 4**: memoria externa persistente — adaptador TS a Qdrant (Docker
  `sacd_system` ya levantado) o backup en cloud (R2/LocalCloudAdapter) para las
  lecciones verificadas.

## FASE 3 — Runner real + motor META-IA (iter-73)

### Motor META-IA (port de la fuente `learning/sources/meta-ia-experimentos.md`,
post IG pegado por el usuario en `enlaces.txt`)

Añadido al dominio puro `packages/core/src/tools/autolearn.ts`:

- `classifyMatrix(impacto, confianza)` — clasifica por la **matriz META-IA**
  (A = ambos ≥0.85, B = ambos ≥0.6, C = ambos ≥0.4, D = resto). Fiel a la fuente
  (el score ordena; la matriz nivela).
- `classifyExperiment(score)` — niveles por score 0-1 (A≥0.75, B≥0.5, C≥0.3, D),
  usado por el runner Python.
- `prioritizeExperiments(candidates, weights?)` → `PrioritizedExperiment[]`:
  score = `(impacto×confianza×valorAprendizaje×urgenciaEstrategica con pesos) /
  (costo×pesoCosto + ε)`, normalizado por sigmoide `raw/(1+raw)`; orden score desc,
  empates por id asc; expone `nivel` + `accion` (`LEVEL_ACTION`).
- `planDailyLoop(candidates, presupuesto?)` → `DailyExperimentPlan`: agrupa por
  nivel (explotación = A+B, optimización = C, exploración = D), presupuesto
  **70/20/10**, selección `round(len × fracción)`, 8 pasos del ciclo diario
  (`DAILY_LOOP_STEPS`) y regla estratégica (`ESTRATEGIC_RULE` — "¿qué experimento
  tiene la mayor probabilidad de mejorar el ecosistema completo...?").
- `DEFAULT_EXPERIMENT_WEIGHTS`, `LEVEL_ACTION`, `DAILY_LOOP_STEPS`,
  `ESTRATEGIC_RULE` exportados en `AL`.

**Tests**: 21 + 8 = **29 PASS** (classify thresholds, orden/fórmula/pesos/empates,
planDailyLoop niveles/presupuesto/personalizado/vacío).

### Runner `scripts/autolearn.py` (cierra el ciclo: autoprogramado real)

Stdlib puro, sin deps, espejo del dominio TS (patrón `scripts/cloud-cli.py`):

- Lectura: `LEARNINGS.md` + `STATE.md` + `learning/truth/*.json` y
  `learning/sources/*.md` (root por env `AUTOLEARN_ROOT`).
- `detect_gaps` (4 kinds, same as TS) + `rice_score` (RICE simplificado).
- `metaia_level(score)` — umbrales calibrados sobre RICE del repo real:
  A≥1.2 (fuentes sin analizar 1.2 → A), B≥1.0 (backlog 1.067 → B), C≥0.8
  (temas 0.8 → C), D resto.
- `build_plan` + `format_plan` → `.opencode/plans/autolearn-<fecha>.md` con
  objetivo, gaps priorizados por nivel y los 8 pasos del motor META-IA.
- CLI: `--dry-run`, `--validate`, `--out <ruta>`, `--length N`, `--verbose`;
  determinista (mismo input → mismo plan).

**Tests**: `scripts/autolearn.test.py` **6/6 e2e PASS** (detección/prioridad,
plan en out, validate ok/fallos, determinismo, repo vacío, pasos del motor).

**Docs**: `docs/RAZONAMIENTO-META-IA.md` (análisis + mapping fuente→implementación);
fuentes nuevas descargadas: `learning/sources/meta-ia-experimentos.md`,
`learning/sources/brain-md.md`, `learning/sources/graphify.md` (análisis de las dos
últimas diferido a iteración siguiente).

### Reglas reafirmadas

- Los gates FULL se corren sobre el worktree REAL; si el WIP ajeno se restauró
  byte-exact, los archivos tocados vuelven a su versión ajena y el runtime NO expone
  las capabilities nuevas hasta el merge de la FASE 2.
- El título bold de una lección ES el tema — no descartarlo en el parse (lección
  aprendida en esta iteración, fallo real en el primer run de tests).