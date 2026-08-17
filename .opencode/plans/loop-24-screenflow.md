# Plan WS-3 — Capability `screenflow` (ScreenFlow: grabación → acciones → edición → publicación local → continuidad)

- **TaskID**: loop-24-screenflow
- **Fecha**: 17/08/2026
- **Fuente**: petición del usuario ("grabar pantalla automáticamente → ejecutar acciones → editar → publicar localmente → continuidad") aprobada en el plan maestro de 3 workstreams.
- **Estado**: pendiente (inicia tras commit 2 video-edit ✅)

## Contexto

El usuario quiere un pipeline de producción de video de pantalla automatizado:
1. **Captura**: grabar la pantalla (ffmpeg gdigrab, keyless, ya instalado).
2. **Acciones**: ejecutar pasos sobre la máquina/web durante la grabación (ActionScript JSON declarativo → pyautogui; Playwright/patchright para web).
3. **Edición**: reutilizar la capability `video_edit` (WS-2) + `omag/sound`/`audiolibrary` + loudnorm.
4. **Publicación local**: paquete reproducible en `.ultraia/recordings/<run-id>/`.
5. **Continuidad**: resume idempotente (state.json), retry máx 3, fail-soft, logs, scheduling (schtasks / watch / a demanda).

## Objetivo

- `packages/core/src/tools/screenflow.ts` — orquestador determinista y testable (sin ejecución real en tests):
  - `validateActionScript(spec)` — validador del ActionScript JSON (comandos conocidos, bounds, tiempos).
  - `planRuns(actions, opts)` — segmenta la grabación por pasos → lista de runs con duración estimada.
  - `buildFfmpegCapture(argv)` — argv ffmpeg gdigrab (segmentado, CRF 18, pcm_s16le).
  - `buildOutputNaming(runId, slug, version)` — `YYYYMMDD-HHMMSS-<slug>-v<N>.mp4` + `latest.mp4`.
  - `buildManifest(run)` — manifest.json (comandos, duración, hashes sha256, toolchain).
  - `scheduleCmd(spec)` — argv para `schtasks` (Windows) / `cron` (Linux) — determinista.
  - `resolveState(statePath)` — estado de continuidad: resume, retries, fail-soft.
  - Tools de agente: `screenflow_plan` (valida ActionScript + genera plan/runs), `screenflow_capture` (argv ffmpeg), `screenflow_schedule`, `screenflow_state`.
- `scripts/screenflow/actions.py` — ejecutor real de ActionScript (pyautogui; Playwright opcional; keyless).
- `scripts/screenflow/schedule.ps1` — crea tarea programada (schtasks) para un run.
- `Task/run_screenflow.ts` — runner CLI: valida → captura → (acciones) → edita con video-edit → publica en `.ultraia/recordings/`.
- `docs/SCREENFLOW.md` — guía de uso (captura, ActionScript, programación, continuidad).
- Registro: capability `screenflow` en `ai/llm.ts` + export en `tools/index.ts`.
- `.gitignore`: añadir `.ultraia/recordings/` y `logs/`.

## Pasos

1. Plan file (este archivo) + resumen `[P]` en loop-run-log.md.
2. `packages/core/src/tools/screenflow.ts` — dominio puro (zod, determinista, sin I/O).
3. `packages/core/src/tools/screenflow.test.ts` — ~15 tests con mocks (cero ejecución real).
4. `scripts/screenflow/actions.py` + `scripts/screenflow/schedule.ps1` + `Task/run_screenflow.ts` + `docs/SCREENFLOW.md`.
5. Registro en `ai/llm.ts` (capability `screenflow`) + `tools/index.ts`.
6. `.gitignore` (+ `.ultraia/recordings/`, `logs/`), LEARNINGS.md, AGENTS.md.
7. Gates FULL + commit 3 `feat(screenflow): ...`.

## ARCHIVOS A TOCAR

- `packages/core/src/tools/screenflow.ts` (nuevo)
- `packages/core/src/tools/screenflow.test.ts` (nuevo)
- `packages/core/src/tools/index.ts` (registro)
- `packages/core/src/ai/llm.ts` (tools screenflow_*)
- `scripts/screenflow/actions.py` (nuevo)
- `scripts/screenflow/schedule.ps1` (nuevo)
- `Task/run_screenflow.ts` (nuevo)
- `docs/SCREENFLOW.md` (nuevo)
- `.gitignore` (añadir 2 líneas)
- `learning/LEARNINGS.md`, `AGENTS.md` (documentar)
- `.opencode/plans/loop-24-screenflow.md` (este archivo)

## Criterios scoped

- `npx vitest run src/tools/screenflow.test.ts` (core, 15+ PASS)
- typecheck core OK

## Criterios FULL (por commit)

- `npm run typecheck` → `npm run lint` → `npm run test` (core 413+15 + runtime 193) → `npm run build` (limpiar `.next` si stale; matar dev servers antes)

## Riesgos

- pyautogui/patchright requieren instalación; el runner degrada con mensajes claros (fail-soft).
- Grabación real solo bajo demanda/--dry-run en tests.
- schtasks solo Windows (Win32); en Linux documentar cron.
- NO ejecutar ffmpeg/pyautogui en tests (argv generation only).

## Esfuerzo

~3 horas (dominio 1h, scripts 1h, wiring/docs 1h) — 1 commit.
