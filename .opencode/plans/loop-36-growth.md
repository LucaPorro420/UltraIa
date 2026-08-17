# Plan loop-35 — Capability `growth` (patrones VidRush + Abacus.AI, enlaces.txt)

## Contexto
- URLs nuevas en enlaces.txt (17/08/2026, sin procesar): vidrush.ai + abacus.ai + perfiles
  IG/TikTok de creadores (referencia visual, no técnicos — anti-bot).
- Fuentes verificadas por webfetch: VidRush = "AI production team for long-form video"
  (brief → video 6-40min <1h; 5 especialistas en paralelo; "Modeled on your channel":
  estudia pacing/ritmo de edición/cadencia del canal; aprobación del plan ANTES de
  generar; sourcing con compliance CC/Public Domain/Commercial Stock; $1.93-2.72/min).
  Abacus.AI = agentes self-improving + "Adaptive Twitter Engine" (aprende estilo, analiza
  performance, mejora con engagement) + "Autonomous YouTube Influencer Agent" (test de UNA
  variable a la vez → playbook canal-específico).
- Backlog F5 pendiente (AGENTS.md): "promoción automática de agentes vía signals" +
  "analytics reales por API de canal". El patrón playbook-por-canal lo cubre en dominio puro.

## Objetivo
Capability `growth` en `packages/core/src/tools/growth.ts`: dominio puro determinista
(sin red, sin LLM) que porta los principios de ambos:
1. **Channel Profile** (VidRush "Modeled on your channel"): perfil de identidad de canal
   desde señales observables (pacing promedio, cadencia de cortes, densidad de texto en
   pantalla, estilo de thumbnail) → `ChannelProfile` tipado.
2. **A/B Experiments** (Abacus "one variable at a time"): dado el perfil y los KPIs por
   publicación, genera experimentos de UNA variable (titulo/hook/thumbnail/duracion),
   con hipótesis, variable, control vs test, y criterio de decisión.
3. **Playbook** (Abacus "compounding wins"): `buildPlaybook` acumula resultados de
   experimentos (signals de engagement) en un playbook por canal — recomendaciones
   persistentes (formato/tono/horario/duracion) que mejoran con cada señal.

## Pasos
1. Descargar fuentes crudas: `learning/sources/vidrush-ai.md` + `learning/sources/abacus-ai.md` (curl, idempotente).
2. `packages/core/src/tools/growth.ts`:
   - Tipos: `ChannelProfile` (pacingAvgSeg, cutCadence, onScreenTextDensity, thumbnailStyle, hookLengthAvg), `ExperimentVariable` ('titulo'|'hook'|'thumbnail'|'duracion'|'formato'), `A/BExperiment {id, variable, hipotesis, control, test, decisionRule}`, `PlaybookEntry {canal, recomendacion, fuente, peso}`.
   - `analyzeChannel(samples)` — samples: Array<{duracionSeg, cortes, textoPantalla, hookChars}> → perfil promedio + clasificación de estilo.
   - `planExperiments(perfil, kpis, maxExperimentos=3)` — prioriza variables con peor KPI, UNA variable por experimento, hipótesis determinista por variable.
   - `buildPlaybook(canal, signals)` — signals: Array<{variable, variante, kpi}> → gana/empata → recomendación con peso (gana>0.15 → peso++), dedupe por (canal,recomendación).
   - Export namespace `growth`.
3. `growth.test.ts`: ~15 tests (perfil promedio/clasificación, samples vacíos → error, experimentos por peor KPI, maxExperiments cap, una variable por experimento, playbook gana/empata/perdedor, dedupe, peso acumulado, errores de input).
4. Wiring: `ai/llm.ts` capability `growth` → tool `growth_plan` (accion profile/experiments/playbook; schema zod) + export en `tools/index.ts` + TOOL_DESCRIPTIONS + union. **Verificar git status de llm.ts/index.ts ANTES de tocar** (regla #25).
5. Docs: `docs/RAZONAMIENTO-VIDRUSH-ABACUS.md` (análisis + mapa implementado/pendiente) + lección en `learning/LEARNINGS.md`.

## Archivos a tocar
- learning/sources/vidrush-ai.md (NUEVO) + abacus-ai.md (NUEVO)
- packages/core/src/tools/growth.ts (NUEVO) + growth.test.ts (NUEVO)
- packages/core/src/ai/llm.ts (si limpio de #25) + packages/core/src/tools/index.ts (si limpio)
- docs/RAZONAMIENTO-VIDRUSH-ABACUS.md (NUEVO) + learning/LEARNINGS.md

## Criterios de éxito
- Vitest scoped growth 15/15 PASS + 0 regresiones en archivos tocados; tsc parcial 0
  errores propios; eslint limpio. FULL pendiente árbol limpio (#25 activo).

## Riesgos
- llm.ts/index.ts tocados por #25 → wiring diferido (documentar), dominio va igual.
- No copiar código de ninguno de los dos productos (solo principios, re-diseñados).

## Esfuerzo
- Medio (~300 líneas + tests).