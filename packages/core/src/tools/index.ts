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
export * from './geom';
// geometry/pngrender/procvid (loop-93): simbolos unicos Geo*/Png*/procvid - sin colision TS2308 con geom.
export * from './geometry';
export * from './pngrender';
export * from './procvid';
export * from './videoqa';
// motion: export explicito (catmullRom colisiona con generative; queda vÃ­a './motion' directo)
export {
  motionVectorSchema, flowFieldSchema, flowAnalysisSchema,
  flowStats, decomposeMotion, trajectoryFit, planFlowAnalysis, motionSurface,
} from './motion';
export type {
  MotionVector, FlowField, FlowAnalysis, DecomposedMotion, FlowStats, Point2D, Trajectory,
} from './motion';
export * from './replica';
export * from './imaging';
export * from './semantic-memory';
export * from './autolearn';
export * from './genesis';
export * from './vault';
export * from './pdfsearch';
// kgraph: `export *` seguro â€” no re-exporta simbolos de otros modulos (sin colision TS2308).
export * from './kgraph';
// brainpage: `export *` seguro â€” modulo nuevo (port de brain.md); simbolos unicos (normalizeId, initBrain, ...).
export * from './brainpage';
// autopub: `export *` seguro â€” modulo nuevo (orquestador del ciclo F1-F4); simbolos prefijados autopub/Autopub.
export * from './autopub';
// security: `export *` seguro â€” modulo nuevo (port cso skill); simbolos unicos (scanText, scanFile, scanRepo, ...).
export * from './security';
// codequality: `export *` seguro â€” modulo nuevo (linter estatico); simbolos unicos (scanText, scanFile, scanRepo, ...).
export * from './codequality';
// deps: `export *` seguro â€” modulo nuevo (SCA audit); simbolos unicos (parseAuditJson, auditDeps, ...).
export * from './deps';
// qdrant-memory: export EXPLICITO (no `export *`) â€” el modulo re-exporta `TruthDoc` y `tokenize`
// de semantic-memory y un `export *` colisionaria (TS2308, mismo patron del fix MemoryHit de iter-72).
export {
  qdrantMemory,
  embedDense,
  embedDense4,
  pointIdFor,
  buildQdrantPoint,
  planMemorySync,
  buildUpsertBody,
  buildSearchBody,
  createQdrantClient,
  syncMemoryToQdrant,
  searchExternalMemory,
  memorySyncSummary,
  QDRANT_COLLECTION,
  QDRANT_VECTOR_SIZE,
  QDRANT_COLLECTION_V1,
  QDRANT_VECTOR_SIZE_V1,
  QDRANT_DISTANCE,
  QDRANT_DEFAULT_URL,
} from './qdrant-memory';
export type {
  MemoryPayload,
  QdrantPoint,
  ExternalMemoryHit,
  QdrantResult,
  MemorySyncPlan,
  QdrantClient,
} from './qdrant-memory';

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
import * as kgraph from './kgraph';
import * as brainpage from './brainpage';
import * as autopub from './autopub';
import * as security from './security';
import * as codequality from './codequality';
import * as deps from './deps';
import { libros } from './libros';
import { sdf } from './sdf';
import { geom } from './geom';
import { geometry } from './geometry';
import * as pngrender from './pngrender';
import * as procvid from './procvid';
import * as videoqa from './videoqa';
import * as motion from './motion';
import * as replica from './replica';
import * as imaging from './imaging';
import * as semanticMemory from './semantic-memory';
import * as autolearn from './autolearn';
import * as genesis from './genesis';
import * as creativo from './creativo';
import { vaultTools } from './vault';
import { pdfsearchTools } from './pdfsearch';
import { qdrantMemory as qdrantMemoryTools } from './qdrant-memory';

export const tools = { web, image, video, music, stitch, reach, skills: { runSkill }, content, g0dm0d3, topics, present: presentTools, publish, enrutador, mediaScore, metrics, memoryFs: { createMemoryFs }, diagram, videoEdit, screenflow, cloud: cloudTools, harness, growth, vfx, codevfx, travel, generative, libros, sdf, videoqa, motion, replica, imaging, semanticMemory, autolearn, genesis, creativo, vault: vaultTools, pdfsearch: pdfsearchTools, qdrantMemory: qdrantMemoryTools, kgraph, brainpage, autopub, security, codequality, deps, geom, geometry, pngrender, procvid };

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  calculator: 'Safely evaluate a mathematical expression (math only).',
  web: 'Fetch a public web page (website or non-private social post) and read its text and metadata. Keyless.',
  image: 'Generate a photoreal image from a text prompt using a free, keyless image model. Returns a hotlinkable URL.',
  video: 'Produce a video storyboard (sequence of photoreal frames) from a text prompt. Keyless; real video when a provider is configured.',
  music: 'Compose an original music piece (structured composition) from a text prompt. Keyless; rendered audio when a provider is configured.',
  design: 'Generate a high-fidelity UI screen from a text prompt using Google Stitch (free Google Labs). Returns a screenshot + HTML.',
  reach: 'Real-time internet access: read any web page as clean text, search the live web, search GitHub repos, parse RSS feeds, and fetch YouTube metadata. Use for anything current (news, prices, docs, repos).',
  skills:
    'Run a step of the agent-development pipeline: plan â†’ build â†’ test â†’ review â†’ ship â†’ simplify. Each skill produces a structured Markdown artifact for the given task using the configured model. Use to design, implement, QA, review, release or refactor.',
  content:
    'Royalty-free content assets for video/audio projects: searchMusic (music tracks with previews), searchSfx (sound effects with previews) via Tunetank (free, keyless), and mixkit (stock video/music/SFX/templates pages). Use when the task needs background music, sound effects, stock footage or video templates.',
  g0dm0d3:
    'G0DM0D3-style evaluation & testing: Parseltongue input perturbation (33 obfuscation techniques), AutoTune context-adaptive sampling params, multi-angle response evaluation (ultraplinian) and combo racing (godmode) with composite scoring (ELITE/EXCELLENT/GOOD/ACCEPTABLE/POOR). Use to stress-test queries, tune generation or pick the best of several candidate answers.',
  topics:
    'Content idea engine (AutoPub F1): generates prioritized topic briefs from RSS feeds and DuckDuckGo trend searches â€” deduplicated, scored by novelty Ã— channel relevance, with per-channel format/tone/angle. Use to feed the content factory with recurring, ready-to-write briefs.',
  present:
    'Presentation builder (AutoPub F3): builds a PublicationPackage from raw content â€” per-channel captions + hashtags (YouTube/TikTok/Instagram/blog), visual specs (9:16/1:1/16:9), SRT subtitles, branding kit and suggested schedule. Use to adapt one piece of content into ready-to-publish packages per platform.',
  publish:
    'Distribution adapters (AutoPub F4): publish a final MP4 (9:16, <60s) to YouTube Shorts (resumable upload v3), TikTok (Direct Post 2 steps), X, Meta (Instagram Reels / Threads), Telegram (Bot API sendVideo), Discord (webhook), Slack (files.upload) and LinkedIn (Assets API + UGC Posts) with bilingual es/ar metadata. Validates tokens first; fails soft with a clear reason when a platform is not configured. Use to ship finished video content to the channels.',
  publications:
    'Publication queue (AutoPub F4): create/list/approve/reject queued publications from PublicationPackages (auto-approves text/blog; video/image channels require human approval) and publish scheduled items that are due. Persisted in Prisma. Use to manage the content distribution pipeline end-to-end.',
  contenido:
    'Content router (AutoPub F2): converts a topic brief into ready-to-use content â€” written post (Redactor) or video script + storyboard (Guionista) â€” and writes a manifest.json to disk. Deterministic and keyless. Use to move from idea to content package.',
  memory:
    'Agent memory filesystem (Fable-5 pattern): structured memory across sessions â€” list/read/write/append/strReplace/delete with version guards (ifVersion), YAML frontmatter (name/description/sources/aliases) and [stated]/[observed]/[inferred] tagged lines. One file per subject (topics/, people/, areas/, preferences, profile). Use to persist what the user tells you and read it in later conversations.',
  metrics:
    'Publication metrics (AutoPub F5): channel KPIs (published/failed/pending counts, success rate, average pre-publication media score), BAD-feedback signals from published posts (ready to feed the agent improvement pipeline), and real channel analytics via fetchChannelAnalytics (YouTube Data API v3 keyless-first with YOUTUBE_API_KEY; tiktok/x/instagram/threads/telegram fail-soft with a reason) merged into queue KPIs by mapped channel. Use to measure and close the content loop.',
  diagram:
    'Editorial diagrams (diagram-design pattern): render self-contained, accessible HTML/SVG diagrams in the project design system (Dark Obsidian) â€” timeline (events on an axis), data-flow (pipeline steps), architecture (components + connections), loop (flywheel with write-back arcs). Anti-AI-slop geometry (coordinates divisible by 4, 1px hairlines, no shadows), role="img" + aria-labelledby, no JS, no external deps. Use to visualize pipelines, motion specs, roadmaps and architecture.',
  video_edit:
    'Video editing pipeline (video-use pattern): pack phrase-level transcripts into the compact takes_packed view the model reads, build and validate an EDL (cut safety: 30-200ms padding, silences >=150ms, no overlaps), generate the ffmpeg render command (per-segment extract with 30ms audio fades + color grade + lossless concat), self-evaluate the cut list deterministically (max 3 fix cycles), and render an on-demand timeline composite SVG (filmstrip + waveform + word labels). Keyless-first. Use to plan and produce video edits from transcripts and motion specs.',
  screenflow:
    'ScreenFlow pipeline (screen-recording automation): validate a declarative ActionScript (click/type/key/scroll/open_url/exec/screenshot/wait_selector/end), plan capture runs, generate the ffmpeg gdigrab capture argv (segmented, CRF 18, silent track fallback), build the local publishing package (.ultraia/recordings/<run-id>/: final.mp4 + master + webm + poster + manifest + report), schedule runs (schtasks/cron), and resolve continuation state (resume idempotente, retry max 3, fail-soft). Deterministic, keyless. Use to automate screen recording + actions + edit + local publish pipelines.',
  cloud:
    'UltraIA Cloud storage (free 2026 stack): list/upload/read/remove/stat files in the project cloud â€” local .ultraia/cloud by default, or Cloudflare R2 via Worker when CLOUDFLARE_R2_WORKER_URL + CLOUDFLARE_R2_TOKEN are set. Uploads validated (safe canonical paths, 42 allowed extensions, 100 MiB cap). Use to persist media, drafts, briefs, exports and backups across sessions.',
  harness:
    'Agent harness runtime (DeepSeek Harness pattern, everything-is-a-plugin): boot a plugin tree (tools/observers/schedulers with topological dependency order), run tasks through the tools of active plugins, advance the tick clock to fire scheduled jobs, inspect the runtime (dump) and shut it down (unwinds effects in reverse order, fail-soft). No privileged core â€” every capability is a plugin. Deterministic, keyless. Use to compose agent runtimes declaratively and orchestrate plugin-driven execution.',
  growth:
    'Channel growth engine (VidRush + Abacus.AI patterns): analyze a channel profile from published samples (pacing, cut cadence, on-screen text density, hook length, thumbnail style), plan A/B experiments on ONE variable at a time (title/hook/thumbnail/duration/format â€” worst KPI first, max experiments cap), and build a per-channel playbook that compounds wins from engagement signals (victory = test beats control by >=5 KPI points). Deterministic, keyless. Use to model a channel, isolate what moves its metrics, and persist winning recommendations.',
  vfx:
    'VFX planning engine (Higgsfield DaVinci Resolve plugin principles): plan AI post-production operations deterministically and keyless â€” reframe (16:9 -> 9:16 crop windows following action centers with smooth pan + ffmpeg argv), upscale (1080p..8k ladder, lanczos vs generative), AI LUT match (grade presets -> ffmpeg eq args), rotoscope (remove-background plan: keyframes/alpha/cleanup/cost), draw-to-edit (sketch -> video prompt with camera motion) and B-roll request builder (missing beat -> frame shape -> motion -> transition). Execution delegates to ffmpeg/video_edit and generation providers. Use to plan post-production before rendering.',
  codevfx:
    'Code-driven visual effects (Elemental Sandbox pattern ï¿½?" 100% code, no assets): plan procedural effects (fire/ice/lightning/meteor/beam/ground/void/plasma/frost) with palette, physics, particles and hand-written GLSL; analyze colorimetry coherence (HSL warmth/saturation); compute curvature shading; plan camera perspective with parallax; render a self-contained HTML5 canvas demo. Deterministic, keyless. Use to design VFX scenes purely from math.',
  travel:
    'Travel video engine ("tomas de paisajes" pattern): plan a 9:16 travel video from a destination (hook + scenes with camera MOTIONS + bilingual es/ar narration + CTA + per-scene image prompts), persist a saved landscape "take" manifest (.ultraia/travel/tomas/<slug>/), build the deterministic ffmpeg render pipeline (Ken Burns zoompan + chained xfade + narration TTS + background music), and replicate a landscape as N prompt variations (time of day x weather x lens) with keyless Pollinations URLs. Deterministic, keyless. Use to turn saved landscape references into automated travel videos.',
  generative:
    'Procedural media generation engine (game-engine style, 100% code â€” no assets, no models, no network): images from math (Perlin/Simplex noise, Mandelbrot fractals, flow fields, L-systems â†’ self-contained SVG), video motion (keyframe interpolation linear/cubic Catmull-Rom, deterministic particle simulations with gravity/wind/friction, parametric Ken Burns camera windows, multi-scene video plans), and audio synthesis (sine/square/saw/triangle waves, FM, granular, pink noise, ADSR envelopes, BPM sequencer, multi-track mixing â†’ PCM/WAV). Fully deterministic (seeded PRNG, checksums). Use to generate visual/audio assets entirely in code.',
  research:
    'Knowledge research engine: search arXiv papers (Atom API), GitHub repositories and the live web (Exa when EXA_API_KEY is set, DuckDuckGo keyless), fetch-and-extract any URL as clean text via r.jina.ai, with in-memory/file cache and cross-source URL dedupe. Fail-soft, keyless-first. Use to gather verifiable knowledge (papers, repos, docs) and feed the learning/truth memory.',
  enlaces:
    'Link curation & knowledge integration: parse the project enlaces.txt URL list, classify entries (pending vs already processed), and download/commit raw sources into learning/sources/<slug>.md â€” the protocol for turning user-shared links into capabilities/docs/tests. Deterministic, idempotent. Use to process new links and integrate external knowledge into the project.',
  libros:
    'Free programming books catalog in Spanish (librosgratis.dev / midudev pattern): 115 free books and tutorials in 32 sections across 8 categories â€” search with multi-term scoring (title 3 > author 2 > section 1, accents-insensitive), list by section, aggregate categories, and validate new resource proposals against the README rules. Deterministic, keyless. Use to recommend free Spanish learning resources for any programming topic.',
  sdf:
    'Signed Distance Fields + ray marching (Inigo Quilez pattern, 100% code): plan a 3D SDF scene (sphere/box/torus/capsule/plane primitives; union/intersection/subtract/smooth ops with evaluable tree and human-readable formula), generate GLSL reference code, estimate a ray-march render plan (steps, 16:9 resolution, ops per frame) or render a self-contained HTML5 canvas 2D scene (drag rotate, wheel zoom, R reset, Dark Obsidian, a11y). Deterministic, keyless, offline. Use to visualize procedural 3D shapes as code.',
  geom:
    'Computational geometry & math library (fundamentos-programacion pattern, 100% code): scalars+easings, Vec2/Vec3 ops, Mat3/Mat4 (row-major: rotation/translation/lookAt) and quaternions (axis-angle, multiply, rotate vector, slerp, toMat4); 2D generators (polygon/star/spiral/lissajous/superellipse/grid/bezier/boundingBox) + SVG render (role=img, a11y); 3D meshes (sphere/torus/box/cylinder/helix/parametric surface) + normals + OBJ/STL export + orthographic projection SVG; keyframed timelines (linear/cubic/back ease) for video, self-contained HTML5 Canvas 2D/3D animation presets, and an SDF implicit-point-cloud bridge. Deterministic, keyless, offline. Use to program 2D/3D objects and animations purely from math.',
  videoqa:
    'Video quality metrics (fundamentos-programacion.md A20-A24 pattern): compute MAE/MSE/PSNR/SSIM between reference and distorted luminance buffers, optical-flow error E_flow, weighted total error E_total (pixel 0.6 / flow 0.3 / semantic 0.1), a PASS/FAIL verdict against thresholds (PSNR>40dB, SSIM>0.95, E_total<0.4), and the deterministic ffmpeg/libvmaf argv (never executes). Deterministic, keyless. Use to verify a rendered/edited video against a reference before publishing.',
  motion:
    'Video motion analysis (fundamentos-programacion.md A9-A11/A14 pattern): stats of an optical-flow field (mean magnitude, dominant angle, coherence), camera-vs-scene decomposition (least-squares translation+zoom, residual scene motion, verdict static/camera/scene/mixed), Catmull-Rom trajectory fitting through control points, and the deterministic Python/OpenCV flow-analysis argv (Farneback/Lucas-Kanade; never executes). Deterministic, keyless. Use to analyze camera movement vs object motion before planning cuts or renders.',
  replica:
    'Analysis-by-synthesis orchestrator (fundamentos-programacion.md A21/A26-A37 pattern): analyze a target signature (mean/variance/span) and plan a replication run (config parsed with stop conditions: target score, max iterations, patience, timeout; compute budget). The full loop (analyze -> generate -> compare -> optimize with checkpoints, resume and fail-soft) lives in the pure domain and is executed by a runner injecting the real IO (generative/videoqa/motion/sdf). Deterministic, keyless. Use to plan and drive replication of a target by synthesis.',
  imaging:
    'Pure-TypeScript image processing kernels (fundamentos-programacion.md A8/A9-A11/A22-A24): 2D convolution and correlation (separable fast path), kernels (gaussian/box/Sobel/Prewitt/Laplacian/sharpen/emboss), filters (gaussian & box blur, median, unsharp mask), grayscale morphology (erode/dilate/open/close/gradient), tone (histogram, Otsu, threshold, normalize, gamma, contrast-limited equalization), geometry (crop, bilinear resize, gaussian pyramid), Canny edges (non-max suppression + hysteresis), 2D comparison (absolute/squared error maps, windowed SSIM map with MSSIM and worst-window locator, full compare report with PSNR and worst quadrant) and REAL optical flow (Lucas-Kanade single-scale and pyramidal coarse-to-fine, producing a FlowField that motion.flowStats/decomposeMotion consume directly). No deps, no network, fully deterministic. Use to measure, verify and analyze frames instead of only planning external runners.',
  creativo:
    'Creative coding physics engine (Creative Code Architect pattern, 100% code â€” no assets): 2D particle physics (Euler/Verlet integration, gravity, air friction, elastic bounce with restitution, floor friction) over deterministic trajectories; physics scene planner (N bodies, seeded PRNG, hue-rotated palette); Web Audio impact sound spec (oscillator + exponential gain decay, intensity-driven frequency/gain/duration); and self-contained HTML5 Canvas renderer (requestAnimationFrame, physics+audio inline). Deterministic, keyless, offline. Use to generate 2D physics simulations, interactive demos and impact sounds entirely from math.',
  semantic_memory:
    'Semantic memory retrieval (SACD/NASA design -> UltraIa port): sparse n-gram hashing + cosine similarity over verified learnings (learning/truth corpus) with top-k ranked hits (id, texto, respuesta, score); corpus stats (total, sources, types). Deterministic, keyless, offline. Use to recall verified knowledge before proposing solutions (meta-learning loop).',
  autolearn:
    'Auto-learning agent (self-programming loop): sense learning state (parse LEARNINGS.md, scan verified truth), detect gaps (topics without verified truth, lessons not implemented, sources without analysis, pending backlog), prioritize with simplified RICE (impact x confidence / effort), generate the improvement plan (loop-piv pattern: goal, steps, files, scoped/FULL criteria, priority), compute cycle KPIs (lessons, truth, gaps, improvement rate), and build the operational-mode plan (P-P/P-B/L-T/S-D with S-D + L-T integrated into P-P). Deterministic, keyless, offline. Use to automate autoprogramming, find new information needs, and improve the project.',
  genesis:
    'Genesis autonomous-engineering engine (DeepSeek "Genesis" share -> UltraIa port): parse and validate an executable Genesis Project Manifest, evaluate its quality gates (build/test/coverage/lint/typecheck/security/docs), check the autonomous stop conditions (stable release, approval, safety boundary, repair budget, missing info, ambiguous repo, destructive confirmation, quality unsatisfied, autonomy budget), prioritize tasks with the Genesis formula (business_value x technical_impact x risk_reduction x dependency_criticality x confidence), and compute the next highest-value validated engineering action (the FINAL PRINCIPLE). Deterministic, keyless, offline. Acciones: validate | gates | prioritize | stop | next | plan | run | eval. Use to drive or audit an autonomous software-engineering loop and to make the project self-improving via a declarative manifest contract.',
  vault:
    'Own repository (UltraIa vault): manage the local+cloud repository that stores data, files, creations, tests and prototypes (.ultraia/vault/<kind>/ with manifest). Actions: plan (classify into data/files/creations/tests/prototypes/pdfs + canonical path + mime), manifest (index with counts), search (score-based), summary (by kind/source), sync (diff vs cloud), export_github (optional, fail-soft without token). Deterministic, keyless. Use to persist what the project learns, creates and proves.',
  pdfsearch:
    'PDF search: OpenAlex (keyless, open-access papers with PDF) + DuckDuckGo filetype:pdf, dedupe by URL, direct .pdf marking; harvest hits into vault/pdfs entries (kind pdfs, meta url/query/source). Fail-soft on network errors. Use to find documents/papers as PDFs and store them in the own repository.',
  qdrant_memory:
    'External persistent memory (Qdrant, SACD/NASA FASE 4): persist and query the verified-truth corpus (learning/truth/*.json) in a real Qdrant collection (memoria_experiencial, dense-4 vectors, Cosine) so knowledge survives across sessions and machines. Actions: plan (pure diff local vs remote), sync (ensure collection + upsert + delete retired), search (top-k by meaning with score + payload), stats (corpus + collection config + reachability). Deterministic ids (djb2) = idempotent upsert; keyless; fail-soft (never throws). Complements semantic_memory (in-process recall) with persistence.',
  kgraph:
    'Knowledge graph builder (graphify port, principios originales): build a cross-corpus knowledge graph from code + docs (code extracts symbol/file/import/call edges as EXTRACTED; docs infer concept/heading/co-occurrence edges as INFERRED). Actions: build (graph.json), report (GRAPH_REPORT.md with god nodes, surprising cross-type connections, suggested questions), svg (Dark Obsidian a11y diagram), analyze (degrees + surprising + questions). Deterministic, keyless, zero deps, never throws. Use to map a repo/notes corpus for retrieval and onboarding.',
  brainpage:
    'Persistent Markdown memory (brain.md port, principios originales): a durable, repo-native brain of pages, each with a rewritable compiled_truth plus an append-only timeline (chain of evidence). Actions: init (scaffold .ultraia/brainpage/ + BRAIN.md), create (new page id/category/title/summary), read, update (rewrites truth AND appends its rationale in one atomic write â€” truth can never change without a trace), append (timeline entry), list, reindex (index.json), lint (broken [[links]]). Deterministic, keyless, zero deps, path-traversal-safe. Use to persist decisions/constraints/learnings that outlive the session.',
  autopub:
    'AutoPub autonomous content factory (iter-90): one action runs the whole F1-F4 cycle â€” discover topic briefs (keyless RSS+DDG) -> TopicBrief queue -> top-N NUEVO -> deterministic content (Redactor/Guionista/guion_largo es/ar, optional edge-tts) -> per-channel package (captions/hashtags/visual/branding, 8 channels) -> Publications queue under the hybrid rule (text/blog auto-APPROVED; video/image DRAFT for human approval) -> optional publishDue. Actions: plan | run. Fail-soft per phase; reports in .ultraia/autopub/. Use to feed social channels and the blog autonomously.',
  security:
    'Security secret/leak scanner (cso skill port, automatable): deterministically detect leaked secrets and risky config in text, a single file, or a repo tree â€” AWS/GCP/Slack/GitHub/GitLab/Stripe/OpenAI keys, private-key blocks, JWTs, generic api_key/secret/password assignments, Bearer tokens, and committed real .env files (not .env.example). Pure, keyless, offline, fail-soft (never throws). Use to audit code, config or pasted snippets for secrets before committing or publishing.',
  codequality:
    'Static code-quality linter (UltraIa port, complementa security): deterministically detect common code smells in text, a file or a repo tree â€” debugger statements, eval/new Function, alert/prompt/confirm, `any`/`@ts-ignore` abuse, empty catch blocks, TODO/FIXME/HACK without an issue ref, hardcoded localhost/127.0.0.1 URLs, and stray console.log. Pure, keyless, offline, fail-soft (never throws). Use to keep the codebase clean before committing or in the self-improving loop.',
  deps:
    'Dependency vulnerability audit (SCA, UltraIa port, completa el trio code-health): run `npm audit --json` (or an injected runner for tests) and return a structured list of advisories â€” package name, severity, via, title, advisory URL and whether a fix is available â€” plus a fail-soft note when the audit cannot run. Pure parser is deterministic and offline-testable. Use to catch known CVEs in the dependency tree before shipping.',
  geometry:
    'Procedural geometry library (Gielis superformula family): build OBJECTS from pure math - superShape2D curves and superShape3D/Mobius parametric meshes with exact grid triangulation, mesh ops (transform/merge/stats) and structural validation. Exports standard glTF 2.0 (embedded base64 buffer, POSITION min/max per spec - loads in three.js/Blender) and Wavefront OBJ text. Deterministic byte-for-byte, keyless, zero deps. Complements the algebra/basic-shapes geometry module: use for parametric assets (stars, flowers, shells, non-orientable bands).',
  pngrender:
    'Procedural PNG renderer: real PNG encoder in pure TypeScript (node:zlib deflate level fixed -> byte-identical outputs). renderImage/renderImagePng turn any pixel(x,y)->RGB math function into an actual image; valuesToRgba maps generative fields (perlin/simplex/mandelbrot) through palettes (obsidian, neoViolet, fire, ice, mono); hslToRgb helper; atomic writes via tmp+rename. Deterministic, keyless. Use when images must come from code/math instead of an AI provider.',
  procvid:
    'Procedural video library: deterministic animations (plasma/waves/orbits/noise-flow/fractal-zoom/shape-morph) rendered frame-by-frame to real PNGs and assembled by a planned ffmpeg argv (libx264 yuv420p crf18 faststart; optional GIF palettegen/paletteuse). planProcVid validates guards (even dims <=1280, fps<=60, <=60s, <=1800 frames); renderFrames+writeManifest are idempotent; nothing executes inside tests. Use to produce loops/backgrounds/videos from pure code without generative AI.',
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
  | 'geom'
  | 'videoqa'
  | 'motion'
   | 'replica'
  | 'imaging'
  | 'creativo'
  | 'semantic_memory'
  | 'autolearn'
  | 'genesis'
  | 'vault'
  | 'pdfsearch'
  | 'qdrant_memory'
  | 'kgraph'
  | 'brainpage'
  | 'autopub'
  | 'security'
  | 'codequality'
  | 'deps'
  | 'geometry'
  | 'pngrender'
  | 'procvid';
