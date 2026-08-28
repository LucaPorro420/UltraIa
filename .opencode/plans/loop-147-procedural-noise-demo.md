# Plan — loop-147: demo REAL de los nuevos generadores de ruido

> Modo: build (auto-switch autorizado). Continuación de loop-146 (generadores value/fbm/worley).
> Gap: los nuevos generadores están testeados (12 tests) pero no hay artefacto REAL que
> pruebe el pipeline completo matemática → PNG/GIF (como sí lo tenía loop-93 con
> `Task/procedural-demo.ts`). Este plan cierra esa brecha con un demo runner determinista.

## Contexto
`generative.ts` ahora exporta `valueNoise2D/Field`, `fbm2D/Field`, `worleyNoise2D/Field`.
`pngrender.ts` ofrece `valuesToRgba` + `encodePng`/`writePngAtomic` + `encodeGif`/`writeGifAtomic`.
Un demo runner (`Task/procedural-noise.ts`) consume ambos y produce imágenes/GIF reales,
keyless y deterministas (mismos bytes al re-ejecutar). No toca `llm.ts` (sesión concurrente
bloqueada), no añade agent tool.

## Objetivo
Crear `Task/procedural-noise.ts` que genere en `resultTask/procedural-noise/`:
- `value-noise.png`  (valueNoiseField, palette `obsidian`)
- `fbm.png`          (fbmField octaves 5, palette `neoViolet`)
- `worley.png`       (worleyField euclidean, palette `ice`)
- `fbm-ridged.png`   (ridged = 1 - |2·fbm - 1|, palette `fire`) — demuestra composición
- `fbm-animated.gif` (16 frames, fbm2D con desplazamiento temporal, palette `rgb332`) — artefacto animado keyless
- `manifest.json`    (metadatos + fnv1a de cada artefacto para verificar determinismo)

## ARCHIVOS A TOCAR
- `Task/procedural-noise.ts` (nuevo)
- `.opencode/plans/loop-147-procedural-noise-demo.md` (este plan)

## NO-hacer
- NO tocar `llm.ts`/`index.ts`/geom/recorderly (sesión concurrente, tasks 25/142).
- NO añadir agent tool (es dominio puro; el demo es evidencia de pipeline).
- NO commitear `resultTask/` (artefactos de evidencia; queda fuera del pathspec, igual que loop-93/145).
- NO `npm run build` (cambio solo agrega un script Task; dev server vivo en :3000; gates typecheck/lint/test siguen verdes).

## Pasos
1. Escribir `Task/procedural-noise.ts` importando de `../packages/core/src/tools/generative`
   y `../packages/core/src/tools/pngrender` (mismo patrón que `Task/procedural-demo.ts`).
2. Ejecutar con `node_modules\.bin\vite-node.cmd Task/procedural-noise.ts`.
3. Verificar determinismo: ejecutar 2 veces y comparar `fnv1a` en `manifest.json` (deben coincidir).

## Criterios de verificación (scoped + FULL en commit)
- `vite-node Task/procedural-noise.ts` produce los 5 artefactos + manifest sin error.
- Re-ejecución → fnv1a idénticos (determinismo bit-a-bit del pipeline).
- `npm run typecheck` → 0; `npm run lint` → 0; `npm run test` (core) → 1821+ PASS sin regresión
  (el script no altera código bajo test; loop-146 ya verde).

## TOLERANCIAS
- Dims PNG 256×256; GIF 160×160, 16 frames (≤ MAX_GIF_FRAMES 600, ≤ MAX_GIF_DIMENSION 512).
- Paletas válidas: obsidian/neoViolet/ice/fire existen en `PALETTES`.
- Campos en 0..1 (garantizado por los generadores).

## Riesgos
- Bajo. Runner puro, sin I/O de red, sin ffmpeg. El GIF usa codificador puro TS.

## Esfuerzo
- P1 (pequeño, ~90 LOC).

## Predicción (resultado esperado)
- 5 artefactos reales generados; manifest con fnv1a estables entre ejecuciones;
  gates verdes. Commit `feat(tools): add procedural-noise demo (value/fbm/worley)` con
  pathspec (`Task/procedural-noise.ts` + plan). Sin push.
