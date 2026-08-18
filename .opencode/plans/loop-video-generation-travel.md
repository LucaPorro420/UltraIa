# PLAN: Video Generation from Travel Footage (tarea ad-hoc)

Fecha: 2026-08-18 · Modo: build

## Contexto
El usuario quiere crear videos de diferentes duraciones (30s, 60s, 2min, 30min) usando:
1. El footage de viajes descargado de @tomassporro (48 videos en `VideoTask&Memory/historyTravelTP/`)
2. Animaciones procedurales generadas desde cero (codevfx)
3. Música integrada (Tunetank keyless + procedural fallback)
4. Transiciones, efectos, narración TTS (edge-tts keyless)
5. Ambos estilos: collage del footage real + videos generativos 100% código

## Objetivo
Generar 4 videos finales (MP4) + planes de render + manifests + scripts de ffmpeg listos para ejecutar:
- `travel-30s.mp4` — 30 segundos, estilo "naturaleza" (collage real)
- `travel-60s.mp4` — 60 segundos, estilo "aventura" (collage real + overlays procedurales)
- `travel-2min.mp4` — 2 minutos, estilo "cultura" (collage + secciones generativas)
- `travel-30min.mp4` — 30 minutos, estilo "relax" (collage extendido + loops generativos)

## Archivos a tocar (staging explícito)

### Nuevos scripts de generación
- `scripts/generate-travel-videos.mjs` — orquestador principal que usa travel.ts + video-edit.ts + codevfx.ts + music.ts
- `scripts/render-travel-30s.sh` — script ffmpeg generado para 30s
- `scripts/render-travel-60s.sh` — script ffmpeg generado para 60s
- `scripts/render-travel-2min.sh` — script ffmpeg generado para 2min
- `scripts/render-travel-30min.sh` — script ffmpeg generado para 30min

### Manifests y planes (output)
- `resultTask/travel/plan-30s.json` — plan de viaje 30s
- `resultTask/travel/plan-60s.json` — plan de viaje 60s
- `resultTask/travel/plan-2min.json` — plan de viaje 2min
- `resultTask/travel/plan-30min.json` — plan de viaje 30min
- `resultTask/travel/render-30s.json` — RenderPlan (argv + manifest)
- `resultTask/travel/render-60s.json` — RenderPlan (argv + manifest)
- `resultTask/travel/render-2min.json` — RenderPlan (argv + manifest)
- `resultTask/travel/render-30min.json` — RenderPlan (argv + manifest)
- `resultTask/travel/vfx-overlays.json` — planes de efectos procedurales para overlays
- `resultTask/travel/music-manifest.json` — selección de música por video

### Tests (existentes, solo verificación)
- `packages/core/src/tools/travel.test.ts` — ya existe (18 tests)
- `packages/core/src/tools/video-edit.test.ts` — ya existe (29 tests)
- `packages/core/src/tools/codevfx.test.ts` — ya existe (29 tests)
- `packages/core/src/tools/music.test.ts` — verificar que existe

## Pasos

1. **Inventario del footage** — escanear `VideoTask&Memory/historyTravelTP/` y crear manifiesto de clips disponibles con duración, resolución, estilo inferido
2. **Planificar 4 videos** — usar `planTravelVideo` para cada duración/estilo, mapear escenas a clips reales
3. **Generar efectos procedurales (codevfx)** — crear overlays VFX para cada video (partículas, transiciones, color grading)
4. **Seleccionar/generar música** — usar `searchMusic` (Tunetank) + `composeMusic` fallback para cada video
5. **Generar narración TTS** — usar `edgeTtsAudio` (omag/tts.ts) para hooks, narración por escena, CTAs
6. **Construir EDL (video-edit)** — crear Edit Decision Lists con cortes, fades, padding, grade presets
7. **Generar pipelines ffmpeg** — `buildTravelRender` + `buildEdl` + `renderFfmpeg` → scripts .sh ejecutables
8. **Generar timeline SVG editorial** — `timelineViewSvg` para cada video (visualización Dark Obsidian)
9. **Self-eval simulado** — `selfEvalEdl` para validar duraciones, cuts seguros, scores
10. **Ejecutar render (opcional)** — correr ffmpeg si está disponible y tiempo lo permite

## Criterios de verificación

### Scoped (packages/core)
- `npm run typecheck` — 0 errores
- `npm run test` — tests de travel/video-edit/codevfx/music pasan (existentes + nuevos si se añaden)

### FULL (antes de commit)
- `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` — TODO verde
- Verificar que los scripts .sh generados son sintácticamente válidos (bash -n)
- Verificar que los manifests JSON son válidos y completos

## Riesgos / guardas
- NO tocar archivos de la sesión concurrente (recorder.ts, automation.ts, blueprint.ts, reach.ts, shared/*)
- NO tocar `.env`, `.env.*`, `auth/`, `secrets/`
- El video de 30min genera archivo muy grande (~500MB+); solo generar script, NO ejecutar render completo en CI
- ffmpeg debe estar en PATH (ya verificado: `winget install Gyan.FFmpeg` hecho)
- edge-tts requiere Node 22+ (WebSocket global) — ya verificado en omag/tts.ts

## Esfuerzo estimado
- **alto** — 4 videos × (plan + EDL + VFX + música + TTS + ffmpeg pipeline) = ~10 pasos orquestados
- Reutiliza herramientas existentes (travel, video-edit, codevfx, music, omag/tts) — no hay código nuevo en core, solo orquestación en scripts/