# PLAN: Capability `videoqa` — métricas de calidad de vídeo (tarea #59 de STATE.md, prioridad P1)

Fecha: 2026-08-18 · Modo: build · Patrón: bucle IA 4 fases × 3 pasadas (C1 base / C2 ajuste / C3 consolidación) · Presupuesto: bajo, ~1-2h

## Contexto
- Fuente: FundamentosDeLaProgramacion §A20-24 (PSNR > 40 dB, SSIM > 0.95, error map, frame a frame) — gap confirmado por grep en ciclo 56.
- Sesión 57b construye sdf (lock task 58) — videoqa.ts NO existe → construir en ráfaga y commitear ANTES de que la tomen.

## Objetivo
- Módulo `videoqa.ts` determinista y keyless: MAE/MSE/PSNR/SSIM matemática pura sobre buffers + E_flow (flujo óptico) + E_total ponderado (α=0.6/β=0.3/γ=0.1) + veredicto con umbrales (PSNR>40, SSIM>0.95, E_total<0.4) + buildVmafArgv (argv ffmpeg/libvmaf determinista, NUNCA ejecuta). Tests ≥ 30.

## Pasos
1. C1: videoqa.ts (schemas zod + métricas + E_total + verdict + runner argv) + videoqa.test.ts.
2. C2: scoped vitest → ajustar (lección: eTotalMax 0.05 incoherente con PSNR>40 → 0.4).
3. C3: typecheck scoped + commit con pathspec explícito.

## Archivos a tocar (staging explícito)
- `packages/core/src/tools/videoqa.ts` — NUEVO
- `packages/core/src/tools/videoqa.test.ts` — NUEVO
- `.opencode/plans/loop-59-videoqa.md` — plan file
- `loop-run-log.md` + `STATE.md` — bitácora + fila 59 DONE (verificar diffs de sesiones antes)

NO tocar: sdf.ts/sdf.test.ts (sesión 57b), llm.ts/index.ts (wiring DIFERIDO), libros.ts, WIP #25.

## RECURSOS / PRESUPUESTO
- npx vitest run packages/core/src/tools/videoqa.test.ts; npx tsc --noEmit -p packages/core.

## NO-hacer
- NO ejecutar ffmpeg nunca (solo argv). NO tocar archivos de sesiones activas. NO git add .

## Criterios de verificación
- Scoped: vitest videoqa ≥ 30 PASS + tsc core 0 errores.
- FULL antes de commit: typecheck → lint → test → build (evaluar árbol; sesiones activas pueden ensuciarlo — precedente aislamiento).

## TOLERANCIAS
- Si la sesión 57b toma videoqa.ts → CEDER (precedente 58), sin guerra.
- Gates RED por archivos ajenos → aislamiento temporal (precedente iter-54).

## Esfuerzo estimado
- bajo — matemática estándar, sin deps, sin ejecución real.