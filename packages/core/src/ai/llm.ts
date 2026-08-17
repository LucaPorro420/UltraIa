import { generateObject, generateText, streamText, tool, type LanguageModel, type Tool } from 'ai';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
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
import { createPublication, listPublications, approvePublication, rejectPublication, publishDue } from '../domain/publications';
import { generarContenido, type ContentPackage } from '../tools/enrutador';
import { computeChannelKpis } from '../tools/metrics';
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

function googleModel(name: string): LanguageModel {
  if (!process.env.GOOGLE_API_KEY) {
    throw new AiUnavailableError(
      'GOOGLE_API_KEY is not set (ULTRAIA_PROVIDER=google). Get a free key at https://aistudio.google.com/apikey.',
    );
  }
  return google(name);
}

// Ollama serves an OpenAI-compatible API locally — fully free (Meta Llama, Microsoft Phi, etc.).
function ollamaModel(name: string): LanguageModel {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  const provider = createOpenAI({ baseURL, apiKey: 'ollama', compatibility: 'compatible' });
  return provider(name);
}

// LM Studio serves an OpenAI-compatible API locally — fully free (Qwen, Llama, etc.).
function lmstudioModel(name: string): LanguageModel {
  const baseURL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
  const provider = createOpenAI({ baseURL, apiKey: 'lmstudio', compatibility: 'compatible' });
  return provider(name);
}

function openaiModel(name: string): LanguageModel {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiUnavailableError(
      'OPENAI_API_KEY is not set. Add it to apps/web/.env (see .env.example) to enable agent design, evaluation and chat.',
    );
  }
  return openai(name);
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
  });
  return provider(name);
}

/**
 * Resolve a LanguageModel by provider. Controlled by ULTRAIA_PROVIDER
 * (openai | google | ollama | lmstudio). Keeps the user's existing OpenAI path
 * as an option while defaulting to local Ollama (Llama/Phi) — free, no keys.
 */
export function resolveModel(model?: string): LanguageModel {
  // * Por defecto Ollama (local, sin API key). Cambia ULTRAIA_PROVIDER para usar
  // * openai / google / deepseek / lmstudio.
  const provider = (process.env.ULTRAIA_PROVIDER || 'ollama').toLowerCase();
  const defaultName =
    provider === 'google'
      ? 'gemini-2.5-flash'
      : provider === 'ollama'
        ? 'llama3.1'
        : provider === 'lmstudio'
          ? 'qwen2.5-7b-instruct'
          : provider === 'deepseek'
            ? 'deepseek-chat'
            : 'gpt-4o-mini';
  const name = model || process.env.ULTRAIA_MODEL || defaultName;
  const cacheKey = `${provider}:${name}`;
  let cached = modelCache.get(cacheKey);
  if (!cached) {
    cached =
      provider === 'google'
        ? googleModel(name)
        : provider === 'ollama'
          ? ollamaModel(name)
          : provider === 'lmstudio'
            ? lmstudioModel(name)
            : provider === 'deepseek'
              ? deepseekModel(name)
              : openaiModel(name);
    modelCache.set(cacheKey, cached);
  }
  return cached;
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

/** Resuelve el adapter cloud en runtime: R2 (Worker) si está configurado, si no local. */
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
  /** Memory filesystem de agente (Fable-5 pattern); si falta, efímero por request. */
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
        'Read a Mixkit page (free stock video, music, sound effects, templates, illustrations — no signup, no attribution). Pass a type like "free-music", "free-sound-effects" or "free-stock-video" (or a full URL) and get the assets listed on it. Use to discover downloadable assets for a content project.',
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
        'Generate prioritized content topic briefs (AutoPub F1) from RSS feeds and DuckDuckGo trend searches. Returns deduplicated briefs scored by novelty × channel relevance, each with tema, canal (youtube_shorts/tiktok/instagram/blog), formato, tono, angulo and fuentes. Use to feed the content factory with recurring ready-to-write ideas.',
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
            // QUÉ ES: sobrescritura parcial del branding kit (F3 editable).
            // PARA QUÉ: el agente personaliza paleta/fuente/logo/acento del paquete.
            // POR QUÉ: aditivo y opcional — `present` hace merge sobre el kit base.
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
        'Publish a finished MP4 (9:16, <60s) to the configured channels (AutoPub F4): YouTube Shorts, TikTok and X, with bilingual es/ar metadata. Validates tokens first — fails soft with a clear reason when a platform is not configured. Returns one result per platform (ok/id/url or error).',
      parameters: z.object({
        videoPath: z.string().min(1).max(500),
        title: z.string().min(1).max(200),
        plainScript: z.string().max(4000).optional(),
        privacyStatus: z.enum(['public', 'private', 'unlisted']).optional(),
        toYoutube: z.boolean().optional(),
        toTiktok: z.boolean().optional(),
        toX: z.boolean().optional(),
      }),
      execute: async ({ videoPath, title, plainScript, privacyStatus, toYoutube, toTiktok, toX }) => {
        const metadata = { ...buildBilingualMetadata(title, plainScript), ...(privacyStatus ? { privacyStatus } : {}) };
        const adapters = createDefaultPublishers({ includeX: true });
        const selected = adapters.filter((a) =>
          a.platform === 'youtube' ? toYoutube !== false : a.platform === 'tiktok' ? toTiktok !== false : toX !== false,
        );
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
        if (!runtime) return { accion, ok: false, error: 'harness sin boot() en esta sesión' };
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
            return { ...res, aviso: res.requiereAprobacion ? 'requiere aprobación humana' : 'aprobada automáticamente' };
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
        'Content router (AutoPub F2): converts a topic brief into ready-to-use content — a written post (Redactor) for 16:9/1:1 formats, a video script + storyboard (Guionista) for 9:16, or a long-form OMAG project (Project/Act/Scene/Shot + synchronized timeline, 60-180s) for 16:9 video — in Spanish (es) or Arabic (ar), optionally generating the MP3 narration via edge-tts (tts=true, keyless) for scripts. Writes a manifest.json to disk (idempotent). Use to move from idea to content package.',
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
              ? `${paquete.proyecto?.title} — ${paquete.proyecto?.acts.length} actos, ${paquete.proyecto?.acts.reduce((n, a) => n + a.sequences.reduce((m, s) => m + s.scenes.length, 0), 0)} escenas, ${paquete.timeline?.durationSec ?? 0}s`
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
        'Publication metrics (AutoPub F5): channel KPIs (published/failed/pending, success rate, avg pre-publication media score) and BAD-feedback signals from published posts (ready for the agent improvement pipeline). Use to measure results and close the content loop.',
      parameters: z.object({
        accion: z.enum(['kpis', 'signals']),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      execute: async ({ accion, limit }) => {
        if (accion === 'kpis') return computeChannelKpis(opts.db!);
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
      description: memDesc('Lista las fichas existentes (path + description + aliases). Úsalo antes de preguntar al usuario por contexto que ya pueda estar archivado; nunca afirmes no tener algo sin listar antes.'),
      parameters: z.object({}),
      execute: async () => mfs.list(),
    });
    tools.memory_read = tool({
      description: memDesc('Lee una ficha completa (frontmatter + líneas con tags) por path, ej. topics/food, people/sam, preferences. La descripción del listing es una pista, no sustituye abrir el archivo.'),
      parameters: z.object({ path: z.string().min(1).max(60) }),
      execute: async ({ path }) => mfs.read(path),
    });
    tools.memory_write = tool({
      description: memDesc('Crea o reescribe una ficha entera (frontmatter + líneas). Líneas con tag explícito "[stated] texto"; sin tag quedan [stated]. Si la ficha existe, pasa ifVersion (de la última lectura) para evitar pisar cambios ajenos.'),
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
      description: memDesc('Agrega una línea al final de una ficha (tag [stated] por defecto). Si la ficha no existe, la crea con frontmatter mínimo. Usa ifVersion si ya leíste la ficha.'),
      parameters: z.object({ path: z.string().min(1).max(60), line: z.string().min(1).max(2000), ifVersion: z.string().optional() }),
      execute: async ({ path, line, ifVersion }) => mfs.append(path, line, ifVersion),
    });
    tools.memory_replace = tool({
      description: memDesc('Reemplaza una parte de una ficha: oldStr debe coincidir EXACTAMENTE una vez (0 o varias → error; amplía oldStr con contexto circundante). Útil para editar o borrar una línea específica (newStr vacío la elimina).'),
      parameters: z.object({ path: z.string().min(1).max(60), oldStr: z.string().min(1).max(2000), newStr: z.string().max(2000), ifVersion: z.string().optional() }),
      execute: async ({ path, oldStr, newStr, ifVersion }) => mfs.strReplace(path, oldStr, newStr, ifVersion),
    });
    tools.memory_delete = tool({
      description: memDesc('Elimina una ficha completa. Úsalo SOLO cuando el usuario lo pide explícitamente (olvidar algo), nunca proactivamente. Requiere ifVersion si la ficha existe.'),
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
        'Editorial diagram (diagram-design pattern): render a self-contained, accessible HTML/SVG diagram in the project design system (Dark Obsidian). Kinds: timeline (events on a time axis — use for motion specs, scene timing), data-flow (pipeline steps with roles — use for processing pipelines), architecture (components + connections), loop (flywheel: hub + stations with optional dashed write-back arcs). Anti-AI-slop geometry, role="img" + aria-labelledby, no JS, no external deps. Use to visualize any flow, roadmap or architecture in docs.',
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
          html: res.html.slice(0, 2000) + '…', // preview; full output is the saved file
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
        'Validate a declarative ActionScript for ScreenFlow (screen-recording automation) and plan the capture runs: checks action types, coordinate bounds, estimated duration (anti-runaway max 90min), warns about missing "end" action or zero open_url. exec actions are restricted to an allowlist of safe binaries (python/py/python3, node/npm/npx, ffmpeg/ffprobe, yt-dlp, mkdir) — no shells, no absolute-path binaries, no shell metacharacters. Returns ok/errors/warnings/estimatedDurationSec/runs. Use before any screenflow run.',
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
