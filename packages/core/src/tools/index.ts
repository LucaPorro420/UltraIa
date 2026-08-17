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

export const tools = { web, image, video, music, stitch, reach, skills: { runSkill }, content, g0dm0d3, topics, present: presentTools, publish, enrutador, mediaScore, metrics, memoryFs: { createMemoryFs }, diagram, videoEdit, screenflow };

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
    'Distribution adapters (AutoPub F4): publish a final MP4 (9:16, <60s) to YouTube Shorts (resumable upload v3) and/or TikTok (Direct Post 2 steps) with bilingual es/ar metadata. Validates tokens first; fails soft with a clear reason when a platform is not configured. Use to ship finished video content to the channels.',
  publications:
    'Publication queue (AutoPub F4): create/list/approve/reject queued publications from PublicationPackages (auto-approves text/blog; video/image channels require human approval) and publish scheduled items that are due. Persisted in Prisma. Use to manage the content distribution pipeline end-to-end.',
  contenido:
    'Content router (AutoPub F2): converts a topic brief into ready-to-use content — written post (Redactor) or video script + storyboard (Guionista) — and writes a manifest.json to disk. Deterministic and keyless. Use to move from idea to content package.',
  memory:
    'Agent memory filesystem (Fable-5 pattern): structured memory across sessions — list/read/write/append/strReplace/delete with version guards (ifVersion), YAML frontmatter (name/description/sources/aliases) and [stated]/[observed]/[inferred] tagged lines. One file per subject (topics/, people/, areas/, preferences, profile). Use to persist what the user tells you and read it in later conversations.',
  metrics:
    'Publication metrics (AutoPub F5): channel KPIs (published/failed/pending counts, success rate, average pre-publication media score) and BAD-feedback signals from published posts, ready to feed the agent improvement pipeline. Use to measure and close the content loop.',
  diagram:
    'Editorial diagrams (diagram-design pattern): render self-contained, accessible HTML/SVG diagrams in the project design system (Dark Obsidian) — timeline (events on an axis), data-flow (pipeline steps), architecture (components + connections), loop (flywheel with write-back arcs). Anti-AI-slop geometry (coordinates divisible by 4, 1px hairlines, no shadows), role="img" + aria-labelledby, no JS, no external deps. Use to visualize pipelines, motion specs, roadmaps and architecture.',
  video_edit:
    'Video editing pipeline (video-use pattern): pack phrase-level transcripts into the compact takes_packed view the model reads, build and validate an EDL (cut safety: 30-200ms padding, silences >=150ms, no overlaps), generate the ffmpeg render command (per-segment extract with 30ms audio fades + color grade + lossless concat), self-evaluate the cut list deterministically (max 3 fix cycles), and render an on-demand timeline composite SVG (filmstrip + waveform + word labels). Keyless-first. Use to plan and produce video edits from transcripts and motion specs.',
  screenflow:
    'ScreenFlow pipeline (screen-recording automation): validate a declarative ActionScript (click/type/key/scroll/open_url/exec/screenshot/wait_selector/end), plan capture runs, generate the ffmpeg gdigrab capture argv (segmented, CRF 18, silent track fallback), build the local publishing package (.ultraia/recordings/<run-id>/: final.mp4 + master + webm + poster + manifest + report), schedule runs (schtasks/cron), and resolve continuation state (resume idempotente, retry max 3, fail-soft). Deterministic, keyless. Use to automate screen recording + actions + edit + local publish pipelines.',
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
  | 'screenflow';
