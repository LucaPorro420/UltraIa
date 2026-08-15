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
import { present } from '../tools/present';
import { createDefaultPublishers, publishToAll, buildBilingualMetadata } from '../tools/publish';
import { createPublication, listPublications, approvePublication, rejectPublication, publishDue } from '../domain/publications';
import { generarContenido, type ContentPackage } from '../tools/enrutador';
import { audioLibrary } from '../omag/audiolibrary';
import { synthSound as synth } from '../omag/sound';

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

export function chatStream(opts: {
  model?: string;
  system: string;
  messages: ChatMessage[];
  tools?: string[];
  onFinish?: (result: { text: string }) => void;
  /** Prisma client para tools con persistencia (publications). */
  db?: import('../db/client').Db;
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
      }),
      execute: async ({ tema, contenido, media, canales, briefId, marca }) =>
        present({ tema, contenido, media, canales, briefId, marca }),
    });
  }
  if (opts.tools?.includes('publish')) {
    tools.publish_submit = tool({
      description:
        'Publish a finished MP4 (9:16, <60s) to the configured channels (AutoPub F4): YouTube Shorts and TikTok, with bilingual es/ar metadata. Validates tokens first — fails soft with a clear reason when a platform is not configured. Returns one result per platform (ok/id/url or error).',
      parameters: z.object({
        videoPath: z.string().min(1).max(500),
        title: z.string().min(1).max(200),
        plainScript: z.string().max(4000).optional(),
        privacyStatus: z.enum(['public', 'private', 'unlisted']).optional(),
        toYoutube: z.boolean().optional(),
        toTiktok: z.boolean().optional(),
      }),
      execute: async ({ videoPath, title, plainScript, privacyStatus, toYoutube, toTiktok }) => {
        const metadata = { ...buildBilingualMetadata(title, plainScript), ...(privacyStatus ? { privacyStatus } : {}) };
        const adapters = createDefaultPublishers();
        const selected = adapters.filter((a) => (a.platform === 'youtube' ? toYoutube !== false : toTiktok !== false));
        const results = await publishToAll(selected, { videoPath, metadata });
        return {
          results,
          ok: results.some((r) => r.ok),
          summary: results.map((r) => (r.ok ? `${r.platform}: ${r.url || r.id}` : `${r.platform}: ${r.error}`)).join(' | ') || 'no channels selected',
        };
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
        'Content router (AutoPub F2): converts a topic brief into ready-to-use content — a written post (Redactor) for 16:9/1:1 formats or a video script + storyboard (Guionista) for 9:16 — and writes a manifest.json to disk (idempotent). Use to move from idea to content package.',
      parameters: z.object({
        briefJson: z.string().min(1).max(2000),
        dryRun: z.boolean().optional(),
        tipo: z.enum(['texto', 'guion']).optional(),
      }),
      execute: async ({ briefJson, dryRun, tipo }) => {
        const brief = JSON.parse(briefJson) as import('../tools/topics').TopicBrief;
        const res = await generarContenido(brief, { dryRun: dryRun ?? false, tipo });
        const paquete = res.paquete;
        return {
          briefId: paquete.briefId,
          tipo: paquete.tipo,
          manifestPath: res.manifestPath,
          titulo: paquete.tipo === 'texto' ? paquete.contenido?.titulo : paquete.guion?.titulo,
          resumen:
            paquete.tipo === 'texto'
              ? paquete.contenido?.intro.slice(0, 200)
              : `${paquete.guion?.hook} (${paquete.guion?.duracionSeg}s, ${paquete.guion?.escenas.length} escenas)`,
        } satisfies { briefId: string; tipo: 'texto' | 'guion'; manifestPath: string | null; titulo?: string; resumen?: string };
      },
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
