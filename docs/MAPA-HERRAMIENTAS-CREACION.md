# Mapa de Herramientas de Creación — UltraIa

Ruta raíz: `packages/core/src/`

---

## 1. IMÁGENES

### `tools/image.ts` — Generador de imágenes (capability `image`)
- **Qué hace**: Genera imágenes desde prompts de texto.
- **Providers**: Pollinations (keyless, default) / MeiGEN (cloud, `MEIGEN_API_TOKEN`).
- **Tool**: `generateImage(prompt, opts?)` → `GeneratedImage { url, width, height, seed, provider }`.
- **Modelo default**: `flux`.

### `tools/pngrender.ts` — Render PNG procedural (capability `pngrender`)
- **Qué hace**: Encoder PNG puro TypeScript (sin deps). Convierte funciones matemáticas `pixel(x,y) → RGBA` en archivos `.png` reales.
- **Paletas**: obsidian, neoViolet, fire, ice, mono.
- **Puente con `generative.ts`**: perlin, simplex, mandelbrot → PNG reales.
- **Tool**: `renderImage()`, `renderImagePng()`, `writePngAtomic()`.

### `omag/design-generator.ts` — Generador de diseño (OMAG)
- **Qué hace**: Generador de diseño 2D/3D para OMAG (composición de elementos visuales).
- **Adapter**: `DesignGeneratorAdapter`.

---

## 2. VIDEO

### `tools/video.ts` — Generador de video (capability `video`)
- **Qué hace**: Genera video desde prompts. Fallback: storyboard de frames generados con `image.ts`.
- **Providers**: Pluggable (`setVideoProvider`). Sin provider real → storyboard keyless.
- **Tool**: `generateVideo(prompt, opts?)` → `VideoResult` (VideoStoryboard | VideoClip).

### `tools/video-edit.ts` — Edición de video (capability `video_edit`)
- **Qué hace**: 12 hard rules de producción. EDL (Edit Decision List), self-eval, timeline SVG.
- **Sub-tools**: `packTranscript()`, `buildEdl()`, `renderFfmpeg()` (argv determinista), `selfEvalEdl()`, `timelineViewSvg()`.
- **Keyless**: Transcribe con provider configurable (Gemini si `GOOGLE_API_KEY`; captions manuales).

### `tools/procvid.ts` — Video procedural (capability `procvid`)
- **Qué hace**: Convierte funciones matemáticas `(x, y, t) → RGBA` en videos REALES.
- **Animaciones**: plasma, waves, orbits, noise-flow, fractal-zoom, shape-morph.
- **Cadena**: catálogo → frames PNG (pngrender) → argv ffmpeg.
- **Guardas**: dims ≤1280, fps 1-60, ≤60s, ≤1800 frames.

### `tools/travel.ts` — Video de viajes (capability `travel`)
- **Qué hace**: Genera scripts de video de paisajes 9:16 con cámara MOTIONS + narración bilingüe es/ar.
- **Sub-tools**: `planTravelVideo()`, `buildTakeManifest()`, `buildTravelRender()`, `replicateLandscape()`.
- **Pipeline**: Ken Burns (zoompan) + xfade + narration (edge-tts) + BGM → `travel-<slug>.mp4`.

### `tools/screenflow.ts` — Captura de pantalla automatizada (capability `screenflow`)
- **Qué hace**: Pipeline: Captura (ffmpeg gdigrab) → Acciones (ActionScript JSON) → Edición (video_edit) → Publicación local.
- **Output**: `.ultraia/recordings/<run-id>/` (final.mp4 + master.mkv + poster.png + manifest.json).
- **Continuidad**: state.json, retry máx 3, scheduling schtasks/cron.

### `tools/recordly.ts` — ScreenFlow Studio planner (capability `recordly`)
- **Qué hace**: Auto-zoom por telemetría de cursor, presets motion, webcam bubble, export MP4.
- **Sub-tools**: `planRecordly()`, `planZoom()`, `planCursor()`, `planExport()`, `planTimeline()`, `planManifest()`.

### `tools/vfx.ts` — Efectos de video (capability `vfx`)
- **Qué hace**: Port de principios Higgsfield + DaVinci Resolve. Planes deterministas para ffmpeg.
- **Funciones**: `planBroll()`, `planTrim()`, `planSpeed()`, `planReframe()`, `planRemoveBg()`, `planUpscale()`.

### `omag/vfx-generator.ts` — Generador VFX (OMAG)
- **Qué hace**: Generador de efectos visuales para OMAG.
- **Adapter**: `VfxGeneratorAdapter`.

---

## 3. AUDIO / MÚSICA

### `tools/music.ts` — Generador de música (capability `music`)
- **Qué hace**: Genera composiciones musicales.
- **Providers**: Tunetank (keyless, search) / Composición determinista (fallback).
- **Tool**: `generateMusic(prompt, opts?)` → `MusicResult` (MusicComposition | MusicTrack).
- **Sub-tools**: `searchMusic()`, `composeMusic()`.

### `omag/sound.ts` — Síntesis procedimental de sonido (OMAG)
- **Qué hace**: Genera audio WAV desde cero (sin deps, sin samples, sin ffmpeg, sin red).
- **Sintetizadores**: `synthTone()`, `synthNoise()`, `synthImpact()`, `synthWhoosh()`, `synthBeat()`, `synthAmbience()`.
- **Output**: PCM16 buffer + encoder WAV.

### `omag/tts.ts` — Text-to-Speech keyless (OMAG)
- **Qué hace**: Microsoft Edge TTS (gratis, sin API key, retorna MP3).
- **Idiomas**: 14 (ar, es, en, fr, pt, de, it, ja, zh, hi, ru, nl, tr, pl).
- **Tool**: `edgeTts(text, lang?)` → `TtsOutput { audioPath, durationMs, voice }`.

### `omag/audiolibrary.ts` — Biblioteca de audio (OMAG)
- **Qué hace**: Búsqueda de música en Tunetank + guardado de samples + extracción de audio de video.
- **Tool**: `searchMusic()`, `searchSfx()`, `saveSample()`, `extractAudioFromVideo()`.

---

## 4. EFX / CÓDIGO VISUAL

### `tools/codevfx.ts` — Efectos 100% código (capability `codevfx`)
- **Qué hace**: Efectos sin assets externos (sin texturas, sprites ni meshes — todo es GLSL + partículas).
- **Efectos**: fire, ice, lightning, meteor, beam, ground, void, plasma, frost.
- **Sub-tools**: `planEffect()`, `colorimetryAnalyze()`, `curvatureShade()`, `perspectivePlan()`, `renderEffectHtml()`.

### `tools/sdf.ts` — Signed Distance Fields + ray marching (capability `sdf`)
- **Qué hace**: Render de escenas 3D con SDF (sphere, box, torus, capsule, plane) + ray marching.
- **Sub-tools**: `planSdfScene()`, `sdfSceneGlsl()`, `rayMarchPlan()`, `renderSdfHtml()`.

---

## 5. CONTENIDO / PUBLICACIÓN (Pipeline AutoPub)

### `tools/topics.ts` — Motor de ideas (capability `topics`)
- **Qué hace**: RSS + DuckDuckGo → briefs puntuados por canal.
- **Tool**: `topics_briefs(source, channel?)` → `TopicBrief[]`.
- **Dominio**: `domain/briefs.ts` (cola persistente TopicBrief en Prisma).

### `tools/enrutador.ts` — Enrutador brief → contenido (capability `contenido`)
- **Qué hace**: Convierte briefs en contenido listo para publicar.
- **Sub-tools**: `redactar(brief)` (post texto), `guionizar(brief)` (guion+storyboard), `guionLargo(brief)` (60-180s OMAG).
- **Idiomas**: es/ar bilingüe.
- **TTS**: narración MP3 via edge-tts.

### `tools/present.ts` — Paquete de publicación (capability `present`)
- **Qué hace**: Empaqueta contenido para cada canal (formato, caption, hashtags, SRT, branding).
- **Tool**: `present_package(brief, contenido)` → `PublicationPackage`.

### `tools/publish.ts` — Distribución multi-canal (capability `publish`)
- **Qué hace**: PublisherAdapter + 14 adaptadores de plataforma.
- **Plataformas**: YouTube, TikTok, X, Instagram, Threads, Facebook, LinkedIn, Telegram, Discord, Slack, Reddit, Pinterest, WhatsApp, Zernio.
- **Tool**: `publish_submit(pkg, opts)` → `PublishResult`.

### `domain/publications.ts` — Cola de publicaciones (Prisma)
- **Qué hace**: Cola persistente con aprobación híbrida (video/imagen → DRAFT humano; texto/blog → APPROVED auto).
- **Estados**: DRAFT → APPROVED → PUBLISHED / FAILED.

---

## 6. ORQUESTACIÓN OMAG

### `omag/orchestrator.ts` — Orquestador OMAG
- **Qué hace**: IDEA → plan Director → MediaField → generadores → críticos → correction loop.
- **Pipeline**: IDEA → plan → MediaField → generate → critique → fix (max 5 iteraciones).

### `omag/generators.ts` — Generadores OMAG
- **Qué hace**: Registry de generadores (image, video, music, tts, vfx, design).
- **Patrón**: validate → prepare → generate → inspect → export.

### `omag/critics.ts` — Críticos OMAG
- **Qué hace**: TemporalSync, Identity, Causal, Multimodal + fuseCritiques.
- **Pesos dinámicos** por prioridad.

### `omag/mediafield.ts` — MediaField (OMAG)
- **Qué hace**: Schema de entidades con identidad persistente, relations, events causales.

### `omag/project.ts` — Proyecto largo (OMAG)
- **Qué hace**: Project → Act → Sequence → Scene → Shot. MasterTimeline sincronizada.

---

## 7. HERRAMIENTAS SOPORTE

### `tools/diagram.ts` — Diagramas editoriales (capability `diagram`)
- **Qué hace**: Genera diagramas HTML/SVG autocontenidos (timeline, data-flow, architecture, loop).

### `tools/generative.ts` — Ruido procedural (capability `generative`)
- **Qué hace**: Perlin, simplex, value noise, fbm, worley, mandelbrot.

### `tools/physics2d.ts` — Física 2D (capability `physics2d`)
- **Qué hace**: Simulación de partículas, colisiones, gravedad.

### `tools/geometry.ts` — Geometría 3D (capability `geometry`)
- **Qué hace**: Superfórmula de Gielis, Möbius, ops de malla, export glTF/OBJ.

---

## Resumen: Pipeline de Creación Automática

```
[IDEA]
    │
    ▼
[topics.ts] → TopicBrief (RSS + DDG)
    │
    ▼
[enrutador.ts] → Contenido (texto/guion/guion_largo) + TTS
    │
    ▼
[present.ts] → PublicationPackage (formato + caption + branding)
    │
    ▼
[publish.ts] → PublishResult (14 plataformas)
    │
    ▼
[domain/publications.ts] → Cola Prisma (DRAFT → APPROVED → PUBLISHED)
```

### Generadores de media (bottom-up):
- **Imágenes**: `image.ts` (Pollinations/MeiGEN) + `pngrender.ts` (procedural)
- **Video**: `video.ts` (storyboard) + `procvid.ts` (procedural) + `travel.ts` (paisajes) + `screenflow.ts` (pantalla) + `recordly.ts` (studio)
- **Audio**: `music.ts` (Tunetank/composición) + `sound.ts` (síntesis WAV) + `tts.ts` (Edge TTS) + `audiolibrary.ts` (biblioteca)
- **Efectos**: `codevfx.ts` (GLSL) + `sdf.ts` (ray marching) + `vfx.ts` (ffmpeg plans)
- **Orquestación**: `omag/orchestrator.ts` → `generators.ts` → `critics.ts`
