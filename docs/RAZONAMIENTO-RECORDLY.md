# RAZONAMIENTO-RECORDLY.md

Análisis de `github.com/webadderallorg/Recordly` (AGPL-3.0, open-source screen recorder +
demo-video editor, 21.9k★, 1.6k forks, 1.6k commits) y mapeo de sus principios transferibles a UltraIa.

Fuente: `learning/sources/recordly-README.md` (README del repo) + lectura de la lógica pura
(`cursorMotionPresets.ts`, `webcamOverlay.ts`, `exportDimensions.ts`, `timeline/zoomSuggestionUtils.ts`,
`timeline/model/timelineModel.ts`) en clone temporal.

## Por qué es relevante para UltraIa
UltraIa ya tiene `screenflow` (grabación automatizada vía ffmpeg gdigrab + ActionScript), `video_edit`
(EDL de cortes + render ffmpeg + self-eval + SVG timeline) y `vfx` (reframe/upscale/LUT/rotoscope/B-roll).
Recordly aporta el modelo de EDICIÓN más rico que falta: **timeline basado en regiones** (zoom/trim/
speed/audio/annotation), **auto-zoom desde la actividad del cursor**, **overlay de cursor estilizado**,
**burbuja de webcam**, **estilo de frame** y **export MP4/GIF con presets de calidad**. Todo eso es
lógica de dominio pura, determinista y portable — exactamente el patrón "port ORIGINAL de los PRINCIPIOS"
usado en g0dm0d3/codevfx/screenflow.

## Principios transferibles (IMPLEMENTADOS en `packages/core/src/tools/recordly.ts`)
1. **Auto-zoom desde telemetría de cursor** (`zoomSuggestionUtils.ts`):
   - `normalizeCursorTelemetry` (clampa cx/cy a [0,1], ordena, infiere cursorType por trayectoria post-click).
   - `detectZoomDwellCandidates` (runs donde el cursor se detiene 450–2600ms → foco = centroide).
   - `detectInteractionCandidates` (click explícito + dwell heurístico + doble-click sintético).
   - `buildClickClusters` (agrupa clicks < 2500ms en clusters, foco = centroide/mayor fuerza).
   - `buildInteractionZoomSuggestions` (ventanas de zoom con padding 500ms, evita solapamientos).
   → UltraIa puede generar regiones de zoom automáticas desde la grabación de `screenflow`.
2. **Presets de cursor** (`cursorMotionPresets.ts`): `focused`/`smooth` con zoomSmoothness, duraciones,
   cursorSize, cursorSmoothing, spring (stiffness/damping/mass), motionBlur, clickBounce. Portados como
   constantes de diseño + `resolveCursorMotionPresetId`.
3. **Layout de webcam bubble** (`webcamOverlay.ts`): presets de posición (9), escala reactiva a zoom
   (`1/zoomScale`), tamaño px desde % (clamp 56px mín, margen), crop region normalizado, source rect.
4. **Dimensiones de export** (`exportDimensions.ts`): `normalizeEvenDimension` (par), `fitAspectRatioWithinBounds`
   (encaje conservando aspect), `calculateMp4ExportDimensions` (quality source/medium/good/high →
   1.0/0.6/0.75/0.9). Útil para planificar MP4/GIF en `video_edit`.
5. **Modelo de timeline por regiones** (`timelineModel.ts`): `ZoomRegion`/`ClipRegion`/`AnnotationRegion`/
   `AudioRegion`/`CaptionCue` en filas (zoom/clip/annotation/audio/caption) → `buildRegionTimeline`.
   Complementa el EDL de cortes de `video_edit` con regiones solapables.
6. **Manifiesto de proyecto** (`.recordly` = path de media + editor state): `buildRecordlyManifest`
   genera JSON determinista (idempotente) para reabrir work — análogo a `screenflow`/`.ultraia/recordings`.

## Decisiones de port (no copia)
- **Original implementation** de los algoritmos en TS puro determinista (sin `node:*` salvo nada; todo en
  memoria), con **header de atribución** a Recordly (AGPL-3.0). No se copia código AGPL para no contaminar
  la licencia de UltraIa.
- Se omite el runtime Electron/PixiJS/native capture (no portable, no headless, AGPL). El planner produce
  planes que el renderer existente (`video_edit`/`vfx`/ffmpeg) puede consumir.

## Pendiente / no implementado (fuera de alcance)
- Captura nativa (ScreenCaptureKit/WGC/Electron) — depende de OS; UltraIa ya tiene `screenflow` (ffmpeg).
- Render PixiJS en vivo — UltraIa usa ffmpeg; el planner entrega coords/regiones, no pixeles.
- Sistema de extensiones/marketplace de Recordly — mapeable a tools/skills de UltraIa (Watch List).
- UI del editor (React) — fuera del dominio core.
- Export GIF con palettegen — se puede añadir a `video_edit` como mejora futura (acción `export`).
