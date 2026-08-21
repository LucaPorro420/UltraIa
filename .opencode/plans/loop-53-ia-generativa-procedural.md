# PLAN: IA Generativa Procedural - Imagen/Video/Audio en codigo puro + Busqueda conocimiento + Integracion enlaces (tarea #53)

Fecha: 2026-08-18 | Modo: plan

## Contexto
- El proyecto ya tiene capacidades maduras de media generativo: OMAG (orquestador + generadores + criticos), `video_edit` (EDL/render/self-eval), `screenflow` (captura->acciones->edicion->publicacion), `travel` (plan->Pollinations->Ken Burns->xfade), `codevfx` (9 kinds GLSL canvas), `vfx` (reframe/upscale/LUT/roto/broll), `growth` (perfil canal->experimentos->playbook).
- Falta un nucleo unificado de generacion procedural (sin assets preexistentes, como motores de videojuegos): ruido/fractales/particulas/fluidos para audio, campos vectoriales/ruido perceptual para video, sintesis aditiva/FM/granular para audio -- todo determinista, keyless, testeable.
- Pendiente: busqueda de informacion + integracion de conocimiento desde fuentes verificadas (arXiv, GitHub, docs oficiales) -> memoria `learning/truth/` + capabilities.
- Pendiente: curar enlaces de `enlaces.txt` (lineas no procesadas: 676, 678, 683, 686, 689, 793, 795, 797, 800, 807, 811, 821) y anadirlos al proyecto como capabilities/docs/tests.
- Decisiones previas (LEARNINGS.md): DDPM+lucidrains = base entrenamiento Gen-Engine; Flow Matching para escalar; EDM sampling eficiente; Pollinations keyless garantizado; edge-tts 14 idiomas; Tunetank MCP musica/SFX gratis.

## Objetivo
Crear capability `generative` (dominio puro TS en `packages/core/src/tools/generative.ts`) que exponga:
1. **Imagen procedural**: ruido Perlin/Simplex, fractales (Mandelbrot/Julia), campos de flujo, L-systems -> canvas 2D/SVG determinista (sin Pollinations).
2. **Video procedural**: keyframes interpolados, particulas/fluidos (Navier-Stokes simplificado), shaders GLSL transpilados a WASM/JS, Ken Burns parametrico.
3. **Audio procedural**: sintesis aditiva/FM/granular, ruido coloreado, envolventes ADSR, secuenciador -> PCM/WAV/MP3 (reusa `omag/sound.ts` + extiende).
4. **Busqueda + conocimiento**: wrapper `searchWeb`/`fetchArxiv`/`fetchGitHub` con cache + dedupe -> `learning/truth/` verificada + capability `research`.
5. **Integracion enlaces**: procesar `enlaces.txt` lineas pendientes -> capabilities/docs/tests en subdirectorios correspondientes.
Todo con **tests deterministas** (vitest), **exports capability** en `ai/llm.ts` + `tools/index.ts`, y **demo runners** en `Task/`.

## Pasos
1. **Estructura base**: `packages/core/src/tools/generative.ts` -- types, exports, capability namespace (`generative`).
2. **Imagen procedural**: `GenerativeImage` class + `perlinNoise`/`simplexNoise`/`fractalMandelbrot`/`flowField`/`lSystem` -> `toCanvas()`/`toSVG()`/`toDataURL()`; tests pixel-perfect.
3. **Video procedural**: `GenerativeVideo` -- keyframe interpolation (cubica/catmull-rom), particle system (posicion/velocidad/fuerza), shader registry (GLSL->WASM via `wasm-bindgen` o JS fallback), render loop determinista -> frames array; tests frame-count + hash.
4. **Audio procedural**: extender `omag/sound.ts` -- `GenerativeAudio`: osciladores (seno/cuadrado/sierra/triangulo), FM (modulador+portadora), granular (grains+envelope), noise (white/pink/brown), ADSR envelope, sequencer (BPM+pattern) -> `toWAV()`/`toMP3()` (lamejs opcional); tests waveform hash + duration.
5. **Busqueda conocimiento**: `ResearchAgent` en `tools/research.ts` -- `searchArxiv(query, max)` (arXiv API), `searchGitHub(query)` (GitHub Search API), `searchWeb(query)` (DuckDuckGo/Exa), `fetchAndExtract(url)` (r.jina.ai), cache en `.ultraia/research/`, dedupe por URL/hash; tests con stubs.
6. **Integracion enlaces**: script `scripts/process-enlaces.ts` -- parse `enlaces.txt`, clasifica por seccion, para cada URL: descarga -> analisis (titulo, descripcion, repo GitHub, docs) -> genera capability/doc/test en subdirectorio apropiado (ej. `tools/`, `docs/`, `Task/`, `learning/sources/`); idempotente (hash URL -> skip si ya procesado).
7. **Capability registry**: registrar en `ai/llm.ts` -- `generative_image`/`generative_video`/`generative_audio`/`research_search`/`research_fetch`; `tools/index.ts` export namespace `generative` + `research`.
8. **Demo runners**: `Task/generative-demo.ts` (imagen/video/audio -> `resultTask/generative/`), `Task/research-demo.ts` (busquedas -> `resultTask/research/`).
9. **Tests**: vitest en `generative.test.ts` (15+ tests), `research.test.ts` (10+ tests), `process-enlaces.test.ts` (5 tests).
10. **Docs**: `docs/RAZONAMIENTO-GENERATIVE.md` + `docs/RAZONAMIENTO-RESEARCH.md` + actualizar `AGENTS.md` seccion capabilities + `STATE.md` tarea #53 DONE.

## Archivos a tocar (staging explicito)
- `packages/core/src/tools/generative.ts` -- nucleo imagen/video/audio procedural
- `packages/core/src/tools/research.ts` -- busqueda + extraccion conocimiento
- `packages/core/src/tools/index.ts` -- exports `generative` + `research`
- `packages/core/src/ai/llm.ts` -- capability registry + tool descriptors
- `packages/core/src/tools/generative.test.ts` -- tests deterministas
- `packages/core/src/tools/research.test.ts` -- tests con stubs
- `scripts/process-enlaces.ts` -- procesador enlaces.txt
- `scripts/process-enlaces.test.ts` -- tests idempotencia
- `Task/generative-demo.ts` -- runner demo
- `Task/research-demo.ts` -- runner demo
- `docs/RAZONAMIENTO-GENERATIVE.md` -- analisis + decisiones
- `docs/RAZONAMIENTO-RESEARCH.md` -- analisis + decisiones
- `learning/sources/` -- fuentes crudas descargadas (gitignored outputs)

## Criterios de verificacion
- Scoped: `npm run typecheck` + `npm run test --workspace=packages/core` (tests generative + research >=25 nuevos)
- FULL antes de commit: `npm run typecheck` -> `npm run lint` -> `npm run test` -> `npm run build`
- Tests esperados: core +25 (total repo ~931+), runtime 193 intacto
- Demo runners ejecutables: `npx vite-node Task/generative-demo.ts` -> genera archivos en `resultTask/generative/`; `npx vite-node Task/research-demo.ts` -> `resultTask/research/`
- `scripts/process-enlaces.ts` procesa lineas pendientes de `enlaces.txt` sin duplicados

## Riesgos / guardas
- **Keyless-first**: cero dependencias externas obligatorias (Pollinations/edge-tts/Tunetank opcionales como providers).
- **Determinismo**: seeds fijas, sin `Math.random()` sin seed; todos los outputs hasheables para tests.
- **Performance**: imagen/video procedural puede ser pesado -- usar `requestIdleCallback`/Web Workers en runners; tests usan resoluciones bajas (64x64, 10 frames).
- **Paths denylisted**: NO tocar `.env*`, `auth/`, `secrets/`, `credentials/`.
- **Enlaces.txt**: lineas ya procesadas (1-829 aprox) -- script debe detectar `## PROCESADO` y saltar.
- **Concurrencia**: sesion #25 tiene archivos sucios en `recorder.ts`/`automation.ts` -- aislar a `%TEMP%` antes de gates FULL.

## Esfuerzo estimado
- **Alto** -- ~5-7 ciclos PIVR (nucleo generativo 2-3, research 1-2, enlaces 1, docs/tests 1-2).
- Justificacion: codigo nuevo extenso (3 modulos principales + integracion), requiere diseno de APIs deterministas, tests pixel-perfect/audio-hash, runners demo, y procesamiento de 15+ URLs pendientes de enlaces.txt.