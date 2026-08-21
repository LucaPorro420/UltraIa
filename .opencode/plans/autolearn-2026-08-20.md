# PLAN AUTOGENERADO (scripts/autolearn.py)

**Fecha**: 2026-08-20 · **Prioridad**: P1

## Objetivo
Cerrar 5 gaps de aprendizaje priorizados (gap_7, gap_0, gap_1, gap_6, gap_5)

## Pasos
1. [A] Tarea del backlog en estado pendiente (score 1.6, Ejecutar inmediatamente)
2. [A] Fuente "brain-md.md" descargada sin analisis RAZONAMIENTO (score 1.2, Ejecutar inmediatamente)
3. [A] Fuente "graphify.md" descargada sin analisis RAZONAMIENTO (score 1.2, Ejecutar inmediatamente)
4. [C] Tema "audio" aparece en lecciones pero sin caso de verdad verificada (score 0.8, Mantener en cola)
5. [C] Tema "code" aparece en lecciones pero sin caso de verdad verificada (score 0.8, Mantener en cola)

## Archivos a tocar (inferidos de la evidencia)
- brain-md.md
- graphify.md
- truth: 49 docs; topic="search" ausente
- truth: 49 docs; topic="image" ausente
- truth: 49 docs; topic="video" ausente
- truth: 49 docs; topic="code" ausente
- truth: 49 docs; topic="audio" ausente
- STATE.md

## Criterios de verificacion
- Scoped: tests de la capability tocada PASS.
- FULL: typecheck -> lint -> test -> build, todos verdes.
- Commit unico con pathspec (nunca `git add .`).
- Evidencia en STATE.md + loop-run-log.md + LEARNINGS.md.

## Motor META-IA
Presupuesto: explotacion 0.7 / optimizacion 0.2 / exploracion 0.1
Ciclo diario:
1. Analizar reglas nuevas.
2. Detectar reglas débiles.
3. Detectar cuellos de botella.
4. Calcular ROI esperado.
5. Calcular conocimiento esperado.
6. Ordenar experimentos.
7. Ejecutar los mejores.
8. Actualizar biblioteca.

## Regla estrategica
¿Qué experimento tiene la mayor probabilidad de mejorar el ecosistema completo o generar nuevo conocimiento valioso al menor costo? (no "¿qué puedo hacer?")

## Gaps detectados (top 10)
- `source_sin_analizar` — Fuente "brain-md.md" descargada sin analisis RAZONAMIENTO (learning/sources/brain-md.md)
- `source_sin_analizar` — Fuente "graphify.md" descargada sin analisis RAZONAMIENTO (learning/sources/graphify.md)
- `tema_sin_truth` — Tema "search" aparece en lecciones pero sin caso de verdad verificada (truth: 49 docs; topic="search" ausente)
- `tema_sin_truth` — Tema "image" aparece en lecciones pero sin caso de verdad verificada (truth: 49 docs; topic="image" ausente)
- `tema_sin_truth` — Tema "video" aparece en lecciones pero sin caso de verdad verificada (truth: 49 docs; topic="video" ausente)
- `tema_sin_truth` — Tema "code" aparece en lecciones pero sin caso de verdad verificada (truth: 49 docs; topic="code" ausente)
- `tema_sin_truth` — Tema "audio" aparece en lecciones pero sin caso de verdad verificada (truth: 49 docs; topic="audio" ausente)
- `backlog_pendiente` — Tarea del backlog en estado pendiente (STATE.md)

