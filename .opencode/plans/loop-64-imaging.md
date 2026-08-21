# Plan loop-64 — capability `imaging` (kernels de imagen en TS puro)

> Bucle IA 4 fases (Sensado / Razonamiento / Acción / Aprendizaje) · 3 pasadas (C1 base,
> C2 ajuste, C3 consolidación). Plantilla ampliada (ciclo 57b).

## Contexto (Sensado)

HEAD = `913e798` (bitácora iteración 63). Wirings 59-61 **COMPLETOS** (`f8b5e7d` llm.ts +
`63ad94b` index.ts) — no rehacer. `llm.ts` e `index.ts` **LIBRES**.

Hallazgo bloqueante detectado en el sensado: **36 archivos versionados de la raíz están a 0
bytes** (`package.json`, `tsconfig.base.json`, `AGENTS.md`, `LOOP.md`, `opencode.json`, …)
por un cierre sucio de NTFS a las `1787104407`. Ver
`docs/INCIDENTE-ARCHIVOS-VACIOS-2026-08-19.md`. Consecuencia operativa: **no hay `npm run`**
⇒ los gates FULL no se pueden ejecutar en esta iteración; se usan gates *scoped*
(precedente: iteraciones 30, 35-45, 58-61).

## Objetivo

Cerrar los **tres gaps `◑ parcial` que quedaban del Bloque A** de
`fundamentos-programacion.md` con una sola capability determinista y sin dependencias:

- **A8** procesamiento de imágenes (kernels en TS puro) — no existía nada
- **A9-A11** optical flow — `motion` solo generaba `argv` de un runner Python
- **A22-A24** comparación — `videoqa` solo medía buffers 1-D, sin mapas de error ni SSIM local

## Métrica / Target

| métrica | target |
|---|---|
| tests `imaging.test.ts` | ≥ 45 PASS, 0 FAIL |
| `tsc --noEmit` scoped | EXIT 0 |
| colisiones de nombres con `export *` de `tools/index.ts` | **0** (verificado antes de cablear) |
| flujo óptico: desplazamiento conocido de 1 px | error < 0.3 px |
| flujo piramidal: desplazamiento de 6 px con ventana 4 | error < 1.5 px |

## Prioridades

- **P0** `imaging.ts` + tests + gates scoped
- **P1** wiring (`tools/index.ts`, `ai/llm.ts` → `imaging_process`)
- **P2** script de recuperación del incidente + doc del incidente
- **P3** docs (`RAZONAMIENTO-IMAGING.md`, mapeo fundamentos, STATE, bitácora)
- **P4** gates FULL (bloqueados hasta restaurar la raíz)

## Archivos a tocar

| archivo | acción |
|---|---|
| `packages/core/src/tools/imaging.ts` | NUEVO |
| `packages/core/src/tools/imaging.test.ts` | NUEVO |
| `packages/core/src/tools/index.ts` | +export, +`tools.imaging`, +descripción, +union |
| `packages/core/src/ai/llm.ts` | +import, +bloque `tools.imaging_process` |
| `scripts/restore-empty-tracked.ps1` | NUEVO (incidente) |
| `docs/INCIDENTE-ARCHIVOS-VACIOS-2026-08-19.md`, `docs/RAZONAMIENTO-IMAGING.md` | NUEVOS |
| `docs/RAZONAMIENTO-FUNDAMENTOS-PROGRAMACION.md`, `STATE.md`, `loop-run-log.md` | actualizar |

## NO hacer

- **NO** `git restore .` ni `git checkout .`: destruiría el WIP sin commitear de las sesiones
  concurrentes (`recorder.ts`, `automation.ts`, `blueprint.ts`, `reach.ts`, migración
  `connections`) que `STATE.md` marca como intocable.
- **NO** tocar `cuentas.txt`, `.ultraia/**` ni los ficheros staged de la sesión #25.
- **NO** duplicar métricas de píxel: `compareImages` reutiliza `videoqa.mse`/`videoqa.psnr`.
- **NO** ejecutar ffmpeg/OpenCV/red desde el dominio: `imaging` es CPU puro y offline.
- **NO** commitear sin pathspec explícito (regla vigente; el índice arrastra ~128 archivos ajenos).

## Tolerancias

- Flujo óptico: ±0.3 px (1 nivel), ±1.5 px (piramidal). No se persigue precisión sub-0.1:
  el objetivo es un veredicto de movimiento, no fotogrametría.
- SSIM local: `mean` con 6 decimales frente a imágenes idénticas (`toBeCloseTo(1, 6)`).
- Convolución separable vs 2D: 8 decimales.

## Recursos / Presupuesto

- Sin GPU, sin red, sin claves. Solo `zod` (ya es dependencia de `@ultraia/core`).
- Presupuesto: 1 iteración, 1 archivo de dominio nuevo, sin tocar dominios ajenos.

## Criterios de aceptación

1. Tests scoped verdes y deterministas (dos ejecuciones ⇒ mismo resultado bit a bit).
2. `motion.flowStats` y `motion.decomposeMotion` consumen el `FlowField` de
   `lucasKanadeFlow` **sin adaptador**.
3. `ssimMap` detecta un defecto local que el `videoqa.ssim` global diluye, y devuelve su
   coordenada.
4. 0 colisiones de exports; `Capability` incluye `'imaging'`.

## Riesgos

| riesgo | mitigación |
|---|---|
| colisión de nombres en `export *` (precedente `catmullRom`) | diferencia de conjuntos de exports contra los 28 módulos ANTES de cablear |
| sesión concurrente editando `llm.ts`/`index.ts` | escritura con guardia de `mtime`; bloque nuevo aislado bajo `opts.tools?.includes('imaging')` |
| gates FULL imposibles (raíz truncada) | gates scoped + P2 entrega el script que desbloquea los FULL |
