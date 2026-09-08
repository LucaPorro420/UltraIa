# Video Course — UltraIa Learning

## Course Overview
Structured video processing course covering editing, generation, analysis, and production workflows. Based on verified learning from UltraIa's video-use and video-edit capabilities.

## Module 1: Video Editing Fundamentals (from `video-use` and `video-edit`)
### 1.1 Cutting and Trimming
- **Cut filler words**: `umm`, `uh`, false starts, dead space between takes
- **Dead space removal**: Silence between takes
- **Segment auto color grading**: Warm cinematic, neutral punch, or custom ffmpeg chain
- **30ms audio fades** at every cut boundary (anti-pops)

### 1.2 Subtitles and Overlays
- **Burn subtitles** in custom style
- **2-word UPPERCASE chunks** by default, fully customizable
- **Subtitles/overlays LAST** in the processing pipeline (after cuts, color, audio)

### 1.3 Audio Processing
- **30ms fades** per boundary (anti-pops)
- **Silence classification**:
  - ≥400ms: limpios (clean cuts)
  - 150-400ms: verificables
  - <150ms: inseguros (unsafe, may lose content)
- **Padding**: 30-200ms range
- **Self-evaluation**: Max 3 attempts (`MAX_SELF_EVAL_ATTEMPTS`)
- **Audio extraction**: From video using ffmpeg

### 1.4 Timeline and EDL (Edit Decision List)
- **takes_packed format**: ~12KB, `[start-end]` + speaker, break ≥0.5s/cambio speaker
- **EDL validation**: in<out, ≥50ms, overlaps (warnOnly opcional)
- **Build EDL**: Valida in<out, ≥50ms, overlaps
- **Render FFmpeg**: argv determinista por grado (warm-cinematic/neutral-punch/none)
- **`-movflags +faststart`**: Optimiza para web streaming

### 1.5 Self-Evaluation Pipeline
- **selfEvalEdl** → DURATION_MISMATCH/UNSAFE_CUT/UNSAFE_GAP + score 0-100
- **Duration mismatch**: Total duration differs
- **Unsafe cut**: Cut within unsafe window (<150ms)
- **Unsafe gap**: Gap between cuts <150ms or >400ms handling
- **Score composition**: Quality × filteredness × speed, grades ELITE 90 / EXCELLENT 80 / GOOD 70 / ACCEPTABLE 60 / POOR

## Module 2: Video Generation (from `omag` and `gen-engine`)
### 2.1 Procedural Video Generation
- **SDF + ray marching**: For each pixel: distance to surface → lighting → color
- **Primitivas**: sphere(), box(), torus(), capsule()
- **Combinaciones**: union=min(dA,dB), intersection=max(dA,dB)
- **Ray marching**: Ray → distance function → advance → intersection → normal → lighting → pixel

### 2.2 Storyboard and Shot Planning
- **MOTIONS vocabulary**: 16 movements from canon (banco prompts-videos.md)
- **motions[] por shot**: Por shot + motion retrocompatible
- **normalizeMotion**: Canoniza espacios→guiones
- **MasterTimeline**: Synchronized timeline
- **checkTimelineSync**: Detecta offset audio-video >0.1s
- **alignEffectsToCause**: Resetea delays al causa

### 2.3 Multi-modal Video Generation
- **Audio-first**: Candidates de corte desde fronteras de palabra/silencios
- **Timeline visual**: Zoom on-demand, never scanner
- **Multi-act structure**: 3 actos, 7 escenas, shots ~10s MOTIONS
- **Long-form scaffolding**: `Project→Act→Sequence→Scene→Shot` (omag/project.ts)

### 2.4 long-form Content (60-180s)
- **guionLargo(brief, idioma, duracionSeg)**: 60-180s → OmagProject
- **3 actos**, 7 escenas, shots ~10s MOTIONS
- **MasterTimeline** sincronizada
- **TTS narración**: Hook+escenas → mp3
- **TopicFormat**: `'16:9 video'` en TopicFormat

### 2.5 OpenSource Video Tools
- **OpenCut**: MIT, rewrite Rust (Editor API, MCP server, headless)
- **OpenShorts**: MIT, Docker, largo→9:16 (whisper+PySceneDetect+Gemini+MediaPipe+FFmpeg)
- **Remotion**: 55.7k stars; videos con React; ⚠ licencia propia (<3 empleados gratis)
- **FFmpeg**: Deterministic argv generation, -c copy (evita doble re-encode)

## Module 3: ScreenFlow and Recording (from `screenflow` capability)
### 3.1 Capture Pipeline
- **ffmpeg gdigrab segmentado**: CRF 18, segmento con silencio fallback
- **ActionScript declarativo**: pyautogui + Playwright opcional
- **Fail-soft retry**: Máx 3 intentos
- **Nomenclatura determinista**: `YYYYMMDD-HHMMSS-<slug>-v<N>.mp4 + latest.mp4`

### 3.2 Region-based Editing
- **planRuns**: Segmentación por pasos
- **buildOutputNaming**: Nombre de salida estructurado
- **scheduleCmd**: schtasks (Windows) + cron (Linux)

### 3.3 Post-production Workflow
- **Edición**: Reutiliza capability video_edit
- **Publicación local**: `.ultraia/recordings/<run-id>/`: final.mp4 + master.mkv + final.webm + poster.png + manifest.json + report.md
- **Continuidad**: state.json resume idempotente, retry máx 3, fail-soft
- **Manifest**: toolchain + hashes

## Module 4: Video Quality and Metrics
### 4.1 Quality Metrics (from `videoqa`)
- **MAE/MSE/PSNR/SSIM**: Error metrics between reference and generated
- **E_flow**: Flow energy between frames
- **E_total ponderado**: `a=0.6/b=0.3/g=0.1`
- **Veredicto**: PSNR>40dB SSIM>0.95 E_total<0.4
- **eTotalMax**: 0.05 (incoherente con PSNR>40 → ePixel 48dB = 0.45 → 0.4)

### 4.2 VideoQA Tool
- **videoqa_metrics**: Compute MAE/MSE/PSNR/SSIM/E_flow/E_total
- **buildVmafArgv**: Nunca ejecuta (solo genera argv ffmpeg)
- **Veredicto determinista**: Por thresholds predefinidos

### 4.3 Self-Evaluation Integration
- Self-eval within video-edit pipeline
- DURATION_MISMATCH/UNSAFE_CUT/UNSAFE_GAP scoring
- Comparison against verified truth

## Module 5: Advanced Video Techniques
### 5.1 Ken Burns Effect
- Zoompan por escena (ffmpeg zoompan filter)
- xfade encadenado entre tomas
- Narración edge-tts en banda 0.25
- BGM at 0.25 volume
- Output: `travel-<slug>.mp4`

### 5.2 Procedural Content Generation
- ** plasma/waves/orbits/noise-flow/fractal-zoom/shape-morph** (from procvid capability)
- **Coordenadas normalizadas**: x∈[-a/2,a/2], y∈[-.5,.5], t∈[0,1)
- **Guardas**: dims PARES ≤1280, fps≤60, ≤60s, ≤1800 frames
- **argv ffmpeg exacto**: (+GIF palettegen/paletteuse)

### 5.3 Video SEO and Distribution
- **Thumbnails**: 9:16 still images (travelLeadImage)
- **Manifests**: `.ultraia/travel/tomas/<slug>/manifest.json` (slug idempotente)
- **Channel-specific formats**: 9:16 video, 1:1, 16:9
- **Bilingual captions**: es/ar subtitles