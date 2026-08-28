# Plan — loop-149: video REAL `fbm-flow` (capstone del ciclo de ruido)

> Modo: build (auto-switch autorizado). Cierra el ciclo 146→147→148: el generador `fbm2D`
> (loop-146) ahora alimenta la animación `fbm-flow` (loop-148); este plan produce un
> VIDEO REAL de esa animación como evidencia end-to-end, keyless y determinista.

## Contexto
`procvid.renderGifBytes(spec, opts)` ensambla un GIF89a animado 100% TypeScript (sin
ffmpeg, sin red) a partir de todos los frames de la spec. Es el artefacto de "video"
ideal para verificar que `fbm-flow` produce movimiento real y reproducible. El runner
`Task/procedural-noise.ts` (loop-147) ya probó el pipeline estático; este prueba el
pipeline de animación.

## Objetivo
Crear `Task/procedural-fbm-video.ts` que genere en `resultTask/procedural-fbm-video/`:
- `fbm-flow.gif`        — animación REAL de `fbm-flow` vía `renderGifBytes` (keyless, sin ffmpeg)
- `fbm-flow-poster.png` — frame 0 como still
- `manifest.json`       — metadatos + fnv1a de cada artefacto (determinismo)

## ARCHIVOS A TOCAR
- `Task/procedural-fbm-video.ts` (nuevo)
- `.opencode/plans/loop-149-procedural-fbm-video.md` (este plan)

## NO-hacer
- NO tocar `llm.ts`/index/geom/recorderly (sesión concurrente bloqueada, tasks 25/142).
- NO añadir agent tool (consumo interno del runner).
- NO commitear `resultTask/` (evidencia; fuera del pathspec, igual que loop-147).
- NO `npm run build` (solo agrega un script Task; dev server vivo en :3000; gates verdes).

## Pasos
1. Escribir `Task/procedural-fbm-video.ts` importando `resolveSpec`, `renderGifBytes`,
   `renderFramePng` de `procvid` y `fnv1a` de `generative` (mismo patrón que loop-147).
2. Ejecutar con `node_modules\.bin\vite-node.cmd Task/procedural-fbm-video.ts`.
3. Verificar determinismo: ejecutar 2 veces y comparar `fnv1a` del GIF (deben coincidir).

## Criterios de verificación (scoped + FULL en commit)
- `vite-node Task/procedural-fbm-video.ts` produce el GIF + poster + manifest sin error.
- Re-ejecución → fnv1a del GIF idéntico (determinismo bit-a-bit del pipeline de video).
- `npm run typecheck` → 0; `npm run lint` → 0; `npm run test` (core) → 1823+ PASS sin regresión.

## TOLERANCIAS
- Dims 320×320 (≤ MAX_GIF_DIMENSION 512); 24 frames a 12fps×2s (≤ MAX_GIF_FRAMES 600).
- Paleta `neoViolet` válida.

## Riesgos
- Bajo. Reusa `renderGifBytes` ya testeado; runner puro sin I/O de red.

## Esfuerzo
- P1 (pequeño, ~60 LOC).

## Predicción (resultado esperado)
- `fbm-flow.gif` real generado (tamaño no trivial), fnv1a estable entre ejecuciones;
  gates verdes. Commit `feat(tools): add procedural fbm-flow video demo` con pathspec
  (script + plan). Sin push. Tras este, el ciclo 146→149 queda cerrado con evidencia
  estática (147) y de video (149).
