# PLAN: Sistema de Generación Multimedia 100% Programado Desde Cero (Niveles 1-3)

Fecha: 2026-08-18 · Modo: build

## Contexto
El usuario quiere un motor de síntesis multimedia **completamente programado desde cero** (sin assets, sin APIs obligatorias, sin modelos pre-entrenados obligatorios) que funcione en **Node.js + Navegador**, sea **invocable desde Gen-Engine Python**, y cubra **Niveles 1-3**:
- **Nivel 1**: Procedural puro (matemática, shaders GLSL, DSP)
- **Nivel 2**: Implementación de diffusion transformer desde cero (educativo, pequeño)
- **Nivel 3**: Entrenamiento micro-modelos (requiere GPU, datos)

Timeline: **2 semanas** con builds continuos y plan de mejoras para IA 100% funcional.

## Objetivo
Crear `packages/core/src/tools/media-synthesis/` — motor unificado que genere imágenes, video y audio 100% desde código, con degradación keyless garantizada, integrable en OMAG y Gen-Engine.

---

## Fase 1 (Semana 1): Fundamentos Matemáticos + Imagen Procedural + Video Básico

### 1.1 Recursos y Referencias (Investigación Activa)
Buscar y documentar en `learning/sources/media-synthesis-math.md`:
- **Matemáticas**: SDF (Inigo Quilez), Noise (Perlin/Simplex/Worley), Fractales, Splines, Curvas de Bézier, Transformadas de Fourier, Wavelets
- **Shaders**: Shadertoy patterns, Raymarching, Signed Distance Fields, Domain Warping, FBM
- **DSP**: Osciladores, Filtros (SVF, Ladder), FM Synthesis, Physical Modeling, Granular
- **Diffusion**: DDPM, DDIM, EDM, Flow Matching, Rectified Flow, Consistency Models
- **Repositorios clave**: 
  - `luciddrains/denoising-diffusion-pytorch` (base training)
  - `NVlabs/edm` (EDM official)
  - `karpathy/makemore` (pedagogía)
  - `achrefelouafi/LinearAbiltyCastingThreeJS` (VFX reference)
  - `fabiancabau/threejs-vfx` (100 effects)
  - `migen-li-2/ThreeJSVFX-Demo`
  - `pollinations/image-pollinations` (keyless API)
  - `facebookresearch/audiocraft` (MusicGen reference)
  - `ace-step/ace-step` (music generation)

### 1.2 Implementación: `media-synthesis/image/` (Procedural)
```
sdf.ts           # SDF primitives, ops, text, morphing (Quilez formulas)
noise.ts         # Perlin/Simplex/Worley 2D/3D, fBm, domain warping, turbulence
gradients.ts     # Mesh gradients, multi-stop, OKLab interpolation, color harmony
patterns.ts      # Voronoi, cellular, reaction-diffusion (Gray-Scott), tiling
fractals.ts      # Mandelbrot/Julia (GPU shader), IFS, L-systems
renderer.ts      # Canvas2D + WebGL (OffscreenCanvas), export PNG/WebP/Base64/Blob
index.ts         # synthesizeImage({prompt, width, height, style, seed, params})
```

### 1.3 Implementación: `media-synthesis/video/` (Básico)
```
timeline.ts      # Tracks, keyframes, easing, time remapping
particles.ts     # CPU particle system (position, velocity, life, forces)
shaders.ts       # Video shaders: time, frame, resolution uniforms
composer.ts      # Layers, blend modes, transitions, color grading
renderer.ts      # WebCodecs (MP4/WebM) + ffmpeg.wasm fallback + chunked
index.ts         # synthesizeVideo({prompt, duration, fps, resolution, seed})
```

### 1.4 Implementación: `media-synthesis/audio/` (DSP Base)
```
dsp.ts           # Osciladores, filtros SVF, envolventes ADSR, LFOs, FM
synthesis.ts     # Aditiva, sustractiva, wavetable, physical modeling (Karplus-Strong)
sequencer.ts     # Pattern sequencer, piano roll, automation
music-theory.ts  # Escalas, acordes, voice-leading, progresiones
effects.ts       # Reverb (algorithmic), delay, chorus, compressor
renderer.ts      # OfflineAudioContext → WAV/MP3/FLAC, stems, loudness
index.ts         # synthesizeAudio({prompt, duration, style, tempo, key, seed})
```

### 1.5 Integración Core
```
media-synthesis.ts           # Export unificado
media-synthesis/index.ts     # synthesizeImage, synthesizeVideo, synthesizeAudio, synthesizeMedia
media-synthesis/unified/     # conditioning, temporal, export
```

### 1.6 Wrappers + Agent Tools + Gen-Engine Integration
```
image.ts       # + provider: 'procedural'
video.ts       # + provider: 'procedural' 
music.ts       # + provider: 'procedural'
omag/generators.ts  # + 3 ProceduralGenerators
ai/llm.ts      # + 4 agent tools
gen-engine/providers.py  # Python wrapper para invocar desde FastAPI
```

---

## Fase 2 (Semana 2): Diffusion From Scratch + Micro-Training + Pipeline Completo

### 2.1 Nivel 2: Diffusion Transformer Pequeño (TypeScript + Python)
```
diffusion/
  ├── scheduler.ts      # DDPM, DDIM, EDM, Flow Matching schedulers
  ├── unet.ts           # U-Net 1D/2D minimal (attention, resblocks, time embedding)
  ├── transformer.ts    # DiT minimal (patchify, blocks, adaLN)
  ├── consistency.ts    # Consistency Models (1-2 step sampling)
  ├── training.ts       # Training loop, EMA, mixed precision
  ├── distillation.ts   # Progressive distillation
  └── index.ts
```

### 2.2 Nivel 3: Micro-Training Pipeline (Python)
```
gen-engine/training/
  ├── data/             # Dataset preparation (LAION subsets, synthetic)
  ├── train_diffusion.py   # Entrenamiento micro (8B params max, 1-4 GPU)
  ├── train_consistency.py # Consistency distillation
  ├── export_onnx.py       # Export ONNX para WebGL/WASM
  ├── quantize.py          # INT8/INT4 quantization
  └── benchmark.py         # Latency/quality benchmarks
```

### 2.3 Pipeline Multimodal Unificado
```
unified/
  ├── conditioning.ts   # Text encoder (CLIP-tiny) → shared latent
  ├── temporal.ts       # Video-audio sync, latent interpolation
  ├── export.ts         # MP4+Audio, stems, project JSON
  └── index.ts
```

### 2.4 CLI + Demos + Documentación
```
scripts/media-synthesis-demo.ts  # npm run media-synth:{image,video,audio,all}
docs/MEDIA-SYNTHESIS.md          # Documentación completa
```

---

## Archivos a Tocar (Staging Explícito)

### Nuevos (~50 archivos)
```
packages/core/src/tools/media-synthesis.ts
packages/core/src/tools/media-synthesis/image/sdf.ts
packages/core/src/tools/media-synthesis/image/noise.ts
packages/core/src/tools/media-synthesis/image/gradients.ts
packages/core/src/tools/media-synthesis/image/patterns.ts
packages/core/src/tools/media-synthesis/image/fractals.ts
packages/core/src/tools/media-synthesis/image/renderer.ts
packages/core/src/tools/media-synthesis/image/index.ts
packages/core/src/tools/media-synthesis/video/timeline.ts
packages/core/src/tools/media-synthesis/video/particles.ts
packages/core/src/tools/media-synthesis/video/shaders.ts
packages/core/src/tools/media-synthesis/video/composer.ts
packages/core/src/tools/media-synthesis/video/renderer.ts
packages/core/src/tools/media-synthesis/video/index.ts
packages/core/src/tools/media-synthesis/audio/dsp.ts
packages/core/src/tools/media-synthesis/audio/synthesis.ts
packages/core/src/tools/media-synthesis/audio/sequencer.ts
packages/core/src/tools/media-synthesis/audio/music-theory.ts
packages/core/src/tools/media-synthesis/audio/effects.ts
packages/core/src/tools/media-synthesis/audio/renderer.ts
packages/core/src/tools/media-synthesis/audio/index.ts
packages/core/src/tools/media-synthesis/diffusion/scheduler.ts
packages/core/src/tools/media-synthesis/diffusion/unet.ts
packages/core/src/tools/media-synthesis/diffusion/transformer.ts
packages/core/src/tools/media-synthesis/diffusion/consistency.ts
packages/core/src/tools/media-synthesis/diffusion/training.ts
packages/core/src/tools/media-synthesis/diffusion/distillation.ts
packages/core/src/tools/media-synthesis/diffusion/index.ts
packages/core/src/tools/media-synthesis/unified/conditioning.ts
packages/core/src/tools/media-synthesis/unified/temporal.ts
packages/core/src/tools/media-synthesis/unified/export.ts
packages/core/src/tools/media-synthesis/unified/index.ts
packages/core/src/tools/media-synthesis/index.ts
packages/core/src/tools/media-synthesis.test.ts
scripts/media-synthesis-demo.ts
learning/sources/media-synthesis-math.md
docs/MEDIA-SYNTHESIS.md
gen-engine/training/train_diffusion.py
gen-engine/training/train_consistency.py
gen-engine/training/export_onnx.py
gen-engine/training/quantize.py
gen-engine/training/benchmark.py
gen-engine/app/providers.py  # actualizar con procedural
```

### Modificados (~10 archivos)
```
packages/core/src/tools/image.ts
packages/core/src/tools/video.ts
packages/core/src/tools/music.ts
packages/core/src/omag/generators.ts
packages/core/src/omag/sound.ts
packages/core/src/ai/llm.ts
packages/core/src/tools/index.ts
gen-engine/app/providers.py
gen-engine/app/main.py
.opencode/plans/loop-media-synthesis-full.md
```

---

## Criterios de Verificación

### Scoped (cada commit)
- `npm run typecheck` — 0 errores
- `npm run test -- media-synthesis` — tests pasan
- `npm run lint` — 0 warnings

### FULL (cada commit)
1. `npm run typecheck` (core + web + runtime)
2. `npm run lint`
3. `npm run test` (969+ tests)
4. `npm run build` (Next.js 15)

### Tests Objetivo: **500+ nuevos** (total repo ~1400+)

---

## Riesgos / Guardas
- **NO tocar**: `automation.ts`, `recorder.ts`, `reach.ts`, `blueprint.ts` (sesión #25)
- **Performance**: WebGL obligatorio para video, Web Workers para CPU-intensive
- **Bundle**: Lazy loading de `media-synthesis` (dynamic import)
- **Determinismo**: PRNG propio (mulberry32), seeds fijos cross-platform
- **Memoria**: Streaming encode, chunked processing
- **Gen-Engine**: Python wrapper invoca Node CLI o HTTP local

---

## Esfuerzo Estimado
- **Muy Alto** — 2 semanas intensivas, ~60 archivos, 500+ tests
- **Paralelizable**: Imagen/Video/Audio independientes
- **Reutiliza**: `codevfx.ts`, `omag/sound.ts`, `video-edit.ts`, `travel.ts`