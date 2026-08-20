# autolearn — Diseño del agente de autoaprendizaje de UltraIa

**Fuente**: pedido directo del usuario (20/08/2026). **Estado**: implementado en
`packages/core/src/tools/autolearn.ts` (FASE 1, iter-72) — análisis completo en
`docs/RAZONAMIENTO-AUTOLEARN.md`. Este archivo es la fuente de diseño del agente.

## Problema

El proyecto acumula conocimiento verificado (learning/truth, LEARNINGS.md) pero el
ciclo de mejora depende de que un humano (o el loop PIVR manual) decida QUÉ aprender
y CÓMO aplicar lo aprendido. Se pide un agente que automatice el autoprogramado:
que sensa el estado, busca información nueva, decide qué mejorar y genera su propio
plan de trabajo.

## Diseño

### 1. Sensar (estado de aprendizaje)

Entrada: `LEARNINGS.md` (lecciones con fecha/ciclo), `learning/truth/` (verdad
verificada), `STATE.md` (backlog), `learning/sources/` + `docs/RAZONAMIENTO-*.md`
(fuentes y análisis).

Salida: lecciones estructuradas + estadísticas de la verdad (total, fuentes, tipos).

### 2. Razonamiento (gaps + priorización)

Detección de 4 kinds de gaps:
- temas sin verdad verificada
- lecciones sin implementar (topic sin capability)
- fuentes descargadas sin análisis
- backlog pendiente

Priorización RICE simplificado: `(impact × confidence) / effort`.

### 3. Acción (autoprogramado)

`buildImprovementPlan` genera un `LearnPlan` con patrón loop-piv: objetivo, pasos,
archivos a tocar, criterios scoped/FULL, prioridad P0-P5. El agente escribe su
propio plan — un ciclo piv-build lo ejecuta y la fase V lo verifica.

### 4. Ajuste (métricas)

KPIs por ciclo: lecciones totales/recientes, verdad verificada, gaps abiertos,
fuentes analizadas, tasa de mejora (lecciones recientes + verdad) / total.

## Integración

- Tool `autolearn_run` (acciones scan/gaps/plan/metrics) bajo capability `autolearn`.
- FASE 3 (pendiente): runner Python `scripts/autolearn.py` que genera el plan file
  automáticamente desde los archivos reales del repo.
- FASE 4 (pendiente): persistencia externa (Qdrant/cloud) de las lecciones.

## Criterios de éxito

- El agente genera un plan de mejora ACCIONABLE (no texto vago) cada ciclo.
- Los gaps detectados mapean 1:1 a tareas del backlog o a fuentes por analizar.
- La tasa de mejora sube con el tiempo (más verdad verificada, menos gaps).