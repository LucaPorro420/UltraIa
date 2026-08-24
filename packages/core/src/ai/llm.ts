import { generateObject, generateText, streamText, tool, type LanguageModel, type Tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import type { AiGateway, ChatMessage, ChatTextInput, StructuredGenInput } from './gateway';
import { AiUnavailableError } from './gateway';
import { evaluate } from '../tools/calculator';
import { fetchWebContent } from '../tools/web';
import { generateImage } from '../tools/image';
import { generateVideo } from '../tools/video';
import { generateMusic } from '../tools/music';
import { generateUiScreen } from '../tools/stitch';
import { readWeb, searchWeb, searchGitHub, parseRss, videoInfo } from '../tools/reach';
import { searchMusic, searchSfx, mixkit } from '../tools/content';
import { runSkill } from '../tools/skills';
import { generateParseltongueVariants, computeAutoTuneParams, ultraplinian, godmodeClassic } from '../tools/g0dm0d3';
import { generateTopicBriefs } from '../tools/topics';
import { guardarBriefs, listarBriefs, marcarBriefProcesado, marcarBriefDescartado } from '../domain/briefs';
import { present } from '../tools/present';
import { createDefaultPublishers, publishToAll, buildBilingualMetadata } from '../tools/publish';
import { createHarness, type HarnessRuntime } from '../tools/harness';
import { analyzeChannel, planExperiments, buildPlaybook } from '../tools/growth';
import { planReframe, planUpscale, planLutMatch, planRotoscope, planDrawToEdit, planBroll } from '../tools/vfx';
import { planEffect, colorimetryAnalyze, curvatureShade, perspectivePlan, renderEffectHtml, EFFECT_KINDS } from '../tools/codevfx';
import { planTravelVideo, buildTakeManifest, buildTravelRender, replicateLandscape, travelLeadImage, type TravelPlan } from '../tools/travel';
import {
  perlinNoise,
  simplexNoiseField,
  mandelbrot,
  flowField,
  lSystem,
  valuesToSvg,
  valuesToSvgPalette,
  interpolateKeyframes,
  particleFrames,
  kenBurnsFrames,
  buildVideoPlan,
  synthWave,
  synthFm,
  synthGranular,
  synthPinkNoise,
  applyAdsr,
  sequenceNotes,
  mixSynths,
} from '../tools/generative';
import { researchSearch, searchArxiv, researchWeb, researchGitHub, fetchAndExtract } from '../tools/research';
import { classifyEnlaces, contentChecksum } from '../tools/enlaces';
import { buscarLibros, librosPorSeccion, categoriasLibros, validarPropuestaLibro } from '../tools/libros';
import { sdf } from '../tools/sdf';
import { geom, type GeomVec3 } from '../tools/geom';
import * as videoqa from '../tools/videoqa';
import * as motion from '../tools/motion';
import * as replica from '../tools/replica';
import * as imaging from '../tools/imaging';
import * as semanticMemory from '../tools/semantic-memory';
import * as autolearn from '../tools/autolearn';
import * as genesis from '../tools/genesis';
import * as genesisRunner from '../tools/genesis-runner';
import type { GenesisState, GenesisTask } from '../tools/genesis';
import * as autopub from '../tools/autopub';
import { runVaultTool, planVaultEntry, buildVaultManifest, vaultSearch, summarizeVault, planVaultSync, exportVaultToGitHub, VAULT_LAYOUT, VAULT_ROOT } from '../tools/vault';
import { runPdfsearchTool, searchOpenAlex, searchPdfWeb, planPdfHarvest, indexPdfEntry } from '../tools/pdfsearch';
import * as qdrantMemory from '../tools/qdrant-memory';
import * as kgraph from '../tools/kgraph';
import * as brainpage from '../tools/brainpage';
import * as geometry from '../tools/geometry';
import * as pngrender from '../tools/pngrender';
import * as procvid from '../tools/procvid';
import * as security from '../tools/security';
import * as codequality from '../tools/codequality';
import * as deps from '../tools/deps';
import * as creativo from '../tools/creativo';
import { createPublication, listPublications, approvePublication, rejectPublication, publishDue } from '../domain/publications';
import { generarContenido, type ContentPackage } from '../tools/enrutador';
import { computeChannelKpis, fetchChannelAnalytics } from '../tools/metrics';
import { publicationSignals } from '../domain/publications';
import { audioLibrary } from '../omag/audiolibrary';
import { createMemoryFs, type MemoryFs } from '../tools/memory-fs';
import { synthSound as synth } from '../omag/sound';
import { renderEditorialDiagram, DIAGRAM_KINDS, type DiagramKind } from '../tools/diagram';
import {
  packTranscript,
  buildEdl,
  renderFfmpeg,
  selfEvalEdl,
  timelineViewSvg,
  HARD_RULES,
  MAX_SELF_EVAL_ATTEMPTS,
} from '../tools/video-edit';
import {
  validateActionScript,
  planRuns,
  buildFfmpegCapture,
  buildOutputNaming,
  buildManifest,
  scheduleCmd,
  resolveState,
  MAX_RETRIES,
  MAX_RUN_DURATION_MIN,
  type RunState,
} from '../tools/screenflow';
import { cloudFilesTool, createCloudFilesHandler, LocalCloudAdapter, R2CloudAdapter, type CloudStorageAdapter } from '../tools/cloud';
import { join } from 'node:path';

const modelCache = new Map<string, LanguageModel>();

// --- Model request reliability: a hard timeout so a slow or unreachable local model
// (Ollama / LM Studio) can NEVER hang the browser stream forever. Node's global fetch already
// reuses keep-alive connections, so we only add the timeout here. ---
const PROVIDER_TIMEOUT_MS = Number(process.env.ULTRAIA_MODEL_TIMEOUT_MS || 120_000);

export const modelFetch: typeof fetch = (input, init) => {
  const signal = init?.signal ?? AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
  return fetch(input, { ...init, signal });
};

function googleModel(name: string): LanguageModel {
  if (!process.env.GOOGLE_API_KEY) {
    throw new AiUnavailableError(
      'GOOGLE_API_KEY is not set (ULTRAIA_PROVIDER=google). Get a free key at https://aistudio.google.com/apikey.',
    );
  }
  return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY, fetch: modelFetch })(name);
}

// Ollama serves an OpenAI-compatible API locally â€” fully free (Meta Llama, Microsoft Phi, etc.).
function ollamaModel(name: string): LanguageModel {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  const provider = createOpenAI({ baseURL, apiKey: 'ollama', compatibility: 'compatible', fetch: modelFetch });
  return provider(name);
}

// LM Studio serves an OpenAI-compatible API locally â€” fully free (Qwen, Llama, etc.).
function lmstudioModel(name: string): LanguageModel {
  const baseURL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
  const provider = createOpenAI({ baseURL, apiKey: 'lmstudio', compatibility: 'compatible', fetch: modelFetch });
  return provider(name);
}

function openaiModel(name: string): LanguageModel {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiUnavailableError(
      'OPENAI_API_KEY is not set. Add it to apps/web/.env (see .env.example) to enable agent design, evaluation and chat.',
    );
  }
  return createOpenAI({ apiKey: process.env.OPENAI_API_KEY, fetch: modelFetch })(name);
}

// DeepSeek is OpenAI-compatible: point the SDK at its base URL with a (free) key.
function deepseekModel(name: string): LanguageModel {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new AiUnavailableError(
      'DEEPSEEK_API_KEY is not set (ULTRAIA_PROVIDER=deepseek). Get a free key at https://platform.deepseek.com.',
    );
  }
  const provider = createOpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY,
    compatibility: 'compatible',
    fetch: modelFetch,
  });
  return provider(name);
}

/**
 * Resolve a LanguageModel by provider. Controlled by ULTRAIA_PROVIDER
 * (openai | google | ollama | lmstudio). Keeps the user's existing OpenAI path
 * as an option while defaulting to local Ollama (Llama/Phi) â€” free, no keys.
 */
function defaultNameFor(provider: ProviderName): string {
  switch (provider) {
    case 'google': return 'gemini-2.5-flash';
    case 'ollama': return 'llama3.1';
    case 'lmstudio': return 'qwen2.5-7b-instruct';
    case 'deepseek': return 'deepseek-chat';
    default: return 'gpt-4o-mini';
  }
}

function buildProvider(p: ProviderName, name: string): LanguageModel {
  switch (p) {
    case 'google': return googleModel(name);
    case 'ollama': return ollamaModel(name);
    case 'lmstudio': return lmstudioModel(name);
    case 'deepseek': return deepseekModel(name);
    case 'openai': return openaiModel(name);
  }
}

/**
 * Resolve a LanguageModel by provider (ULTRAIA_PROVIDER). Local-first: if the configured
 * provider is unavailable (e.g. missing API key) it falls back to Ollama then LM Studio so the
 * agent keeps working fully offline ("IA local sin intermediario"). Every provider request carries
 * a hard timeout via `modelFetch`, so a dead/slow model can never hang the UI stream.
 */
export function resolveModel(model?: string): LanguageModel {
  const primary = (process.env.ULTRAIA_PROVIDER || 'ollama') as ProviderName;
  const name = model || process.env.ULTRAIA_MODEL || defaultNameFor(primary);
  const direct = modelCache.get(`${primary}:${name}`);
  if (direct) return direct;
  return tryResolve(name, primary);
}

function tryResolve(name: string, primary: ProviderName): LanguageModel {
  const order: ProviderName[] = [primary];
  if (primary !== 'ollama') order.push('ollama');
  if (primary !== 'lmstudio') order.push('lmstudio');
  let lastErr: unknown;
  for (const p of order) {
    try {
      const built = buildProvider(p, name);
      modelCache.set(`${p}:${name}`, built);
      return built;
    } catch (e) {
      if (e instanceof AiUnavailableError) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new AiUnavailableError('No local model provider available (Ollama/LMStudio).');
}

export type ProviderName = 'openai' | 'google' | 'ollama' | 'lmstudio' | 'deepseek';

export class OpenAICompatibleGateway implements AiGateway {
  async generateStructured<T>(input: StructuredGenInput): Promise<T> {
    const { object } = await generateObject({
      model: resolveModel(input.model),
      system: input.system,
      prompt: input.prompt,
      schema: input.schema as z.ZodType<T>,
    });
    return object;
  }

  async chatText(input: ChatTextInput): Promise<string> {
    const { text } = await generateText({
      model: resolveModel(input.model),
      system: input.system,
      prompt: input.input,
    });
    return text;
  }
}

export function guardrailsBlock(guardrails: string[]): string {
  if (!guardrails.length) return '';
  return `\n\n## Guardrails\n${guardrails.map((g, i) => `${i + 1}. ${g}`).join('\n')}`;
}

/** Resuelve el adapter cloud en runtime: R2 (Worker) si estÃ¡ configurado, si no local. */
function resolveCloudAdapter(): CloudStorageAdapter {
  const workerUrl = process.env.CLOUDFLARE_R2_WORKER_URL;
  const token = process.env.CLOUDFLARE_R2_TOKEN;
  if (workerUrl && token) {
    return new R2CloudAdapter({
      baseUrl: workerUrl,
      token,
      publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
    });
  }
  return new LocalCloudAdapter(
    process.env.ULTRAIA_CLOUD_DIR ?? join(process.cwd(), '..', '..', '.ultraia', 'cloud'),
  );
}

export function chatStream(opts: {
  model?: string;
  system: string;
  messages: ChatMessage[];
  tools?: string[];
  onFinish?: (result: { text: string }) => void;
  /** Prisma client para tools con persistencia (publications). */
  db?: import('../db/client').Db;
  /** Memory filesystem de agente (Fable-5 pattern); si falta, efÃ­mero por request. */
  memoryFs?: MemoryFs | null;
}) {
  const tools: Record<string, Tool> = {};
  if (opts.tools?.includes('calculator')) {
    tools.calculator = tool({
      description:
        'Safely evaluate a mathematical expression. Supports + - * / % ^, parentheses, and functions sqrt, abs, round, floor, ceil, min, max, pow.',
      parameters: z.object({ expression: z.string().min(1).max(200) }),
      execute: async ({ expression }) => String(evaluate(expression)),
    });
  }
  if (opts.tools?.includes('web')) {
    tools.web = tool({
      description:
        'Fetch a public web page (website or non-private social post) and return its title, description, metadata and readable text. Use for current info, links, or grounding answers in real sources. Keyless.',
      parameters: z.object({ url: z.string().url() }),
      execute: async ({ url }) => fetchWebContent(url),
    });
  }
  if (opts.tools?.includes('image')) {
    tools.image = tool({
      description:
        'Generate a photoreal image from a text prompt using a free, keyless image model. Returns a hotlinkable image URL. Use when the task needs visuals or "recreating" a scene/photo.',
      parameters: z.object({
        prompt: z.string().min(1).max(2000),
        width: z.number().int().min(128).max(1792).optional(),
        height: z.number().int().min(128).max(1792).optional(),
        model: z.string().max(50).optional(),
      }),
      execute: async ({ prompt, width, height, model }) => generateImage({ prompt, width, height, model }),
    });
  }
  if (opts.tools?.includes('video')) {
    tools.video = tool({
      description:
        'Produce a sequence of photoreal frames (a video storyboard) from a text prompt. Keyless; returns a storyboard of image URLs. Use when the task needs video/motion.',
      parameters: z.object({ prompt: z.string().min(1).max(2000), frames: z.number().int().min(1).max(8).optional() }),
      execute: async ({ prompt, frames }) => generateVideo(prompt, { frames }),
    });
  }
  if (opts.tools?.includes('music')) {
    tools.music = tool({
      description:
        'Compose an original music piece (title, mood, key, tempo, structured sections, production notes) from a text prompt. Keyless; returns a composition. Use when the task needs music/audio.',
      parameters: z.object({ prompt: z.string().min(1).max(2000) }),
      execute: async ({ prompt }) => generateMusic(prompt),
    });
  }
  if (opts.tools?.includes('design')) {
    tools.design = tool({
      description:
        'Generate a high-fidelity UI screen/mockup from a text prompt using Google Stitch (free Google Labs). Returns a screenshot URL and an HTML URL. Use when the task is about building or designing interfaces/UI.',
      parameters: z.object({ prompt: z.string().min(1).max(2000) }),
      execute: async ({ prompt }) => generateUiScreen(prompt),
    });
  }
  if (opts.tools?.includes('reach')) {
    tools.reach_read = tool({
      description:
        'Read any public web page as clean text (Jina Reader). Use for current info, docs, articles, or grounding answers in real sources. Returns title, description and readable text.',
      parameters: z.object({ url: z.string().url(), maxLength: z.number().int().min(500).max(50000).optional() }),
      execute: async ({ url, maxLength }) => readWeb({ url, maxLength }),
    });
    tools.reach_search = tool({
      description:
        'Search the live web in real time (DuckDuckGo or Exa). Returns recent, factual results with titles, URLs and snippets. Use for anything current: news, prices, events, docs, or verifying facts from this year.',
      parameters: z.object({ query: z.string().min(1).max(200), maxResults: z.number().int().min(1).max(10).optional() }),
      execute: async ({ query, maxResults }) => searchWeb({ query, maxResults }),
    });
    tools.reach_github = tool({
      description:
        'Search public GitHub repositories by keyword (sorted by stars). Returns repo names, descriptions, star counts and languages.',
      parameters: z.object({ query: z.string().min(1).max(200), maxResults: z.number().int().min(1).max(10).optional() }),
      execute: async ({ query, maxResults }) => searchGitHub({ query, maxResults }),
    });
    tools.reach_rss = tool({
      description: 'Fetch and parse any RSS/Atom feed. Returns the feed title and recent items with links and descriptions.',
      parameters: z.object({ url: z.string().url(), maxItems: z.number().int().min(1).max(20).optional() }),
      execute: async ({ url, maxItems }) => parseRss({ url, maxItems }),
    });
    tools.reach_video = tool({
      description: 'Get YouTube video metadata (title, author, thumbnail) from a video URL via oEmbed.',
      parameters: z.object({ url: z.string().url() }),
      execute: async ({ url }) => videoInfo({ url }),
    });
  }
  if (opts.tools?.includes('skills')) {
    const skill = (kind: 'plan' | 'build' | 'test' | 'review' | 'ship' | 'simplify', label: string) =>
      tool({
        description: `${label}. Runs a step of the agent-development pipeline using the configured model and returns a structured Markdown artifact. Use when the task maps to ${label.toLowerCase()}.`,
        parameters: z.object({
          task: z.string().min(1).max(2000),
          context: z.string().max(4000).optional(),
        }),
        execute: async ({ task, context }) => runSkill(kind, { task, context }),
      });
    tools.skill_plan = skill('plan', 'Plan');
    tools.skill_build = skill('build', 'Build');
    tools.skill_test = skill('test', 'Test');
    tools.skill_review = skill('review', 'Review');
    tools.skill_ship = skill('ship', 'Ship');
    tools.skill_simplify = skill('simplify', 'Simplify');
  }
  if (opts.tools?.includes('content')) {
    tools.content_music = tool({
      description:
        'Search royalty-free music tracks (Tunetank, free, keyless). Returns tracks with artist, duration, BPM, genres/moods/themes and a preview URL. Use when the task needs background music for a video, podcast, reel or ad.',
      parameters: z.object({
        query: z.string().min(1).max(200),
        duration: z.number().int().min(1).max(1800).optional(),
        tolerance: z.number().int().min(1).max(120).optional(),
        maxResults: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ query, duration, tolerance, maxResults }) => searchMusic({ query, duration, tolerance, maxResults }),
    });
    tools.content_sfx = tool({
      description:
        'Search royalty-free sound effects (Tunetank, free, keyless). Returns SFX with duration and preview URL. Use when the task needs sound effects (whoosh, rain, ui click, transitions, ambience).',
      parameters: z.object({
        query: z.string().min(1).max(200),
        category: z.string().max(100).optional(),
        maxResults: z.number().int().min(1).max(30).optional(),
      }),
      execute: async ({ query, category, maxResults }) => searchSfx({ query, category, maxResults }),
    });
    tools.content_mixkit = tool({
      description:
        'Read a Mixkit page (free stock video, music, sound effects, templates, illustrations â€” no signup, no attribution). Pass a type like "free-music", "free-sound-effects" or "free-stock-video" (or a full URL) and get the assets listed on it. Use to discover downloadable assets for a content project.',
      parameters: z.object({
        type: z.string().min(1).max(200),
        maxLength: z.number().int().min(500).max(50000).optional(),
      }),
      execute: async ({ type, maxLength }) => mixkit({ type, maxLength }),
    });
  }
  if (opts.tools?.includes('audio')) {
    tools.audio_search = tool({
      description:
        'Search royalty-free audio (Tunetank, keyless) for music or SFX and return downloadable URLs. Use when the task needs real sound (music beds, effects, ambience) rather than synthesized ones.',
      parameters: z.object({
        query: z.string().min(1).max(200),
        kind: z.enum(['music', 'sfx']).optional(),
        maxResults: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ query, kind, maxResults }) => audioLibrary.search({ query, kind, maxResults }),
    });
    tools.audio_synth = tool({
      description:
        'Synthesize a procedural sound from nothing (no network, no ffmpeg): kinds are tone, noise, impact, whoosh, beat, ambience. Returns duration and kind; saves a WAV when a name is given. Use for UI sounds, transitions, foley and background beds without licensing.',
      parameters: z.object({
        kind: z.enum(['tone', 'noise', 'impact', 'whoosh', 'beat', 'ambience']),
        name: z.string().min(1).max(80).optional(),
        durationSec: z.number().min(0.05).max(30).optional(),
        freq: z.number().min(20).max(8000).optional(),
      }),
      execute: async ({ kind, name, durationSec, freq }) => {
        const result = name ? await audioLibrary.saveSynth(kind, name, { durationSec, freq }) : synth(kind, { durationSec, freq });
        return { kind: result.kind, durationSec: result.durationSec, sampleRate: result.sampleRate };
      },
    });
  }
  if (opts.tools?.includes('g0dm0d3')) {
    tools.g0_parseltongue = tool({
      description:
        'Generate input-perturbation variants of a query using Parseltongue obfuscation techniques (up to 33, tiers light/standard/heavy). Rewrites detected trigger words via leetspeak, unicode, morse, braille, base64, etc. Use to stress-test how a model handles adversarial or unusual input spellings.',
      parameters: z.object({
        query: z.string().min(1).max(2000),
        tier: z.enum(['light', 'standard', 'heavy']).optional(),
        customTriggers: z.array(z.string().min(1).max(50)).max(20).optional(),
      }),
      execute: async ({ query, tier, customTriggers }) =>
        generateParseltongueVariants(query, tier ?? 'standard', customTriggers).map((v) => ({
          text: v.text,
          technique: v.technique,
          label: v.label,
          tier: v.tier,
        })),
    });
    tools.g0_autotune = tool({
      description:
        'Detect the nature of a query (code, creative, analytical, security, legal, etc.) and return context-adaptive LLM sampling parameters (temperature, top_p, top_k, penalties). Use to tune generation quality for the task at hand.',
      parameters: z.object({
        message: z.string().min(1).max(2000),
        history: z.array(z.string().min(1).max(2000)).max(20).optional(),
        strategy: z.enum(['adaptive', 'precise', 'balanced', 'creative', 'chaotic']).optional(),
      }),
      execute: async ({ message, history, strategy }) =>
        computeAutoTuneParams(message, history ?? [], strategy ?? 'adaptive'),
    });
    tools.g0_ultraplinian = tool({
      description:
        'Evaluate a query through multiple parallel analysis angles (executive, technical, critic, synthesizer, teacher, analyst, strategist, researcher, practitioner, historian, futurist, balanced) using the configured model, score every response with the composite scorer and return the ranked results with grades (ELITE/EXCELLENT/GOOD/ACCEPTABLE/POOR). Use when you need the best of several candidate answers or a second opinion on quality.',
      parameters: z.object({
        query: z.string().min(1).max(2000),
        tier: z.enum(['fast', 'standard', 'smart', 'power', 'ultra']).optional(),
        model: z.string().max(100).optional(),
      }),
      execute: async ({ query, tier, model }) => {
        const result = await ultraplinian(query, tier ?? 'standard', model);
        return {
          winner: { id: result.winner.id, role: result.winner.role, text: result.winner.text, composite: result.winner.composite },
          ranked: result.results.map((r) => ({ id: r.id, role: r.role, text: r.text, composite: r.composite })),
          passes: result.passes,
          totalMs: result.totalMs,
        };
      },
    });
    tools.g0_godmode = tool({
      description:
        'Race 5 distinct answer styles (BOUNDARY, CONCISE, STRUCTURED, EXPLORATORY, FAST) in parallel through the configured model, score each response with the composite scorer and return the winner plus the ranked results. Use when you want the strongest of several differently-framed answers.',
      parameters: z.object({
        query: z.string().min(1).max(2000),
        model: z.string().max(100).optional(),
      }),
      execute: async ({ query, model }) => {
        const result = await godmodeClassic(query, model);
        return {
          winner: { codename: result.winner.combo.codename, text: result.winner.text, composite: result.winner.composite },
          ranked: result.results.map((r) => ({ codename: r.combo.codename, text: r.text, composite: r.composite })),
          totalMs: result.totalMs,
        };
      },
    });
  }
  if (opts.tools?.includes('topics')) {
    tools.topics_briefs = tool({
      description:
        'Generate prioritized content topic briefs (AutoPub F1) from RSS feeds and DuckDuckGo trend searches. Returns deduplicated briefs scored by novelty Ã— channel relevance, each with tema, canal (youtube_shorts/tiktok/instagram/blog), formato, tono, angulo and fuentes. Use to feed the content factory with recurring ready-to-write ideas.',
      parameters: z.object({
        fuentes: z
          .array(
            z.object({
              rss: z.string().url().optional(),
              search: z.string().min(1).max(200).optional(),
            }),
          )
          .max(10)
          .optional(),
        canales: z.array(z.enum(['youtube_shorts', 'tiktok', 'instagram', 'blog'])).max(4).optional(),
        maxBriefs: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ fuentes, canales, maxBriefs }) => generateTopicBriefs({ fuentes, canales, maxBriefs }),
    });
    if (opts.db) {
      tools.topics_queue = tool({
        description:
          'Persistent topic brief queue (AutoPub F1 tarea 4): save generated briefs (deduped by tema+canal), list the queue prioritized by score (filter by estado/canal), and mark briefs as processed or discarded. Use to persist ideas between runs and feed the content factory (F2) from the database.',
        parameters: z.object({
          accion: z.enum(['guardar', 'listar', 'marcar_procesado', 'marcar_descartado']),
          briefsJson: z.string().optional(), // JSON TopicBrief[] (para guardar)
          estado: z.enum(['NUEVO', 'PROCESADO', 'DESCARTADO', 'ALL']).optional(),
          canal: z.enum(['youtube_shorts', 'tiktok', 'instagram', 'blog']).optional(),
          id: z.string().optional(), // para marcar_procesado/descartado
          take: z.number().int().min(1).max(100).optional(),
        }),
        execute: async ({ accion, briefsJson, estado, canal, id, take }) => {
          switch (accion) {
            case 'guardar': {
              if (!briefsJson) throw new Error('guardar requiere briefsJson');
              const briefs = JSON.parse(briefsJson) as import('../tools/topics').TopicBrief[];
              return await guardarBriefs(opts.db!, briefs);
            }
            case 'listar':
              return await listarBriefs(opts.db!, { estado, canal, take });
            case 'marcar_procesado': {
              if (!id) throw new Error('marcar_procesado requiere id');
              return { estado: await marcarBriefProcesado(opts.db!, id) };
            }
            case 'marcar_descartado': {
              if (!id) throw new Error('marcar_descartado requiere id');
              return { estado: await marcarBriefDescartado(opts.db!, id) };
            }
            default:
              throw new Error(`accion desconocida: ${accion}`);
          }
        },
      });
    }
  }
  if (opts.tools?.includes('present')) {
    tools.present_package = tool({
      description:
        'Build a PublicationPackage from raw content (AutoPub F3): returns per-channel captions + hashtags (YouTube/TikTok/Instagram/blog), visual specs (9:16/1:1/16:9 with thumbnail), SRT subtitles for video, branding kit and suggested schedule. Use to adapt one piece of content into ready-to-publish packages per platform.',
      parameters: z.object({
        tema: z.string().min(1).max(300),
        contenido: z.string().min(1).max(8000),
        media: z.array(z.string().url()).max(20).optional(),
        canales: z.array(z.enum(['youtube_shorts', 'tiktok', 'instagram', 'blog'])).max(4).optional(),
        briefId: z.string().max(100).optional(),
        marca: z.string().max(100).optional(),
        branding: z
          .object({
            // QUÃ‰ ES: sobrescritura parcial del branding kit (F3 editable).
            // PARA QUÃ‰: el agente personaliza paleta/fuente/logo/acento del paquete.
            // POR QUÃ‰: aditivo y opcional â€” `present` hace merge sobre el kit base.
            marca: z.string().max(100).optional(),
            paleta: z.array(z.string().max(20)).max(10).optional(),
            fuente: z.string().max(50).optional(),
            logo: z.string().max(500).nullable().optional(),
            acento: z.string().max(20).optional(),
          })
          .optional(),
      }),
      execute: async ({ tema, contenido, media, canales, briefId, marca, branding }) =>
        present({ tema, contenido, media, canales, briefId, marca, branding }),
    });
  }
  if (opts.tools?.includes('publish')) {
    tools.publish_submit = tool({
      description:
        'Publish a finished MP4 (9:16, <60s) to the configured channels (AutoPub F4): YouTube Shorts, TikTok, X, Meta (Instagram Reels / Threads), Telegram, Discord and Slack, with bilingual es/ar metadata. Validates tokens first â€” fails soft with a clear reason when a platform is not configured. Returns one result per platform (ok/id/url or error).',
      parameters: z.object({
        videoPath: z.string().min(1).max(500),
        title: z.string().min(1).max(200),
        plainScript: z.string().max(4000).optional(),
        privacyStatus: z.enum(['public', 'private', 'unlisted']).optional(),
        toYoutube: z.boolean().optional(),
        toTiktok: z.boolean().optional(),
        toX: z.boolean().optional(),
        toInstagram: z.boolean().optional(),
        toThreads: z.boolean().optional(),
        toTelegram: z.boolean().optional(),
        toDiscord: z.boolean().optional(),
        toSlack: z.boolean().optional(),
        toLinkedIn: z.boolean().optional(),
      }),
      execute: async ({ videoPath, title, plainScript, privacyStatus, toYoutube, toTiktok, toX, toInstagram, toThreads, toTelegram, toDiscord, toSlack, toLinkedIn }) => {
        const metadata = { ...buildBilingualMetadata(title, plainScript), ...(privacyStatus ? { privacyStatus } : {}) };
        const adapters = createDefaultPublishers({ includeX: true, includeMeta: true, includeTelegram: true, includeDiscord: true, includeSlack: true });
        const selected = adapters.filter((a) => {
          switch (a.platform) {
            case 'youtube':
              return toYoutube !== false;
            case 'tiktok':
              return toTiktok !== false;
            case 'x':
              return toX !== false;
            case 'instagram':
              return toInstagram !== false;
            case 'threads':
              return toThreads !== false;
            case 'telegram':
              return toTelegram !== false;
            case 'discord':
              return toDiscord !== false;
            case 'slack':
              return toSlack !== false;
            case 'linkedin':
              return toLinkedIn !== false;
            default:
              return true;
          }
        });
        const results = await publishToAll(selected, { videoPath, metadata });
        return {
          results,
          ok: results.some((r) => r.ok),
          summary: results.map((r) => (r.ok ? `${r.platform}: ${r.url || r.id}` : `${r.platform}: ${r.error}`)).join(' | ') || 'no channels selected',
        };
      },
    });
  }
  if (opts.tools?.includes('harness')) {
    // runtime vivo de esta sesion de chat: se crea en boot(), se destruye en shutdown()
    let runtime: HarnessRuntime | null = null;
    tools.harness_manage = tool({
      description:
        'Agent harness runtime (everything-is-a-plugin, DeepSeek Harness pattern): boot a declarative plugin tree (tools/observers/schedulers with dependency order), run a task through the tools of active plugins, advance the tick clock (fires scheduled jobs), dump the runtime state, or shut it down (reversible effects unwind in reverse order, fail-soft). Deterministic and keyless. Use to compose agent runtimes declaratively and orchestrate plugin-driven execution.',
      parameters: z.object({
        accion: z.enum(['boot', 'run', 'tick', 'dump', 'shutdown']),
        pluginsJson: z.string().optional(), // arbol declarativo: [{id, kind?, dependsOn?, tools?: [{name, echo?}]}]
        tool: z.string().optional(), // para run
        argsJson: z.string().optional(), // para run
      }),
      execute: async ({ accion, pluginsJson, tool: toolName, argsJson }) => {
        // runtime PERSISTENTE por sesion de chat: boot() en una llamada, run/tick en las siguientes
        if (accion === 'boot') {
          if (!pluginsJson) throw new Error('boot requiere pluginsJson');
          const specs = JSON.parse(pluginsJson) as Array<{
            id: string;
            kind?: 'tool' | 'observer';
            dependsOn?: string[];
            tools?: Array<{ name: string; echo?: boolean }>;
          }>;
          const plugins = specs.map((s) => ({
            id: s.id,
            kind: s.kind ?? 'tool',
            dependsOn: s.dependsOn,
            activate: () => undefined,
            tools:
              s.tools && s.tools.length > 0
                ? Object.fromEntries(
                    s.tools.map((t) => [
                      t.name,
                      t.echo === false
                        ? (args: Record<string, unknown>) => ({ ok: true, result: args })
                        : (args: Record<string, unknown>) => ({ ok: true, result: args.value ?? null }),
                    ]),
                  )
                : undefined,
          }));
          runtime = createHarness({ plugins });
          const res = runtime.boot();
          return { accion, ok: res.ok, error: res.error };
        }
        if (!runtime) return { accion, ok: false, error: 'harness sin boot() en esta sesiÃ³n' };
        if (accion === 'run') {
          if (!toolName) throw new Error('run requiere tool');
          const args = argsJson ? JSON.parse(argsJson) : {};
          const res = runtime.run({ tool: toolName, args });
          return { accion, ...res };
        }
        if (accion === 'tick') {
          runtime.tick();
          return { accion, ok: true, tick: 'avanzado' };
        }
        if (accion === 'dump') return { accion, ok: true, runtime: runtime.dump() };
        if (accion === 'shutdown') {
          const res = runtime.shutdown();
          runtime = null;
          return { accion, ...res };
        }
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('vfx')) {
    tools.vfx_plan = tool({
      description:
        'VFX planning engine (Higgsfield DaVinci Resolve plugin principles): plan AI video operations deterministically and keyless â€” reframe (16:9 -> 9:16 crop windows that follow action centers with smooth pan, ffmpeg argv), upscale (1080p..8k ladder, lanczos vs generative), AI LUT match (grade presets warm-cinematic/neutral-punch/teal-orange/mono -> ffmpeg eq args), rotoscope (remove-background plan: keyframes, alpha, cleanup passes, cost), draw-to-edit (sketch -> video prompt with camera motion) and B-roll request builder (missing beat -> frame shape -> motion -> transition). Execution is delegated: ffmpeg renders via video_edit, generation via providers. Use to plan post-production operations before rendering.',
      parameters: z.object({
        accion: z.enum(['reframe', 'upscale', 'lut', 'rotoscope', 'draw', 'broll']),
        reframeJson: z.string().optional(), // {width,height,durSeg,centers:[{t,x01,y01,w01}],targetRatio?,pad?,maxPanPerSec?}
        upscaleJson: z.string().optional(), // {width,height,target?:1080p|1440p|4k|8k|2x|4x}
        lutJson: z.string().optional(), // {style:warm-cinematic|neutral-punch|teal-orange|mono|custom, hints?}
        rotoJson: z.string().optional(), // {durSeg,fps,mode?:keyframe|full,keyEveryFrames?}
        drawJson: z.string().optional(), // {style:lineart|scribble|colored-sketch|painterly, subject, motion?, aspect?}
        brollJson: z.string().optional(), // {missingBeat,frameShape,motionNeed,transition,durationSeg,style}
      }),
      execute: async ({ accion, reframeJson, upscaleJson, lutJson, rotoJson, drawJson, brollJson }) => {
        if (accion === 'reframe') {
          if (!reframeJson) throw new Error('reframe requiere reframeJson');
          return { accion, plan: planReframe(JSON.parse(reframeJson)) };
        }
        if (accion === 'upscale') {
          if (!upscaleJson) throw new Error('upscale requiere upscaleJson');
          return { accion, plan: planUpscale(JSON.parse(upscaleJson)) };
        }
        if (accion === 'lut') {
          if (!lutJson) throw new Error('lut requiere lutJson');
          return { accion, plan: planLutMatch(JSON.parse(lutJson)) };
        }
        if (accion === 'rotoscope') {
          if (!rotoJson) throw new Error('rotoscope requiere rotoJson');
          return { accion, plan: planRotoscope(JSON.parse(rotoJson)) };
        }
        if (accion === 'draw') {
          if (!drawJson) throw new Error('draw requiere drawJson');
          return { accion, plan: planDrawToEdit(JSON.parse(drawJson)) };
        }
        if (accion === 'broll') {
          if (!brollJson) throw new Error('broll requiere brollJson');
          return { accion, plan: planBroll(JSON.parse(brollJson)) };
        }
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('growth')) {
    tools.growth_plan = tool({
      description:
        'Channel growth engine (VidRush + Abacus.AI patterns): analyze a channel profile from samples of published videos (pacing, cut cadence, on-screen text density, hook length, thumbnail style), plan A/B experiments on ONE variable at a time (title/hook/thumbnail/duration/format â€” worst KPI first, capped), and build a per-channel playbook that compounds wins from engagement signals (victory = test beats control by >=5 KPI points). Deterministic, keyless. Use to model a channel, isolate what moves its metrics, and persist winning recommendations.',
      parameters: z.object({
        accion: z.enum(['profile', 'experiments', 'playbook']),
        muestrasJson: z.string().optional(), // para profile: [{duracionSeg, cortes, textoPantalla, hookChars}]
        kpisJson: z.string().optional(), // para experiments: {titulo?, hook?, thumbnail?, duracion?, formato?} 0-100
        maxExperimentos: z.number().int().min(1).max(5).optional(),
        canal: z.string().optional(), // para playbook
        signalsJson: z.string().optional(), // para playbook: [{canal, variable, variante, kpi}]
      }),
      execute: async ({ accion, muestrasJson, kpisJson, maxExperimentos, canal, signalsJson }) => {
        if (accion === 'profile') {
          if (!muestrasJson) throw new Error('profile requiere muestrasJson');
          const samples = JSON.parse(muestrasJson) as Array<{ duracionSeg: number; cortes: number; textoPantalla: boolean; hookChars: number }>;
          return { accion, perfil: analyzeChannel(samples) };
        }
        if (accion === 'experiments') {
          if (!kpisJson) throw new Error('experiments requiere kpisJson');
          const kpis = JSON.parse(kpisJson) as Record<string, number>;
          const perfil = muestrasJson ? analyzeChannel(JSON.parse(muestrasJson) as Array<{ duracionSeg: number; cortes: number; textoPantalla: boolean; hookChars: number }>) : undefined;
          return { accion, perfil, experimentos: planExperiments(perfil ?? { pacingAvgSeg: 0, cutCadence: 0, onScreenTextDensity: 0, hookLengthAvg: 0, thumbnailStyle: 'mixto' }, kpis, maxExperimentos) };
        }
        if (accion === 'playbook') {
          if (!canal || !signalsJson) throw new Error('playbook requiere canal + signalsJson');
          const signals = JSON.parse(signalsJson) as Array<{ canal: string; variable: 'titulo' | 'hook' | 'thumbnail' | 'duracion' | 'formato'; variante: 'control' | 'test'; kpi: number }>;
          return { accion, playbook: buildPlaybook(canal, signals) };
        }
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('semantic_memory')) {
    tools.memory_search = tool({
      description:
        'Semantic memory retrieval (SACD/NASA design -> UltraIa port): search verified learnings (learning/truth corpus) by MEANING, not keywords - sparse n-gram hashing + cosine similarity, top-k ranked hits with scores; or get corpus stats (total docs, sources, types). Deterministic, keyless, offline. Use to recall what UltraIa already verified before proposing solutions (meta-learning loop).',
      parameters: z.object({
        accion: z.enum(['search', 'stats']),
        query: z.string().optional(), // search: texto a recuperar semanticamente
        corpusJson: z.string().optional(), // casos de verdad alternativos: [{source?, cases:[{id, prompt, answer, type?, unit?}]}]
        k: z.number().int().min(1).max(20).optional(), // top-k resultados (default 5)
      }),
      execute: async ({ accion, query, corpusJson, k }) => {
        const docs = corpusJson
          ? semanticMemory.loadTruthCorpus(JSON.parse(corpusJson) as semanticMemory.TruthFileLike[])
          : (await semanticMemory.loadTruthAuto()).docs;
        if (accion === 'search') {
          if (!query) throw new Error('search requiere query');
          if (docs.length === 0) return { accion, hits: [], nota: 'corpus vacio: pasa corpusJson con los casos de verdad (learning/truth no encontrado)' };
          return { accion, query, hits: semanticMemory.searchTruth(docs, query, k ?? 5) };
        }
        if (accion === 'stats') {
          return { accion, stats: semanticMemory.corpusStats(docs), total: docs.length };
        }
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('autolearn')) {
    tools.autolearn_run = tool({
      description:
        'Auto-learning agent (self-programming loop): sense the project learning state (parse LEARNINGS.md lessons, scan verified truth stats), detect learning gaps (topics without verified truth, lessons not implemented, downloaded sources without RAZONAMIENTO analysis, pending backlog), prioritize improvement work with a simplified RICE score (impact x confidence / effort), generate the improvement plan (self-programmed: the agent writes its own plan with loop-piv pattern: goal, steps, files, scoped/FULL criteria, priority), and compute cycle KPIs (lessons, verified truth, open gaps, improvement rate). Deterministic, keyless, offline. Use to automate autoprogramming, find new information needs, and improve the project.',
      parameters: z.object({
        accion: z.enum(['scan', 'gaps', 'plan', 'metrics', 'mode_plan']),
        learningsText: z.string().optional(), // texto de LEARNINGS.md para scan/gaps/metrics
        truthDocsJson: z.string().optional(), // [{fuente?, tipo?, texto?}] para scan/gaps
        backlogText: z.string().optional(), // texto del backlog (STATE.md) para gaps
        sourcesJson: z.string().optional(), // ["sacd-nasa.md", ...] para gaps
        razonamientosJson: z.string().optional(), // ["RAZONAMIENTO-SACD.md", ...] para gaps
        implementedJson: z.string().optional(), // capabilities/tools registradas para gaps
        gapsJson: z.string().optional(), // gaps para plan (si no se pasan, se detectan)
        candidatesJson: z.string().optional(), // [{id, descripcion, impact, effort, confidence}] para plan
        objetivo: z.string().optional(), // para plan
        modo: z.enum(['P-P', 'P-B', 'L-T', 'S-D']).optional(), // para mode_plan
        archivosJson: z.string().optional(), // para mode_plan: archivos sugeridos
        prediccion: z.string().optional(), // para mode_plan
      }),
      execute: async ({ accion, learningsText, truthDocsJson, backlogText, sourcesJson, razonamientosJson, implementedJson, gapsJson, candidatesJson, objetivo, modo, archivosJson, prediccion }) => {
        const entries = learningsText ? autolearn.parseLearnings(learningsText) : [];
        const truthDocs = truthDocsJson ? (JSON.parse(truthDocsJson) as Array<{ fuente?: string; tipo?: string; texto?: string }>) : [];
        if (accion === 'scan') {
          const stats = autolearn.scanTruthStats(truthDocs);
          return {
            accion,
            lecciones: entries.length,
            leccionesRecientes: autolearn.countRecentLearnings(entries, 7),
            truth: stats,
          };
        }
        if (accion === 'metrics') {
          const gaps = gapsJson ? (JSON.parse(gapsJson) as unknown as autolearn.Gap[]) : [];
          return {
            accion,
            metrics: autolearn.learningMetrics({
              entries,
              truthCount: truthDocs.length,
              gaps,
              sourcesCount: sourcesJson ? (JSON.parse(sourcesJson) as string[]).length : 0,
            }),
          };
        }
        const gaps = gapsJson
          ? (JSON.parse(gapsJson) as unknown as autolearn.Gap[])
          : autolearn.detectGaps({
              learnings: entries,
              truth: truthDocs,
              backlog: backlogText ?? [],
              sources: sourcesJson ? (JSON.parse(sourcesJson) as string[]) : [],
              razonamientos: razonamientosJson ? (JSON.parse(razonamientosJson) as string[]) : [],
              implemented: implementedJson ? (JSON.parse(implementedJson) as string[]) : [],
            });
        if (accion === 'gaps') {
          return { accion, gaps };
        }
        if (accion === 'plan') {
          const candidates = candidatesJson
            ? (JSON.parse(candidatesJson) as autolearn.WorkCandidate[])
            : gaps.map((g, i) => ({
                id: `gap_${i}`,
                descripcion: g.descripcion,
                impact: g.kind === 'backlog_pendiente' ? 4 : 3,
                effort: g.kind === 'source_sin_analizar' ? 2 : 3,
                confidence: 0.8,
              }));
          const priorities = autolearn.prioritizeWork(candidates);
          return {
            accion,
            plan: autolearn.buildImprovementPlan({ gaps, priorities, objetivo }),
          };
        }
        if (accion === 'mode_plan') {
          if (!modo) throw new Error('mode_plan requiere modo (P-P | P-B | L-T | S-D)');
          const plan = autolearn.buildModePlan(modo, {
            archivos: archivosJson ? (JSON.parse(archivosJson) as string[]) : undefined,
            prediccion,
          });
          return { accion, modo, plan };
        }
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('genesis')) {
    tools.genesis_run = tool({
      description:
        'Genesis autonomous-engineering engine (DeepSeek "Genesis" share -> UltraIa port): parse and validate an executable Genesis Project Manifest, evaluate its quality gates (build/test/coverage/lint/typecheck/security/docs), check the autonomous stop conditions (stable release, approval, safety boundary, repair budget, missing info, ambiguous repo, destructive confirmation, quality unsatisfied, autonomy budget), prioritize tasks with the Genesis formula (business_value x technical_impact x risk_reduction x dependency_criticality x confidence), and compute the next highest-value validated engineering action (the FINAL PRINCIPLE). Deterministic, keyless, offline. Acciones: validate | gates | prioritize | stop | next | plan | run | eval | propose. Use to drive or audit an autonomous software-engineering loop and to make the project self-improving via a declarative manifest contract. `propose` emits a reviewable Markdown proposal (does NOT mutate the repo).',
      parameters: z.object({
        accion: z.enum(['validate', 'gates', 'prioritize', 'stop', 'next', 'plan', 'run', 'eval', 'propose']),
        manifestJson: z.string().optional(),
        tasksJson: z.string().optional(),
        stateJson: z.string().optional(),
        resultadosJson: z.string().optional(),
        objetivo: z.string().optional(),
      }),
      execute: async ({ accion, manifestJson, tasksJson, stateJson, resultadosJson, objetivo }) => {
        const manifest = manifestJson ? genesis.parseManifest(manifestJson) : null;
        if (accion === 'validate') {
          return { accion, parsed: manifest };
        }
        if (!manifest || !manifest.ok) {
          return { accion, ok: false, error: 'manifestJson requerido/invÃ¡lido' };
        }
        const m = manifest.manifest;
        if (accion === 'gates') {
          return { accion, gates: genesis.qualityGates(m), autonomyLevel: genesis.autonomyLevel(m) };
        }
        const state: GenesisState =
          (stateJson ? (JSON.parse(stateJson) as GenesisState) : { iterations: 0, repairAttempts: 0 });
        if (accion === 'stop') {
          return { accion, stop: genesis.checkStopConditions(state, m) };
        }
        const tasks = tasksJson ? (JSON.parse(tasksJson) as GenesisTask[]) : undefined;
        if (accion === 'prioritize') {
          return { accion, prioritized: genesis.prioritizeTasks(tasks ?? []) };
        }
        if (accion === 'next') {
          return { accion, next: genesis.nextEngineeringAction(m, state, tasks) };
        }
        if (accion === 'plan') {
          const plan = genesis.buildGenesisPlan(m, state, tasks);
          if (objetivo) plan.objetivo = objetivo;
          return { accion, plan };
        }
        if (accion === 'run') {
          const cycle = genesisRunner.runGenesisCycle(m, state, { tasks });
          return { accion, cycle };
        }
        if (accion === 'eval') {
          const results = resultadosJson
            ? (JSON.parse(resultadosJson) as Record<string, boolean>)
            : {};
          return { accion, verdict: genesis.evaluateGates(m, results) };
        }
        if (accion === 'propose') {
          const proposal = genesis.buildGenesisProposal({ manifest: m, state, tasks });
          return { accion, proposal: proposal.markdown, nextAction: proposal.nextAction, topTaskId: proposal.topTaskId };
        }
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('autopub')) {
    tools.autopub_run = tool({
      description:
        'AutoPub autonomous content factory (iter-90): run the full F1-F4 publishing cycle in ONE step â€” discover topic briefs (keyless RSS + DuckDuckGo), persist them to the TopicBrief queue with dedupe, take the top-N NUEVO briefs, generate content (deterministic Redactor/Guionista/guion_largo, es/ar, optional keyless edge-tts narration), build the per-channel publication package (captions/hashtags/visual/branding for up to 8 channels: youtube_shorts/tiktok/instagram/blog/telegram/discord/slack/facebook), enqueue Publications under the hybrid approval rule (text/blog auto-APPROVED; video/image channels DRAFT awaiting human approval), and optionally publish due APPROVED items via publishDue (fail-soft without channel tokens). Actions: plan (deterministic cycle preview, no side effects) | run (execute the cycle against Prisma; requires db). Cycle reports land in .ultraia/autopub/. Deterministic core, keyless-first, fail-soft per phase. Use to keep social feeds and the blog fed autonomously.',
      parameters: z.object({
        accion: z.enum(['plan', 'run']),
        configJson: z.string().optional(),
        disponibles: z.number().int().min(0).optional(),
      }),
      execute: async ({ accion, configJson, disponibles }) => {
        const parsed = autopub.parseAutopubConfig(configJson ? JSON.parse(configJson) : {});
        if (!parsed.ok) return { accion, ok: false, issues: parsed.issues, config: parsed.config };
        if (accion === 'plan') {
          return { accion, ok: true, plan: autopub.planAutopubCycle(parsed.config, disponibles ?? 0) };
        }
        if (!opts.db) return { accion, ok: false, error: 'opts.db requerido para la accion run' };
        const deps = autopub.defaultAutopubDeps(opts.db);
        const report = await autopub.runAutopubCycle(deps, parsed.config);
        return { accion, ok: report.ok, report };
      },
    });
  }
  if (opts.tools?.includes('vault')) {
    tools.vault_manage = tool({
      description:
        'Own repository (UltraIa vault, user request): manage the local+cloud repository that stores data, files, creations, tests and prototypes (.ultraia/vault/<kind>/). Actions: plan (classify an entry into data/files/creations/tests/prototypes/pdfs and compute canonical path + mime), manifest (build the vault index with counts), search (score-based retrieval across id/name/kind/source/meta), summary (aggregate counts/bytes by kind and source), sync (diff local entries vs cloud files under vault/ -> toUpload/toRemove), export_github (optional export to a GitHub repo via Contents API, fail-soft without token). Deterministic, keyless. Use to persist what the project learns/creates/proves instead of losing it.',
      parameters: z.object({
        accion: z.enum(['plan', 'manifest', 'search', 'summary', 'sync', 'export_github']),
        name: z.string().optional(), // plan: nombre del archivo
        sizeBytes: z.number().int().min(0).optional(), // plan
        source: z.string().optional(), // plan: origen (research/upload/generation/test/prototype/import/pdf)
        kind: z.enum(['data', 'files', 'creations', 'tests', 'prototypes', 'pdfs']).optional(), // plan: categorÃ­a forzada
        entriesJson: z.string().optional(), // manifest/search/summary/sync/export: [{id,kind,name,path,sizeBytes,mime,createdAt,source?,meta?}]
        query: z.string().optional(), // search
        cloudJson: z.string().optional(), // sync: [{path,name,type,sizeBytes,mime,updatedAt}]
        contentsJson: z.string().optional(), // export_github: {"vault/<path>": "base64 o texto"}
        repo: z.string().optional(), // export_github: owner/repo
        token: z.string().optional(), // export_github (o env GH_TOKEN/GITHUB_TOKEN)
        branch: z.string().optional(), // export_github
      }),
      execute: async (params) => runVaultTool(params),
    });
  }
  if (opts.tools?.includes('pdfsearch')) {
    tools.pdfsearch_search = tool({
      description:
        'PDF search (user request: search PDFs on the web and repositories): search OpenAlex (keyless, open-access papers with PDF) + DuckDuckGo filetype:pdf, dedupe by URL, mark direct .pdf hits; or harvest hits into vault/pdfs entries (kind pdfs, meta url/query/source) ready to persist in the own repository (vault_manage). Deterministic mapping; network adapters fail-soft (empty results on error). Use to find documents/papers as PDFs and store them in the vault.',
      parameters: z.object({
        accion: z.enum(['search', 'harvest']),
        query: z.string().min(1),
        maxResults: z.number().int().min(1).max(20).optional(),
        includeWeb: z.boolean().optional(), // search: false = solo OpenAlex
        hitsJson: z.string().optional(), // harvest: [{title,url,source,snippet,directPdf,year?}]
      }),
      execute: async (params) => runPdfsearchTool(params),
    });
  }
  if (opts.tools?.includes('qdrant_memory')) {
    tools.qdrant_memory_sync = tool({
      description:
        'External persistent memory (Qdrant, SACD/NASA FASE 4 â€” closes the iter-76 pending wiring): persist and query the verified-truth corpus (learning/truth/*.json) in a REAL Qdrant collection so knowledge survives across sessions and machines. Actions: plan (pure diff local corpus vs remote ids -> crear/actualizar/borrar/sinCambio, NO network), sync (ensure collection + upsert + delete retired, fail-soft), search (dense-4 embedding of the query -> top-k hits with score and payload), stats (corpus stats + collection config + reachability). Deterministic point ids (djb2 uint31) = idempotent upsert; keyless; never throws (fail-soft {ok:false, razon}). Use it to remember verified knowledge beyond the process, and memory_search for the in-process semantic recall.',
      parameters: z.object({
        accion: z.enum(['plan', 'sync', 'search', 'stats']),
        query: z.string().optional(), // search: texto a recuperar
        k: z.number().int().min(1).max(20).optional(), // search: top-k (default 5)
        url: z.string().optional(), // base URL de Qdrant (default http://127.0.0.1:6333)
        corpusJson: z.string().optional(), // corpus alternativo: [{source?, cases:[{id, prompt, answer, type?, unit?}]}]
        remoteIdsJson: z.string().optional(), // plan: ids ya presentes en Qdrant, p.ej. [123,456]
      }),
      execute: async ({ accion, query, k, url, corpusJson, remoteIdsJson }) => {
        const docs = corpusJson
          ? semanticMemory.loadTruthCorpus(JSON.parse(corpusJson) as semanticMemory.TruthFileLike[])
          : (await semanticMemory.loadTruthAuto()).docs;
        const client = qdrantMemory.createQdrantClient(url ?? qdrantMemory.QDRANT_DEFAULT_URL);
        if (accion === 'plan') {
          const remoteIds = remoteIdsJson ? (JSON.parse(remoteIdsJson) as number[]) : [];
          const plan = qdrantMemory.planMemorySync(docs, remoteIds);
          return {
            accion,
            total: docs.length,
            crear: plan.crear.length,
            actualizar: plan.actualizar.length,
            borrar: plan.borrar.length,
            sinCambio: plan.sinCambio,
          };
        }
        if (accion === 'sync') {
          const res = await qdrantMemory.syncMemoryToQdrant(client, docs);
          return { accion, ok: res.ok, total: docs.length, resumen: qdrantMemory.memorySyncSummary(res) };
        }
        if (accion === 'search') {
          if (!query) throw new Error('search requiere query');
          // dos etapas: candidatos por vector denso + rescoring con el coseno esparcido exacto
          const res = await qdrantMemory.searchExternalMemory(client, query, k ?? 5);
          return res.ok ? { accion, query, hits: res.data } : { accion, query, hits: [], error: res.razon };
        }
        if (accion === 'stats') {
          const existe = await client.collectionExists();
          return {
            accion,
            total: docs.length,
            corpus: semanticMemory.corpusStats(docs),
            coleccion: qdrantMemory.QDRANT_COLLECTION,
            vectorSize: qdrantMemory.QDRANT_VECTOR_SIZE,
            distancia: qdrantMemory.QDRANT_DISTANCE,
            url: client.baseUrl,
            disponible: existe.ok ? existe.data : false,
            razon: existe.ok ? undefined : existe.razon,
          };
        }
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('kgraph')) {
    tools.kgraph_build = tool({
      description:
        'Knowledge graph builder (graphify port, principios originales): build a cross-corpus knowledge graph from code + docs. Code extracts symbol/file/import/call edges as EXTRACTED; docs infer concept/heading/co-occurrence edges as INFERRED. Actions: build (returns graph.json: nodes+edges+analysis), report (GRAPH_REPORT.md text with god nodes, surprising cross-type connections, suggested questions), svg (Dark Obsidian a11y SVG diagram), analyze (degrees + surprising connections + suggested questions only). Deterministic, keyless, zero deps, never throws. Use to map a repo or notes corpus for retrieval and onboarding.',
      parameters: z.object({
        accion: z.enum(['build', 'report', 'svg', 'analyze']),
        filesJson: z
          .string()
          .optional()
          .describe('JSON array of {path, content, kind?} (kind: code|doc). Alternative to path.'),
        path: z
          .string()
          .optional()
          .describe('File or directory to scan (read via node:fs/promises). Alternative to filesJson.'),
      }),
      execute: async ({ accion, filesJson, path }) => {
        let files: kgraph.GraphInputFile[] = [];
        if (filesJson) {
          files = JSON.parse(filesJson) as kgraph.GraphInputFile[];
        } else if (path) {
          const fs = await import('node:fs/promises');
          const stat = await fs.stat(path);
          if (stat.isDirectory()) {
            const ents = await fs.readdir(path, { withFileTypes: true });
            for (const e of ents) {
              if (e.isFile()) {
                const fp = `${path.replace(/\/$/, '')}/${e.name}`;
                files.push({ path: fp, content: await fs.readFile(fp, 'utf8') });
              }
            }
          } else {
            files.push({ path, content: await fs.readFile(path, 'utf8') });
          }
        } else {
          throw new Error('kgraph_build requiere filesJson o path');
        }
        const graph = kgraph.buildGraph({ files });
        if (accion === 'build') return { accion, graph, json: kgraph.buildGraphJson(graph) };
        if (accion === 'report') return { accion, report: kgraph.buildGraphReport(graph) };
        if (accion === 'svg') return { accion, svg: kgraph.buildGraphSvg(graph) };
        if (accion === 'analyze') return { accion, analysis: kgraph.analyzeGraph(graph) };
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('brainpage')) {
    tools.brainpage_manage = tool({
      description:
        'Persistent Markdown memory (brain.md port, principios originales): a durable, repo-native brain of pages, each with a rewritable compiled_truth plus an append-only timeline (chain of evidence). updateTruth rewrites the truth AND appends its rationale in one atomic write, so the understanding can never change without a trace. Actions: init (scaffold .ultraia/brainpage/ + BRAIN.md), create (new page id/category/title/summary), read (page by id), update (rewrite truth + append timeline), append (timeline entry), list (page ids), reindex (index.json with metadata), lint (broken [[links]]). Deterministic, keyless, zero deps, path-traversal-safe. Use to persist decisions/constraints/learnings that outlive the session.',
      parameters: z.object({
        accion: z.enum(['init', 'create', 'read', 'update', 'append', 'list', 'reindex', 'lint']),
        root: z
          .string()
          .optional()
          .describe('Brain root dir (default .ultraia/brainpage). Writes to disk via node:fs/promises.'),
        id: z.string().optional().describe('Page id (create/read/update/append).'),
        category: z.enum(['decision', 'architecture', 'constraint', 'learning', 'fact']).optional(),
        title: z.string().optional().describe('Page title (create).'),
        summary: z.string().optional().describe('Truth/summary text (create/update/append).'),
        kind: z.string().optional().describe('Timeline entry kind (append) or updateTruth override.'),
        now: z.string().optional().describe('Fixed ISO timestamp for deterministic writes/tests.'),
      }),
      execute: async ({ accion, root, id, category, title, summary, kind, now }) => {
        const r = brainpage.resolveBrainRoot(root);
        if (accion === 'init') return { accion, result: await brainpage.initBrain(r) };
        if (accion === 'list') return { accion, result: await brainpage.listPages(r) };
        if (accion === 'reindex') return { accion, result: await brainpage.reindex(r) };
        if (accion === 'lint') return { accion, result: await brainpage.lintLinks(r) };
        if (!id) throw new Error('accion requiere id');
        const nid = brainpage.normalizeId(id);
        if (!nid) throw new Error('id invalido');
        if (accion === 'create') {
          if (!category || !title || !summary) throw new Error('create requiere category, title y summary');
          return {
            accion,
            result: await brainpage.createPage(r, { id: nid, category, title, summary, now }),
          };
        }
        if (accion === 'read') return { accion, result: await brainpage.readPage(r, nid) };
        if (accion === 'update') {
          if (!summary) throw new Error('update requiere summary');
          return { accion, result: await brainpage.updateTruth(r, nid, summary, { kind, now }) };
        }
        if (accion === 'append') {
          if (!summary) throw new Error('append requiere summary');
          return { accion, result: await brainpage.appendTimeline(r, nid, kind ?? 'note', summary, now) };
        }
        throw new Error('accion desconocida');
      },
    });
  }
  if (opts.tools?.includes('security')) {
    tools.security_scan = tool({
      description:
        'Security secret/leak scanner (cso skill port, automatable): deterministically detect leaked secrets and risky config in text, a single file, or a repo tree â€” AWS/GCP/Slack/GitHub/GitLab/Stripe/OpenAI keys, private-key blocks, JWTs, generic api_key/secret/password assignments, Bearer tokens, and committed real .env files (not .env.example). Pure, keyless, offline, fail-soft (never throws). Use to audit code, config or pasted snippets for secrets before committing or publishing.',
      parameters: z.object({
        text: z.string().optional().describe('Raw text to scan (paste a snippet).'),
        path: z.string().optional().describe('Single file path to scan (fail-soft per file).'),
        rootDir: z
          .string()
          .optional()
          .describe('Repo root to walk recursively (skips node_modules/.git/.next/.ultraia and binaries).'),
        maxBytes: z.number().int().optional().describe('Max bytes per file (default 512 KiB).'),
      }),
      execute: async ({ text, path, rootDir, maxBytes }) => {
        const opts = maxBytes ? { maxBytes } : {};
        if (text != null) {
          const f = security.scanText(text);
          return { count: f.length, findings: f };
        }
        if (path) {
          const f = security.scanFile(path, opts);
          return { count: f.length, findings: f };
        }
        if (rootDir) {
          const f = security.scanRepo(rootDir, opts);
          return { count: f.length, findings: f };
        }
        return { ok: false, error: 'text, path o rootDir requerido' };
      },
    });
  }
  if (opts.tools?.includes('codequality')) {
    tools.codequality_scan = tool({
      description:
        'Static code-quality linter (UltraIa port, complementa security): deterministically detect common code smells in text, a single file, or a repo tree â€” debugger statements, eval/new Function, alert/prompt/confirm, `any`/`@ts-ignore` abuse, empty catch blocks, TODO/FIXME/HACK without an issue ref, hardcoded localhost/127.0.0.1 URLs, and stray console.log. Pure, keyless, offline, fail-soft (never throws). Use to keep the codebase clean before committing or in the self-improving loop.',
      parameters: z.object({
        text: z.string().optional().describe('Raw text to scan (paste a snippet).'),
        path: z.string().optional().describe('Single source file to scan (fail-soft per file).'),
        rootDir: z
          .string()
          .optional()
          .describe('Repo root to walk recursively (skips node_modules/.git/.next/.ultraia, source exts only).'),
        maxBytes: z.number().int().optional().describe('Max bytes per file (default 512 KiB).'),
      }),
      execute: async ({ text, path, rootDir, maxBytes }) => {
        const opts = maxBytes ? { maxBytes } : {};
        if (text != null) {
          const f = codequality.cqScanText(text);
          return { count: f.length, findings: f };
        }
        if (path) {
          const f = codequality.cqScanFile(path, opts);
          return { count: f.length, findings: f };
        }
        if (rootDir) {
          const f = codequality.cqScanRepo(rootDir, opts);
          return { count: f.length, findings: f };
        }
        return { ok: false, error: 'text, path o rootDir requerido' };
      },
    });
  }
  if (opts.tools?.includes('deps')) {
    tools.deps_audit = tool({
      description:
        'Dependency vulnerability audit (SCA, UltraIa port): run `npm audit --json` (or an injected runner for tests) and return a structured list of advisories â€” package name, severity, via, title, advisory URL and whether a fix is available â€” plus a fail-soft note when the audit cannot run. Use to catch known CVEs in the dependency tree before shipping.',
      parameters: z.object({
        cwd: z.string().optional().describe('Working dir to run the audit in (default process.cwd()).'),
      }),
      execute: async ({ cwd }) => {
        const result = await deps.auditDeps({ cwd });
        return result;
      },
    });
  }
  if (opts.tools?.includes('codevfx')) {
    tools.vfx_code = tool({
      description:
        'Code-driven visual effects engine (Elemental Sandbox pattern, 100% code â€” no assets, no textures): plan a procedural effect (fire/ice/lightning/meteor/beam/ground/void/plasma/frost) with palette, physics, particles and hand-written GLSL, analyze colorimetry of a palette (HSL warmth/saturation coherence), compute curvature shading of a surface, plan camera perspective with parallax layer offsets, and render a self-contained HTML5 canvas demo. Deterministic, keyless. Use to design VFX scenes purely from math.',
      parameters: z.object({
        accion: z.enum(['plan', 'colorimetria', 'curvatura', 'perspectiva', 'render']),
        kind: z.enum(EFFECT_KINDS).optional(), // para plan/render
        opcionesJson: z.string().optional(), // para plan/render: {intensity, speed, width, height, title}
        coloresJson: z.string().optional(), // para colorimetria: ["#ff6b35", ...]
        hex: z.string().optional(), // para curvatura: color base
        curvatura: z.number().min(0).max(1).optional(), // 0 plano .. 1 muy curvo
        capas: z.number().int().min(1).max(8).optional(), // para perspectiva
        distancia: z.number().min(1).max(100).optional(), // para perspectiva
      }),
      execute: async ({ accion, kind, opcionesJson, coloresJson, hex, curvatura, capas, distancia }) => {
        const opts = opcionesJson ? (JSON.parse(opcionesJson) as Record<string, unknown>) : {};
        switch (accion) {
          case 'plan': {
            if (!kind) throw new Error('plan requiere kind');
            return { accion, plan: planEffect(kind, opts) };
          }
          case 'colorimetria': {
            if (!coloresJson) throw new Error('colorimetria requiere coloresJson');
            return { accion, reporte: colorimetryAnalyze(JSON.parse(coloresJson) as string[]) };
          }
          case 'curvatura': {
            if (!hex) throw new Error('curvatura requiere hex');
            return { accion, resultado: curvatureShade(hex, curvatura ?? 0.5) };
          }
          case 'perspectiva': {
            return { accion, plan: perspectivePlan(capas ?? 3, { distance: distancia }) };
          }
          case 'render': {
            if (!kind) throw new Error('render requiere kind');
            const plan = planEffect(kind, opts);
            return { accion, plan, html: renderEffectHtml(plan, opts) };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('travel')) {
    tools.travel_plan = tool({
      description:
        'Travel video engine ("tomas de paisajes"): plan a 9:16 travel video from a destination (hook + 3-7 scenes with camera MOTIONS + bilingual es/ar narration + CTA), persist a saved landscape take manifest (.ultraia/travel/tomas/<slug>/), build the deterministic ffmpeg render pipeline (Ken Burns zoompan + chained xfade + narration TTS + BGM -> travel-<slug>.mp4), replicate a landscape as N prompt variations (time x weather x lens, Pollinations keyless URLs), and build the lead image URL of a plan. Deterministic, keyless. Use to turn saved landscape references (e.g. IG stories of landscapes) into automated travel videos.',
      parameters: z.object({
        accion: z.enum(['plan', 'toma', 'render', 'replicar', 'lead']),
        destino: z.string().min(1).max(100).optional(), // para plan
        idioma: z.enum(['es', 'ar']).optional(),
        estilo: z.enum(['aventura', 'relax', 'cultura', 'naturaleza']).optional(),
        duracionSeg: z.number().int().min(30).max(60).optional(),
        escenas: z.number().int().min(3).max(7).optional(),
        tomaJson: z.string().optional(), // para toma: {fuente, lugar, descripcion, tags[], tipo?, guardadoEn?}
        planJson: z.string().optional(), // para render/lead: TravelPlan serializado
        opcionesJson: z.string().optional(), // para render: {imagenesDir, narracionMp3, bgmMp3, outFile}; para replicar: {variaciones, seed}
        promptBase: z.string().optional(), // para replicar
      }),
      execute: async ({ accion, destino, idioma, estilo, duracionSeg, escenas, tomaJson, planJson, opcionesJson, promptBase }) => {
        switch (accion) {
          case 'plan': {
            if (!destino) throw new Error('plan requiere destino');
            return { accion, plan: planTravelVideo(destino, { idioma, estilo, duracionSeg, escenas }) };
          }
          case 'toma': {
            if (!tomaJson) throw new Error('toma requiere tomaJson');
            return { accion, manifest: buildTakeManifest(JSON.parse(tomaJson)) };
          }
          case 'render': {
            if (!planJson) throw new Error('render requiere planJson');
            const plan = JSON.parse(planJson) as TravelPlan;
            const opts = opcionesJson ? (JSON.parse(opcionesJson) as Record<string, unknown>) : {};
            const render = buildTravelRender(plan, {
              imagenesDir: opts.imagenesDir as string | undefined,
              narracionMp3: opts.narracionMp3 === undefined ? null : (opts.narracionMp3 as string | null),
              bgmMp3: opts.bgmMp3 === undefined ? null : (opts.bgmMp3 as string | null),
              outFile: opts.outFile as string | undefined,
            });
            return { accion, pasos: render.pasos, argv: render.argv, renderSh: render.renderSh, manifest: render.manifest };
          }
          case 'replicar': {
            if (!promptBase) throw new Error('replicar requiere promptBase');
            const opts = opcionesJson ? (JSON.parse(opcionesJson) as { variaciones?: number; seed?: number }) : {};
            return { accion, replicas: replicateLandscape(promptBase, opts) };
          }
          case 'lead': {
            if (!planJson) throw new Error('lead requiere planJson');
            const plan = JSON.parse(planJson) as TravelPlan;
            const opts = opcionesJson ? (JSON.parse(opcionesJson) as { width?: number; height?: number; seed?: number }) : {};
            return { accion, imagen: travelLeadImage(plan, opts) };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('generative')) {
    tools.generative_media = tool({
      description:
        'Procedural media generation engine (game-engine style, 100% code â€” no assets, no models, no network): images from math (perlin/simplex noise fields, mandelbrot fractals, flow fields, L-systems -> self-contained SVG), video motion (keyframe interpolation, particle simulations, Ken Burns camera windows, multi-scene video plans) and audio synthesis (waves, FM, granular, pink noise, ADSR, BPM sequencer, mixing -> PCM/WAV). Fully deterministic (seeded, checksums). Use to generate visual/audio assets entirely in code.',
      parameters: z.object({
        medio: z.enum(['imagen', 'video', 'audio']),
        accion: z.enum([
          'perlin',
          'simplex',
          'mandelbrot',
          'flujo',
          'lsystem',
          'svg',
          'keyframes',
          'particulas',
          'kenburns',
          'video_plan',
          'onda',
          'fm',
          'granular',
          'ruido_rosa',
          'adsr',
          'secuencia',
          'mix',
        ]),
        ancho: z.number().int().min(1).max(1024).optional(),
        alto: z.number().int().min(1).max(1024).optional(),
        opcionesJson: z.string().optional(), // seed/scale/octaves/zoom/fps/gravedad/frecuencias/bpm...
        patronJson: z.string().optional(), // para lsystem {axioma, reglas, iteraciones} y secuencia {pattern[]}
        keyframesJson: z.string().optional(), // para keyframes [{t, value[]}]
      }),
      execute: async ({ medio, accion, ancho, alto, opcionesJson, patronJson, keyframesJson }) => {
        const opts = opcionesJson ? (JSON.parse(opcionesJson) as Record<string, any>) : {};
        const w = ancho ?? 128;
        const h = alto ?? 128;
        switch (accion) {
          case 'perlin':
            return { accion, checksum: undefined, campo: Array.from(perlinNoise(w, h, opts)) };
          case 'simplex':
            return { accion, campo: Array.from(simplexNoiseField(w, h, opts)) };
          case 'mandelbrot':
            return { accion, campo: Array.from(mandelbrot(w, h, opts)) };
          case 'flujo':
            return { accion, campo: Array.from(flowField(w, h, opts)) };
          case 'lsystem': {
            const p = patronJson ? (JSON.parse(patronJson) as { axioma?: string; reglas?: Record<string, string>; iteraciones?: number }) : {};
            const s = lSystem(p.axioma ?? 'F', p.reglas ?? { F: 'F+F--F+F' }, p.iteraciones ?? 3);
            return { accion, cadena: s, checksum: contentChecksum(s) };
          }
          case 'svg': {
            const field = opts.fuente === 'mandelbrot' ? mandelbrot(w, h, opts) : perlinNoise(w, h, opts);
            const paleta = opts.paleta as string[] | undefined;
            const svg = paleta ? valuesToSvgPalette(field, w, h, paleta, opts) : valuesToSvg(field, w, h, opts);
            return { accion, svg };
          }
          case 'keyframes': {
            const kfs = keyframesJson ? (JSON.parse(keyframesJson) as Array<{ t: number; value: number[] }>) : [{ t: 0, value: [0] }, { t: 1, value: [1] }];
            const t = opts.t ?? 0.5;
            return { accion, valores: interpolateKeyframes(kfs, t, opts.metodo === 'cubic' ? 'cubic' : 'linear') };
          }
          case 'particulas':
            return { accion, frames: particleFrames({ ...opts, count: opts.count ?? 32, steps: opts.steps ?? 24 }) };
          case 'kenburns':
            return { accion, frames: kenBurnsFrames(opts.duracion ?? 3, opts.fps ?? 30, opts) };
          case 'video_plan': {
            const escenas = opts.escenas as Array<{ durationSec: number; label?: string; camera?: Record<string, unknown> }> | undefined;
            if (!escenas || escenas.length === 0) throw new Error('video_plan requiere escenas[{durationSec,label?}]');
            const plan = buildVideoPlan(escenas, { fps: opts.fps ?? 30, width: opts.width ?? 1920, height: opts.height ?? 1080 });
            return { accion, fps: plan.fps, escenas: plan.sceneRanges, checksum: plan.checksum, frames: plan.frames.length };
          }
          case 'onda': {
            const r = synthWave({ ...opts, durationSec: opts.duracion ?? 1 });
            return { accion, kind: r.kind, duracionSec: r.durationSec, samples: r.pcm.length, checksum: undefined, pcm: Array.from(r.pcm.slice(0, 512)) };
          }
          case 'fm': {
            const r = synthFm({ ...opts, durationSec: opts.duracion ?? 1 });
            return { accion, kind: r.kind, duracionSec: r.durationSec, samples: r.pcm.length, pcm: Array.from(r.pcm.slice(0, 512)) };
          }
          case 'granular': {
            const r = synthGranular({ ...opts, durationSec: opts.duracion ?? 1.5 });
            return { accion, kind: r.kind, duracionSec: r.durationSec, samples: r.pcm.length, pcm: Array.from(r.pcm.slice(0, 512)) };
          }
          case 'ruido_rosa': {
            const r = synthPinkNoise({ ...opts, durationSec: opts.duracion ?? 1.5 });
            return { accion, kind: r.kind, duracionSec: r.durationSec, samples: r.pcm.length, pcm: Array.from(r.pcm.slice(0, 512)) };
          }
          case 'adsr': {
            const base = synthWave({ ...opts, durationSec: opts.duracion ?? 1 });
            const r = applyAdsr(base, opts);
            return { accion, kind: r.kind, duracionSec: r.durationSec, samples: r.pcm.length, pcm: Array.from(r.pcm.slice(0, 512)) };
          }
          case 'secuencia': {
            const p = patronJson ? (JSON.parse(patronJson) as { pattern: Array<{ step: number; freq: number; type?: string }> }) : { pattern: [{ step: 0, freq: 220 }] };
            const r = sequenceNotes({ ...opts, pattern: p.pattern.map((n) => ({ ...n, type: n.type as 'sine' | 'square' | 'saw' | 'triangle' | undefined })) });
            return { accion, kind: r.kind, duracionSec: r.durationSec, samples: r.pcm.length, pcm: Array.from(r.pcm.slice(0, 512)) };
          }
          case 'mix': {
            const partes = opts.partes as Array<{ tipo: string; freq?: number; duracion?: number; type?: string }> | undefined;
            const results = (partes ?? []).map((p) => synthWave({ freq: p.freq, durationSec: p.duracion, type: p.type as never }));
            const r = mixSynths(results.length ? results : [synthWave({}), synthFm({})]);
            return { accion, kind: r.kind, duracionSec: r.durationSec, samples: r.pcm.length, pcm: Array.from(r.pcm.slice(0, 512)) };
          }
          default:
            return { accion, ok: false, error: `accion ${accion} no soportada para ${medio}` };
        }
      },
    });
  }
  // QUARANTINED #25 restored 18/08: research.ts/enlaces.ts existen y pasan tests â€” registros activos.
  if (opts.tools?.includes('research')) {
    tools.research_search = tool({
      description:
        'Knowledge research engine: search arXiv papers (Atom API), GitHub repositories and the live web (Exa when EXA_API_KEY is set, DuckDuckGo keyless), and fetch-and-extract any URL as clean text via r.jina.ai. Cross-source URL dedupe + in-memory cache. Fail-soft, keyless-first. Use to gather verifiable knowledge (papers, repos, docs) to feed the learning/truth memory.',
      parameters: z.object({
        accion: z.enum(['arxiv', 'web', 'github', 'fetch', 'buscar']),
        query: z.string().min(1).max(200).optional(),
        url: z.string().url().optional(),
        maxResults: z.number().int().min(1).max(20).optional(),
        fuentes: z.string().optional(), // "arxiv,web,github" para accion buscar
      }),
      execute: async ({ accion, query, url, maxResults, fuentes }) => {
        switch (accion) {
          case 'arxiv': {
            if (!query) throw new Error('arxiv requiere query');
            const r = await searchArxiv(query, { maxResults });
            return { accion, query, items: r.items };
          }
          case 'web': {
            if (!query) throw new Error('web requiere query');
            const r = await researchWeb(query, { maxResults });
            return { accion, query, items: r.items };
          }
          case 'github': {
            if (!query) throw new Error('github requiere query');
            const r = await researchGitHub(query, { maxResults });
            return { accion, query, items: r.items };
          }
          case 'fetch': {
            if (!url) throw new Error('fetch requiere url');
            const r = await fetchAndExtract(url);
            return { accion, url, titulo: r.title, chars: r.chars, texto: r.text.slice(0, 4000) };
          }
          case 'buscar': {
            if (!query) throw new Error('buscar requiere query');
            const sources = fuentes ? (fuentes.split(',').map((s) => s.trim()) as Array<'arxiv' | 'web' | 'github'>) : undefined;
            const report = await researchSearch(query, { sources, maxResults });
            return { accion, query, items: report.items, deduped: report.deduped, fuentes: report.sources };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('enlaces')) {
    tools.enlaces_process = tool({
      description:
        'Link curation & knowledge integration: classify the project enlaces.txt (pending vs already processed via ## PROCESADO marks or learning/sources/<slug>.md presence), derive idempotent slugs per URL, and report the pending list ready for download. Deterministic, idempotent. Use to process new links and integrate external knowledge into the project.',
      parameters: z.object({
        accion: z.enum(['clasificar', 'checksum']),
        contenido: z.string().min(1).max(100_000).optional(), // contenido de enlaces.txt
        texto: z.string().optional(), // para checksum
      }),
      execute: async ({ accion, contenido, texto }) => {
        switch (accion) {
          case 'clasificar': {
            if (!contenido) throw new Error('clasificar requiere contenido de enlaces.txt');
            const out = classifyEnlaces(contenido, { checkDisk: false });
            return {
              accion,
              total: out.entries.length,
              pendientes: out.pending.map((e) => ({ linea: e.line, url: e.url, slug: e.slug })),
              procesados: out.processed.length,
            };
          }
          case 'checksum': {
            if (!texto) throw new Error('checksum requiere texto');
            return { accion, checksum: contentChecksum(texto) };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('libros')) {
    tools.libros_buscar = tool({
      description:
        'Free programming books catalog in Spanish (librosgratis.dev / midudev pattern): search 115 free books/tutorials across 32 sections with multi-term scoring (title 3 > author 2 > section 1, accents-insensitive), list books of a section, aggregate the 8 categories (Fundamentos/Desarrollo web/Lenguajes/Plataformas/Frameworks/Herramientas/Bases de datos/IA y datos), and validate a new resource proposal against the README rules (title >=3 chars, http(s) URL, author, format PDF/HTML/ePub/eBook, free + Spanish confirmation). Deterministic, keyless. Use to recommend free Spanish programming learning resources or check catalog proposals.',
      parameters: z.object({
        accion: z.enum(['buscar', 'seccion', 'categorias', 'proponer']),
        query: z.string().min(1).max(200).optional(), // para buscar: tÃ©rminos libres
        seccion: z.string().max(60).optional(), // para seccion/buscar: id o nombre de secciÃ³n
        formato: z.string().max(20).optional(), // para buscar: PDF/HTML/ePub/eBook (substring)
        max: z.number().int().min(1).max(115).optional(), // para buscar: lÃ­mite (default 20)
        propuestaJson: z.string().optional(), // para proponer: {titulo, autor, url, formato, gratis, espanol}
      }),
      execute: async ({ accion, query, seccion, formato, max, propuestaJson }) => {
        switch (accion) {
          case 'buscar': {
            if (!query) throw new Error('buscar requiere query');
            return { accion, total: buscarLibros(query, { seccion, formato, max }).length, libros: buscarLibros(query, { seccion, formato, max }) };
          }
          case 'seccion': {
            if (!seccion) throw new Error('seccion requiere seccion');
            const libros = librosPorSeccion(seccion);
            if (libros.length === 0) return { accion, seccion, libros: [], ok: false, error: 'seccion no encontrada' };
            return { accion, seccion, total: libros.length, libros };
          }
          case 'categorias':
            return { accion, categorias: categoriasLibros() };
          case 'proponer': {
            if (!propuestaJson) throw new Error('proponer requiere propuestaJson');
            const r = validarPropuestaLibro(JSON.parse(propuestaJson));
            return { accion, ...r };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('sdf')) {
    tools.sdf_render = tool({
      description:
        'Signed Distance Fields + ray marching (fundamentos-programacion.md A12-A13, Inigo Quilez pattern): plan a 3D SDF scene (primitives sphere/box/torus/capsule/plane, ops union/intersection/subtract/smooth), get GLSL reference code, a ray-march render plan (steps, 16:9 resolution, estimated ops per frame) or a self-contained HTML5 canvas render (2D software ray marching, drag to rotate, wheel to zoom, R reset, Dark Obsidian). Deterministic, keyless, offline. Use to visualize procedural 3D shapes as code or teach ray marching.',
      parameters: z.object({
        accion: z.enum(['plan', 'glsl', 'ray', 'html']),
        escenaJson: z.string().min(2).max(12000).optional(), // {primitives, ops?, root?, camera?, steps?}
        width: z.number().int().min(160).max(1920).optional(), // para html
        height: z.number().int().min(90).max(1080).optional(), // para html
      }),
      execute: async ({ accion, escenaJson, width, height }) => {
        const escena = escenaJson ? JSON.parse(escenaJson) : { primitives: [{ kind: 'sphere', pos: [0, 0, 0], color: '#8b5cf6', params: { radius: 1 } }] };
        const plan = sdf.planSdfScene(escena);
        switch (accion) {
          case 'plan':
            return { accion, plan: { primitives: plan.primitives, ops: plan.ops, root: plan.root, camera: plan.camera, steps: plan.steps, palette: plan.palette, formula: plan.formula } };
          case 'glsl':
            return { accion, formula: plan.formula, glsl: sdf.sdfSceneGlsl(plan) };
          case 'ray':
            return { accion, formula: plan.formula, ray: sdf.rayMarchPlan(plan) };
          case 'html':
            return { accion, formula: plan.formula, html: sdf.renderSdfHtml(plan, { width, height }) };
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('geom')) {
    tools.geom_program = tool({
      description:
        'Computational geometry & math library (fundamentos-programacion pattern, 100% code): scalars+easings, Vec2/Vec3 ops, Mat3/Mat4 (row-major rotation/translation/lookAt) and quaternions (axis-angle, multiply, rotate vector, slerp, toMat4); 2D generators (polygon/star/spiral/lissajous/superellipse/grid/bezier/boundingBox) + SVG render (role=img, a11y); 3D meshes (sphere/torus/box/cylinder/helix/parametric surface) + normals + OBJ/STL export + orthographic projection SVG; keyframed timelines (linear/cubic/back ease) and self-contained HTML5 Canvas 2D/3D animation presets; plus an SDF implicit-point-cloud bridge. Deterministic, keyless, offline. Use to program 2D/3D objects and animations purely from math.',
      parameters: z.object({
        accion: z.enum([
          'v2add', 'v2sub', 'v2dot', 'v2cross', 'v2len', 'v3add', 'v3sub', 'v3dot', 'v3cross', 'v3len',
          'mat4mul', 'transform', 'quat', 'polygon', 'star', 'spiral', 'lissajous', 'superellipse', 'grid', 'bezier', 'bbox', 'svg2d',
          'sphere', 'torus', 'box', 'cylinder', 'helix', 'parametric', 'obj', 'stl', 'project', 'timeline', 'anim', 'implicit',
        ]),
        A: z.string().min(1).max(400).optional(),
        B: z.string().min(1).max(400).optional(),
        params: z.string().min(1).max(4000).optional(),
        width: z.number().int().min(160).max(1920).optional(),
        height: z.number().int().min(90).max(1080).optional(),
      }),
      execute: async ({ accion, A, B, params, width, height }) => {
        const P = params ? JSON.parse(params) : {};
        const vA = A ? JSON.parse(A) : undefined;
        const vB = B ? JSON.parse(B) : undefined;
        switch (accion) {
          case 'v2add': return { accion, result: geom.v2add(vA, vB) };
          case 'v2sub': return { accion, result: geom.v2sub(vA, vB) };
          case 'v2dot': return { accion, result: geom.v2dot(vA, vB) };
          case 'v2cross': return { accion, result: geom.v2cross(vA, vB) };
          case 'v2len': return { accion, result: geom.v2len(vA) };
          case 'v3add': return { accion, result: geom.v3add(vA, vB) };
          case 'v3sub': return { accion, result: geom.v3sub(vA, vB) };
          case 'v3dot': return { accion, result: geom.v3dot(vA, vB) };
          case 'v3cross': return { accion, result: geom.v3cross(vA, vB) };
          case 'v3len': return { accion, result: geom.v3len(vA) };
          case 'mat4mul': return { accion, result: geom.mat4Multiply(vA, vB) };
          case 'transform': return { accion, result: geom.transformPoint(vA, vB) };
          case 'quat': return { accion, result: geom.quatRotateVec3(geom.quatFromAxisAngle(P.axis || [0, 1, 0], P.angle || 0), vA) };
          case 'polygon': return { accion, points: geom.polygon2D(P.sides || 5, P.radius || 1) };
          case 'star': return { accion, points: geom.star2D(P.points || 5, P.outer || 1, P.inner || 0.5) };
          case 'spiral': return { accion, points: geom.spiral2D(P.turns || 3, P.growth || 0.1, P.scale || 1, P.samples || 100) };
          case 'lissajous': return { accion, points: geom.lissajous2D(P.ax || 3, P.ay || 2, P.bx || 1, P.by || 1, P.delta || Math.PI / 2, P.samples || 100) };
          case 'superellipse': return { accion, points: geom.superellipse2D(P.a || 4, P.b || 4, P.samples || 100) };
          case 'grid': return { accion, points: geom.grid2D(P.cols || 3, P.rows || 2, P.size || 1) };
          case 'bezier': return { accion, points: geom.bezierPath2D(vA, P.samples || 20) };
          case 'bbox': { const b = geom.boundingBox2D(vA); return { accion, min: b.min, max: b.max, width: b.width, height: b.height }; }
          case 'svg2d': return { accion, svg: geom.render2DSvg(vA, { width: width || 480, height: height || 480 }) };
          case 'sphere': return { accion, vertices: geom.sphere3D(P.radius || 1, P.segU || 12, P.segV || 16).positions.length, faces: geom.sphere3D(P.radius || 1, P.segU || 12, P.segV || 16).faces.length };
          case 'torus': return { accion, faces: geom.torus3D(P.R || 1, P.r || 0.4, P.segU || 12, P.segV || 16).faces.length };
          case 'box': return { accion, vertices: geom.box3D(P.w || 1, P.h || 1, P.d || 1).positions.length, faces: geom.box3D(P.w || 1, P.h || 1, P.d || 1).faces.length };
          case 'cylinder': return { accion, faces: geom.cylinder3D(P.radius || 1, P.height || 2, P.seg || 8).faces.length };
          case 'helix': return { accion, points: geom.helix3D(P.turns || 3, P.radius || 1, P.height || 4, P.samples || 50) };
          case 'parametric': return { accion, faces: geom.parametricSurface3D((P.fn ? new Function('u', 'v', 'return ' + P.fn) : (u, v) => [Math.cos(u * 2 * Math.PI) * (1 + 0.3 * Math.cos(v * 2 * Math.PI)), Math.sin(u * 2 * Math.PI) * (1 + 0.3 * Math.cos(v * 2 * Math.PI)), 0.3 * Math.sin(v * 2 * Math.PI)]) as (u: number, v: number) => GeomVec3, P.segU || 24, P.segV || 8).faces.length };
          case 'obj': return { accion, obj: geom.meshToOBJ(geom.sphere3D(P.radius || 1, P.segU || 4, P.segV || 6)) };
          case 'stl': return { accion, stl: geom.meshToSTL(geom.box3D(1, 1, 1)).slice(0, 200) };
          case 'project': { const m = geom.sphere3D(1, 12, 16); const mat = geom.mat4Multiply(geom.mat4LookAt([0, 0, 4], [0, 0, 0], [0, 1, 0]), geom.mat4RotationY(P.angle || 0.4)); return { accion, svg: geom.projectMeshSvg(m, mat) }; }
          case 'timeline': { const tl = P.timeline || { x: [{ t: 0, value: 0 }, { t: 1, value: 10 }] }; return { accion, sample: geom.sampleTimeline(tl, P.t || 0.5) }; }
          case 'anim': return { accion, html: geom.renderGeomHtml({ mode: P.mode || '2d', preset: P.preset || 'lissajous', params: P.params || {}, width: width || 720, height: height || 480 }) };
          case 'implicit': { const field = (P.field ? new Function('p', 'return ' + P.field) : (p) => Math.hypot(p[0], p[1], p[2]) - 1) as (p: GeomVec3) => number; return { accion, points: geom.implicitPointCloud(field, { bounds: (P.bounds || [[-1.5, -1.5, -1.5], [1.5, 1.5, 1.5]]) as [GeomVec3, GeomVec3], step: P.step || 0.1, eps: P.eps || 0.09 }).length }; }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('videoqa')) {
    tools.videoqa_metrics = tool({
      description:
        'Video quality metrics (fundamentos-programacion.md A20-A24): MAE/MSE/PSNR/SSIM between reference and distorted luminance buffers, optical-flow error E_flow, weighted total error E_total (alpha=0.6 pixel / beta=0.3 flow / gamma=0.1 semantic), and a pass verdict against thresholds (PSNR>40dB, SSIM>0.95, E_total<0.4). Also builds the deterministic ffmpeg/libvmaf argv (never executes). Deterministic, keyless. Use to verify a rendered/edited video against a reference before publishing.',
      parameters: z.object({
        accion: z.enum(['metricas', 'veredicto', 'vmaf']),
        referenceJson: z.string().min(2).max(12000).optional(), // number[] luminancia 0-255
        distortedJson: z.string().min(2).max(12000).optional(), // number[] luminancia
        flowJson: z.string().optional(), // {flowReference: [[x,y]...], flowDistorted: [[x,y]...]}
        semanticError: z.number().min(0).max(1).optional(),
        umbralesJson: z.string().optional(), // {psnrMin?, ssimMin?, eTotalMax?}
        runnerJson: z.string().optional(), // para vmaf: {reference?, distorted?, size?, model?, features?, ffmpegPath?}
      }),
      execute: async ({ accion, referenceJson, distortedJson, flowJson, semanticError, umbralesJson, runnerJson }) => {
        switch (accion) {
          case 'metricas': {
            const reference = JSON.parse(referenceJson ?? '[]');
            const distorted = JSON.parse(distortedJson ?? '[]');
            const flow = flowJson ? JSON.parse(flowJson) : {};
            const mseValue = videoqa.mse(reference, distorted);
            return {
              accion,
              metrics: {
                mae: videoqa.mae(reference, distorted),
                mse: mseValue,
                psnr: videoqa.psnr(mseValue),
                ssim: videoqa.ssim(reference, distorted),
                e_flow: videoqa.eFlow(flow.flowReference ?? [], flow.flowDistorted ?? []),
                e_total: videoqa.eTotal({ reference, distorted, flowReference: flow.flowReference, flowDistorted: flow.flowDistorted, semanticError }),
              },
            };
          }
          case 'veredicto': {
            const reference = JSON.parse(referenceJson ?? '[]');
            const distorted = JSON.parse(distortedJson ?? '[]');
            const flow = flowJson ? JSON.parse(flowJson) : {};
            const umbrales = umbralesJson ? JSON.parse(umbralesJson) : {};
            return { accion, ...videoqa.verdictVideo({ reference, distorted, flowReference: flow.flowReference, flowDistorted: flow.flowDistorted, semanticError }, umbrales) };
          }
          case 'vmaf': {
            const runner = runnerJson ? JSON.parse(runnerJson) : {};
            return { accion, argv: videoqa.buildVmafArgv(runner), nota: 'argv listo; no ejecutado' };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('motion')) {
    tools.motion_analyze = tool({
      description:
        'Video motion analysis (fundamentos-programacion.md A9-A11/A14): stats of an optical-flow field F(x,y,t) (mean magnitude, dominant angle, coherence), camera-vs-scene decomposition (least-squares global translation+zoom model, residual scene motion, dominant verdict static/camera/scene/mixed), Catmull-Rom trajectory fitting through control points, and the deterministic Python/OpenCV flow-analysis argv (Farneback/Lucas-Kanade; never executes). Deterministic, keyless. Use to analyze camera movement vs object motion before planning cuts or renders.',
      parameters: z.object({
        accion: z.enum(['stats', 'descomponer', 'trayectoria', 'runner']),
        campoJson: z.string().min(2).max(12000).optional(), // {width, height, vectors: [[x,y,u,v]...]}
        puntosJson: z.string().optional(), // [[x,y]...] para trayectoria
        t: z.number().optional(), // para trayectoria: evaluar en t
        cfgJson: z.string().optional(), // para runner: {method?, scale?, grid?, roi?, window?, minMagnitude?, pythonPath?}
      }),
      execute: async ({ accion, campoJson, puntosJson, t, cfgJson }) => {
        switch (accion) {
          case 'stats': {
            const campo = campoJson ? JSON.parse(campoJson) : { width: 1, height: 1, vectors: [] };
            return { accion, stats: motion.flowStats(campo) };
          }
          case 'descomponer': {
            const campo = campoJson ? JSON.parse(campoJson) : { width: 1, height: 1, vectors: [] };
            const d = motion.decomposeMotion(campo);
            return {
              accion,
              camera: d.cameraTranslation,
              zoom: d.cameraZoom,
              explicado: d.explainedRatio,
              dominante: d.dominant,
              residual: {
                width: d.sceneResidual.width,
                height: d.sceneResidual.height,
                meanMagnitude: motion.flowStats(d.sceneResidual).meanMagnitude,
              },
            };
          }
          case 'trayectoria': {
            const puntos = puntosJson ? JSON.parse(puntosJson) : [];
            const tr = motion.trajectoryFit(puntos);
            return { accion, puntos: tr.controlPoints, longitud: tr.length, evaluacion: t !== undefined ? tr.evaluate(t) : null };
          }
          case 'runner': {
            const cfg = cfgJson ? JSON.parse(cfgJson) : {};
            const p = motion.planFlowAnalysis(cfg);
            return { accion, argv: p.argv, summary: p.summary };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('replica')) {
    tools.replica_run = tool({
      description:
        'Analysis-by-synthesis orchestrator (fundamentos-programacion.md A21/A26-A37): analyze a target signature (mean/variance/span), plan a replica run (parse config with stop conditions target score, max iterations, patience, timeout; presupuestos de cÃ³mputo) and expose deterministic optimization steps. The full loop (analyze -> generate -> compare -> optimize with checkpoints, resume and fail-soft) lives in the pure domain packages/core/src/tools/replica.ts and is executed by a runner that injects the real IO (generative/videoqa/motion/sdf). Deterministic, keyless. Use to plan and drive replication of a target by synthesis.',
      parameters: z.object({
        accion: z.enum(['analizar', 'plan']),
        targetJson: z.string().min(2).max(12000).optional(), // number[] firma numÃ©rica del objetivo
        cfgJson: z.string().optional(), // {maxIterations?, targetScore?, improvementThreshold?, patience?, theta[], stepSize?, timeoutMs?}
      }),
      execute: async ({ accion, targetJson, cfgJson }) => {
        switch (accion) {
          case 'analizar': {
            const target = JSON.parse(targetJson ?? '[]');
            return { accion, stats: replica.analyzeTarget(target) };
          }
          case 'plan': {
            const cfg = cfgJson ? JSON.parse(cfgJson) : { theta: [1] };
            const parsed = replica.replicaConfigSchema.parse(cfg);
            return {
              accion,
              cfg: parsed,
              stopConditions: {
                targetScore: parsed.targetScore,
                maxIterations: parsed.maxIterations,
                patience: parsed.patience,
                timeoutMs: parsed.timeoutMs,
                improvementThreshold: parsed.improvementThreshold,
              },
              presupuesto: `max ${parsed.maxIterations} iteraciones, ${parsed.timeoutMs} ms`,
              nota: 'ejecucion real con IO inyectado: runner externo (dominio puro keyless)',
            };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('imaging')) {
    tools.imaging_process = tool({
      description:
        'Pure-TypeScript image processing (fundamentos-programacion.md A8/A9-A11/A22-A24): filter a grayscale frame (gaussian/box blur, median, unsharp, laplacian, sharpen, emboss), grayscale morphology (erode/dilate/open/close/gradient), tone (normalize/gamma/equalize/threshold), analyze it (stats + histogram + Otsu + entropy), detect Canny edges, compare two frames in 2D (error maps, windowed SSIM with MSSIM, PSNR, worst window and worst quadrant) or compute REAL optical flow between two frames (Lucas-Kanade, pyramidal for large displacements) returning a field that motion_analyze consumes. No deps, no network, deterministic. Use to measure and verify actual pixels instead of only planning external runners.',
      parameters: z.object({
        accion: z.enum(['filtrar', 'morfologia', 'tono', 'analizar', 'bordes', 'comparar', 'flujo']),
        imagenJson: z.string().min(2).max(24000), // {width, height, data:[luminancia 0-255]}
        imagenBJson: z.string().max(24000).optional(), // segunda imagen (comparar/flujo)
        operacion: z.string().optional(), // filtrar: blur|box|median|unsharp|laplacian|sharpen|emboss
                                          // morfologia: erode|dilate|open|close|gradient
                                          // tono: normalize|gamma|equalize|threshold
                                          // flujo: lk|piramidal
        parametro: z.number().optional(), // sigma / radio / gamma / umbral segun operacion
        incluirDatos: z.boolean().optional(), // devolver el buffer resultante (max 4096 valores)
      }),
      execute: async ({ accion, imagenJson, imagenBJson, operacion, parametro, incluirDatos }) => {
        const parse = (raw: string) => {
          const o = JSON.parse(raw);
          return imaging.imageFrom(o.width, o.height, o.data);
        };
        const img = parse(imagenJson);
        const salida = (out: imaging.GrayImage) => ({
          width: out.width,
          height: out.height,
          stats: imaging.imageStats(out),
          datos: incluirDatos && out.data.length <= 4096 ? imaging.toArray(out) : undefined,
        });
        switch (accion) {
          case 'filtrar': {
            const op = operacion ?? 'blur';
            const p = parametro;
            const out =
              op === 'box' ? imaging.boxBlur(img, Math.max(1, Math.round(p ?? 1)))
              : op === 'median' ? imaging.medianFilter(img, Math.max(1, Math.round(p ?? 1)))
              : op === 'unsharp' ? imaging.unsharpMask(img, { sigma: p ?? 1, amount: 1.5 })
              : op === 'laplacian' ? imaging.laplacianFilter(img)
              : op === 'sharpen' ? imaging.correlate2d(img, imaging.SHARPEN)
              : op === 'emboss' ? imaging.correlate2d(img, imaging.EMBOSS)
              : imaging.gaussianBlur(img, p ?? 1.5);
            return { accion, operacion: op, ...salida(out) };
          }
          case 'morfologia': {
            const op = operacion ?? 'gradient';
            const r = Math.max(1, Math.round(parametro ?? 1));
            const out =
              op === 'erode' ? imaging.erodeImage(img, r)
              : op === 'dilate' ? imaging.dilateImage(img, r)
              : op === 'open' ? imaging.openImage(img, r)
              : op === 'close' ? imaging.closeImage(img, r)
              : imaging.morphGradient(img, r);
            return { accion, operacion: op, radio: r, ...salida(out) };
          }
          case 'tono': {
            const op = operacion ?? 'normalize';
            const out =
              op === 'gamma' ? imaging.gammaCorrect(img, parametro ?? 2.2)
              : op === 'equalize' ? imaging.equalizeImage(img, { clipLimit: parametro })
              : op === 'threshold' ? imaging.thresholdImage(img, parametro ?? imaging.otsuThreshold(img))
              : imaging.normalizeImage(img);
            return { accion, operacion: op, ...salida(out) };
          }
          case 'analizar': {
            const hist = imaging.imageHistogram(img, 32);
            return {
              accion,
              width: img.width,
              height: img.height,
              stats: imaging.imageStats(img),
              otsu: imaging.otsuThreshold(img),
              histograma: { bins: hist.bins, min: hist.min, max: hist.max, counts: hist.counts },
            };
          }
          case 'bordes': {
            const res = imaging.cannyEdges(img, { sigma: parametro ?? 1.4 });
            return {
              accion,
              densidad: res.density,
              umbrales: res.thresholds,
              datos: incluirDatos && res.edges.data.length <= 4096 ? imaging.toArray(res.edges) : undefined,
            };
          }
          case 'comparar': {
            if (!imagenBJson) throw new Error('comparar requiere imagenBJson');
            return { accion, reporte: imaging.compareImages(img, parse(imagenBJson)) };
          }
          case 'flujo': {
            if (!imagenBJson) throw new Error('flujo requiere imagenBJson');
            const next = parse(imagenBJson);
            if ((operacion ?? 'lk') === 'piramidal') {
              const res = imaging.pyramidalFlow(img, next, { levels: Math.max(2, Math.round(parametro ?? 3)) });
              return {
                accion,
                metodo: 'piramidal',
                desplazamientoGlobal: res.globalShift,
                porNivel: res.perLevel,
                vectores: res.field.vectors.length,
                campo: incluirDatos ? res.field : undefined,
              };
            }
            const field = imaging.lucasKanadeFlow(img, next, { windowRadius: Math.max(1, Math.round(parametro ?? 3)) });
            return {
              accion,
              metodo: 'lucas-kanade',
              desplazamientoMediano: imaging.medianFlow(field),
              vectores: field.vectors.length,
              campo: incluirDatos ? field : undefined,
              nota: 'campo compatible con motion_analyze (stats/descomponer)',
            };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('publications') && opts.db) {
    tools.publication_queue = tool({
      description:
        'Publication queue (AutoPub F4): create/list/approve/reject queued publications and publish those scheduled and due. Creates a DRAFT from a PublicationPackage (auto-approves text/blog; video/image channels require human approval). Use to manage the content distribution pipeline.',
      parameters: z.object({
        accion: z.enum(['crear', 'listar', 'aprobar', 'rechazar', 'publicar_due']),
        paqueteJson: z.string().optional(), // PublicationPackage serializado (para crear)
        canal: z.enum(['youtube_shorts', 'tiktok', 'instagram', 'blog']).optional(),
        scheduledAt: z.string().datetime().optional(),
        id: z.string().optional(), // para aprobar/rechazar
        estado: z.enum(['DRAFT', 'APPROVED', 'REJECTED', 'PUBLISHED', 'FAILED', 'ALL']).optional(),
      }),
      execute: async ({ accion, paqueteJson, canal, scheduledAt, id, estado }) => {
        switch (accion) {
          case 'crear': {
            if (!paqueteJson || !canal) throw new Error('crear requiere paqueteJson + canal');
            const paquete = JSON.parse(paqueteJson);
            const res = await createPublication(opts.db!, {
              paquete,
              canal,
              scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            });
            return { ...res, aviso: res.requiereAprobacion ? 'requiere aprobaciÃ³n humana' : 'aprobada automÃ¡ticamente' };
          }
          case 'listar': {
            const res = await listPublications(opts.db!, { estado, canal });
            return { total: res.items.length, items: res.items.map((p) => ({ id: p.id, tema: p.tema, canal: p.canal, estado: p.estado, scheduledAt: p.scheduledAt })) };
          }
          case 'aprobar': {
            if (!id) throw new Error('aprobar requiere id');
            return { estado: await approvePublication(opts.db!, id) };
          }
          case 'rechazar': {
            if (!id) throw new Error('rechazar requiere id');
            return { estado: await rejectPublication(opts.db!, id) };
          }
          case 'publicar_due':
            return await publishDue(opts.db!);
          default:
            throw new Error(`accion desconocida: ${accion}`);
        }
      },
    });
  }
  if (opts.tools?.includes('contenido')) {
    tools.contenido_generar = tool({
      description:
        'Content router (AutoPub F2): converts a topic brief into ready-to-use content â€” a written post (Redactor) for 16:9/1:1 formats, a video script + storyboard (Guionista) for 9:16, or a long-form OMAG project (Project/Act/Scene/Shot + synchronized timeline, 60-180s) for 16:9 video â€” in Spanish (es) or Arabic (ar), optionally generating the MP3 narration via edge-tts (tts=true, keyless) for scripts. Writes a manifest.json to disk (idempotent). Use to move from idea to content package.',
      parameters: z.object({
        briefJson: z.string().min(1).max(2000),
        dryRun: z.boolean().optional(),
        tipo: z.enum(['texto', 'guion', 'guion_largo']).optional(),
        idioma: z.enum(['es', 'ar']).optional(),
        tts: z.boolean().optional(),
        duracionSeg: z.number().int().min(60).max(180).optional(),
      }),
      execute: async ({ briefJson, dryRun, tipo, idioma, tts, duracionSeg }) => {
        const brief = JSON.parse(briefJson) as import('../tools/topics').TopicBrief;
        const res = await generarContenido(brief, {
          dryRun: dryRun ?? false,
          tipo,
          idioma: idioma ?? 'es',
          tts: tts ?? false,
          duracionSeg: duracionSeg ?? 75,
        });
        const paquete = res.paquete;
        const resumen =
          paquete.tipo === 'texto'
            ? paquete.contenido?.intro.slice(0, 200)
            : paquete.tipo === 'guion_largo'
              ? `${paquete.proyecto?.title} â€” ${paquete.proyecto?.acts.length} actos, ${paquete.proyecto?.acts.reduce((n, a) => n + a.sequences.reduce((m, s) => m + s.scenes.length, 0), 0)} escenas, ${paquete.timeline?.durationSec ?? 0}s`
              : `${paquete.guion?.hook} (${paquete.guion?.duracionSeg}s, ${paquete.guion?.escenas.length} escenas)`;
        return {
          briefId: paquete.briefId,
          tipo: paquete.tipo,
          idioma: paquete.idioma,
          manifestPath: res.manifestPath,
          audioPath: paquete.audioPath ?? null,
          titulo: paquete.tipo === 'texto' ? paquete.contenido?.titulo : (paquete.proyecto?.title ?? paquete.guion?.titulo),
          resumen,
        } satisfies { briefId: string; tipo: 'texto' | 'guion' | 'guion_largo'; idioma: 'es' | 'ar'; manifestPath: string | null; audioPath: string | null; titulo?: string; resumen?: string };
      },
    });
  }
  if (opts.tools?.includes('metrics') && opts.db) {
    tools.publication_metrics = tool({
      description:
        'Publication metrics (AutoPub F5): channel KPIs (published/failed/pending, success rate, avg pre-publication media score), BAD-feedback signals from published posts (ready for the agent improvement pipeline), and real channel analytics (YouTube Data API v3 with YOUTUBE_API_KEY; other platforms fail-soft with a reason: TikTok approval / X OAuth / IG token / Telegram bot admin). Use to measure results and close the content loop.',
      parameters: z.object({
        accion: z.enum(['kpis', 'signals', 'analytics']),
        limit: z.number().int().min(1).max(100).optional(),
        platform: z.enum(['youtube', 'tiktok', 'x', 'instagram', 'threads', 'telegram']).optional(),
        channelId: z.string().min(1).max(200).optional(),
      }),
      execute: async ({ accion, limit, platform, channelId }) => {
        if (accion === 'kpis') return computeChannelKpis(opts.db!);
        if (accion === 'analytics') {
          if (!platform) return { error: 'analytics requiere platform' };
          return fetchChannelAnalytics({ platform, channelId });
        }
        const res = await publicationSignals(opts.db!, limit ?? 20);
        return res;
      },
    });
  }
  if (opts.tools?.includes('memory')) {
    const mfs: MemoryFs = opts.memoryFs ?? createMemoryFs({});
    const memDesc = (s: string) =>
      'Memoria de agente (Fable-5 pattern, una ficha por sujeto). ' + s;
    tools.memory_list = tool({
      description: memDesc('Lista las fichas existentes (path + description + aliases). Ãšsalo antes de preguntar al usuario por contexto que ya pueda estar archivado; nunca afirmes no tener algo sin listar antes.'),
      parameters: z.object({}),
      execute: async () => mfs.list(),
    });
    tools.memory_read = tool({
      description: memDesc('Lee una ficha completa (frontmatter + lÃ­neas con tags) por path, ej. topics/food, people/sam, preferences. La descripciÃ³n del listing es una pista, no sustituye abrir el archivo.'),
      parameters: z.object({ path: z.string().min(1).max(60) }),
      execute: async ({ path }) => mfs.read(path),
    });
    tools.memory_write = tool({
      description: memDesc('Crea o reescribe una ficha entera (frontmatter + lÃ­neas). LÃ­neas con tag explÃ­cito "[stated] texto"; sin tag quedan [stated]. Si la ficha existe, pasa ifVersion (de la Ãºltima lectura) para evitar pisar cambios ajenos.'),
      parameters: z.object({
        path: z.string().min(1).max(60),
        name: z.string().min(1).max(60).optional(),
        description: z.string().min(1).max(200).optional(),
        sources: z.array(z.string().max(20)).optional(),
        aliases: z.array(z.string().max(40)).optional(),
        lines: z.array(z.string().max(2000)).min(1).max(500),
        ifVersion: z.string().optional(),
      }),
      execute: async (input) => {
        const { ifVersion, ...rest } = input;
        return mfs.write(rest.path, rest, ifVersion);
      },
    });
    tools.memory_append = tool({
      description: memDesc('Agrega una lÃ­nea al final de una ficha (tag [stated] por defecto). Si la ficha no existe, la crea con frontmatter mÃ­nimo. Usa ifVersion si ya leÃ­ste la ficha.'),
      parameters: z.object({ path: z.string().min(1).max(60), line: z.string().min(1).max(2000), ifVersion: z.string().optional() }),
      execute: async ({ path, line, ifVersion }) => mfs.append(path, line, ifVersion),
    });
    tools.memory_replace = tool({
      description: memDesc('Reemplaza una parte de una ficha: oldStr debe coincidir EXACTAMENTE una vez (0 o varias â†’ error; amplÃ­a oldStr con contexto circundante). Ãštil para editar o borrar una lÃ­nea especÃ­fica (newStr vacÃ­o la elimina).'),
      parameters: z.object({ path: z.string().min(1).max(60), oldStr: z.string().min(1).max(2000), newStr: z.string().max(2000), ifVersion: z.string().optional() }),
      execute: async ({ path, oldStr, newStr, ifVersion }) => mfs.strReplace(path, oldStr, newStr, ifVersion),
    });
    tools.memory_delete = tool({
      description: memDesc('Elimina una ficha completa. Ãšsalo SOLO cuando el usuario lo pide explÃ­citamente (olvidar algo), nunca proactivamente. Requiere ifVersion si la ficha existe.'),
      parameters: z.object({ path: z.string().min(1).max(60), ifVersion: z.string().optional() }),
      execute: async ({ path, ifVersion }) => mfs.delete(path, ifVersion),
    });
  }

  if (opts.tools?.includes('diagram')) {
    const kindEnum = z.enum(DIAGRAM_KINDS);
    const nodeSchema = z.object({
      id: z.string().min(1).max(60),
      label: z.string().min(1).max(120),
      sublabel: z.string().max(200).optional(),
      accent: z.boolean().optional(),
    });
    tools.diagram_render = tool({
      description:
        'Editorial diagram (diagram-design pattern): render a self-contained, accessible HTML/SVG diagram in the project design system (Dark Obsidian). Kinds: timeline (events on a time axis â€” use for motion specs, scene timing), data-flow (pipeline steps with roles â€” use for processing pipelines), architecture (components + connections), loop (flywheel: hub + stations with optional dashed write-back arcs). Anti-AI-slop geometry, role="img" + aria-labelledby, no JS, no external deps. Use to visualize any flow, roadmap or architecture in docs.',
      parameters: z.object({
        kind: kindEnum,
        title: z.string().min(1).max(200),
        description: z.string().max(400).optional(),
        unit: z.string().max(40).optional(),
        events: z
          .array(
            z.object({
              label: z.string().min(1).max(120),
              sublabel: z.string().max(200).optional(),
              start: z.number().min(0),
              end: z.number().min(0),
              accent: z.boolean().optional(),
            }),
          )
          .max(60)
          .optional(),
        steps: z
          .array(
            z.object({
              id: z.string().min(1).max(60),
              label: z.string().min(1).max(120),
              sublabel: z.string().max(200).optional(),
              role: z.string().max(80).optional(),
              accent: z.boolean().optional(),
            }),
          )
          .max(12)
          .optional(),
        nodes: z.array(nodeSchema).max(16).optional(),
        edges: z
          .array(
            z.object({
              from: z.string().min(1).max(60),
              to: z.string().min(1).max(60),
              label: z.string().max(120).optional(),
              dashed: z.boolean().optional(),
            }),
          )
          .max(30)
          .optional(),
        hub: z
          .object({
            label: z.string().min(1).max(120),
            sublabel: z.string().max(200).optional(),
          })
          .optional(),
        stations: z
          .array(nodeSchema.extend({ id: z.string().min(1).max(60) }))
          .max(10)
          .optional(),
        writeBacks: z.array(z.string().min(1).max(60)).max(10).optional(),
        variant: z.enum(['minimal-dark', 'full-editorial']).optional(),
        size: z.enum(['doc-inline', 'doc-wide']).optional(),
      }),
      execute: async (input) => {
        const { kind, variant, size, ...specParts } = input;
        const spec = { ...specParts } as never;
        const res = renderEditorialDiagram(kind as DiagramKind, spec, { variant, size });
        return {
          kind: res.kind,
          title: res.title,
          meta: res.meta,
          html: res.html.slice(0, 2000) + 'â€¦', // preview; full output is the saved file
          svgChars: res.svg.length,
          note: 'Guarda el HTML en disco para abrirlo offline (ej. docs/diagrams/<slug>.html).',
        };
      },
    });
  }

  if (opts.tools?.includes('video_edit')) {
    tools.video_edit_pack = tool({
      description:
        'Pack phrase-level transcript segments (with word timestamps, speaker and optional audio events like (laughs)/(applause)) into the compact takes_packed markdown view an editing model reads: one line per phrase with [start-end] and speaker, breaking on speaker change or >=0.5s silence. Use to turn raw transcripts into the model-readable editing surface.',
      parameters: z.object({
        segmentsJson: z.string().min(1).max(100000), // TranscriptSegment[] JSON
      }),
      execute: async ({ segmentsJson }) => {
        const segments = JSON.parse(segmentsJson) as import('../tools/video-edit').TranscriptSegment[];
        return packTranscript(segments);
      },
    });
    tools.video_edit_edl = tool({
      description:
        'Build and validate an edit decision list (EDL) for a video edit: sorts cuts by in, rejects in>=out, sub-50ms cuts and overlaps; classifies silence gaps (clean >=400ms / usable >=150ms / unsafe <150ms). Optionally warn-only. Use to plan cuts from transcripts or motion specs with production-correctness rules (video-use pattern).',
      parameters: z.object({
        title: z.string().min(1).max(200),
        cutsJson: z.string().min(1).max(50000), // EdlCut[] JSON
        grade: z.enum(['warm-cinematic', 'neutral-punch', 'none']).optional(),
        warnOnly: z.boolean().optional(),
      }),
      execute: async ({ title, cutsJson, grade, warnOnly }) => {
        const cuts = JSON.parse(cutsJson) as import('../tools/video-edit').EdlCut[];
        const { edl, warnings } = buildEdl({ title, cuts, grade }, { warnOnly });
        return { edl, warnings };
      },
    });
    tools.video_edit_render = tool({
      description:
        'Generate the ffmpeg render command (argv + shell script + step summary) for an EDL: per-segment extract with 30ms audio fades at every boundary (anti-pops) and optional color grade, then lossless -c copy concat, then subtitles LAST. Deterministic; returns the exact command to run (ffmpeg must exist on the machine). Use to produce the final.mp4 from an edit decision list.',
      parameters: z.object({
        edlJson: z.string().min(1).max(100000), // Edl JSON
        outDir: z.string().max(500).optional(),
        outName: z.string().max(200).optional(),
        preview: z.boolean().optional(),
      }),
      execute: async ({ edlJson, outDir, outName, preview }) => {
        const edl = JSON.parse(edlJson) as import('../tools/video-edit').Edl;
        const { shell, steps, argv } = renderFfmpeg(edl, { outDir, outName, preview });
        return { shell, steps, argv, hardRules: HARD_RULES.map((h) => h.rule) };
      },
    });
    tools.video_edit_selfeval = tool({
      description:
        'Deterministic self-eval of an EDL before shipping: duration vs expected, unsafe cuts (<150ms, mid-phrase), silence-gap warnings, correction-loop budget (max 3 attempts). Returns ok/score/issues. Use to verify an edit decision list before rendering (and after render, with real ffprobe data, to decide fix-or-ship).',
      parameters: z.object({
        edlJson: z.string().min(1).max(100000),
        expectedDurationSec: z.number().min(0).optional(),
        silenceGapsMsJson: z.string().max(10000).optional(), // number[]
        attempt: z.number().int().min(1).max(MAX_SELF_EVAL_ATTEMPTS).optional(),
      }),
      execute: async ({ edlJson, expectedDurationSec, silenceGapsMsJson, attempt }) => {
        const edl = JSON.parse(edlJson) as import('../tools/video-edit').Edl;
        const silenceGapsMs = silenceGapsMsJson ? (JSON.parse(silenceGapsMsJson) as number[]) : undefined;
        return selfEvalEdl(edl, { expectedDurationSec, silenceGapsMs }, attempt ?? 1);
      },
    });
    tools.video_edit_timeline = tool({
      description:
        'Render the on-demand visual composite (timeline view) of a video edit as an accessible editorial SVG: filmstrip band + waveform + word/phrase labels with speakers + silence-gap cut candidates (Dark Obsidian, a11y role="img", no JS). Use at decision points (ambiguous pauses, cut-point sanity checks), not as a scan tool.',
      parameters: z.object({
        title: z.string().min(1).max(200),
        durationSec: z.number().min(0.1),
        markersJson: z.string().min(1).max(50000), // TimelineViewSpec.markers
        silencesJson: z.string().max(10000).optional(),
        width: z.number().int().min(400).max(2000).optional(),
      }),
      execute: async ({ title, durationSec, markersJson, silencesJson, width }) => {
        const markers = JSON.parse(markersJson) as import('../tools/video-edit').TimelineViewSpec['markers'];
        const silences = silencesJson ? (JSON.parse(silencesJson) as import('../tools/video-edit').TimelineViewSpec['silences']) : undefined;
        return timelineViewSvg({ title, durationSec, markers, silences }, width);
      },
    });
  }

  if (opts.tools?.includes('screenflow')) {
    tools.screenflow_plan = tool({
      description:
        'Validate a declarative ActionScript for ScreenFlow (screen-recording automation) and plan the capture runs: checks action types, coordinate bounds, estimated duration (anti-runaway max 90min), warns about missing "end" action or zero open_url. exec actions are restricted to an allowlist of safe binaries (python/py/python3, node/npm/npx, ffmpeg/ffprobe, yt-dlp, mkdir) â€” no shells, no absolute-path binaries, no shell metacharacters. Returns ok/errors/warnings/estimatedDurationSec/runs. Use before any screenflow run.',
      parameters: z.object({
        scriptJson: z.string().min(1).max(100000), // ActionScript JSON
        actionsPerRun: z.number().int().min(1).max(50).optional(),
      }),
      execute: async ({ scriptJson, actionsPerRun }) => {
        const script = JSON.parse(scriptJson) as import('../tools/screenflow').ActionScript;
        const v = validateActionScript(script);
        const runs = v.ok ? planRuns(script, { actionsPerRun }) : [];
        return { ...v, runs };
      },
    });
    tools.screenflow_capture = tool({
      description:
        'Generate the ffmpeg gdigrab capture argv for a ScreenFlow run (Windows): segmented recording (default 60s per segment), fps 30, CRF 18, optional region (WxH+X+Y) and audio device (dshow); silent track fallback when no device. Deterministic; returns the exact command the runner executes (ffmpeg must exist).',
      parameters: z.object({
        outFile: z.string().min(1).max(300), // pattern out_%03d.mp4
        fps: z.number().int().min(15).max(60).optional(),
        region: z.string().max(60).optional(),
        audioDevice: z.string().max(100).optional(),
        segmentSec: z.number().int().min(5).max(600).optional(),
      }),
      execute: async ({ outFile, fps, region, audioDevice, segmentSec }) => ({
        argv: buildFfmpegCapture(outFile, { fps, region, audioDevice, segmentSec }),
        note: 'ejecutar con spawn; nunca dentro de tests',
      }),
    });
    tools.screenflow_schedule = tool({
      description:
        'Generate the scheduling command for a ScreenFlow run: schtasks (Windows, daily HH:mm) or cron (Linux, * * * * * expression). Returns argv + human note. Use to program recurring screen recordings.',
      parameters: z.object({
        scriptPath: z.string().min(1).max(300),
        runId: z.string().max(100),
        when: z.string().min(1).max(50), // 'HH:mm' | cron
      }),
      execute: async ({ scriptPath, runId, when }) => scheduleCmd({ scriptPath, runId, when }),
    });
    tools.screenflow_state = tool({
      description:
        'Resolve the ScreenFlow continuation state for a run: given the previous state.json (or none), decides start / resume (fail-soft retry, max 3) / give-up (after MAX_RETRIES with recorded error). Deterministic. Use to resume interrupted screen-recording pipelines.',
      parameters: z.object({
        previousJson: z.string().max(5000).optional(), // RunState JSON | null
      }),
      execute: async ({ previousJson }) => {
        const previous: RunState | null = previousJson ? (JSON.parse(previousJson) as RunState) : null;
        const r = resolveState(previous, new Date().toISOString());
        return { ...r, maxRetries: MAX_RETRIES, maxRunDurationMin: MAX_RUN_DURATION_MIN };
      },
    });
  }

  if (opts.tools?.includes('geometry')) {
    const gnum = (v: unknown, d: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? v : d;
    const buildGeoMesh = (preset: string, p: Record<string, unknown>) => {
      if (preset === 'mobius') {
        return geometry.mobiusSurface({
          radius: gnum(p.radius, 1),
          width: gnum(p.width, 0.6),
          uSegs: Math.floor(gnum(p.uSegs, 48)),
          vSegs: Math.floor(gnum(p.vSegs, 8)),
        });
      }
      return geometry.superShape3D(
        {
          m: gnum(p.lonM, 6),
          n1: gnum(p.lonN1, 1),
          n2: gnum(p.lonN2, 1.7),
          n3: gnum(p.lonN3, 1.7),
        },
        {
          m: gnum(p.latM, 3),
          n1: gnum(p.latN1, 1),
          n2: gnum(p.latN2, 1.7),
          n3: gnum(p.latN3, 1.7),
        },
        { uSegs: Math.floor(gnum(p.uSegs, 48)), vSegs: Math.floor(gnum(p.vSegs, 24)) },
      );
    };
    tools.geometry_build = tool({
      description:
        'Procedural geometry library (Gielis superformula + Mobius + mesh ops + glTF/OBJ export): builds OBJECTS from pure math - no AI model, fully deterministic. Actions: shape2d (sample a closed 2D superformula curve), surface (build a 3D mesh: preset supershape3d|mobius with lon/lat params and segments; returns vertex/face counts + bbox), transform (translate/rotate/scale a built mesh), merge (fuse two meshes with reindexed faces), export_obj (Wavefront OBJ text), export_gltf (glTF 2.0 JSON with embedded base64 buffer - loads in three.js/Blender). Complements the algebra/basic-shapes library. Use to generate parametric objects (stars, flowers, shells, mobius bands) for demos/assets from formulas.',
      parameters: z.object({
        accion: z.enum(['shape2d', 'surface', 'transform', 'merge', 'export_obj', 'export_gltf']),
        preset: z.string().optional(),
        paramsJson: z.string().max(2000).optional(),
        translate: z.array(z.number()).length(3).optional(),
        rotate: z.array(z.number()).length(3).optional(),
        scale: z.union([z.number(), z.array(z.number())]).optional(),
        samples: z.number().int().min(8).max(1024).optional(),
      }),
      execute: async ({ accion, preset, paramsJson, translate, rotate, scale, samples }) => {
        const p = paramsJson ? (JSON.parse(paramsJson) as Record<string, unknown>) : {};
        const pr = preset ?? 'supershape3d';
        if (accion === 'shape2d') {
          const pts = geometry.superShape2D(
            {
              m: gnum(p.m, 6),
              n1: gnum(p.n1, 1),
              n2: gnum(p.n2, 1.7),
              n3: gnum(p.n3, 1.7),
            },
            { samples: samples ?? 64 },
          );
          return { accion, count: pts.length, preview: pts.slice(0, 12) };
        }
        if (accion === 'merge') {
          const merged = geometry.mergeMeshes([buildGeoMesh(pr, p), buildGeoMesh('mobius', {})]);
          return { accion, stats: geometry.meshStats(merged) };
        }
        const mesh = buildGeoMesh(pr, p);
        const scaleFix =
          Array.isArray(scale) ? ([scale[0], scale[1], scale[2]] as [number, number, number]) : scale;
        const final =
          accion === 'transform'
            ? geometry.transformMesh(mesh, {
                translate: translate as [number, number, number] | undefined,
                rotate: rotate as [number, number, number] | undefined,
                scale: scaleFix,
              })
            : mesh;
        if (accion === 'export_obj')
          return { accion, obj: geometry.meshToObjText(final, pr) };
        if (accion === 'export_gltf')
          return { accion, gltfJson: geometry.meshToGltf(final, pr) };
        return { accion, stats: geometry.meshStats(final) };
      },
    });
  }

  if (opts.tools?.includes('pngrender')) {
    tools.png_render = tool({
      description:
        'Procedural PNG image renderer (real PNG encoder in pure TypeScript via node:zlib): turns math functions pixel(x,y)->RGB into REAL .png files - deterministic byte-for-byte, keyless. Actions: render (kinds solid|gradient|field; field sources perlin|simplex|mandelbrot reuse the generative library; optional savePath writes atomically to disk; small results include base64), palettes (list available palettes: obsidian, neoViolet, fire, ice, mono), hsl (HSL->RGB helper). Max dimension 4096. Use to produce procedural images/textures from mathematics instead of calling an image-generation API.',
      parameters: z.object({
        accion: z.enum(['render', 'palettes', 'hsl']),
        width: z.number().int().min(1).max(4096).optional(),
        height: z.number().int().min(1).max(4096).optional(),
        kind: z.enum(['solid', 'gradient', 'field']).optional(),
        palette: z.string().max(24).optional(),
        colorA: z.array(z.number()).length(3).optional(),
        colorB: z.array(z.number()).length(3).optional(),
        field: z
          .object({
            source: z.enum(['perlin', 'simplex', 'mandelbrot']),
            seed: z.number().optional(),
            scale: z.number().optional(),
            octaves: z.number().optional(),
            zoom: z.number().optional(),
            centerX: z.number().optional(),
            centerY: z.number().optional(),
            maxIter: z.number().optional(),
          })
          .optional(),
        savePath: z.string().max(400).optional(),
        h: z.number().optional(),
        s: z.number().optional(),
        l: z.number().optional(),
      }),
      execute: async ({ accion, width, height, kind, palette, colorA, colorB, field, savePath, h, s, l }) => {
        if (accion === 'palettes')
          return {
            accion,
            palettes: pngrender.PALETTE_NAMES.map((name) => ({
              name,
              stops: pngrender.PALETTES[name].length,
            })),
          };
        if (accion === 'hsl') {
          return { accion, rgb: pngrender.hslToRgb(h ?? 0, s ?? 1, l ?? 0.5) };
        }
        const w = width ?? 256;
        const hh = height ?? 256;
        const pal = palette ?? 'obsidian';
        let rgba: Uint8Array;
        if (kind === 'field' && field) {
          const { perlinNoise, simplexNoiseField, mandelbrot } = await import('../tools/generative');
          const values =
            field.source === 'perlin'
              ? perlinNoise(w, hh, { seed: field.seed ?? 1337, scale: field.scale ?? 16, octaves: field.octaves ?? 3 })
              : field.source === 'simplex'
                ? simplexNoiseField(w, hh, { seed: field.seed ?? 1337, scale: field.scale ?? 16 })
                : mandelbrot(w, hh, {
                    zoom: field.zoom ?? 1,
                    center: [field.centerX ?? -0.5, field.centerY ?? 0],
                    maxIter: field.maxIter ?? 64,
                  });
          rgba = pngrender.valuesToRgba(values, w, hh, pal);
        } else if (kind === 'gradient') {
          const a = (colorA ?? [8, 8, 10]) as [number, number, number];
          const b = (colorB ?? [139, 92, 246]) as [number, number, number];
          rgba = pngrender.renderImage({ width: w, height: hh }, (_x, y) => {
            const t = y / Math.max(1, hh - 1);
            return [
              a[0] + (b[0] - a[0]) * t,
              a[1] + (b[1] - a[1]) * t,
              a[2] + (b[2] - a[2]) * t,
            ];
          }).rgba;
        } else {
          const c = (colorA ?? [139, 92, 246]) as [number, number, number];
          rgba = pngrender.renderImage({ width: w, height: hh }, () => [c[0], c[1], c[2]]).rgba;
        }
        const bytes = pngrender.encodePng({ width: w, height: hh, rgba });
        if (savePath) await pngrender.writePngAtomic(savePath, bytes);
        return {
          accion,
          width: w,
          height: hh,
          sizeBytes: bytes.byteLength,
          savedTo: savePath ?? null,
          base64: !savePath && bytes.byteLength <= 200_000 ? Buffer.from(bytes).toString('base64') : null,
        };
      },
    });
  }

  if (opts.tools?.includes('procvid')) {
    const specFrom = (args: {
      animation?: string;
      width?: number;
      height?: number;
      fps?: number;
      durationSec?: number;
      seed?: number;
      outName?: string;
      palette?: string;
      paramsJson?: string;
    }): procvid.NormalizedProcVidSpec => {
      return procvid.resolveSpec({
        animation: args.animation ?? 'plasma',
        width: args.width,
        height: args.height,
        fps: args.fps,
        durationSec: args.durationSec,
        seed: args.seed,
        outName: args.outName,
        palette: args.palette,
        params: args.paramsJson ? (JSON.parse(args.paramsJson) as Record<string, unknown>) : undefined,
      });
    };
    const procvidSpecShape = {
      animation: z.enum(procvid.PROCVID_ANIMATIONS).optional(),
      width: z.number().int().min(2).max(procvid.MAX_DIM).optional(),
      height: z.number().int().min(2).max(procvid.MAX_DIM).optional(),
      fps: z.number().int().min(1).max(procvid.MAX_FPS).optional(),
      durationSec: z.number().min(0.1).max(procvid.MAX_DURATION_SEC).optional(),
      seed: z.number().optional(),
      outName: z.string().max(48).optional(),
      palette: z.string().max(24).optional(),
      paramsJson: z.string().max(2000).optional(),
    };
    tools.procvid_render = tool({
      description:
        'Procedural video planner/renderer (math -> PNG frames -> ffmpeg plan): creates REAL videos from deterministic animations without any generative AI. Animations: plasma (sum of sines), waves, orbits (glowing bodies), noise-flow (time-shifted simplex noise), fractal-zoom (Mandelbrot), shape-morph (superformula interpolation). Actions: plan (validate spec + emit exact ffmpeg argv + render script, writes NOTHING), frames (render all frames as real PNGs into .ultraia/procedural/<outName>/ + write idempotent manifest; then run the returned ffmpegArgv outside this tool to encode MP4). Guards: even dims <=1280, fps<=60, duration<=60s, <=1800 frames. Action gif renders a NATIVE animated GIF in pure TypeScript (no ffmpeg needed). Use to generate procedural loops/backgrounds/videos from pure code.',
      parameters: z.object({
        accion: z.enum(['plan', 'frames', 'gif']),
        outDir: z.string().max(400).optional(),
        gif: z.boolean().optional(),
        ...procvidSpecShape,
      }),
      execute: async ({ accion, outDir, gif, ...args }) => {
        const spec = specFrom(args);
        const plan = procvid.planProcVid(spec, { outDir: outDir ?? '.ultraia/procedural', gif });
        if (accion === 'plan') {
          const { sh, steps } = procvid.buildRenderScript(plan);
          return {
            accion,
            frameCount: plan.frameCount,
            framesDir: plan.framesDir,
            outputPath: plan.outputPath,
            ffmpegArgv: plan.ffmpegArgv,
            steps,
            script: sh,
          };
        }
        if (accion === 'gif') {
          const bytes = await procvid.renderGifBytes(spec);
          const dir2 = outDir ?? '.ultraia/procedural';
          const file = `${dir2}/${spec.outName}.gif`;
          await pngrender.writeGifAtomic(file, bytes);
          return {
            accion,
            frameCount: spec.frameCount,
            path: file,
            sizeBytes: bytes.byteLength,
            base64: bytes.byteLength <= 200_000 ? Buffer.from(bytes).toString('base64') : null,
          };
        }
        const rendered = await procvid.renderFrames(spec, plan);
        const manifest = await procvid.writeManifest(plan);
        const { sh } = procvid.buildRenderScript(plan);
        return {
          accion,
          count: rendered.count,
          dir: rendered.dir,
          filesPreview: rendered.files.slice(0, 5),
          manifestPath: `${plan.outDir}/${plan.outName}.manifest.json`,
          nextStep: manifest.gif ? plan.gifArgv : plan.ffmpegArgv,
          script: sh,
        };
      },
    });
  }

  if (opts.tools?.includes('cloud')) {
    tools.cloud_files = tool({
      description: cloudFilesTool.description,
      parameters: cloudFilesTool.inputSchema,
      execute: createCloudFilesHandler(resolveCloudAdapter()),
    });
  }

  if (opts.tools?.includes('cloud')) {
    tools.cloud_files = tool({
      description: cloudFilesTool.description,
      parameters: cloudFilesTool.inputSchema,
      execute: createCloudFilesHandler(resolveCloudAdapter()),
    });
  }

  return streamText({
    model: resolveModel(opts.model),
    system: opts.system,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    tools: Object.keys(tools).length ? tools : undefined,
    maxSteps: 4,
    onFinish: opts.onFinish,
  });
}
