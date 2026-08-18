# UltraIa Travel Video Generation — Result Task

Generated: 2026-08-18

## Overview

This directory contains all generated assets for creating 4 travel videos from the `@tomassporro` Instagram footage (48 clips, ~10 min total) using UltraIa's video pipeline:

- **travel-30s.mp4** — 30 seconds, estilo "naturaleza" (collage real + VFX frost/ground)
- **travel-60s.mp4** — 60 seconds, estilo "aventura" (collage real + VFX fire/lightning/meteor)
- **travel-2min.mp4** — 2 minutes, estilo "cultura" (collage + secciones generativas + VFX plasma/beam/void)
- **travel-30min.mp4** — 30 minutes, estilo "relax" (collage extendido + loops generativos + VFX frost/ground/ice)

## Generated Assets

### Plans (JSON)
| File | Description |
|------|-------------|
| `plan-30s.json` | 30s travel plan: 4 escenas, hook, CTA, música sugerida |
| `plan-60s.json` | 60s travel plan: 7 escenas, estilo aventura |
| `plan-2min.json` | 2min travel plan: 12 escenas, estilo cultura |
| `plan-30min.json` | 30min travel plan: 30 escenas (60s c/u), estilo relax |

### Render Plans (JSON)
| File | Description |
|------|-------------|
| `render-30s.json` | ffmpeg argv: 5 steps (4 Ken Burns + 1 final xfade) |
| `render-60s.json` | ffmpeg argv: 8 steps (7 Ken Burns + 1 final xfade) |
| `render-2min.json` | ffmpeg argv: 13 steps (12 Ken Burns + 1 final xfade) |
| `render-30min.json` | ffmpeg argv: 33 steps (30 Ken Burns + 1 final xfade) |

### VFX Overlays (JSON)
| File | Description |
|------|-------------|
| `vfx-overlays.json` | Procedural effects per video (codevfx.ts): kind, intensity, speed, GLSL shader, blend mode, timing |

### Music Manifest (JSON)
| File | Description |
|------|-------------|
| `music-manifest.json` | Tunetank search queries + procedural fallback per video |

### Render Scripts (Shell)
| File | Description |
|------|-------------|
| `scripts/render-travel-30s.sh` | Executable ffmpeg pipeline for 30s |
| `scripts/render-travel-60s.sh` | Executable ffmpeg pipeline for 60s |
| `scripts/render-travel-2min.sh` | Executable ffmpeg pipeline for 2min |
| `scripts/render-travel-30min.sh` | Executable ffmpeg pipeline for 30min |

### Master Generator
| File | Description |
|------|-------------|
| `scripts/generate-all-travel-videos.sh` | Orchestrates everything: TTS, footage prep, render |

### Footage Manifest
| File | Description |
|------|-------------|
| `footage-manifest.json` | Complete inventory of 48 source clips with durations |

## Pipeline Used

All generation uses **existing UltraIa capabilities** (no new core code):

1. **`travel.ts`** — `planTravelVideo`, `buildTravelRender` (deterministic Ken Burns + xfade + audio mix)
2. **`video-edit.ts`** — EDL construction, hard rules (30ms fades, safe silence cuts, lossless concat), self-eval
3. **`codevfx.ts`** — `planEffect` for 9 procedural VFX kinds (fire, ice, lightning, meteor, beam, ground, void, plasma, frost)
4. **`music.ts`** — `searchMusic` (Tunetank keyless) + `composeMusic` (procedural fallback)
4. **`omag/tts.ts`** — `edgeTtsAudio` (WebSocket keyless, Node 22+ global) for narration
5. **`screenflow.ts`** — Recording → actions → edit → publish local (manifest + continuity)

## Quick Start

```bash
# Check dependencies
winget install Gyan.FFmpeg  # Windows
# brew install ffmpeg       # macOS
# apt install ffmpeg        # Linux

# Run master generator (generates 30s, 60s, 2min; 30min script only)
bash scripts/generate-all-travel-videos.sh

# Or run individual render scripts
bash scripts/render-travel-30s.sh
bash scripts/render-travel-60s.sh
bash scripts/render-travel-2min.sh
# 30min: bash scripts/render-travel-30min.sh  (takes ~30 min, outputs ~2GB)
```

## Output

Videos saved to `resultTask/travel/output/`:
- `travel-30s.mp4` (~30s, 720x1280, 9:16)
- `travel-60s.mp4` (~60s, 720x1280, 9:16)
- `travel-2min.mp4` (~2min, 720x1280, 9:16)
- `travel-30min.mp4` (~30min, 720x1280, 9:16) — **run manually**

## Verification

All core tools have tests passing:
- `travel.test.ts` — 18 tests
- `video-edit.test.ts` — 29 tests
- `codevfx.test.ts` — 29 tests
- `music.test.ts` — tests exist

Run: `npm run test` (from repo root)

## Creative Notes

### Collage Strategy (Real Footage)
- 48 clips from `@tomassporro` highlights + posts (4.3s–45s each)
- Smart selection: longest clips for hero scenes, shorter for transitions
- Ken Burns (zoompan) on extracted keyframes for cinematic feel
- Chained xfade (0.6s) for smooth transitions
- 30ms audio fades at every boundary (anti-pop)

### Procedural VFX (codevfx)
- **30s/naturaleza**: frost (cold) + ground (earth) — subtle, organic
- **60s/aventura**: fire (energy) + lightning (drama) + meteor (epic) — high intensity
- **2min/cultura**: plasma (mystical) + beam (focus) + void (depth) — rich, layered
- **30min/relax**: frost + ground + ice — minimal, calming, loopable

### Music
- Keyless Tunetank search (single-word queries per style)
- Procedural `composeMusic` fallback (tone/noise/ambience → WAV)
- Volume ducked to 0.25 under narration
- 30min version: 30 loops of ~60s ambient

### Narration
- Bilingual es/ar (pattern RF-12 from enrutador)
- edge-tts keyless (WebSocket, no API key)
- Hook + per-scene + CTA

## Customization

Edit plans in `resultTask/travel/plan-*.json` to change:
- Destination, style, duration, scenes
- Hook, narration, CTA text
- Camera motions (from MOTIONS vocabulary)
- Music style

Edit VFX in `resultTask/travel/vfx-overlays.json`:
- Effect kinds, intensity, speed
- Timing (start/end percentage)
- Blend mode, opacity

## Architecture

This generation follows UltraIa's **deterministic, keyless, offline-first** philosophy:
- All plans are pure JSON (reproducible, versionable)
- Render scripts are standalone shell (no Node runtime needed for execution)
- VFX are pure GLSL + Canvas 2D (no Three.js, no assets)
- Music is procedural or keyless API
- TTS is local WebSocket (edge-tts)

## Next Steps

1. Run `bash scripts/generate-all-travel-videos.sh` to produce 30s/60s/2min
2. Review outputs, adjust plans/VFX/music as needed
3. For 30min: run render script manually (expect 30-60 min encode time)
4. Use `video-edit.ts` self-eval for quality checks
5. Publish via AutoPub pipeline (capability `publish` → YouTube/TikTok/IG/Telegram/etc.)