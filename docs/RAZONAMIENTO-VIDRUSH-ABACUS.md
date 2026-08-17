# RAZONAMIENTO — VidRush + Abacus.AI → capability `growth` (enlaces.txt)

> Fuentes: `learning/sources/vidrush-ai.md` + `learning/sources/abacus-ai.md` (URLs nuevas
> en enlaces.txt, 17/08/2026 — vidrush.ai, abacus.ai + perfiles IG/TikTok de creadores que
> son referencia visual, no técnicos, anti-bot: no procesados).
> Port: `packages/core/src/tools/growth.ts` — capability `growth` (iteración 35).

## Análisis

**VidRush** = "equipo de producción AI para video largo" (brief → video 6-40min < 1h).
Sus dos principios transferibles: (1) *"Modeled on your channel"* — el pipeline estudia la
identidad del canal (pacing, ritmo de edición, cadencia de cortes, densidad de texto,
jerarquía tipográfica de thumbnails) antes de producir; (2) *aprobación del plan ANTES de
generar* (script, footage, estilo, costo) — el humano decide qué se hace antes de gastar
cómputo. También: sourcing con compliance (CC/Public Domain/Commercial Stock) y edición
por chat sin regenerar.

**Abacus.AI** = plataforma de agentes auto-mejorables. Sus principios transferibles:
(1) *"one variable at a time"* (Autonomous YouTube Influencer Agent) — testear UNA variable
por experimento (thumbnail/título/metadata) y componer cada victoria en un playbook
canal-específico; (2) *Adaptive Twitter Engine* — aprender el estilo del canal, analizar
performance, mejorar con engagement (database-driven insights); (3) agentes self-improving
(Autobots) que "se vuelven mejores con cada ejecución".

Ambos convergen en el mismo patrón: **perfil de canal → experimentos aislados → playbook
que compone victorias**. Eso es exactamente el pendiente F5 de AutoPub ("promoción
automática de agentes vía signals").

## Mapeo implementado (port ORIGINAL, dominio puro determinista)

| Principio | Port UltraIa (`growth.ts`) |
|---|---|
| Modeled on your channel (VidRush) | `analyzeChannel(samples)` → `ChannelProfile` (pacingAvgSeg, cutCadence, onScreenTextDensity, hookLengthAvg, thumbnailStyle clasificado: texto-grande/closeup/comparativo/mixto) |
| One variable at a time (Abacus) | `planExperiments(perfil, kpis, max)` — UNA variable por experimento, peor KPI primero, hipótesis/control/test/regla de decisión deterministas (+5 pts) |
| Compounding wins → playbook (Abacus) | `buildPlaybook(canal, signals)` — victoria = test > control +5; cada victoria suma peso a la recomendación; dedupe por (canal, recomendación); ordena por peso desc |
| Aprobación antes de generar (VidRush) | Ya cubierto por la cola `Publication` (DRAFT + aprobación humana para video/imagen) — el playbook/experimentos alimentan qué probar, la cola aprueba qué publicar |

Wiring: capability `growth` → tool `growth_plan` (acciones profile/experiments/playbook,
schema zod) + export/descriptor/union en `tools/index.ts`. 19 tests.

## Verificación

- Vitest scoped: growth 19/19 + harness 19/19 (regresión) = 38/38 PASS.
- tsc parcial: 0 errores propios (ruido preexistente reach.ts de #25).
- eslint 4 archivos: 0 issues. FULL pendiente árbol limpio (#25 activo).

## Pendiente (no portado — requiere integración real)

- **Costo estimado por render** (VidRush): hoy no hay costo medible por video en el dominio
  puro; con Gen-Engine + GPU cloud podría estimarse — diferido.
- **Sourcing con compliance** (CC/Public Domain/Commercial Stock): los generadores OMAG son
  keyless; un selector de fuentes por política sería extensión de `video_edit`/OMAG.
- **Analytics reales por API de canal** (Abacus): requiere tokens OAuth de YouTube/TikTok —
  el feedback post-pub (F5) ya existe como canal de signals para `buildPlaybook`.
- **Auto-mejora de prompts/estrategias**: hoy el playbook es un artefacto determinista; el
  loop "mejorar con cada ejecución" (Autobots) se alimentaría de `buildPlaybook` como
  entrada al sistema de agentes — diferido a la integración con el pipeline de skills.