# Plan — loop-146: generadores de ruido adicionales en `generative.ts`

> Modo: build (auto-switch autorizado 19/08). Fuente: backlog implícito — extensión de
> librerías procedurales (pedido usuario 23/08 "librerías para crear objetos/imágenes/videos
> desde matemática/geometría/lógica"). Gap verificado: `generative.ts` exporta
> `perlinNoise`, `simplexNoise2D/Field`, `mandelbrot` — pero NO `valueNoise`, `fbm`, ni
> `worley` (cellular). Estos tres son los generadores clásicos que faltan y alimentan
> directo a `pngrender.valuesToRgba` / `procvid` / `designcompose`.

## Contexto
El motor procedural ya tiene Perlin (value-noise multi-octava sobre campo), Simplex y
Mandelbrot. Para cubrir el trípode clásico del generative art faltan: (1) **value noise
puntual** (base composable para fBm), (2) **fBm** (fractal Brownian motion — el trabajo
caballo de texturas/terrenos), y (3) **Worley/cellular** (celdas — mosaicos, burbujas,
distribuciones orgánicas). Todos deterministas, keyless, seedables, sin deps. No requieren
wiring en `llm.ts` (igual que perlin/simplex/mandelbrot, que son dominio puro usado por
otras tools), por lo que NO tocan la sesión concurrente bloqueada (tasks 25/142).

## Objetivo
Añadir a `packages/core/src/tools/generative.ts` seis funciones deterministas:
- `valueNoise2D(x, y, seed?)` → número 0..1 (value noise de 1 octava, base de fBm).
- `valueNoiseField(w, h, {seed, scale})` → Float32Array 0..1.
- `fbm2D(x, y, opts?)` → número 0..1 (suma de octavas de valueNoise2D; lacunarity/gain).
- `fbmField(w, h, {seed, octaves, persistence, lacunarity, scale})` → Float32Array 0..1.
- `worleyNoise2D(x, y, seed?, metric?)` → número 0..1 (distancia a feature point más cercano).
- `worleyField(w, h, {seed, scale, metric})` → Float32Array 0..1.

Registrarlas en el facade `generative` y añadir ~16 tests en `generative.test.ts`.

## ARCHIVOS A TOCAR
- `packages/core/src/tools/generative.ts` (añadir funciones + interfaces + barrel).
- `packages/core/src/tools/generative.test.ts` (añadir describe blocks).
- `.opencode/plans/loop-146-generative-noise.md` (este plan).

## NO-hacer
- NO tocar `llm.ts`, `index.ts` (tools), `geom.ts`, `recorderly`, ni nada de la sesión
  concurrente (tasks 25/142).
- NO añadir agent tool / capability (es dominio puro, como perlin/simplex).
- NO dithering (YAGNI, descartado en loop-95).
- NO `npm run build` (cambio solo-core, server dev vivo en :3000; justificado igual que loop-145).

## Pasos
1. En `generative.ts`: tras `simplexNoiseField` (L193) añadir `valueNoise2D` (reusa `hash2`,
   `lerp`, `smoothstep`), `valueNoiseField`, `FbmOptions` + `fbm2D` + `fbmField`,
   `WorleyMetric` + `WorleyOptions` + `worleyNoise2D` + `worleyField`.
2. Añadir las 6 al facade `generative` (L722-747).
3. En `generative.test.ts`: agregar describe blocks con determinismo ×2, rango [0,1],
   continuidad (value noise: coords cercanos → valores cercanos), `fbm2D` octaves=1 ≡
   `valueNoise2D`, `worleyNoise2D` en centro de feature point ≈ 0, longitud de campos,
   métricas válidas.

## Criterios de verificación (scoped + FULL en commit)
- `npm run typecheck` → 0 errores.
- `npm run lint` → 0 warnings.
- `npm run test` (vitest core) → generative tests PASS (verificar 6 nuevas + sin regresión).
- (build omitido: solo-core, dev server :3000 vivo — igual que loop-145).

## TOLERANCIAS
- Determinismo: misma entrada ⇒ mismos bytes (Float32Array) bit-a-bit.
- Rango: `valueNoise*`, `fbm*`, `worley*` ∈ [0,1] (clamp por defecto).
- `worleyNoise2D` en un feature point exacto: distancia ≤ 1e-9 ⇒ retorna ~0.

## Riesgos
- Bajo. Funciones puras, sin I/O, sin deps. No afectan app (Next) ni sesión concurrente.

## Esfuerzo
- P0 (pequeño, ~120 LOC + ~160 LOC tests).

## Predicción (resultado esperado)
- 6 nuevas funciones exportadas; facade actualizado; ~16 tests nuevos PASS; typecheck/lint/test
  verdes. Commit `feat(core): add valueNoise/fbm/worley generators to generative.ts` con
  pathspec (`generative.ts generative.test.ts plan`). Sin push.
