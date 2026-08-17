# Plan loop-34 — Port de DeepSeek Harness (enlaces.txt línea 804)

## Contexto
- Usuario: "Adicionalo al modo agente y al proyecto: No copies, crea de forma totalmente
  aislada al modelo de forma nueva y que aparente ser creado por un ser humano no vibecoding."
- deepseek-harness VERIFICADO (17/08/2026): repo real, MIT, 148k stars, rama `master`,
  "Everything is a Plugin" sobre Cordis (creado 13/08/2026). Fuente cruda descargada:
  `learning/sources/deepseek-harness.md` (README + docs/architecture.md + AGENTS.md).
- Patrón del proyecto: port ORIGINAL de principios (g0dm0d3, video-edit, cloud) — nada de
  código copiado, attribution header, dominio puro determinista + tests.

## Objetivo
Capability `harness` en `packages/core/src/tools/harness.ts`: runtime de agente donde TODO
es plugin (sin core privilegiado), seams intercambiables, eventos tipados y efectos
reversibles que se deshacen al desactivar. Determinista, sin red, con reloj inyectable.

## Principios portados (re-diseñados, estilo UltraIa)
1. Todo es plugin: `HarnessPlugin { id, kind, dependsOn?, activate(ctx), deactivate?(ctx) }`;
   registros = efectos que se deshacen (unwind) en shutdown inverso.
2. Seams: `defineSeam<T>(name)` → Service Definition / Provider / Consumer; resolver sin
   provider → error claro.
3. Eventos como extensión: `ctx.events.on/emit`; suscripciones se deshacen al desactivar.
4. Sin core privilegiado: `createHarness({plugins})` + boot() (validación id
   `^[a-z0-9][a-z0-9-]{1,63}$`, duplicados, orden topológico Kahn por dependsOn, ciclos →
   error), run({tool,args}) a través de tools activas, shutdown() inverso fail-soft, dump().
5. Scheduler determinista con reloj inyectable (ticks → tareas programadas).

## Pasos
1. `packages/core/src/tools/harness.ts`: tipos + createHarness + defineSeam + plugins de
   ejemplo (echoTool, counterScheduler, logPlugin) + export namespace `harness`.
2. `harness.test.ts`: 15 tests (orden de activación, dependencia faltante, ciclo, id
   inválido, duplicado, shutdown inverso, efectos reversibles, seam sin provider, run ok,
   run tool desconocida, scheduler con reloj, dump, shutdown fail-soft, deactivate
   opcional, state namespaced).
3. Wiring: `ai/llm.ts` capability `harness` → tool `harness_manage` (accion
   boot/dump/run/shutdown) + export en `tools/index.ts` (verificar que están limpios de #25
   ANTES de tocar).
4. `docs/RAZONAMIENTO-DEEPSEEK-HARNESS.md` (análisis + mapa implementado/pendiente) +
   lección en `learning/LEARNINGS.md` + anotación en `enlaces.txt` NO (archivo de #25 —
   el estado del enlace queda documentado en el RAZONAMIENTO).

## Archivos a tocar
- packages/core/src/tools/harness.ts (NUEVO)
- packages/core/src/tools/harness.test.ts (NUEVO)
- packages/core/src/ai/llm.ts (+ capability `harness`)
- packages/core/src/tools/index.ts (+ export `harness`)
- docs/RAZONAMIENTO-DEEPSEEK-HARNESS.md (NUEVO) + learning/sources/deepseek-harness.md (YA)
- learning/LEARNINGS.md

## Criterios de éxito
- Vitest scoped harness 15/15 + 0 regresiones en archivos tocados; tsc parcial 0 errores;
  eslint limpio. Gates FULL pendientes árbol limpio (#25 sigue activo).

## Riesgos
- llm.ts/index.ts: NO tocar si #25 los tiene modificados (git status previo al edit).
- No importar nada del repo original (verificación visual del diff — código propio).

## Esfuerzo
- Medio (~280 líneas + tests).