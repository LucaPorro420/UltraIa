# PLAN: AutoPub Autónomo — ciclo F1→F4 programado + conexiones nube gratis (#90, P1)

Fecha: 2026-08-22 · Modo: P-P→P-B · Presupuesto: 1 ciclo (~6h / ≤100k tokens)

> Numeración: la tarea 89 la tomó la sesión concurrente (`security.ts`, plan `loop-89-security-scan.md`,
> index.ts M ahora mismo) — precedente iter-40: se cede el número y se toma el siguiente libre (90).

## Contexto
- Pedido usuario 22/08: "iniciar la autoprogramación y creación de contenido automatizado para subir a
  redes sociales + la programación de creación de contenido automatizado" + conexiones gratis nube/servidor.
- El pipeline F1-F5 existe en piezas (topics→briefs→enrutador→present→cola→publishDue) pero NO hay
  orquestador que encadene todo en UN ciclo ejecutable ni scheduler que lo dispare.
- Pendiente iter-82: Qdrant Cloud sin cabecera `api-key` (3 líneas).
- Decisiones usuario 22/08: canales TODOS (híbrido vigente: video/imagen→DRAFT humano; texto/blog→APPROVED),
  cadencia 3 ciclos diarios (09:00/14:00/19:00), registrar schtasks AHORA.

## SPEC / DESIGN (S-D)
- `packages/core/src/tools/autopub.ts` — dominio puro + deps inyectables (patrón screenflow/replica):
  `parseAutopubConfig` (zod fail-soft), `planAutopubCycle`, `runAutopubCycle(deps,config)`,
  `defaultAutopubDeps(db)` (compone topics/domain/briefs/enrutador/present/publications reales),
  `textoDeContenido` (texto|guion|guion_largo→narración vía timeline.dialogue), `rowToBrief`.
- Config `{maxBriefs 1..10 def 3, idioma es|ar, canales[], tts, publishDue}`. Un publication POR brief
  usando el canal DEL brief. Reporte JSON+MD en `.ultraia/autopub/ciclo-<ts>.{json,md}`, fail-soft por fase.
- CLI `Task/run-autopub.ts`: --dry-run/--max/--idioma/--canales/--publish-due/--tts. Dry-run no escribe cola.

## LEARN / TEST (L-T)
- Verdad: truth_ultraia_capabilities (edge-tts/pollinations keyless OK). Lecciones: pathspec SIEMPRE,
  build sin dev servers, edge-tts degrada sin abortar.
- Tests (~18): config defaults/clamps, plan pasos, textoDeContenido×3, rowToBrief, run con fakes
  (happy path, fallo F1 continúa, fallo puntual no tumba lote, maxBriefs→take, publishDue on/off,
  duplicados, clock inyectable, passthrough idioma/tts) + qdrant api-key ×3.

## MEJORAS A ADICIONAR
- Scheduler Windows 3×día (`scripts/schedule-autopub.ps1`, Register-ScheduledTask + fallback schtasks.exe).
- heartbeat.yml: step observador `autopub --dry-run`. Fix Qdrant Cloud api-key (tier gratis).

## Pasos
1. autopub.ts + tests → 2. CLI + npm script `autopub` + `.gitignore` `.ultraia/autopub/` →
3. qdrant api-key + tests → 4. wiring llm.ts `autopub_run` (index.ts DIFERIDO si sigue sucio;
   precedent 76→78) → 5. schedule-autopub.ps1 + registrar tareas → 6. heartbeat step →
7. docs (AUTO-PUBLICACION/CANALES-CONFIG/DESPLIEGUE-GRATUITO) → 8. gates → smoke → bookkeeping → commit.

## Archivos a tocar (staging explícito)
- `.opencode/plans/loop-90-autopub-autonomo.md`, `packages/core/src/tools/autopub.ts` (NUEVO),
  `autopub.test.ts` (NUEVO), `Task/run-autopub.ts` (NUEVO), `package.json`, `.gitignore`,
  `qdrant-memory.ts`+`.test.ts`, `ai/llm.ts`, `scripts/schedule-autopub.ps1` (NUEVO),
  `.github/workflows/heartbeat.yml`, `docs/AUTO-PUBLICACION.md`, `docs/CANALES-CONFIG-2026.md`,
  `docs/DESPLIEGUE-GRATUITO.md`, `STATE.md`, `loop-run-log.md`.

## NO-hacer / Riesgos
- NO tocar security.ts/.test.ts/index.ts (sesión 89; solo si libera antes del commit), SACD-P*,
  RoadMapLearning, pdf/, poe-*, AGENT.md/DOCS_TODO, resultTask/qdrant.
- NO .env/.env.* (denylist). NO push. Máx 3 fixes/ítem. Smoke = dry-run (sin publicación real).

## Criterios de verificación
- Scoped: vitest autopub+qdrant ≈ 40 PASS + tsc core 0.
- FULL: typecheck→lint→test→build. Smoke: `npm run autopub -- --dry-run` genera reporte sin mutar cola;
  schtasks lista las 3 tareas.

## TOLERANCIAS
- Flaky red: 1 reintento. schtasks sin admin → fallback schtasks.exe; si falla → script listo + guía.
