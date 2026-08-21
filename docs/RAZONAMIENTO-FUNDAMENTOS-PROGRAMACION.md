# RAZONAMIENTO — FundamentosDeLaProgramacion (Replica Engine + requests eficientes)

Fuente: `learning/sources/fundamentos-programacion.md` (transcript `FundamentosDeLaProgramcon.txt`,
URL chatgpt.com/share/6a84c8a2-fd50-83e9-b85d-4678d39ae3d9). Análisis 18/08/2026 · Ciclo PIVR 56.
Protocolo enlaces.txt: fuente → análisis → implementar lo accionable como ciclos PIVR → lecciones.

## Resumen ejecutivo

El transcript contiene 2 bloques independientes:

1. **Bloque A — Replica Engine**: guía para replicar video a nivel de píxel como función
   matemática (análisis por síntesis). Es el "ADN" técnico de las capabilities de media del
   proyecto: ~60% ya está implementado en UltraIa (generative, codevfx, omag/sound, video_edit,
   travel, screenflow), el resto son 4 gaps concretos y accionables (sdf, videoqa, motion, replica).
2. **Bloque B — 31 prácticas de requests/loops**: ~25 de 31 ya son reglas vivas del harness PIVR;
   los gaps son: plantilla universal de request (13 campos), presupuestos de tiempo, tolerancias
   explícitas, prioridades P0-P5 y el patrón de bucle de IA de 4 fases (Sensado/Razonamiento/
   Acción/Aprendizaje) — que el usuario pidió incorporar a la ejecución (3 pasadas por tarea).

## Mapeo Bloque A → implementación existente (verificado por código)

| Sección fuente | Estado | Implementación UltraIa |
|---|---|---|
| A6 shaders GLSL / colorimetría | ✅ implementado | `codevfx.ts` (9 kinds GLSL hand-written, colorimetryAnalyze HSL, curvatureShade, perspectivePlan; 29 tests) + `omag/vfx-generator.ts` (modality vfx, 7 tests) |
| A14 generación procedural | ✅ implementado | `generative.ts` (perlinNoise, simplexNoise2D/Field, mandelbrot, flowField, lSystem, particles, kenburns + audio FM/granular/ADSR/sequencer; 38 tests) |
| A15 audio como señal | ✅ implementado | `omag/sound.ts` (tone/noise/impact/whoosh/beat/ambience → PCM16+WAV), `omag/tts.ts` (edge-tts keyless), `tools/music.ts` (Tunetank) |
| A16 FFmpeg programático | ✅ implementado | `video-edit.ts` (buildEdl/renderFfmpeg/selfEvalEdl), `travel.ts` (zoompan+xfade), `screenflow.ts` (gdigrab), `vfx.ts` (argv ffmpeg reframe/upscale/lut) |
| A8 procesamiento imágenes | ✅ implementado | **`imaging.ts` (ciclo 64)**: convolución 2D/correlación/separable, kernels gauss/box/Sobel/Prewitt/Laplaciano/sharpen/emboss, blur/mediana/unsharp, morfología, histograma/Otsu/ecualización con clipLimit, resize bilineal, pirámide gaussiana, Canny; 58 tests |
| A22-24 comparación/métricas | ✅ implementado | `media-score.ts` (paquetes) + OMAG critics (semántico) + **`imaging.ts` (ciclo 64): `absDiffMap`/`squaredDiffMap` (error maps 2D), `ssimMap` (SSIM local con ventana gaussiana, MSSIM + peor ventana localizada) y `compareImages` (PSNR + peor cuadrante), reutilizando `videoqa.mse`/`psnr`** |
| A9-11 optical flow/tracking | ✅ implementado | `motion.ts` (stats/descomposición/trayectorias + argv del runner OpenCV) + **`imaging.ts` (ciclo 64): `lucasKanadeFlow` (tensor estructural 2×2) y `pyramidalFlow` coarse-to-fine — flujo REAL en TS puro, `FlowField` consumido directamente por `motion.flowStats`/`decomposeMotion`** |
| A12-13 SDF / ray marching | ✅ implementado | `sdf.ts` (ciclo 58, `7477187`): primitivas sphere/box/torus/capsule/plane, ops union/intersection/subtract/smooth con árbol evaluable, `planSdfScene`, codegen GLSL, `rayMarchPlan` y `renderSdfHtml` (canvas autocontenido); 31 tests + tool `sdf_render` |
| A20-21 métricas PSNR/SSIM/VMAF + E_flow | ✅ implementado | `videoqa.ts` (ciclo 59, `8d14835`): MAE/MSE/PSNR/SSIM, `eFlow`, `eTotal` ponderado (α/β/γ), veredicto contra umbrales y `buildVmafArgv`; 31 tests + tool `videoqa_metrics`. Extendido en 2-D por `imaging.ts` (ciclo 64) |
| A26-37 arquitectura/ruta/proyectos | ✅ implementado | `replica.ts` (ciclo 61, `9f996db`): `runReplica` analyze→generate→compare→optimize con `ReplicaIO` inyectable, descenso por coordenadas, stop conditions (target/maxIterations/patience/timeout), checkpoints y `resumeFrom`; 17 tests + tool `replica_run`. Función de coste 2-D real desde el ciclo 64 (`imaging.compareImages`) |
| A17-19 CUDA/Vulkan/OpenCL | ⏸ fuera de alcance | Requiere GPU/NVIDIA; diferido (como Gen-Engine entrenamiento E0-E5, backlog #6) |

## Mapeo Bloque B → harness PIVR (verificado contra loop-piv/loop-constraints)

| Práctica | Estado | Dónde está en UltraIa |
|---|---|---|
| 5 loops pequeños / 6 una transformación | ✅ | Backlog por tarea en STATE.md; un commit por iteración |
| 7 estados explícitos | ✅ | PIVR (Plan/Implement/Verify/Reiniciar) + agentes piv-plan (read-only) / piv-build |
| 8 precondiciones | ✅ | check_prereqs (start.py), pre-flight git status, concurrency guard |
| 9 condiciones de salida | ✅ | Gates FULL (typecheck→lint→test→build) en cada commit |
| 10 diagnóstico ≠ modificación | ✅ | piv-plan read-only; verifier independiente (loop-verifier) |
| 11 evidencia no afirmaciones | ✅ | loop-run-log con hashes + counts de tests |
| 12 no asumir | ✅ | AGENTS.md: "State explicitly when critical information is missing; never invent it" |
| 13 prioridades | ◑ | P0-P5 explícito NO está en loop-constraints (solo High Priority en STATE.md) |
| 14 NO hacer | ✅ | loop-constraints.md (paths, never disable tests, staging explícito) |
| 15 cambios mínimos | ✅ | "Never refactor unrelated code — one fix per run" |
| 16 idempotentes | ✅ | start.py idempotente, manifests atómicos, restore_memory |
| 17 checkpoints | ✅ | commit por iteración + plan files + quarantine hash-check |
| 18 continue/retry/abort | ✅ | max 3 intentos → escalar a High Priority; fail-soft en adapters |
| 19 retries limitados | ✅ | MAX_RETRIES=3 (loop-constraints, screenflow, video_edit) |
| 20 métricas para detener loops | ✅ | Gates + "si RED → máx 3 intentos, luego escalar" |
| 21 tolerancias | ◑ | En tests individuales (ej. offset 0.1s timeline) pero no como sección de plantilla |
| 22 presupuestos de recursos | ◑ | loop-budget.md (tokens/día) — **sin presupuesto de tiempo por tarea** |
| 23 investigación ≠ ejecución | ✅ | piv-plan; triage report-only |
| 24 formatos estructurados | ✅ | Plan files markdown con plantilla + JSON de presupuesto |
| 25 plantilla universal 13 campos | ❌ gap | Plantilla plan loop-piv tiene Contexto/Objetivo/Pasos/Archivos/Criterios/Riesgos/Esfuerzo — faltan RESOURCES/VALIDATION/FAILURE/RETRY/STOP explícitos |
| 26 request→loop máquina de estados | ◑ | PIVR lo cubre implícitamente; no formalizado como fases IA |
| 27 ANALYZE→PLAN→IMPLEMENT→TEST→VERIFY→REPORT | ✅ | Exactamente PIVR + verifier |
| 28 diff mental | ✅ | Plan file: "Archivos a tocar" + "Riesgos" antes de implementar |
| 29 un loop = una pregunta | ✅ | Backlog granular + gates scoped |
| 30 decisión verificable | ✅ | APPROVE/REJECT del verifier + gates GREEN/RED |
| 31 patrón OBSERVAR→PLANEAR→EJECUTAR→MEDIR→COMPARAR | ◑ | = PIVR; el usuario pidió formalizarlo como **bucle IA de 4 fases** (Sensado/Razonamiento/Acción/Aprendizaje) con 3 pasadas por tarea → ciclo 57 |

## Decisiones de implementación (backlog PIVR 56-62)

1. **#57 Harness**: skill `ultraia-request` (plantilla 13 campos + config declarativa de loop +
   fases IA explícitas) + ampliar plantilla plan loop-piv (RECURSOS/PRESUPUESTO, NO-hacer,
   TOLERANCIAS, prioridades P0-P5) + loop-budget con tiempo. (Bloque B gaps 13/21/22/25/31.)
2. **#58 Capability `sdf`**: primitivas SDF + ops + ray-march planner + GLSL codegen + HTML
   canvas autocontenido (patrón codevfx). Cierra A12-13; alimenta codevfx kind raymarch + OMAG.
3. **#59 Capability `videoqa`**: MAE/MSE/PSNR/SSIM/E_flow/E_total + umbrales + runner
   ffmpeg/libvmaf opcional fail-soft. Cierra A20-24; alimenta OMAG critics + media-score v2.
4. **#60 Capability `motion`**: planFlowAnalysis (runner Python/OpenCV), trajectory fitting,
   cámara vs escena. Cierra A9-11, A14.
5. **#61 Capability `replica`**: orquestador análisis-por-síntesis (analyze→generate→compare→
   optimize, θ params, stop conditions, checkpoints, presupuestos). Cierra A21/26-37.
6. **#62 Skills audit**: inventario + `.opencode/skills-avoid/` (manifest + copias de globales
   evitadas) + AGENTS.md.

7. **#64 Capability `imaging`** (19/08/2026): cierra A8 + A9-A11 + A22-A24 con dominio puro
   (kernels, morfología, tono, pirámides, Canny, mapas de error 2D, SSIM por ventana y
   Lucas-Kanade mono/piramidal) + tool `imaging_process`. Ver `docs/RAZONAMIENTO-IMAGING.md`.

**Bloque A CERRADO salvo GPU.** Único diferido restante: CUDA/Vulkan/OpenCL (A17-19) —
requiere GPU (igual que backlog #6 Gen-Engine E0-E5).

## Lecciones (se alimentan a LEARNINGS.md en C3)

- L1: La fuente confirma que el proyecto ya implementó ~60% del Bloque A con patrones propios
  (codevfx/generative/omag) — el mapeo valida el diseño keyless-first + determinista.
- L2: El Bloque B es esencialmente el harness PIVR ya en producción: formalizar los 6 gaps
  (prioridades, tolerancias, presupuesto tiempo, plantilla 13 campos, fases IA, declarativo)
  es la mejora de mayor ROI del bucle.
- L3: Métricas pixel (PSNR/SSIM/E_flow) son el eslabón perdido entre media-score (pre-pub) y
  OMAG critics (semántico) — videoqa cierra el bucle de verificación visual real.
- L4 (ciclo 64): los tres gaps que quedaban (A8, A9-A11, A22-A24) eran **el mismo** eslabón
  ausente: aritmética de imagen 2-D. Al implementarla una vez (`imaging.ts`) se cerraron los
  tres, y `replica` gana una función de coste 2-D real en vez de una firma escalar.