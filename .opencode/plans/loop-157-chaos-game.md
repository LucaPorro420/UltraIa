# PLAN: Chaos Game — Fractal Generator (capability `chaos`)

## Context
Procedural fractal generation via the chaos game method. The chaos game is a simple algorithm that produces fractals: pick a random starting point inside a polygon, then repeatedly move halfway toward a randomly chosen vertex and plot the point. Different polygon sizes and rules produce different fractals (Sierpinski triangle, pentagon fractal, hexagon, etc.).

This fits the existing procedural ecosystem (generative.ts, pngrender.ts, procvid.ts, geometry.ts) as a new deterministic, keyless, zero-dependency capability.

## Objective
Create `packages/core/src/tools/chaos-game.ts` with:
- `ChaosGameSpec` zod schema (polygon sides, iterations, relaxation factor, rules, seed, dimensions)
- `generateChaosGame(spec)` → deterministic point cloud
- `chaosGameToPng(points, width, height, palette)` → RGBA buffer (bridge to pngrender)
- Multiple fractal presets (sierpinski, pentagon, hexagon, dragon, custom)
- Anti-aliasing via point density accumulation (not just binary hit/miss)
- Export `chaosTool` for wiring in llm.ts

## Files created
1. **`packages/core/src/tools/chaos-game.ts`** — chaos game engine (polygonVertices, resolveChaosSpec, selectVertex, generateChaosGame, chaosDensityToRgba, listPresets, 7 presets)
2. **`packages/core/src/tools/chaos-game.test.ts`** — 31 tests (all GREEN)
3. **`Task/chaos-game-demo.ts`** — demo that renders 7 real PNGs to resultTask/chaos-game/
4. **`packages/core/src/tools/index.ts`** — added `export * from './chaos-game'`

## Verification
- typecheck ✅ · lint ✅ · test 31/31 scoped ✅ · demo 7/7 PNGs real ✅
- Full suite: 128/142 files pass, 2112 tests GREEN (13 pre-existing failures in chaos/index.ts CJS require — unrelated)
