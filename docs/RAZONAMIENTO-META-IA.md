# RAZONAMIENTO-META-IA — Motor de priorización de experimentos para el autoprogramador

**Fecha**: 20/08/2026 · **Iteración**: 73 · **Fuente**: `learning/sources/meta-ia-experimentos.md`
(post de Instagram DcL0G4MDiKV pegado por el usuario en enlaces.txt — desbloqueado)

## Qué es la fuente

Un **sistema de priorización de experimentos para una "Meta-IA"** (el sistema que decide
qué experimento ejecutar para mejorar los generadores de imagen/vídeo/audio/3D y el
ecosistema completo). Reglas clave:

1. **Fórmula de prioridad**: `impacto × confianza × valor_de_aprendizaje × urgencia_estratégica ÷ costo_computacional` — priorizar por valor esperado de aprendizaje, NUNCA por curiosidad.
2. **Categorías de experimentos**: C1 máxima prioridad (reglas con alta confianza+alto impacto), C2 prioridad alta (evidencia moderada → validar), C3 metaaprendizaje (genera inteligencia futura), C4 exploración (reserva fija 70/20/10: explotación/optimización/exploración — aunque contradiga reglas actuales).
3. **Matriz de niveles**: A (impacto≥0.85, confianza≥0.85 → ejecutar ya), B (≥0.6 → corto plazo), C (≥0.4 → cola), D (→ exploración ocasional).
4. **Plantilla JSON**: `{experiment_id, objective, related_rules[], confidence_score, expected_gain, knowledge_gain, compute_cost, strategic_importance, priority_score, priority_level}`.
5. **Ciclo diario de 8 pasos**: analizar reglas nuevas → detectar reglas débiles → detectar cuellos de botella → calcular ROI → calcular conocimiento esperado → ordenar → ejecutar los mejores → actualizar biblioteca.
6. **Regla estratégica**: "¿qué experimento tiene la mayor probabilidad de mejorar el ecosistema o generar conocimiento valioso al menor costo?" (no "¿qué puedo hacer?").

## Mapeo implementado (iter-73) → `autolearn.ts` (dominio puro determinista)

| Idea de la fuente | Implementación |
|---|---|
| Fórmula prioridad (impacto×confianza×aprendizaje×estrategia/costo) | `prioritizeExperiments(items, pesos?)` → `score` normalizado 0-1: `(impacto × confianza × expected_gain × strategic_importance) / (compute_cost + ε)` con pesos por defecto `{impacto:1, confianza:1, expectedGain:1, strategic:1, cost:1}` |
| Matriz de niveles A/B/C/D | `classifyExperiment(score)` → `{nivel: 'A'\|'B'\|'C'\|'D', accion}` (A≥0.75 ejecutar ya; B≥0.5 corto plazo; C≥0.3 cola; D exploración ocasional) + `ExperimentLevel` |
| Categorías C1-C4 / presupuesto 70/20/10 | `planDailyLoop(gaps, {explotacion=0.7, optimizacion=0.2, exploracion=0.1})` → `DailyExperimentPlan` (8 pasos del motor + presupuesto por categoría: backlog_pendiente→explotación, source_sin_analizar→optimización, leccion/tema→explotación, resto→exploración) |
| Ciclo diario 8 pasos | `DAILY_LOOP_STEPS` (constante) — embebido en el output de `planDailyLoop` |
| Regla estratégica | `ESTRATEGIC_RULE` (constante) + doc string de la capability — "no qué puedo hacer, sino qué mejora al menor costo" |
| Plantilla JSON | `ExperimentCandidate` (mismo shape: experiment_id, objective, related_rules, confidence_score, expected_gain, knowledge_gain, compute_cost, strategic_importance) |

## Mapeo pendiente / diferido

- **FASE 2 wiring** (llm.ts/index.ts del worktree = WIP ajeno #25 con `creativo`): el nuevo
  motor queda disponible en el dominio `autolearn` pero el tool `autolearn_run` NO expone
  aún `plan` con el motor META-IA hasta el merge aditivo (iter prevista con cuarentena).
- **Runner real** (`scripts/autolearn.py`, FASE 3): lee el estado real y ESCRIBE
  `.opencode/plans/autolearn-<fecha>.md` reutilizando el motor (prioritizeWork + nivel META-IA).
- **brain.md (mindmuxai, "memoria persistente para agentes como Markdown + CLI")**:
  `learning/sources/brain-md.md` descargado (Apache-2.0, CLI 0 deps). Patrón transferible:
  capa de memoria durable en Markdown versionable. Mapping a UltraIa: nuestro
  `learning/truth/` + `LEARNINGS.md` YA cumplen ese rol (verdad aparte + lecciones);
  gap real = CLI/API de lectura-escritura de memoria standard (el runner FASE 3 lo cierra en
  parte). Implementación = siguiente iteración (candidato: subcomandos del runner para
  `brain read/write`).
- **graphify (Graphify-Labs, "grafo para agentes")**: `learning/sources/graphify.md`
  descargado. Mapping: nuestro world graph de OMAG + relations de mediafield.
  Implementación diferida (candidato: exportar el graph a formato Graphify en el runner).
- La "consulta bottleneck_detection / meta_learning_patterns" de la fuente → equivalente a
  `detectGaps` + `scanTruthStats` actuales. OK.

## Verificación iter-73

- Scoped: `autolearn.test.ts` 21→29 tests PASS (+8: prioritizeExperiments pesos/fórmula/
  empates, classifyExperiment umbrales A/B/C/D, planDailyLoop presupuesto/8 pasos/exploración).
- Python: `scripts/autolearn.py` pyflakes 0 + py_compile OK + `scripts/autolearn.test.py` e2e.
- FULL: typecheck/lint/test/build verdes (red restaurada 20/08).

## Lecciones

- El post de IG "bloqueado" tenía el contenido pegado por el usuario al final de enlaces.txt:
  al detectar un banner de "requiere acción humana", revisar TODO el archivo (tail) antes de
  declararlo sin fuente (el contenido puede ya estar ahí).
- contextos de priorización: la fórmula META-IA es un caso especial del RICE simplificado
  con más factores (gain/knowledge/strategic/cost) — `prioritizeExperiments` es el
  superconjunto; `prioritizeWork` (RICE) se mantiene para compatibilidad del tool existente.