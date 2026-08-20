# PLAN: Avance y mejoras del proyecto (plan maestro, sesion 19/08/2026) — prioridad P1-P3

Fecha: 2026-08-19 · Modo: **BUILD (aprobado por usuario 19/08: "inicia el Piv-Plan y luego Piv-Build")** · Patron: bucle IA 4 fases por fase · Presupuesto: ~2-3h / ~35k tokens

## Contexto
- Backlog filas 1-66: TODO DONE salvo #6 (GPU humana), #17 (app review), #25 (EN CURSO, sesion ajena) — no hay tareas de codigo pendientes en la tabla.
- High Priority con entradas OBSOLETAS que ya cerraron otras sesiones — **F1 YA EJECUTADA** (commit 8ce8f85, 19/08: RESUELTO/CERRADO + plan maestro).
- Watch List: `.ultraia/travel/` **F2 YA EJECUTADA** (commit 635ec19: .gitignore + unstaging; status actual `?? .ultraia/` ignorado — 0 media staged); DOCS_TODO con ~100 archivos sin documentar; smoke test 13/13 (14/08) no re-corrido tras iter 66.
- Capacities recientes (imaging/sdf/videoqa/motion/replica/harness/growth/codevfx/vfx) tienen dominio + wiring de tools pero CERO UI web para probarlas.
- Pendiente documentado F5 AutoPub: "promocion automatica de agentes via signals" (growth.buildPlaybook se alimentaria de publicationSignals — wiring completo no hecho).

## Objetivo
- Avanzar el proyecto con mejoras accionables SIN GPU/app review/dependencias humanas: 4 fases restantes (F3 smoke E2E, F4 wiring growth<->signals, F5 UI /lab capabilities, F6 docs DOCS_TODO) — cada fase con su commit y gates.

## Pasos
1. ~~**F1 (P1, docs-only)**: marcar RESUELTO/CERRADO las entradas obsoletas de High Priority~~ — **DONE 8ce8f85**.
2. ~~**F2 (P1, config)**: .gitignore + unstaging .ultraia/travel~~ — **DONE 635ec19** (verificado: status sin media staged).
3. **F3 (P1, verificacion)**: smoke test 13/13 con dev server limpio (`py -3.12 start.py --web --no-open --skip-setup` + browser.mjs con --eval IIFE) — confirmar que la web funciona tras iter 66. Evidencia en run-log. Sin archivos fuente → sin commit propio.
4. **F4 (P2, codigo)**: cierre F5 AutoPub — puente growth <-> publicationSignals en `growth.ts` SOLO dominio puro (publications.ts/publicationSignals ya existen: `{critiques,total}` de ratings BAD): `clasifyCritique` (keywords es/ar → ExperimentVariable|null), `critiquesToKpis` (ChannelKpis: 100 - 20×frecuencia, floor 0, solo variables criticadas), `buildAvoidanceFromCritiques` (PlaybookEntry[]: recomendaciones de EVITAR con peso=frecuencia, orden desc) — el loop se cierra: critiques → kpis → planExperiments (peor KPI primero). **WIRING llm.ts/index.ts DIFERIDO** (ambos M por #25 — verificado en status). Tests: +8-10 en growth.test.ts.
5. **F5 (P2, UI)**: pagina `/lab` (Laboratorio de capabilities): client component con demos deterministas keyless de capabilities visuales (renderSdfHtml de sdf, renderEffectHtml de codevfx, imageStats/canny de imaging, buildAvoidanceFromCritiques de growth) + entrada en nav.tsx. Reutilizar core via server component/import directo (patron cloud-client/metrics-client). Cargar ultraia-design-system antes de escribir UI.
6. **F6 (P3, docs)**: ronda explain-code sobre archivos .ts recientes sin documentar (harness.ts, growth.ts ampliado, travel.ts, cloud.ts...) — JSDoc estilo Better Comments, sin cambiar logica. Marcar [x] en DOCS_TODO.

## Archivos a tocar (staging explicito por fase)
- F3: (sin archivos fuente; evidencia en loop-run-log.md)
- F4: `packages/core/src/tools/growth.ts` + `packages/core/src/tools/growth.test.ts` + `.opencode/plans/loop-67-avance-proyecto.md` (plan file sin commitear)
- F5: `apps/web/src/app/(app)/lab/page.tsx` + `apps/web/src/components/lab-client.tsx` + `apps/web/src/components/app-shell/nav.tsx`
- F6: archivos .ts recientes (JSDoc) — lista exacta en build tras grep DOCS_TODO

## RECURSOS / PRESUPUESTO
- Skills: loop-piv, ultraia-request (bucle IA 4 fases por fase), ultraia-design-system (UI Dark Obsidian), explain-code (F6), loop-concurrency-guard (lock tomado: task 67).
- Herramientas: gates npm (typecheck/lint/test/build), vitest scoped, browser-automation (smoke), git con pathspec.
- Presupuesto: ~2-3h, ~35k tokens; 3 commits de codigo (F4/F5/F6) + evidencia F3.

## NO-hacer (guardas explicitas)
- NO tocar WIP de sesion #25 (recorder.ts/automation.ts/blueprint.ts/reach.ts/connections + tests + migrations + docs AUTOMATION-* + `creativo.ts`/`creativo.test.ts`/`dbg-creativo.ts` untracked ajenos); aislar a %TEMP% solo para gates FULL si rompen y restaurar byte-exact con hash-check.
- NO `git add .` ni `git add -A` — SIEMPRE pathspec por fase.
- NO push sin aprobacion humana (constraint).
- NO tocar .env / secrets / cuentas.txt (staged de #25 — no commitearlo).
- NO tocar llm.ts/index.ts/publications.ts (M por #25) — F4 wiring DIFERIDO.
- NO correr build con dev servers activos (matar node.exe antes).

## Criterios de verificacion
- Scoped: vitest growth.test.ts + tsc parcial en F4; tsc web + eslint en F5; F6 docs-only parcial.
- FULL por fase con commit: typecheck → lint → test → build (esperado core ~1004+ / runtime 193 / build 44 paginas incl. /lab).
- F3: smoke 13/13 PASS.
- F4: tests growth ampliados (+8-10, total growth ~27-29).
- F5: /lab en manifest del build + typecheck web 0.

## TOLERANCIAS
- llm.ts/index.ts sucios → wiring F4 DIFERIDO confirmado (precedente 58-61); commit solo del dominio+test.
- Si smoke falla por flakes de red (Tunetank/yt-dlp) → reintentar 1-2 veces (leccion iter-53).
- Max 3 intentos por item; si gates RED persistente → escalar a High Priority y parar.

## Riesgos / guardas
- Sesion #25 puede tocar el working tree durante el build → cuarentena + hash-check (loop-concurrency-guard).
- .next corrupto por raza → matar node.exe + Remove-Item .next antes del build (Watch List).
- F5 UI puede chocar con design system si no se sigue ultraia-design-system — cargar la skill antes de escribir UI.

## Esfuerzo estimado
- Medio-alto: F3 (~30min), F4 media (~40min), F5 alta (~1h), F6 media (~40min).

## Prediccion (resultado esperado ANTES de actuar)
- Gates FULL verdes en todos los commits; smoke 13/13; growth ~27-29 tests; build con /lab (44 paginas); DOCS_TODO con ~6-10 archivos nuevos [x]; F4 sin wiring (diferido documentado en STATE.md).