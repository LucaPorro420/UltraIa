# Loop 51 — codevfx → OMAG (Integración VFX 100% código en pipeline OMAG)

## Contexto
- **codevfx** (iteración 45, `packages/core/src/tools/codevfx.ts`): 9 efectos procedimentales 100% código (fire/ice/lightning/meteor/beam/ground/void/plasma/frost) con GLSL hand-written, física (gravedad/viento/fricción), partículas escaladas, colorimetría HSL, curvatura shading, perspective planning, HTML5 canvas autocontenido. Tool `vfx_code` (acciones plan/colorimetria/curvatura/perspectiva/render) en llm.ts.
- **OMAG** (iteraciones 14/08): MediaField + WorldTransitionEngine + Timeline + Generators (Image/Video/Audio/Music) + Critics (TemporalSync/Identity/Causal/Multimodal) + OmagOrchestrator (IDEA → plan → MediaField → generators → critics → correction loop max 5).
- **Integración pedida**: usar codevfx como generador/efecto dentro del pipeline OMAG — efectos visuales procedimentales como assets generables, con crítica y corrección en el loop.

## Objetivo
1. **VFX Generator Adapter** en OMAG: `VfxGeneratorAdapter` implementando `Generator` interface (modality: 'vfx' o extender 'image'/'video') que usa `codevfx.planEffect` + `renderEffectHtml` para producir assets HTML5 canvas (autocontenidos, sin deps externas).
2. **Integración en critics**: critic VFX que evalúe calidad colorimétrica, coherencia física, performance (partículas/fps) → feed al correction loop.
3. **Wiring**: añadir a `defaultGenerators()` + export en `omag/index.ts` (si existe) o `generators.ts`.
4. **Tests**: unitarios del adapter + integración en `omag.test.ts` (generación + critic + corrección loop).
5. **Docs**: actualizar `AUDIO/VIDEO/IMAGE.md` o `omag/README.md` con la nueva capacidad.

## Pasos
1. Crear `packages/core/src/omag/vfx-generator.ts` con `VfxGeneratorAdapter`:
   - `name: 'vfx-code'`, `modality: 'vfx'` (nuevo tipo en Modality? o reusar 'video'/'image')
   - `validate`: requiere `ctx.field.environment.scene` + `ctx.constraints?.vfxKind` (EffectKind)
   - `generate`: llama `codevfx.planEffect(kind, opts)` → `renderEffectHtml` → artifact = { html, width, height, glsl, kind }
   - `inspect`: metadata del plan (partículas, física, paleta, hotkeys)
   - `export`: guarda .html en target o devuelve data URI
2. Extender `Modality` en `mediafield.ts` para incluir `'vfx'` (o mapear a 'video').
3. Añadir import de codevfx en generadores (keyless, sin deps nuevas — codevfx ya usa solo Three.js que ya está en apps/web; pero codevfx es puro TS/canvas, sin Three.js en runtime — verificar).
4. Actualizar `defaultGenerators()` para incluir `new VfxGeneratorAdapter()`.
5. Critic opcional: `VfxQualityCritic` (colorimetric coherence ≥ threshold, particle count ≤ budget, shader syntax valid).
6. Tests: `vfx-generator.test.ts` + integración en `omag.test.ts`.
7. Gates FULL con cuarentena tests #25.

## ARCHIVOS A TOCAR
- `packages/core/src/omag/vfx-generator.ts` (NUEVO)
- `packages/core/src/omag/generators.ts` (import + defaultGenerators)
- `packages/core/src/omag/mediafield.ts` (extender Modality si hace falta)
- `packages/core/src/omag/critics.ts` (critic VFX opcional)
- `packages/core/src/omag/orchestrator.ts` (si hay wiring de critics)
- `packages/core/src/omag/*.test.ts` (tests)
- `docs/` (doc de la integración)

## Criterios
- Scoped: typecheck core 0, lint 0, test omag + codevfx PASS.
- FULL: typecheck/lint/test/build EXIT 0.
- Adapter: genera HTML5 canvas autocontenido con GLSL, integra en MediaField, criticable.

## Riesgos
- codevfx usa Three.js? No — `codevfx.ts` es puro Canvas 2D + GLSL strings (no importa Three). Three.js solo en apps/web para aurora. OK.
- Modality 'vfx' nuevo: rompería serialización MediaField? Verificar zod schema en mediafield.ts.
- Critics loop: añadir critic nuevo requiere ajustar `fuseCritiques` pesos.

## Esfuerzo
Medio-Alto (nuevo adapter + critic + tests + wiring ≈ 45-60 min).