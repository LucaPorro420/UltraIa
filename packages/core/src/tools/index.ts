export * from './calculator';
export * from './web';
export * from './image';
export * from './meigen';
export * from './reach';
export * from './skills';
export * from './content';
export * from './video';
export * from './music';
export * from './stitch';
export * from './gen-engine';
export * from './g0dm0d3';
export * from './topics';
export * from './present';
export * from './publish';
export * from './enrutador';
export * from './media-score';
export * from './metrics';
export * from './memory-fs';
export * from './diagram';
export * from './video-edit';
export * from './cloud';
export * from './travel';
export * from './generative';
export * from './libros';
export * from './sdf';
export * from './videoqa';
// motion: export explicito (catmullRom colisiona con generative; queda vía './motion' directo)
export {
  motionVectorSchema, flowFieldSchema, flowAnalysisSchema,
  flowStats, decomposeMotion, trajectoryFit, planFlowAnalysis, motionSurface,
} from './motion';
export type {
  MotionVector, FlowField, FlowAnalysis, DecomposedMotion, FlowStats, Point2D, Trajectory,
} from './motion';
export * from './replica';
export * from './imaging';

import * as web from './web';
import * as image from './image';
import * as content from './content';
import * as video from './video';
import * as music from './music';
import * as stitch from './stitch';
import { reach } from './reach';
import { runSkill } from './skills';
import * as g0dm0d3 from './g0dm0d3';
import { topics } from './topics';
import { presentTools } from './present';
import { publish } from './publish';
import { enrutador } from './enrutador';
import { mediaScore } from './media-score';
import { metrics } from './metrics';
import { createMemoryFs } from './memory-fs';
import { diagram } from './diagram';
import { videoEdit } from './video-edit';
import { screenflow } from './screenflow';
import { cloudTools } from './cloud';
import { harness } from './harness';
import { growth } from './growth';
import { vfx } from './vfx';
import { codevfx } from './codevfx';
import { travel } from './travel';
import { generative } from './generative';
import { libros } from './libros';
import { sdf } from './sdf';
import * as videoqa from './videoqa';
import * as motion from './motion';
import * as replica from './replica';
import * as imaging from './imaging';

export const tools = { web, image, video, music, stitch, reach, skills: { runSkill }, content, g0dm0d3, topics, present: presentTools, publish, enrutador, mediaScore, metrics, memoryFs: { createMemoryFs }, diagram, videoEdit, screenflow, cloud: cloudTools, harness, growth, vfx, codevfx, travel, generative, libros, sdf, videoqa, motion, replica, imaging };

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  calculator: 'Safely evaluate a mathematical expression (math only).',
  web: 'Fetch a public web page (website or non-private social post) and read its text and metadata. Keyless.',
  image: 'Generate a photoreal image from a text prompt using a free, keyless image model. Returns a hotlinkable URL.',
  video: 'Produce a video storyboard (sequence of photoreal frames) from a text prompt. Keyless; real video when a provider is configured.',
  music: 'Compose an original music piece (structured composition) from a text prompt. Keyless; rendered audio when a provider is configured.',
  design: 'Generate a high-fidelity UI screen from a text prompt using Google Stitch (free Google Labs). Returns a screenshot + HTML.',
  reach: 'Real-time internet access: read any web page as clean text, search the live web, search GitHub repos, parse RSS feeds, and fetch YouTube metadata. Use for anything current (news, prices, docs, repos).',
  skills:
    'Run a step of the agent-development pipeline: plan → build → test → review → ship → simplify. Each skill produces a structured Markdown artifact for the given task using the configured model. Use to design, implement, QA, review, release or refactor.',
  content:
    'Royalty-free content assets for video/audio projects: searchMusic (music tracks with previews), searchSfx (sound effects with previews) via Tunetank (free, keyless), and mixkit (stock video/music/SFX/templates pages). Use when the task needs background music, sound effects, stock footage or video templates.',
  g0dm0d3:
    'G0DM0D3-style evaluation & testing: Parseltongue input perturbation (33 obfuscation techniques), AutoTune context-adaptive sampling params, multi-angle response evaluation (ultraplinian) and combo racing (godmode) with composite scoring (ELITE/EXCELLENT/GOOD/ACCEPTABLE/POOR). Use to stress-test queries, tune generation or pick the best of several candidate answers.',
  topics:
    'Content idea engine (AutoPub F1): generates prioritized topic briefs from RSS feeds and DuckDuckGo trend searches — deduplicated, scored by novelty × channel relevance, with per-channel format/tone/angle. Use to feed the content factory with recurring, ready-to-write briefs.',
  present:
    'Presentation builder (AutoPub F3): builds a PublicationPackage from raw content — per-channel captions + hashtags (YouTube/TikTok/Instagram/blog), visual specs (9:16/1:1/16:9), SRT subtitles, branding kit and suggested schedule. Use to adapt one piece of content into ready-to-publish packages per platform.',
  publish:
    'Distribution adapters (AutoPub F4): publish a final MP4 (9:16, <60s) to YouTube Shorts (resumable upload v3), TikTok (Direct Post 2 steps), X, Meta (Instagram Reels / Threads), Telegram (Bot API sendVideo), Discord (webhook), Slack (files.upload) and LinkedIn (Assets API + UGC Posts) with bilingual es/ar metadata. Validates tokens first; fails soft with a clear reason when a platform is not configured. Use to ship finished video content to the channels.',
  publications:
    'Publication queue (AutoPub F4): create/list/approve/reject queued publications from PublicationPackages (auto-approves text/blog; video/image channels require human approval) and publish scheduled items that are due. Persisted in Prisma. Use to manage the content distribution pipeline end-to-end.',
  contenido:
    'Content router (AutoPub F2): converts a topic brief into ready-to-use content — written post (Redactor) or video script + storyboard (Guionista) — and writes a manifest.json to disk. Deterministic and keyless. Use to move from idea to content package.',
  memory:
    'Agent memory filesystem (Fable-5 pattern): structured memory across sessions — list/read/write/append/strReplace/delete with version guards (ifVersion), YAML frontmatter (name/description/sources/aliases) and [stated]/[observed]/[inferred] tagged lines. One file per subject (topics/, people/, areas/, preferences, profile). Use to persist what the user tells you and read it in later conversations.',
  metrics:
    'Publication metrics (AutoPub F5): channel KPIs (published/failed/pending counts, success rate, average pre-publication media score), BAD-feedback signals from published posts (ready to feed the agent improvement pipeline), and real channel analytics via fetchChannelAnalytics (YouTube Data API v3 keyless-first with YOUTUBE_API_KEY; tiktok/x/instagram/threads/telegram fail-soft with a reason) merged into queue KPIs by mapped channel. Use to measure and close the content loop.',
  diagram:
    'Editorial diagrams (diagram-design pattern): render self-contained, accessible HTML/SVG diagrams in the project design system (Dark Obsidian) — timeline (events on an axis), data-flow (pipeline steps), architecture (components + connections), loop (flywheel with write-back arcs). Anti-AI-slop geometry (coordinates divisible by 4, 1px hairlines, no shadows), role="img" + aria-labelledby, no JS, no external deps. Use to visualize pipelines, motion specs, roadmaps and architecture.',
  video_edit:
    'Video editing pipeline (video-use pattern): pack phrase-level transcripts into the compact takes_packed view the model reads, build and validate an EDL (cut safety: 30-200ms padding, silences >=150ms, no overlaps), generate the ffmpeg render command (per-segment extract with 30ms audio fades + color grade + lossless concat), self-evaluate the cut list deterministically (max 3 fix cycles), and render an on-demand timeline composite SVG (filmstrip + waveform + word labels). Keyless-first. Use to plan and produce video edits from transcripts and motion specs.',
  screenflow:
    'ScreenFlow pipeline (screen-recording automation): validate a declarative ActionScript (click/type/key/scroll/open_url/exec/screenshot/wait_selector/end), plan capture runs, generate the ffmpeg gdigrab capture argv (segmented, CRF 18, silent track fallback), build the local publishing package (.ultraia/recordings/<run-id>/: final.mp4 + master + webm + poster + manifest + report), schedule runs (schtasks/cron), and resolve continuation state (resume idempotente, retry max 3, fail-soft). Deterministic, keyless. Use to automate screen recording + actions + edit + local publish pipelines.',
  cloud:
    'UltraIA Cloud storage (free 2026 stack): list/upload/read/remove/stat files in the project cloud — local .ultraia/cloud by default, or Cloudflare R2 via Worker when CLOUDFLARE_R2_WORKER_URL + CLOUDFLARE_R2_TOKEN are set. Uploads validated (safe canonical paths, 42 allowed extensions, 100 MiB cap). Use to persist media, drafts, briefs, exports and backups across sessions.',
  harness:
    'Agent harness runtime (DeepSeek Harness pattern, everything-is-a-plugin): boot a plugin tree (tools/observers/schedulers with topological dependency order), run tasks through the tools of active plugins, advance the tick clock to fire scheduled jobs, inspect the runtime (dump) and shut it down (unwinds effects in reverse order, fail-soft). No privileged core — every capability is a plugin. Deterministic, keyless. Use to compose agent runtimes declaratively and orchestrate plugin-driven execution.',
  growth:
    'Channel growth engine (VidRush + Abacus.AI patterns): analyze a channel profile from published samples (pacing, cut cadence, on-screen text density, hook length, thumbnail style), plan A/B experiments on ONE variable at a time (title/hook/thumbnail/duration/format — worst KPI first, max experiments cap), and build a per-channel playbook that compounds wins from engagement signals (victory = test beats control by >=5 KPI points). Deterministic, keyless. Use to model a channel, isolate what moves its metrics, and persist winning recommendations.',
  vfx:
    'VFX planning engine (Higgsfield DaVinci Resolve plugin principles): plan AI post-production operations deterministically and keyless — reframe (16:9 -> 9:16 crop windows following action centers with smooth pan + ffmpeg argv), upscale (1080p..8k ladder, lanczos vs generative), AI LUT match (grade presets -> ffmpeg eq args), rotoscope (remove-background plan: keyframes/alpha/cleanup/cost), draw-to-edit (sketch -> video prompt with camera motion) and B-roll request builder (missing beat -> frame shape -> motion -> transition). Execution delegates to ffmpeg/video_edit and generation providers. Use to plan post-production before rendering.',
  codevfx:
    'Code-driven visual effects (Elemental Sandbox pattern �?" 100% code, no assets): plan procedural effects (fire/ice/lightning/meteor/beam/ground/void/plasma/frost) with palette, physics, particles and hand-written GLSL; analyze colorimetry coherence (HSL warmth/saturation); compute curvature shading; plan camera perspective with parallax; render a self-contained HTML5 canvas demo. Deterministic, keyless. Use to design VFX scenes purely from math.',
  travel:
    'Travel video engine ("tomas de paisajes" pattern): plan a 9:16 travel video from a destination (hook + scenes with camera MOTIONS + bilingual es/ar narration + CTA + per-scene image prompts), persist a saved landscape "take" manifest (.ultraia/travel/tomas/<slug>/), build the deterministic ffmpeg render pipeline (Ken Burns zoompan + chained xfade + narration TTS + background music), and replicate a landscape as N prompt variations (time of day x weather x lens) with keyless Pollinations URLs. Deterministic, keyless. Use to turn saved landscape references into automated travel videos.',
  generative:
    'Procedural media generation engine (game-engine style, 100% code — no assets, no models, no network): images from math (Perlin/Simplex noise, Mandelbrot fractals, flow fields, L-systems → self-contained SVG), video motion (keyframe interpolation linear/cubic Catmull-Rom, deterministic particle simulations with gravity/wind/friction, parametric Ken Burns camera windows, multi-scene video plans), and audio synthesis (sine/square/saw/triangle waves, FM, granular, pink noise, ADSR envelopes, BPM sequencer, multi-track mixing → PCM/WAV). Fully deterministic (seeded PRNG, checksums). Use to generate visual/audio assets entirely in code.',
  research:
    'Knowledge research engine: search arXiv papers (Atom API), GitHub repositories and the live web (Exa when EXA_API_KEY is set, DuckDuckGo keyless), fetch-and-extract any URL as clean text via r.jina.ai, with in-memory/file cache and cross-source URL dedupe. Fail-soft, keyless-first. Use to gather verifiable knowledge (papers, repos, docs) and feed the learning/truth memory.',
  enlaces:
    'Link curation & knowledge integration: parse the project enlaces.txt URL list, classify entries (pending vs already processed), and download/commit raw sources into learning/sources/<slug>.md — the protocol for turning user-shared links into capabilities/docs/tests. Deterministic, idempotent. Use to process new links and integrate external knowledge into the project.',
  libros:
    'Free programming books catalog in Spanish (librosgratis.dev / midudev pattern): 115 free books and tutorials in 32 sections across 8 categories — search with multi-term scoring (title 3 > author 2 > section 1, accents-insensitive), list by section, aggregate categories, and validate new resource proposals against the README rules. Deterministic, keyless. Use to recommend free Spanish learning resources for any programming topic.',
  sdf:
    'Signed Distance Fields + ray marching (Inigo Quilez pattern, 100% code): plan a 3D SDF scene (sphere/box/torus/capsule/plane primitives; union/intersection/subtract/smooth ops with evaluable tree and human-readable formula), generate GLSL reference code, estimate a ray-march render plan (steps, 16:9 resolution, ops per frame) or render a self-contained HTML5 canvas 2D scene (drag rotate, wheel zoom, R reset, Dark Obsidian, a11y). Deterministic, keyless, offline. Use to visualize procedural 3D shapes as code.',
  videoqa:
    'Video quality metrics (fundamentos-programacion.md A20-A24 pattern): compute MAE/MSE/PSNR/SSIM between reference and distorted luminance buffers, optical-flow error E_flow, weighted total error E_total (pixel 0.6 / flow 0.3 / semantic 0.1), a PASS/FAIL verdict against thresholds (PSNR>40dB, SSIM>0.95, E_total<0.4), and the deterministic ffmpeg/libvmaf argv (never executes). Deterministic, keyless. Use to verify a rendered/edited video against a reference before publishing.',
  motion:
    'Video motion analysis (fundamentos-programacion.md A9-A11/A14 pattern): stats of an optical-flow field (mean magnitude, dominant angle, coherence), camera-vs-scene decomposition (least-squares translation+zoom, residual scene motion, verdict static/camera/scene/mixed), Catmull-Rom trajectory fitting through control points, and the deterministic Python/OpenCV flow-analysis argv (Farneback/Lucas-Kanade; never executes). Deterministic, keyless. Use to analyze camera movement vs object motion before planning cuts or renders.',
  replica:
    'Analysis-by-synthesis orchestrator (fundamentos-programacion.md A21/A26-A37 pattern): analyze a target signature (mean/variance/span) and plan a replication run (config parsed with stop conditions: target score, max iterations, patience, timeout; compute budget). The full loop (analyze -> generate -> compare -> optimize with checkpoints, resume and fail-soft) lives in the pure domain and is executed by a runner injecting the real IO (generative/videoqa/motion/sdf). Deterministic, keyless. Use to plan and drive replication of a target by synthesis.',
  imaging:
    'Pure-TypeScript image processing kernels (fundamentos-programacion.md A8/A9-A11/A22-A24 pattern): 2D convolution and correlation (separable fast path), kernels (gaussian/box/Sobel/Prewitt/Laplacian/sharpen/emboss), filters (gaussian & box blur, median, unsharp mask), grayscale morphology (erode/dilate/open/close/gradient), tone (histogram, Otsu, threshold, normalize, gamma, contrast-limited equalization), geometry (crop, bilinear resize, gaussian pyramid), Canny edges (non-max suppression + hysteresis), 2D comparison (absolute/squared error maps, windowed SSIM map with MSSIM and worst-window locator, full compare report with PSNR and worst quadrant) and REAL optical flow (Lucas-Kanade single-scale and pyramidal coarse-to-fine, producing a FlowField that motion.flowStats/decomposeMotion consume directly). No deps, no network, fully deterministic. Use to measure, verify and analyze frames instead of only planning external runners.',
};

export type Capability =
  | 'calculator'
  | 'web'
  | 'image'
  | 'video'
  | 'music'
  | 'design'
  | 'reach'
  | 'skills'
  | 'content'
  | 'g0dm0d3'
  | 'topics'
  | 'present'
  | 'publish'
  | 'publications'
  | 'contenido'
  | 'metrics'
  | 'memory'
  | 'diagram'
  | 'video_edit'
  | 'screenflow'
  | 'cloud'
  | 'harness'
  | 'growth'
  | 'vfx'
  | 'codevfx'
  | 'travel'
  | 'generative'
  | 'research'
  | 'enlaces'
  | 'libros'
  | 'sdf'
  | 'videoqa'
  | 'motion'
  | 'replica'
  | 'imaging';
