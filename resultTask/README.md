# resultTask — Task1 (orquestador OMAG)

Generado el 2026-08-17T02:00:38.526Z por `Task/run_task1.ts` (OmagOrchestrator + ffmpeg).

## Apps (10 prompts de Task1.md)

| # | App | Video ref. | Estado |
|---|-----|------------|--------|
| 1 | [🏎️ Aplicación Web/Móvil de Automóviles Premium](01-autos-premium/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |
| 2 | [🍔 Plataforma de Restaurante / Food Experience](02-restaurante/report.md) | `Download (2).mp4` | ✅ accepted=true overall=1.00 |
| 3 | [🏨 Hotel / Resort Cinematográfico](03-hotel-resort/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |
| 4 | [🎧 Plataforma de Música / Streaming](04-musica-streaming/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |
| 5 | [🛍️ Ecommerce Fashion de Alta Gama](05-fashion/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |
| 6 | [🏠 Real Estate / Arquitectura](06-real-estate/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |
| 7 | [🤖 Dashboard de IA / AI Workspace](07-ai-workspace/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |
| 8 | [🎮 Plataforma Gaming / Game Launcher](08-gaming/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |
| 9 | [✈️ Travel / Explorador de Destinos](09-travel/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |
| 10 | [🧠 Plataforma Educativa / Learning OS](10-learning-os/report.md) | `Download (5).mp4` | ✅ accepted=true overall=1.00 |

## Análisis de video (Motion Spec)

| Video | Motion spec |
|-------|-------------|
| Download (5).mp4 | [motion-spec](download-5.motion-spec.json) |
| Download (2).mp4 | [motion-spec](download-2.motion-spec.json) |

Cada app contiene: `plan.json` (DirectorPlan), `field.json` (MediaField),
`results.json` (imágenes generadas), `critiques.json` (score/críticas) y
`report.md` (resumen legible). Los motion-specs alimentan la implementación
React/Framer Motion (protocolo de replicación visual de Task1.md).

## Edits de video (capability video_edit)

Pipeline portado del patrón video-use (browser-use): transcript → takes_packed →
EDL validado → ffmpeg (fades 30ms + grade) → self-eval → timeline SVG.

| Demo | takes_packed | EDL | render | self-eval | timeline |
|---|---|---|---|---|---|
| Download (2) | [takes_packed](edl/download-2/takes_packed.md) | [edl.json](edl/download-2/edl.json) | [render.sh](edl/download-2/render.sh) | [selfeval.json](edl/download-2/selfeval.json) | [timeline.svg](edl/download-2/timeline.svg) |
| Download (5) | [takes_packed](edl/download-5/takes_packed.md) | [edl.json](edl/download-5/edl.json) | [render.sh](edl/download-5/render.sh) | [selfeval.json](edl/download-5/selfeval.json) | [timeline.svg](edl/download-5/timeline.svg) |

Regeneración (idempotente): `node_modules\.bin\vite-node.cmd Task/video-edit-demo.ts`

## Diagramas editoriales

Generados con la capability `diagram` (patrón diagram-design, Dark Obsidian) por
`Task/generate-diagrams.ts` — HTML autocontenidos (sin JS, sin deps, a11y).

| Diagrama | Tipo | Qué muestra |
|----------|------|-------------|
| [timeline-download-2.html](diagrams/timeline-download-2.html) | timeline | Escenas del motion-spec de `Download (2).mp4` |
| [timeline-download-5.html](diagrams/timeline-download-5.html) | timeline | Escenas del motion-spec de `Download (5).mp4` |
| [motion-engine-pipeline.html](diagrams/motion-engine-pipeline.html) | data-flow | Pipeline Video Analyzer → Motion Spec JSON → React UI |

Más diagramas del repo (roadmap, Desktop, Gen-Engine) en `docs/diagrams/`.
## Efectos por código (capability codevfx)

Patrón Elemental Sandbox (repo achrefelouafi/LinearAbiltyCastingThreeJS, MIT — Three.js + GLSL a mano,
post https://www.instagram.com/p/DcJDsghiJne/): efectos 100% código, sin texturas/sprites/meshes.

- `codevfx/plans.json` — planes de los 9 kinds (paleta, física, partículas, GLSL, hotkeys Q/W/E/R/F/X/V/C/B).
- `codevfx/colorimetria.json` — coherencia HSL (calor/saturación/dominante) de cada paleta.
- `codevfx/curvatura.json` — sombreado por curvatura (0/0.5/1) de la primary Dark Obsidian.
- `codevfx/perspectiva.json` — cámara (fov/distancia/tilt) + offsets de parallax por capa.
- `codevfx/effects/*.html` — demo canvas autocontenida por kind (abrir en navegador; reacciona a pointer y hotkey).

Abrir en navegador: `start resultTask/codevfx/effects/fire.html`
