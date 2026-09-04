import { generateObject, generateText, streamText, tool, type LanguageModel, type Tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import type { AiGateway, ChatMessage, ChatTextInput, StructuredGenInput } from './gateway';
import { AiUnavailableError } from './gateway';
import { modelCache as responseCache } from './model-cache';
import { searchMemories, storeMemory } from './mem0-client';
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
import { safeJsonParse } from '../utils/safe-json';
import { present } from '../tools/present';
import { createDefaultPublishers, publishToAll, buildBilingualMetadata } from '../tools/publish';
import { createHarness, type HarnessRuntime } from '../tools/harness';
import { analyzeChannel, planExperiments, buildPlaybook } from '../tools/growth';
import { scoreExperiment, levelFor, prioritizeExperiments, autoPrioritizeCycle, type PriorityExperiment, type Rule, type ModuleBottleneck } from '../tools/prioritize';
import { planReframe, planUpscale, planLutMatch, planRotoscope, planDrawToEdit, planBroll } from '../tools/vfx';
import {
  EFFECT_KINDS,
  planEffect,
  colorimetryAnalyze,
  curvatureShade,
  perspectivePlan,
  renderEffectHtml,
  effectSettingsTree,
  deepMergePreset,
  fractionalSpawn,
  resolveSpawnDimensions,
  phaseMachine,
  evaluatePhase,
  flickerClocks,
  noiseProfileFor,
  castShapeFor,
  aimIndicatorPlan,
  zoneIndicatorPlan,
  snappedZoneRadius,
  particleSystemSpec,
  renderPipelinePlan,
  validateDecalSampling,
  drawCallBudget,
} from '../tools/codevfx';
import {
  CURSOR_MOTION_PRESETS,
  buildInteractionZoomSuggestions,
  buildRecordlyManifest,
  buildRegionTimeline,
  calculateMp4ExportDimensions,
  type AudioRegion,
  type AnnotationRegion,
  type ClipRegion,
  type CursorSample,
  type RecordlyEditorState,
  type ZoomRegion,
} from '../tools/recordly';
import {
  buildCronLine,
  buildSchtasksArgv,
  buildBrainReport,
  cycleIdFor,
  nextRunAt,
  parseBrainState,
  planBrainCycle,
  planProceduralBatch,
  resolveCerebroConfig,
} from '../tools/cerebro';
import { planTravelVideo, buildTakeManifest, buildTravelRender, replicateLandscape, travelLeadImage, type TravelPlan } from '../tools/travel';
import { generateDerivedContent, generateBatch } from '../tools/content-engine';
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
import { isSafeMathExpression } from './geom-safety';
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
import { runGoal, buildGoalDispatch } from '../tools/goal';
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
import * as physics2d from '../tools/physics2d';
import * as cadgeo from '../tools/cadgeo';
import * as evoDomain from '../tools/evo';
import * as evolutionDomain from '../tools/evolution';
import { createObservabilityTracer } from '../tools/observability';
import { planAgenticGraph, planCrew, planRagPipeline, routeIntent, planLcelChain, planSandbox, planMemory } from '../tools/agentic';
import { createZernioClient } from '../tools/zernio';
import { executeSandbox } from '../tools/sandbox';
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
import { ModelOrchestrator } from './orchestrator';
import { ChatSessionMemory } from './chat-memory';
import { FREE_MODEL_CATALOG } from './model-catalog';

/** Safe JSON parse with default — never throws. Used in tool execute handlers. */
const parseJson = <T>(s: string | undefined, d: T): T => {
  if (!s) return d;
  try { return JSON.parse(s) as T; } catch { return d; }
};

const modelCache = new Map<string, LanguageModel>();

// --- Model request reliability: a hard timeout so a slow or unreachable local model
// (Ollama / LM Studio) can NEVER hang the browser stream forever. Node's global fetch already
// reuses keep-alive connections, so we only add the timeout here. ---
const PROVIDER_TIMEOUT_MS = Number(process.env.ULTRAIA_MODEL_TIMEOUT_MS || 120_000);

export const modelFetch: typeof fetch = (input, init) => {
  const signal = init?.signal ?? AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
  return fetch(input, { ...init, signal });
};

// Qwen (Alibaba DashScope) OpenAI-compatible endpoint. Thinking mode is enabled by injecting
// `enable_thinking` into the request body for chat completions, keeping the gateway provider-agnostic.
const qwenFetch: typeof fetch = (input, init) => {
  if (
    process.env.QWEN_ENABLE_THINKING === 'true' &&
    typeof input === 'string' &&
    input.includes('/chat/completions')
  ) {
    try {
      const body = JSON.parse((init?.body as string) ?? '{}');
      body.enable_thinking = true;
      init = { ...init, body: JSON.stringify(body) };
    } catch {
      /* keep original body */
    }
  }
  return modelFetch(input, init);
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

// Qwen via Alibaba DashScope — OpenAI-compatible (text + vision input, 1M context, thinking + tools).
// Front-tier model as of 2026-08 is `qwen3.8-max-preview` (2.4T MoE, 95B active, 1M context).
function qwenModel(name: string): LanguageModel {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new AiUnavailableError(
      'DASHSCOPE_API_KEY is not set (ULTRAIA_PROVIDER=qwen). Get a key at https://dashscope.aliyuncs.com (Model Studio).',
    );
  }
  const baseURL =
    process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
  const provider = createOpenAI({
    baseURL,
    apiKey: process.env.DASHSCOPE_API_KEY,
    compatibility: 'compatible',
    fetch: qwenFetch,
  });
  return provider(name);
}

// OpenRouter is OpenAI-compatible: a single key (OPENROUTER_API_KEY) unlocks hundreds of
// models, including the keyless `:free` tier (e.g. google/gemma-2-9b-it:free) that needs NO
// per-vendor key. Extra headers make usage show up in the OpenRouter dashboard.
function openrouterModel(name: string): LanguageModel {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new AiUnavailableError(
      'OPENROUTER_API_KEY is not set (ULTRAIA_PROVIDER=openrouter). Add it to apps/web/.env (see .env.example).',
    );
  }
  const provider = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    compatibility: 'compatible',
    fetch: modelFetch,
    headers: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'UltraIa',
    },
  });
  return provider(name);
}

// Groq is OpenAI-compatible — ultra-low latency, free tier (GROQ_API_KEY).
function groqModel(name: string): LanguageModel {
  if (!process.env.GROQ_API_KEY) {
    throw new AiUnavailableError(
      'GROQ_API_KEY is not set (ULTRAIA_PROVIDER=groq). Get a free key at https://console.groq.com/keys.',
    );
  }
  const provider = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
    compatibility: 'compatible',
    fetch: modelFetch,
  });
  return provider(name);
}

// Mistral is OpenAI-compatible — free tier (MISTRAL_API_KEY).
function mistralModel(name: string): LanguageModel {
  if (!process.env.MISTRAL_API_KEY) {
    throw new AiUnavailableError(
      'MISTRAL_API_KEY is not set (ULTRAIA_PROVIDER=mistral). Get a free key at https://console.mistral.ai/.',
    );
  }
  const provider = createOpenAI({
    baseURL: 'https://api.mistral.ai/v1',
    apiKey: process.env.MISTRAL_API_KEY,
    fetch: modelFetch,
  });
  return provider(name);
}

// Together AI is OpenAI-compatible — free tier (TOGETHER_API_KEY).
function togetherModel(name: string): LanguageModel {
  if (!process.env.TOGETHER_API_KEY) {
    throw new AiUnavailableError(
      'TOGETHER_API_KEY is not set (ULTRAIA_PROVIDER=together). Get a free key at https://api.together.xyz/.',
    );
  }
  const provider = createOpenAI({
    baseURL: 'https://api.together.xyz/v1',
    apiKey: process.env.TOGETHER_API_KEY,
    compatibility: 'compatible',
    fetch: modelFetch,
  });
  return provider(name);
}

// HuggingFace Inference API is OpenAI-compatible — free tier (HUGGINGFACE_API_KEY).
function huggingfaceModel(name: string): LanguageModel {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new AiUnavailableError(
      'HUGGINGFACE_API_KEY is not set (ULTRAIA_PROVIDER=huggingface). Get a free key at https://huggingface.co/settings/tokens.',
    );
  }
  const provider = createOpenAI({
    baseURL: 'https://api-inference.huggingface.co/v1',
    apiKey: process.env.HUGGINGFACE_API_KEY,
    compatibility: 'compatible',
    fetch: modelFetch,
  });
  return provider(name);
}

/** Qwen model family on DashScope — selectable via ULTRAIA_MODEL / QWEN_MODEL. */
export const QWEN_MODELS = [
  'qwen3.8-max-preview',
  'qwen3.7-max',
  'qwen3.6-max-preview',
  'qwen3-max',
  'qwen-plus',
  'qwen-turbo',
  'qwen-long',
] as const;

/** Front-tier Qwen model used when ULTRAIA_PROVIDER=qwen and no explicit model is given. */
export const QWEN_DEFAULT_MODEL = 'qwen3.8-max-preview';

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
    case 'qwen': return QWEN_DEFAULT_MODEL;
    case 'openrouter': return process.env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free';
    case 'groq': return 'llama-3.1-8b-instant';
    case 'mistral': return 'mistral-small-latest';
    case 'together': return 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo';
    case 'huggingface': return 'meta-llama/Llama-3.1-8B-Instruct';
    default: return 'gpt-4o-mini';
  }
}

function buildProvider(p: ProviderName, name: string): LanguageModel {
  switch (p) {
    case 'google': return googleModel(name);
    case 'ollama': return ollamaModel(name);
    case 'lmstudio': return lmstudioModel(name);
    case 'deepseek': return deepseekModel(name);
    case 'qwen': return qwenModel(name);
    case 'openai': return openaiModel(name);
    case 'openrouter': return openrouterModel(name);
    case 'groq': return groqModel(name);
    case 'mistral': return mistralModel(name);
    case 'together': return togetherModel(name);
    case 'huggingface': return huggingfaceModel(name);
  }
}

/**
 * Build a LanguageModel for an EXPLICIT provider+model pair (the canonical builder used by the
 * orchestrator for per-request routing and failover). Cached by `${provider}:${name}`.
 * Throws AiUnavailableError if that specific provider's key is missing — unlike `resolveModel`,
 * it does NOT fall back to a local provider.
 */
export function modelFor(provider: ProviderName, model?: string): LanguageModel {
  const name = model || defaultNameFor(provider);
  const key = `${provider}:${name}`;
  const cached = modelCache.get(key);
  if (cached) return cached;
  const built = buildProvider(provider, name);
  modelCache.set(key, built);
  return built;
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
  return tryResolve(name, primary);
}

function tryResolve(name: string, primary: ProviderName): LanguageModel {
  const order: ProviderName[] = [primary];
  if (primary !== 'ollama') order.push('ollama');
  if (primary !== 'lmstudio') order.push('lmstudio');
  let lastErr: unknown;
  for (const p of order) {
    try {
      return modelFor(p, name);
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

export type ProviderName =
  | 'openai'
  | 'google'
  | 'ollama'
  | 'lmstudio'
  | 'deepseek'
  | 'qwen'
  | 'openrouter'
  | 'groq'
  | 'mistral'
  | 'together'
  | 'huggingface';

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

// Cache de sesiones de chat en memoria (mismo proceso) para que append/context operen sobre
// la misma sesion sin requerir save/load entre cada llamada. save() persiste a disco.
const chatSessionCache = new Map<string, ChatSessionMemory>();

function getChatSession(sessionId?: string, rootDir?: string): ChatSessionMemory {
  if (sessionId && chatSessionCache.has(sessionId)) return chatSessionCache.get(sessionId)!;
  if (sessionId) {
    const m = ChatSessionMemory.load(sessionId, { rootDir });
    chatSessionCache.set(sessionId, m);
    return m;
  }
  const m = new ChatSessionMemory({ rootDir });
  chatSessionCache.set(m.sessionId, m);
  return m;
}

export const orchestratorTool = tool({
  description:
    'Orquestador de modelos: cambia de modelo y modo automaticamente con failover. Acciones: ' +
    'recommend (que modelo usaria para tarea/modo), route (resuelve el LanguageModel construible), ' +
    'providers (proveedores con clave disponible), context (system prompt con modo+estrategia), ' +
    'catalog (modelos gratis disponibles). Keyless-first: prioriza los :free de OpenRouter.',
  parameters: z.object({
    action: z.enum(['recommend', 'route', 'providers', 'context', 'catalog']),
    taskType: z.enum(['chat', 'coding', 'reasoning', 'vision', 'fast', 'agent', 'summarize', 'translate']).optional(),
    mode: z.enum(['P-P', 'P-B', 'L-T', 'S-D']).optional(),
    strategy: z.enum(['concise', 'agentic', 'reasoning', 'creative']).optional(),
    tier: z.enum(['fast', 'balanced', 'reasoning', 'coding', 'vision']).optional(),
    preferredProvider: z.string().optional(),
    model: z.string().optional(),
  }),
  execute: async ({ action, taskType, mode, strategy, tier, preferredProvider, model }) => {
    const orch = new ModelOrchestrator();
    const req: any = { taskType, mode, strategy, tier, preferredProvider, model };
    switch (action) {
      case 'recommend': {
        const r = orch.recommend(req);
        return { provider: r.provider, model: r.model, tier: r.tier };
      }
      case 'route': {
        try {
          await orch.route(req);
          return { ok: true, provider: req.provider ?? 'auto', model: req.model ?? 'auto' };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      }
      case 'providers':
        return { available: orch.availableProviders() };
      case 'context':
        return { system: orch.buildSystemContext(req, '') };
      case 'catalog':
        return {
          models: FREE_MODEL_CATALOG.map((m) => ({ id: m.id, provider: m.provider, tier: m.tier, keyless: m.keyless })),
        };
      default:
        return { error: 'accion desconocida' };
    }
  },
});

export const chatMemoryTool = tool({
  description:
    'Memoria de chat persistente + grafo (graphity). Acciones: create (nueva sesion), append ' +
    '(agrega turno user/assistant/system), context (bloque de contexto para inyectar al cambiar ' +
    'de modelo/modo, preserva consistencia), graph (grafo de entidades), save (persiste en disco), ' +
    'load (reanuda sesion desde disco). Deterministico y keyless.',
  parameters: z.object({
    action: z.enum(['create', 'append', 'context', 'graph', 'save', 'load']),
    sessionId: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system']).optional(),
    content: z.string().optional(),
    maxRecent: z.number().int().optional(),
    rootDir: z.string().optional(),
  }),
  execute: async ({ action, sessionId, role, content, maxRecent, rootDir }) => {
    if (!sessionId && action !== 'create') return { error: 'sessionId requerido para esta accion' };
    try {
      const mem = getChatSession(sessionId, rootDir);
      switch (action) {
        case 'create':
          return { sessionId: mem.sessionId };
        case 'append':
          if (!role || content === undefined) return { error: 'role y content requeridos' };
          mem.addTurn(role, content);
          return { ok: true, turns: mem.getTurns().length, sessionId: mem.sessionId };
        case 'context':
          return { ...mem.getContextBlock({ maxRecent }), sessionId: mem.sessionId };
        case 'graph': {
          const g = mem.buildGraph();
          return { sessionId: mem.sessionId, nodes: g.nodes.length, edges: g.edges.length, graph: g };
        }
        case 'save':
          mem.save();
          return { ok: true, sessionId: mem.sessionId };
        case 'load':
          return { ok: true, sessionId: mem.sessionId, turns: mem.getTurns().length };
        default:
          return { error: 'accion desconocida' };
      }
    } catch (e) {
      return { error: (e as Error).message };
    }
  },
});

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
  /** User ID for mem0 persistent memory. */
  userId?: string;
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
              const briefs = safeJsonParse<import('../tools/topics').TopicBrief[]>(briefsJson);
              if (!briefs) throw new Error('briefsJson no es JSON valido');
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
  if (opts.tools?.includes('goal')) {
    tools.goal_run = tool({
      description:
        'Meta-agente autonomo (/goal): dado un objetivo + lista de tareas, ejecuta cada tarea encadenando contexto (memoria) y despachando a las capabilities reales del proyecto (creadores de contenido, viajes/video, planificador/orquestador, investigacion, memoria/vault, topicos, diagramas, publicacion, mensajeria, media-score). El modelo decide por tarea si responder o invocar una herramienta via JSON {"tool","args"}; soporta encadenado (investigar -> crear -> publicar). Parametros: goal (objetivo global) y tasks (lista de tareas en orden).',
      parameters: z.object({
        goal: z.string().min(1).max(2000),
        tasks: z.array(z.string().min(1).max(2000)).min(1).max(20),
      }),
      execute: async ({ goal, tasks }) => {
        const complete = async (system: string, user: string): Promise<string> => {
          const r = await generateText({ model: resolveModel(opts.model), system, prompt: user });
          return r.text;
        };
        const dispatchMap = buildGoalDispatch();
        const dispatch = async (tool: string, toolArgs: Record<string, unknown>): Promise<unknown> => {
          const fn = dispatchMap[tool];
          if (!fn) throw new Error(`Herramienta no mapeada en goal_run: ${tool}`);
          return fn(toolArgs);
        };
        return await runGoal({ goal, tasks, complete, dispatch, toolNames: Object.keys(dispatchMap), maxStepsPerTask: 5 });
      },
    });
  }
  if (opts.tools?.includes('loop-trigger')) {
    tools.loop_trigger = tool({
      description:
        'Autonomous IDE trigger: dado una tarea, ejecuta el pipeline apropiado (PIVR para dev, goal runner para contenido). Modos: auto (selecciona por contenido), p-p (solo plan), p-b (implementa plan), goal (ejecuta agente). Retorna taskId, status, summary, output, filesChanged. Conecta al EventBus del runtime para updates en tiempo real.',
      parameters: z.object({
        task: z.string().min(10).max(4000).describe('Descripcion de la tarea a ejecutar'),
        mode: z.enum(['auto', 'p-p', 'p-b', 'goal']).optional().describe('Modo de ejecucion'),
        agentId: z.string().optional().describe('ID del agente a usar (solo mode=goal)'),
      }),
      execute: async ({ task, mode, agentId }) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        try {
          const res = await fetch(`${baseUrl}/api/loop/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task, mode, agentId, userId: opts.userId ?? 'system' }),
          });
          if (!res.ok) return { error: `HTTP ${res.status}: ${res.statusText}` };
          return await res.json();
        } catch (err) {
          return { error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    });
  }
  if (opts.tools?.includes('chat-bridge')) {
    tools.chat_bridge = tool({
      description:
        'Chat-to-Code Bridge: recibe un mensaje de chat, lo routea al agente correcto, genera edits de archivo, ejecuta gates (typecheck/lint/test) y hace commit si pasan o rollback si fallan. Retorna edits, summary, gates status, filesChanged.',
      parameters: z.object({
        message: z.string().min(5).max(8000).describe('Mensaje del usuario'),
        source: z.enum(['vscode', 'discord', 'telegram', 'web']).describe('Fuente del mensaje'),
        agentId: z.string().optional().describe('ID del agente a usar (auto-selecciona si no se provee)'),
      }),
      execute: async ({ message, source, agentId }) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        try {
          const res = await fetch(`${baseUrl}/api/bridge/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, source, agentId, userId: opts.userId ?? 'system' }),
          });
          if (!res.ok) return { error: `HTTP ${res.status}: ${res.statusText}` };
          return await res.json();
        } catch (err) {
          return { error: `Fetch failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      },
    });
  }
  if (opts.tools?.includes('publish')) {
    tools.publish_submit = tool({
      description:
        'Publish a finished MP4 (9:16, <60s) to the configured channels (AutoPub F4): YouTube Shorts, TikTok, X, Meta (Instagram Reels / Threads), Facebook, LinkedIn, Telegram, Discord, Slack, Reddit, Pinterest and WhatsApp, with bilingual es/ar metadata. Validates tokens first — fails soft with a clear reason when a platform is not configured. Returns one result per platform (ok/id/url or error).',
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
        toFacebook: z.boolean().optional(),
        toLinkedIn: z.boolean().optional(),
        toTelegram: z.boolean().optional(),
        toDiscord: z.boolean().optional(),
        toSlack: z.boolean().optional(),
        toReddit: z.boolean().optional(),
        toPinterest: z.boolean().optional(),
        toWhatsApp: z.boolean().optional(),
      }),
      execute: async ({ videoPath, title, plainScript, privacyStatus, toYoutube, toTiktok, toX, toInstagram, toThreads, toFacebook, toLinkedIn, toTelegram, toDiscord, toSlack, toReddit, toPinterest, toWhatsApp }) => {
        const metadata = { ...buildBilingualMetadata(title, plainScript), ...(privacyStatus ? { privacyStatus } : {}) };
        const adapters = createDefaultPublishers({ includeX: true, includeMeta: true, includeFacebook: true, includeTelegram: true, includeDiscord: true, includeSlack: true, includeLinkedIn: true, includeReddit: true, includePinterest: true, includeWhatsApp: true });
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
            case 'facebook':
              return toFacebook !== false;
            case 'telegram':
              return toTelegram !== false;
            case 'discord':
              return toDiscord !== false;
            case 'slack':
              return toSlack !== false;
            case 'linkedin':
              return toLinkedIn !== false;
            case 'reddit':
              return toReddit !== false;
            case 'pinterest':
              return toPinterest !== false;
            case 'whatsapp':
              return toWhatsApp !== false;
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
          const specs = safeJsonParse<Array<{
            id: string;
            kind?: 'tool' | 'observer';
            dependsOn?: string[];
            tools?: Array<{ name: string; echo?: boolean }>;
          }>>(pluginsJson);
          if (!specs) throw new Error('pluginsJson no es JSON válido');
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
          const args = argsJson ? (safeJsonParse<Record<string, unknown>>(argsJson) ?? {}) : {};
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
          const p = safeJsonParse<Parameters<typeof planReframe>[0]>(reframeJson);
          if (!p) throw new Error('reframeJson no es JSON valido');
          return { accion, plan: planReframe(p) };
        }
        if (accion === 'upscale') {
          if (!upscaleJson) throw new Error('upscale requiere upscaleJson');
          const p = safeJsonParse<Parameters<typeof planUpscale>[0]>(upscaleJson);
          if (!p) throw new Error('upscaleJson no es JSON valido');
          return { accion, plan: planUpscale(p) };
        }
        if (accion === 'lut') {
          if (!lutJson) throw new Error('lut requiere lutJson');
          const p = safeJsonParse<Parameters<typeof planLutMatch>[0]>(lutJson);
          if (!p) throw new Error('lutJson no es JSON valido');
          return { accion, plan: planLutMatch(p) };
        }
        if (accion === 'rotoscope') {
          if (!rotoJson) throw new Error('rotoscope requiere rotoJson');
          const p = safeJsonParse<Parameters<typeof planRotoscope>[0]>(rotoJson);
          if (!p) throw new Error('rotoJson no es JSON valido');
          return { accion, plan: planRotoscope(p) };
        }
        if (accion === 'draw') {
          if (!drawJson) throw new Error('draw requiere drawJson');
          const p = safeJsonParse<Parameters<typeof planDrawToEdit>[0]>(drawJson);
          if (!p) throw new Error('drawJson no es JSON valido');
          return { accion, plan: planDrawToEdit(p) };
        }
        if (accion === 'broll') {
          if (!brollJson) throw new Error('broll requiere brollJson');
          const p = safeJsonParse<Parameters<typeof planBroll>[0]>(brollJson);
          if (!p) throw new Error('brollJson no es JSON valido');
          return { accion, plan: planBroll(p) };
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
          const samples = safeJsonParse<Array<{ duracionSeg: number; cortes: number; textoPantalla: boolean; hookChars: number }>>(muestrasJson);
          if (!samples) throw new Error('muestrasJson no es JSON valido');
          return { accion, perfil: analyzeChannel(samples) };
        }
        if (accion === 'experiments') {
          if (!kpisJson) throw new Error('experiments requiere kpisJson');
          const kpis = safeJsonParse<Record<string, number>>(kpisJson);
          if (!kpis) throw new Error('kpisJson no es JSON valido');
          const perfil = muestrasJson ? analyzeChannel(safeJsonParse<Array<{ duracionSeg: number; cortes: number; textoPantalla: boolean; hookChars: number }>>(muestrasJson) ?? []) : undefined;
          return { accion, perfil, experimentos: planExperiments(perfil ?? { pacingAvgSeg: 0, cutCadence: 0, onScreenTextDensity: 0, hookLengthAvg: 0, thumbnailStyle: 'mixto' }, kpis, maxExperimentos) };
        }
        if (accion === 'playbook') {
          if (!canal || !signalsJson) throw new Error('playbook requiere canal + signalsJson');
          const signals = safeJsonParse<Array<{ canal: string; variable: 'titulo' | 'hook' | 'thumbnail' | 'duracion' | 'formato'; variante: 'control' | 'test'; kpi: number }>>(signalsJson);
          if (!signals) throw new Error('signalsJson no es JSON valido');
          return { accion, playbook: buildPlaybook(canal, signals) };
        }
        return { accion, ok: false, error: 'accion desconocida' };
      },
    });
  }
  if (opts.tools?.includes('prioritize')) {
    tools.prioritize_run = tool({
      description:
        'Meta-IA prioritization engine (enlaces.txt): score experiments with Priority = Impact x Confidence x LearningValue x Urgency / Cost (clamped 0-1), assign A/B/C/D tiers, and rank a batch by score. Detect weak rules (confidence < threshold) and module bottlenecks, compute expected ROI and knowledge-per-cost, and run the 8-step auto-motor (analyze rules -> detect weak -> detect bottlenecks -> ROI -> knowledge -> sort -> pick best -> library update) deterministically. Use to decide which experiment best improves the ecosystem at the lowest cost.',
      parameters: z.object({
        accion: z.enum(['score', 'list', 'cycle']),
        experimentsJson: z.string().optional(), // [{id, objective, impact, confidence, learningValue, urgency, computeCost, strategicImportance?, relatedRules?, notes?}]
        rulesJson: z.string().optional(), // para cycle: [{id, description, confidence, impact}]
        bottlenecksJson: z.string().optional(), // para cycle: [{module, impactGlobal}]
      }),
      execute: async ({ accion, experimentsJson, rulesJson, bottlenecksJson }) => {
        if (!experimentsJson) throw new Error('score/list/cycle requiere experimentsJson');
        const experiments = safeJsonParse<PriorityExperiment[]>(experimentsJson);
        if (!experiments) throw new Error('experimentsJson no es JSON valido');
        if (accion === 'score') {
          return {
            accion,
            scores: experiments.map((e) => {
              const s = scoreExperiment(e);
              return { id: e.id, score: s, level: levelFor(s) };
            }),
          };
        }
        if (accion === 'list') {
          return { accion, ranked: prioritizeExperiments(experiments) };
        }
        if (accion === 'cycle') {
          const rules = rulesJson ? safeJsonParse<Rule[]>(rulesJson) : undefined;
          const bottlenecks = bottlenecksJson ? safeJsonParse<ModuleBottleneck[]>(bottlenecksJson) : undefined;
          return { accion, cycle: autoPrioritizeCycle({ experiments, rules, bottlenecks }) };
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
          ? semanticMemory.loadTruthCorpus(safeJsonParse<semanticMemory.TruthFileLike[]>(corpusJson) ?? [])
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
        const truthDocs = truthDocsJson ? (safeJsonParse<Array<{ fuente?: string; tipo?: string; texto?: string }>>(truthDocsJson) ?? []) : [];
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
          const gaps = gapsJson ? (safeJsonParse<autolearn.Gap[]>(gapsJson) ?? []) : [];
          return {
            accion,
            metrics: autolearn.learningMetrics({
              entries,
              truthCount: truthDocs.length,
              gaps,
              sourcesCount: sourcesJson ? (safeJsonParse<string[]>(sourcesJson) ?? []).length : 0,
            }),
          };
        }
        const gaps = gapsJson
          ? (safeJsonParse<autolearn.Gap[]>(gapsJson) ?? [])
          : autolearn.detectGaps({
              learnings: entries,
              truth: truthDocs,
              backlog: backlogText ?? [],
              sources: sourcesJson ? (safeJsonParse<string[]>(sourcesJson) ?? []) : [],
              razonamientos: razonamientosJson ? (safeJsonParse<string[]>(razonamientosJson) ?? []) : [],
              implemented: implementedJson ? (safeJsonParse<string[]>(implementedJson) ?? []) : [],
            });
        if (accion === 'gaps') {
          return { accion, gaps };
        }
        if (accion === 'plan') {
          const candidates = candidatesJson
            ? (safeJsonParse<autolearn.WorkCandidate[]>(candidatesJson) ?? [])
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
            archivos: archivosJson ? (safeJsonParse<string[]>(archivosJson) ?? []) : undefined,
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
          (stateJson ? (safeJsonParse<GenesisState>(stateJson) ?? { iterations: 0, repairAttempts: 0 }) : { iterations: 0, repairAttempts: 0 });
        if (accion === 'stop') {
          return { accion, stop: genesis.checkStopConditions(state, m) };
        }
        const tasks = tasksJson ? (safeJsonParse<GenesisTask[]>(tasksJson) ?? []) : undefined;
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
            ? (safeJsonParse<Record<string, boolean>>(resultadosJson) ?? {})
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
        const parsed = autopub.parseAutopubConfig(configJson ? (safeJsonParse<Record<string, unknown>>(configJson) ?? {}) : {});
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
          ? semanticMemory.loadTruthCorpus(parseJson<semanticMemory.TruthFileLike[]>(corpusJson, []))
          : (await semanticMemory.loadTruthAuto()).docs;
        const client = qdrantMemory.createQdrantClient(url ?? qdrantMemory.QDRANT_DEFAULT_URL);
        if (accion === 'plan') {
          const remoteIds = parseJson<number[]>(remoteIdsJson, []);
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
          files = parseJson<kgraph.GraphInputFile[]>(filesJson, []);
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
        'Code-driven visual effects engine (Elemental Sandbox pattern, 100% code â€” no assets, no textures): plan a procedural effect (fire/ice/lightning/meteor/beam/ground/void/plasma/frost) with palette, physics, particles and hand-written GLSL, analyze colorimetry of a palette (HSL warmth/saturation coherence), compute curvature shading of a surface, plan camera perspective with parallax layer offsets, and render a self-contained HTML5 canvas demo. Deterministic, keyless. V2 actions port the advanced architecture principles of the vendored upstream (settings-as-API trees + preset deep-merge; fractional spawn records resolved against live settings = edit-while-paused; windup/travel/impact/fade phase machine; restrike+crawl flicker clocks; noise personality per effect; metres-based SDF aim/zone indicators with snap overshoot; GPU particle ring-buffer specs with 4-stop lifetime gradients; depth-prepass/bloom/ACES/grade pipeline data; anti-pattern guard against angular decal sampling; geometry shape-hash sync; per-family draw-call budgets). Deterministic, keyless. Use to design VFX scenes purely from math.',
      parameters: z.object({
        accion: z.enum(['plan', 'colorimetria', 'curvatura', 'perspectiva', 'render', 'settings', 'preset', 'spawn', 'fases', 'flicker', 'ruido', 'aim', 'zona', 'particulas', 'pipeline', 'decal_check', 'budget']),
        kind: z.enum(EFFECT_KINDS).optional(), // para plan/render
        opcionesJson: z.string().optional(), // para plan/render: {intensity, speed, width, height, title}
        coloresJson: z.string().optional(), // para colorimetria: ["#ff6b35", ...]
        hex: z.string().optional(), // para curvatura: color base
        curvatura: z.number().min(0).max(1).optional(), // 0 plano .. 1 muy curvo
        capas: z.number().int().min(1).max(8).optional(), // para perspectiva
        distancia: z.number().min(1).max(100).optional(), // para perspectiva
      }),
      execute: async ({ accion, kind, opcionesJson, coloresJson, hex, curvatura, capas, distancia }) => {
        const opts = parseJson<Record<string, unknown>>(opcionesJson, {});
        switch (accion) {
          case 'plan': {
            if (!kind) throw new Error('plan requiere kind');
            return { accion, plan: planEffect(kind, opts) };
          }
          case 'colorimetria': {
            if (!coloresJson) throw new Error('colorimetria requiere coloresJson');
            return { accion, reporte: colorimetryAnalyze(parseJson<string[]>(coloresJson, [])) };
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
          case 'settings': {
            if (!kind) throw new Error('settings requiere kind');
            return { accion, tree: effectSettingsTree(kind), forma: castShapeFor(kind) };
          }
          case 'preset': {
            if (!kind) throw new Error('preset requiere kind');
            const patch = (opts.patch ?? {}) as Record<string, unknown>;
            const base = effectSettingsTree(kind) as unknown as Record<string, unknown>;
            return { accion, tree: deepMergePreset(base, patch) };
          }
          case 'spawn': {
            if (!kind) throw new Error('spawn requiere kind');
            const record = fractionalSpawn(kind, opts);
            const ageSec = typeof opts.ageSec === 'number' ? opts.ageSec : 0;
            return { accion, record, resuelto: resolveSpawnDimensions(record, undefined, ageSec) };
          }
          case 'fases': {
            if (!kind) throw new Error('fases requiere kind');
            const pm = phaseMachine(kind);
            const distanceM = typeof opts.distanceM === 'number' ? opts.distanceM : 10;
            const speedMps = typeof opts.speedMps === 'number' ? opts.speedMps : 20;
            const ageSec = typeof opts.ageSec === 'number' ? opts.ageSec : 0;
            return { accion, plan: pm, estado: evaluatePhase(pm, ageSec, distanceM, speedMps) };
          }
          case 'flicker': {
            const timeSec = typeof opts.timeSec === 'number' ? opts.timeSec : 0;
            const cfg = opts as unknown as Parameters<typeof flickerClocks>[1];
            return { accion, relojes: flickerClocks(timeSec, cfg) };
          }
          case 'ruido': {
            if (!kind) throw new Error('ruido requiere kind');
            return { accion, perfil: noiseProfileFor(kind) };
          }
          case 'aim':
            return { accion, plan: aimIndicatorPlan(opts as unknown as Parameters<typeof aimIndicatorPlan>[0]) };
          case 'zona': {
            const zOpts = opts as unknown as Parameters<typeof zoneIndicatorPlan>[0];
            const radiusM = typeof opts.zoneRadiusM === 'number' ? opts.zoneRadiusM : 4.5;
            const reveal01 = typeof opts.reveal01 === 'number' ? opts.reveal01 : 1;
            return { accion, plan: zoneIndicatorPlan(zOpts), radioSnapeado: snappedZoneRadius(radiusM, reveal01) };
          }
          case 'particulas': {
            if (!kind) throw new Error('particulas requiere kind');
            return { accion, spec: particleSystemSpec(kind) };
          }
          case 'pipeline':
            return { accion, pipeline: renderPipelinePlan() };
          case 'decal_check':
            return { accion, validacion: validateDecalSampling(opts as unknown as Parameters<typeof validateDecalSampling>[0]) };
          case 'budget':
            if (!kind) throw new Error('budget requiere kind');
            return { accion, presupuesto: drawCallBudget(kind, opts as unknown as Parameters<typeof drawCallBudget>[1]) };
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('recordly')) {
    tools.recordly_plan = tool({
      description:
        'Recordly ScreenFlow Studio planner (port of principles, AGPL-safe original implementation): auto-zoom suggestions from cursor telemetry (dwell detection 450-2600ms + click clusters), cursor motion presets (focused/smooth), webcam bubble layout (position presets, overlay scale/size/position, crop normalization), MP4 export dimensions (quality ladder source..high, aspect ratios native/16:9/4:3/1:1/9:16 with even-dimension fitting), region-based timeline model (zoom/clips/annotations/audio rows -> render items) and .recordly-style project manifest (JSON). Deterministic, keyless. Use to plan screen-recording demo edits before rendering.',
      parameters: z.object({
        accion: z.enum(['plan', 'zoom', 'cursor', 'export', 'timeline', 'manifest']),
        telemetriaJson: z.string().optional(), // zoom/plan: CursorSample[]
        duracionMs: z.number().min(0).optional(),
        presetId: z.string().optional(), // cursor
        ancho: z.number().int().positive().optional(), // export
        alto: z.number().int().positive().optional(), // export
        calidad: z.enum(['source', 'low', 'medium', 'good', 'high']).optional(),
        aspecto: z.enum(['native', '16:9', '4:3', '1:1', '9:16']).optional(),
        regionesJson: z.string().optional(), // timeline: {zoomRegions?, clipRegions?, annotationRegions?, audioRegions?}
        sourcePath: z.string().optional(), // manifest/plan
        editorJson: z.string().optional(), // manifest/plan: RecordlyEditorState
      }),
      execute: async ({ accion, telemetriaJson, duracionMs, presetId, ancho, alto, calidad, aspecto, regionesJson, sourcePath, editorJson }) => {
        const editorState = parseJson<RecordlyEditorState | undefined>(editorJson, undefined);
        const samples = parseJson<CursorSample[]>(telemetriaJson, []);
        switch (accion) {
          case 'plan': {
            const src = sourcePath ?? 'recording.mp4';
            const zoom = buildInteractionZoomSuggestions({ cursorTelemetry: samples, totalMs: duracionMs ?? 0 });
            const manifest = buildRecordlyManifest({ sourcePath: src, editorState: editorState ?? {}, durationMs: duracionMs });
            return { accion, zoom, manifest };
          }
          case 'zoom': {
            const zoom = buildInteractionZoomSuggestions({ cursorTelemetry: samples, totalMs: duracionMs ?? 0 });
            return { accion, ...zoom };
          }
          case 'cursor': {
            const id = presetId === 'smooth' || presetId === 'focused' ? presetId : 'focused';
            return { accion, id, presets: CURSOR_MOTION_PRESETS };
          }
          case 'export': {
            if (!ancho || !alto) throw new Error('export requiere ancho y alto');
            const dims = calculateMp4ExportDimensions({
              sourceWidth: ancho,
              sourceHeight: alto,
              quality: calidad,
              aspectRatio: aspecto,
            });
            return { accion, dims };
          }
          case 'timeline': {
            const regions = parseJson<{
              zoomRegions?: ZoomRegion[];
              clipRegions?: ClipRegion[];
              annotationRegions?: AnnotationRegion[];
              audioRegions?: AudioRegion[];
            }>(regionesJson, {});
            return { accion, items: buildRegionTimeline(regions) };
          }
          case 'manifest': {
            if (!sourcePath) throw new Error('manifest requiere sourcePath');
            const manifest = buildRecordlyManifest({ sourcePath, editorState: editorState ?? {}, durationMs: duracionMs });
            return { accion, manifest: parseJson(manifest, {}) };
          }
          default:
            return { accion, ok: false, error: 'accion desconocida' };
        }
      },
    });
  }
  if (opts.tools?.includes('cerebro')) {
    tools.cerebro_run = tool({
      description:
        'Cerebro autónomo de UltraIa (autoaprendizaje + creación procedural + autopublicación programada): planifica el ciclo completo LEARN (gaps de autolearn sobre learning/truth) → CREATE (objetos matemáticos PNG/OBJ/glTF desde cero y videos procedurales MP4 vía ffmpeg, keyless) → PUBLISH (briefs→contenido→cola Publication en youtube/tiktok/telegram/...) → REPORT (manifest+report+state idempotente). Acciones: plan (plan del ciclo con presupuesto diario), siguiente (próxima ejecución según schedule), schedule (argv schtasks Windows + línea cron Linux/macOS), procedural (lote determinista de specs videos/objetos por semilla), report (reporte markdown de un ciclo). La ejecución REAL vive en Task/cerebro-cycle.ts; esta tool es el plano puro y determinista. Deterministic, keyless.',
      parameters: z.object({
        accion: z.enum(['plan', 'siguiente', 'schedule', 'procedural', 'report']),
        configJson: z.string().optional(), // CerebroConfig parcial
        estadoJson: z.string().optional(), // estado previo parseable
        semilla: z.number().int().optional(), // para procedural
        workdir: z.string().optional(), // para schedule
      }),
      execute: async ({ accion, configJson, estadoJson, semilla, workdir }) => {
        const cfgInput = parseJson<Record<string, unknown>>(configJson, {});
        const config = resolveCerebroConfig(cfgInput);
        const state = parseBrainState(parseJson(estadoJson, undefined));
        switch (accion) {
          case 'plan': {
            return { accion, plan: planBrainCycle(cfgInput, state), config };
          }
          case 'siguiente': {
            return { accion, proximaEjecucion: nextRunAt(config.schedule)?.toISOString() ?? null };
          }
          case 'schedule': {
            const opts = {
              taskName: config.schedule.taskName,
              mode: config.schedule.mode === 'daily' ? ('daily' as const) : ('interval' as const),
              cadaNMinutos: config.schedule.cadaNMinutos,
              aLas: config.schedule.aLas,
              workdir: workdir ?? process.cwd(),
            };
            return {
              accion,
              windows: buildSchtasksArgv(opts),
              cron: buildCronLine(opts),
              taskName: config.schedule.taskName,
            };
          }
          case 'procedural': {
            return { accion, lote: planProceduralBatch(config, semilla ?? 1) };
          }
          case 'report': {
            const plan = planBrainCycle(cfgInput, state);
            return {
              accion,
              cycleId: cycleIdFor(),
              markdown: buildBrainReport(plan, {
                cycleId: plan.cycleId,
                artefactos: 0,
                videos: config.videosPorCiclo,
                objetos: config.objetosPorCiclo,
                publicaciones: 0,
                lecciones: state.leccionesRecientes,
                errores: [],
                duracionMs: 0,
              }),
            };
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
            return { accion, manifest: buildTakeManifest(parseJson<any>(tomaJson, {})) };
          }
          case 'render': {
            if (!planJson) throw new Error('render requiere planJson');
            const plan = parseJson<TravelPlan>(planJson, {} as TravelPlan);
            const opts = parseJson<Record<string, unknown>>(opcionesJson, {});
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
            const opts = parseJson<{ variaciones?: number; seed?: number }>(opcionesJson, {});
            return { accion, replicas: replicateLandscape(promptBase, opts) };
          }
          case 'lead': {
            if (!planJson) throw new Error('lead requiere planJson');
            const plan = parseJson<TravelPlan>(planJson, {} as TravelPlan);
            const opts = parseJson<{ width?: number; height?: number; seed?: number }>(opcionesJson, {});
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
        const opts = parseJson<Record<string, any>>(opcionesJson, {});
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
            const p = parseJson<{ axioma?: string; reglas?: Record<string, string>; iteraciones?: number }>(patronJson, {});
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
            const kfs = parseJson<Array<{ t: number; value: number[] }>>(keyframesJson, [{ t: 0, value: [0] }, { t: 1, value: [1] }]);
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
            const p = parseJson<{ pattern: Array<{ step: number; freq: number; type?: string }> }>(patronJson, { pattern: [{ step: 0, freq: 220 }] });
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
  if (opts.tools?.includes('chaos-game')) {
    tools.chaos_game = tool({
      description:
        'Deterministic fractal generator via the chaos game method. 7 presets (sierpinski, pentagon, hexagon, golden-triangle, dragon, square-no-same, star) or custom polygon (3-12 sides). Density-based anti-aliased rendering with log-scale palette mapping. Use to generate fractal art entirely from math — no assets, no network, fully seeded/deterministic.',
      parameters: z.object({
        accion: z.enum(['generate', 'presets']),
        preset: z.enum(['sierpinski', 'pentagon', 'hexagon', 'golden-triangle', 'dragon', 'square-no-same', 'star']).optional(),
        sides: z.number().int().min(3).max(12).optional(),
        iterations: z.number().int().min(1000).max(1000000).optional(),
        relaxation: z.number().min(0.1).max(0.9).optional(),
        rule: z.enum(['random', 'no-same', 'no-adjacent', 'skip-1', 'skip-2']).optional(),
        seed: z.number().int().optional(),
        width: z.number().int().min(64).max(2048).optional(),
        height: z.number().int().min(64).max(2048).optional(),
        palette: z.enum(['neoViolet', 'obsidian', 'fire', 'ice', 'mono', 'rainbow']).optional(),
      }),
      execute: async (params) => {
        const { generateChaosGame, chaosDensityToRgba, listPresets } = await import('../tools/chaos-game');
        if (params.accion === 'presets') {
          return { presets: listPresets() };
        }
        const result = generateChaosGame({
          preset: params.preset,
          sides: params.sides,
          iterations: params.iterations,
          relaxation: params.relaxation,
          rule: params.rule,
          seed: params.seed,
          width: params.width ?? 512,
          height: params.height ?? 512,
          palette: params.palette,
        });
        const rgba = chaosDensityToRgba(result.density, result.gridWidth, result.gridHeight, result.spec.palette);
        return {
          accion: 'generate',
          preset: params.preset,
          spec: result.spec,
          checksum: result.checksum,
          points: result.points.length,
          gridWidth: result.gridWidth,
          gridHeight: result.gridHeight,
          rgbaBase64: Buffer.from(rgba).toString('base64'),
        };
      },
    });
  }
  // QUARANTINED #25 restored 18/08: research.ts/enlaces.ts existen y pasan tests â€" registros activos.
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
            const r = validarPropuestaLibro(parseJson<any>(propuestaJson, {}));
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
        const escena = parseJson(escenaJson, { primitives: [{ kind: 'sphere', pos: [0, 0, 0], color: '#8b5cf6', params: { radius: 1 } }] }) as Parameters<typeof sdf.planSdfScene>[0];
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
        const P = parseJson<Record<string, any>>(params, {});
        const vA = parseJson<any>(A, undefined);
        const vB = parseJson<any>(B, undefined);
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
          case 'parametric': {
            const fnExpr = P.fn || 'Math.cos(u * 2 * Math.PI) * (1 + 0.3 * Math.cos(v * 2 * Math.PI)), Math.sin(u * 2 * Math.PI) * (1 + 0.3 * Math.cos(v * 2 * Math.PI)), 0.3 * Math.sin(v * 2 * Math.PI)';
            if (P.fn && !isSafeMathExpression(P.fn)) return { accion, ok: false, error: 'unsafe parametric expression rejected by geom-safety' };
            return { accion, faces: geom.parametricSurface3D((P.fn ? new Function('u', 'v', 'return ' + fnExpr) : (u, v) => [Math.cos(u * 2 * Math.PI) * (1 + 0.3 * Math.cos(v * 2 * Math.PI)), Math.sin(u * 2 * Math.PI) * (1 + 0.3 * Math.cos(v * 2 * Math.PI)), 0.3 * Math.sin(v * 2 * Math.PI)]) as (u: number, v: number) => GeomVec3, P.segU || 24, P.segV || 8).faces.length };
          }
          case 'obj': return { accion, obj: geom.meshToOBJ(geom.sphere3D(P.radius || 1, P.segU || 4, P.segV || 6)) };
          case 'stl': return { accion, stl: geom.meshToSTL(geom.box3D(1, 1, 1)).slice(0, 200) };
          case 'project': { const m = geom.sphere3D(1, 12, 16); const mat = geom.mat4Multiply(geom.mat4LookAt([0, 0, 4], [0, 0, 0], [0, 1, 0]), geom.mat4RotationY(P.angle || 0.4)); return { accion, svg: geom.projectMeshSvg(m, mat) }; }
          case 'timeline': { const tl = P.timeline || { x: [{ t: 0, value: 0 }, { t: 1, value: 10 }] }; return { accion, sample: geom.sampleTimeline(tl, P.t || 0.5) }; }
          case 'anim': return { accion, html: geom.renderGeomHtml({ mode: P.mode || '2d', preset: P.preset || 'lissajous', params: P.params || {}, width: width || 720, height: height || 480 }) };
          case 'implicit': {
            const fieldExpr = P.field || 'Math.hypot(p[0], p[1], p[2]) - 1';
            if (P.field && !isSafeMathExpression(P.field)) return { accion, ok: false, error: 'unsafe implicit field expression rejected by geom-safety' };
            const field = (P.field ? new Function('p', 'return ' + fieldExpr) : (p) => Math.hypot(p[0], p[1], p[2]) - 1) as (p: GeomVec3) => number;
            return { accion, points: geom.implicitPointCloud(field, { bounds: (P.bounds || [[-1.5, -1.5, -1.5], [1.5, 1.5, 1.5]]) as [GeomVec3, GeomVec3], step: P.step || 0.1, eps: P.eps || 0.09 }).length };
          }
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
            const reference = parseJson(referenceJson, []);
            const distorted = parseJson(distortedJson, []);
            const flow = parseJson(flowJson, {}) as { flowReference?: import('../tools/videoqa').FlowVector[]; flowDistorted?: import('../tools/videoqa').FlowVector[] };
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
            const reference = parseJson(referenceJson, []);
            const distorted = parseJson(distortedJson, []);
            const flow = parseJson(flowJson, {}) as { flowReference?: import('../tools/videoqa').FlowVector[]; flowDistorted?: import('../tools/videoqa').FlowVector[] };
            const umbrales = parseJson<{ psnrMin: number; ssimMin: number; eTotalMax: number }>(umbralesJson, { psnrMin: 40, ssimMin: 0.95, eTotalMax: 0.4 });
            return { accion, ...videoqa.verdictVideo({ reference, distorted, flowReference: flow.flowReference, flowDistorted: flow.flowDistorted, semanticError }, umbrales) };
          }
          case 'vmaf': {
            const runner = parseJson<{ model: string; size: string; reference: string; distorted: string; features: ('psnr' | 'ssim' | 'vmaf')[]; ffmpegPath: string }>(runnerJson, { model: 'vmaf-0.6.1', size: '1920x1080', reference: '', distorted: '', features: ['psnr', 'ssim', 'vmaf'], ffmpegPath: 'ffmpeg' });
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
            const campo = parseJson(campoJson, { width: 1, height: 1, vectors: [] });
            return { accion, stats: motion.flowStats(campo) };
          }
          case 'descomponer': {
            const campo = parseJson(campoJson, { width: 1, height: 1, vectors: [] });
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
            const puntos = parseJson(puntosJson, []);
            const tr = motion.trajectoryFit(puntos);
            return { accion, puntos: tr.controlPoints, longitud: tr.length, evaluacion: t !== undefined ? tr.evaluate(t) : null };
          }
          case 'runner': {
            const cfg = parseJson(cfgJson, {});
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
            const target = parseJson<number[]>(targetJson, []);
            return { accion, stats: replica.analyzeTarget(target) };
          }
          case 'plan': {
            const cfg = parseJson<Record<string, unknown>>(cfgJson, { theta: [1] });
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
          const o = parseJson<Record<string, unknown>>(raw, {});
          return imaging.imageFrom(o.width as number, o.height as number, o.data as number[]);
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
            const paquete = parseJson<any>(paqueteJson, {});
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
        const brief = parseJson<import('../tools/topics').TopicBrief>(briefJson, {} as import('../tools/topics').TopicBrief);
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
        const segments = parseJson<import('../tools/video-edit').TranscriptSegment[]>(segmentsJson, []);
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
        const cuts = parseJson<import('../tools/video-edit').EdlCut[]>(cutsJson, []);
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
        const edl = parseJson<import('../tools/video-edit').Edl>(edlJson, {} as import('../tools/video-edit').Edl);
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
        const edl = parseJson<import('../tools/video-edit').Edl>(edlJson, {} as import('../tools/video-edit').Edl);
        const silenceGapsMs = parseJson<number[] | undefined>(silenceGapsMsJson, undefined);
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
        const markers = parseJson<import('../tools/video-edit').TimelineViewSpec['markers']>(markersJson, []);
        const silences = parseJson<import('../tools/video-edit').TimelineViewSpec['silences']>(silencesJson, undefined);
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
        const script = parseJson<import('../tools/screenflow').ActionScript>(scriptJson, [] as unknown as import('../tools/screenflow').ActionScript);
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
        const previous: RunState | null = parseJson<RunState | null>(previousJson, null);
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
        const p = parseJson<Record<string, unknown>>(paramsJson, {});
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
        params: parseJson<Record<string, unknown> | undefined>(args.paramsJson, undefined),
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

  if (opts.tools?.includes('physics2d')) {
    const parseJsonLoose = <T,>(raw: string, label: string): T => {
      try {
        return JSON.parse(raw) as T;
      } catch {
        throw new Error(`${label} no es JSON válido`);
      }
    };
    tools.physics_sim = tool({
      description:
        'Deterministic 2D physics simulator (Motor Evolutivo M1, pure TypeScript): Verlet positional particles (implicit velocity, fixed substeps gravity->integrate->container->links->collisions, stick links weighted by radius^2) and rigid circle/box bodies with sequential impulses (restitution + Coulomb friction, multi-iteration solver stable for stacks). Actions: stack (build a particle stack and settle it N frames), step (advance a given Verlet state inside a container), render (self-contained Dark Obsidian HTML canvas of the given state). 100% deterministic byte-exact, serializable JSON states, keyless. Use to simulate soft/rigid motion from pure code without any engine.',
      parameters: z.object({
        accion: z.enum(['stack', 'step', 'render']),
        count: z.number().int().min(1).max(60).optional(),
        radius: z.number().positive().max(200).optional(),
        frames: z.number().int().min(0).max(2000).optional(),
        stateJson: z.string().max(400_000).optional(),
        containerKind: z.enum(['circle', 'rect']).optional(),
        containerJson: z.string().max(4000).optional(),
      }),
      execute: async ({ accion, count, radius, frames, stateJson, containerKind, containerJson }) => {
        const container: physics2d.VerletContainer =
          containerJson
            ? parseJsonLoose<physics2d.VerletContainer>(containerJson, 'containerJson')
            : containerKind === 'circle'
              ? { kind: 'circle', cx: 0, cy: 0, radius: 280 }
              : { kind: 'rect', x: -300, y: -600, width: 600, height: 580 };
        if (accion === 'step') {
          let st = stateJson ? parseJsonLoose<physics2d.VerletState>(stateJson, 'stateJson') : physics2d.createVerletStack(count ?? 5, container, radius ?? 20);
          const n = frames ?? 60;
          for (let i = 0; i < n; i++) st = physics2d.stepVerlet(st, container);
          return { accion, frames: n, energy: physics2d.verletKineticEnergy(st), state: st };
        }
        if (accion === 'render') {
          const st = stateJson ? parseJsonLoose<physics2d.VerletState>(stateJson, 'stateJson') : physics2d.createVerletStack(count ?? 5, container, radius ?? 20);
          return { accion, html: physics2d.renderPhysicsHtml({ verlet: { state: st, container } }, { title: 'physics_sim' }) };
        }
        let st = physics2d.createVerletStack(count ?? 5, container, radius ?? 20);
        const n = frames ?? 120;
        for (let i = 0; i < n; i++) st = physics2d.stepVerlet(st, container);
        return { accion, frames: n, particles: st.particles.length, energy: physics2d.verletKineticEnergy(st), state: st };
      },
    });
  }

  if (opts.tools?.includes('cadgeo')) {
    const ptsFrom = (raw: string | undefined, fallback: Array<[number, number]>): Array<[number, number]> =>
      parseJson<Array<[number, number]>>(raw, fallback);
    tools.cadgeo_compute = tool({
      description:
        'Computational geometry toolkit (Motor Evolutivo M2, pure math): Delaunay triangulation (Bowyer-Watson, empty-circle property), Voronoi cells via half-plane clipping (partition the bounding box exactly), BVH median-split build with AABB and ray queries (slab method, identical results to brute force), point quadtree with circular range queries, clamped uniform B-spline evaluation (de Boor, degree<=5, optional rational weights) and CAD-lite extrudeMesh/revolveMesh producing standard GeoMesh exportable as OBJ/glTF 2.0. Deterministic, keyless, zero deps. Use for spatial analysis, mesh generation and computational geometry from code.',
      parameters: z.object({
        accion: z.enum(['delaunay', 'voronoi', 'bvh', 'quadtree', 'bspline', 'extrude', 'revolve']),
        pointsJson: z.string().max(200_000).optional(),
        boxesJson: z.string().max(200_000).optional(),
        queryJson: z.string().max(2000).optional(),
        rayJson: z.string().max(500).optional(),
        degree: z.number().int().min(1).max(5).optional(),
        t: z.number().min(0).max(1).optional(),
        height: z.number().positive().max(10_000).optional(),
        segments: z.number().int().min(3).max(256).optional(),
      }),
      execute: async ({ accion, pointsJson, boxesJson, queryJson, rayJson, degree, t, height, segments }) => {
        const squarePts: Array<[number, number]> = [[0, 0], [2, 0], [2, 2], [0, 2]];
        if (accion === 'delaunay') {
          return { accion, triangles: cadgeo.delaunayTriangulate(ptsFrom(pointsJson, squarePts)) };
        }
        if (accion === 'voronoi') {
          const cells = cadgeo.voronoiCells(ptsFrom(pointsJson, squarePts));
          return { accion, cells: cells.map((c) => ({ site: c.site, vertices: c.polygon.length })) , polygons: cells.map((c) => c.polygon) };
        }
        if (accion === 'bvh') {
          const boxes = parseJson<cadgeo.BvhBox[]>(boxesJson, []);
          const root = cadgeo.bvhBuild(boxes);
          const q = parseJson<cadgeo.BvhBox>(queryJson, { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 });
          const base: Record<string, unknown> = { accion, nodes: boxes.length };
          if (rayJson) {
            const [ox, oy, dx, dy] = parseJson<[number, number, number, number]>(rayJson, [0, 0, 1, 0]);
            base.rayHits = cadgeo.bvhRayQuery(root, boxes, ox, oy, dx, dy);
          } else {
            base.aabbHits = cadgeo.bvhAabbQuery(root, boxes, q);
          }
          return base;
        }
        if (accion === 'quadtree') {
          const pts = ptsFrom(pointsJson, squarePts);
          const qt = cadgeo.quadtreeCreate(-1000, -1000, 2000, 4, 12);
          pts.forEach((p, i) => qt.insert(p[0], p[1], i));
          const c = parseJson<{ cx: number; cy: number; r: number }>(queryJson, { cx: 1, cy: 1, r: 3 });
          return { accion, inserted: pts.length, hits: qt.query(c.cx, c.cy, c.r) };
        }
        if (accion === 'bspline') {
          const ctrl = ptsFrom(pointsJson, [[0, 0], [1, 2], [3, 2], [4, 0]]);
          return { accion, point: cadgeo.bsplineEval(ctrl, degree ?? 3, t ?? 0.5) };
        }
        if (accion === 'extrude') {
          const mesh = cadgeo.extrudeMesh(ptsFrom(pointsJson, squarePts), height ?? 5);
          return { accion, vertices: mesh.vertices.length, faces: mesh.faces.length, objPreview: geometry.meshToObjText(mesh).split('\n').slice(0, 6) };
        }
        const mesh = cadgeo.revolveMesh(ptsFrom(pointsJson, [[1, 0], [2, 1], [1, 2]]), segments ?? 24);
        return { accion, vertices: mesh.vertices.length, faces: mesh.faces.length, gltfBytes: geometry.meshToGltf(mesh).length };
      },
    });
  }

  if (opts.tools?.includes('evo')) {
    tools.evo_optimize = tool({
      description:
        'Deterministic genetic algorithm optimizer (Motor Evolutivo M3, pure TypeScript): xorshift32 PRNG (same seed -> same evolution across processes), tournament selection, uniform/arithmetic/blend crossover, gaussian mutation, elitism. Actions: benchmark (sphere minimization demo proving convergence <50 generations), evolve (run generations over genes provided as JSON with your OWN fitness expression evaluated offline), stats (best/mean/worst/diversity of a population). Maximizes fitness; encode minimization by negating. Deterministic byte-exact, keyless. Use to optimize numeric parameter vectors from pure code.',
      parameters: z.object({
        accion: z.enum(['benchmark', 'evolve', 'stats']),
        populationJson: z.string().max(400_000).optional(),
        fitnessJson: z.string().max(10_000).optional(),
        generations: z.number().int().min(1).max(1000).optional(),
        seed: z.number().int().optional(),
      }),
      execute: async ({ accion, populationJson, fitnessJson, generations, seed }) => {
        if (accion === 'benchmark') {
          const r = evoDomain.benchmarkSphere({ dims: 8, size: 40, generations: Math.min(generations ?? 50, 50), target: -0.01, seed: seed ?? 20260824 });
          return { accion, bestFitness: r.bestFitness, reachedAtGeneration: r.reachedAtGeneration, bestGenesPreview: r.bestGenes.slice(0, 4) };
        }
        if (accion === 'stats') {
          const pop = parseJson<evoDomain.Individual[]>(populationJson, [{ genes: [0, 0] }, { genes: [1, 1] }]);
          return { accion, stats: evoDomain.statsEvolution(pop) };
        }
        // evolve: usa una función de fitness declarativa segura (suma ponderada de genes)
        let weights: number[] = [1];
        try {
          const parsed = parseJson<{ weights?: number[] }>(fitnessJson, {});
          if (parsed.weights && parsed.weights.every((w) => Number.isFinite(w))) weights = parsed.weights;
        } catch {
          /* fallback default */
        }
        const fitnessFn = (genes: readonly number[]) => genes.reduce((a, g, i) => a - g * (weights[i % weights.length] ?? 1), 0);
        const initial = parseJson<evoDomain.IndividualInput[]>(populationJson, evoDomain.spherePopulation(20, weights.length || 4, 5, seed ?? 42));
        const r = evoDomain.runGa(initial, Math.min(generations ?? 20, 200), fitnessFn, {
          seed: seed ?? 42,
          elite: 2,
          crossover: { kind: 'blend', rate: 0.9 },
          mutation: { sigma: 0.05, rate: 0.2 },
        });
        const last = r.history[r.history.length - 1];
        return { accion, generations: r.history.length, ...last };
      },
    });
  }

  if (opts.tools?.includes('evolution')) {
    tools.evolution_run = tool({
      description:
        'Artifact evolution engine (Motor Evolutivo M4): maps the manual pipeline Observe->Measure->Analyze->Propose->Implement->Test->Evaluate->Learn onto injectable generator/evaluator domains with periodic resumable checkpoints (resume == full run, byte-exact) and fail-soft IO to brainpage timeline + vault. Action cycle runs the built-in tracking domain (genes converge toward a sine target vector; fitness = negative L1 distance). Use to evolve numeric parameter sets deterministically and persist evolutionary memory.',
      parameters: z.object({
        accion: z.enum(['cycle']),
        dims: z.number().int().min(2).max(32).optional(),
        size: z.number().int().min(4).max(200).optional(),
        generations: z.number().int().min(1).max(500).optional(),
        checkpointEvery: z.number().int().min(1).max(100).optional(),
        seed: z.number().int().optional(),
      }),
      execute: async ({ accion, dims, size, generations, checkpointEvery, seed }) => {
        void accion;
        const d = dims ?? 6;
        const n = size ?? 24;
        const targetVec = Array.from({ length: d }, (_, i) => Math.sin(i * 1.7 + 0.3));
        const r = evolutionDomain.runEvolutionCycle<number[]>({
          initialPopulation: Array.from({ length: n }, (_, i) => ({
            genes: Array.from({ length: d }, (_, j) => Math.cos(i * 2.3 + j) * 1.5),
          })),
          generator: (genes) => [...genes],
          evaluator: (artifact, target) => -(artifact as number[]).reduce((a, g, i) => a + Math.abs(g - (target as number[])[i]), 0),
          target: targetVec,
          generations: generations ?? 30,
          checkpointEvery: checkpointEvery ?? 5,
          ga: { seed: seed ?? 20260824, elite: 2, crossover: { kind: 'blend', rate: 0.9 }, mutation: { sigma: 0.04, rate: 0.25 } },
        });
        return {
          accion,
          bestFitness: r.bestFitness,
          stoppedEarly: r.stoppedEarly,
          checkpointsWritten: r.checkpointsWritten,
          warnings: r.warnings,
          historyTail: r.history.slice(-3),
          bestGenesPreview: r.bestGenes.slice(0, 4),
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

  if (opts.tools?.includes('orchestrator')) {
    tools.orchestrator_route = orchestratorTool;
  }

  if (opts.tools?.includes('chat_memory')) {
    tools.chat_memory_session = chatMemoryTool;
  }

  if (opts.tools?.includes('observability')) {
    tools.observability_trace = tool({
      description:
        'Observabilidad agéntica (Langfuse port, Fase A): traza spans/generaciones/scores hacia Langfuse Cloud via ingestion batch; keyless-first fail-soft sin LANGFUSE_* no hace red. Acciones: trace (span|generation|score) + flush.',
      parameters: z.object({
        accion: z.enum(['trace', 'generation', 'score', 'flush']),
        name: z.string().min(1).max(100).optional(),
        inputJson: z.string().max(5000).optional(),
        outputJson: z.string().max(5000).optional(),
        model: z.string().max(100).optional(),
        value: z.number().min(0).max(1).optional(),
        comment: z.string().max(300).optional(),
      }),
      execute: async ({ accion, name, inputJson, outputJson, model, value, comment }) => {
        const tracer = createObservabilityTracer({
          host: process.env.LANGFUSE_HOST,
          publicKey: process.env.LANGFUSE_PUBLIC_KEY,
          secretKey: process.env.LANGFUSE_SECRET_KEY,
        });
        if (accion === 'trace') {
          if (!name) throw new Error('trace requiere name');
          const input = parseJson(inputJson, undefined);
          const output = parseJson(outputJson, undefined);
          const id = tracer.traceStep({ name, input, output });
          return { id, buffered: tracer.buffered.length, enabled: tracer.enabled };
        }
        if (accion === 'generation') {
          if (!name) throw new Error('generation requiere name');
          const input = parseJson(inputJson, undefined);
          const output = parseJson(outputJson, undefined);
          const id = tracer.traceGeneration({ name, model, input, output });
          return { id, buffered: tracer.buffered.length, enabled: tracer.enabled };
        }
        if (accion === 'score') {
          if (!name || value === undefined) throw new Error('score requiere name + value');
          const id = tracer.score(name, value, comment);
          return { id, buffered: tracer.buffered.length, enabled: tracer.enabled };
        }
        if (accion === 'flush') {
          const res = await tracer.flush();
          return res;
        }
        throw new Error(`accion desconocida: ${accion}`);
      },
    });
  }

  if (opts.tools?.includes('agentic')) {
    tools.agentic_plan = tool({
      description:
        'Puente infraestructura agéntica (6 capas): planifica grafo agéntico (LangGraph), crew (CrewAI), RAG pipeline (LlamaIndex), routing (SK/LCEL), sandbox (E2B), memoria (Mem0/Chainlit). Todo determinista, keyless-first, serializable JSON. Usa para demostrar o materializar una capa antes de ejecutarla.',
      parameters: z.object({
        capa: z.enum(['graph', 'crew', 'rag', 'route', 'lcel', 'sandbox', 'memory']),
        specJson: z.string().max(10000).optional(),
        intent: z.string().max(500).optional(),
      }),
      execute: async ({ capa, specJson, intent }) => {
        if (capa === 'graph') {
          const spec = parseJson<any>(specJson, { entry: 'start', nodes: [{ id: 'start', kind: 'router' }], edges: [] });
          return planAgenticGraph(spec);
        }
        if (capa === 'crew') {
          const spec = parseJson<any>(specJson, { roles: [{ name: 'researcher', goal: 'investigar' }], tasks: [{ id: 't1', role: 'researcher', objective: 'buscar' }] });
          return planCrew(spec);
        }
        if (capa === 'rag') {
          const spec = parseJson<any>(specJson, { loaders: ['web'], chunk: { size: 1000, overlap: 100 }, embed: 'local', store: 'qdrant' });
          return planRagPipeline(spec);
        }
        if (capa === 'route') {
          if (!intent) throw new Error('route requiere intent');
          return routeIntent(intent);
        }
        if (capa === 'lcel') {
          const steps = parseJson<any>(specJson, [{ kind: 'prompt', name: 'template' }, { kind: 'model', name: 'gpt-4o-mini' }]);
          return planLcelChain(steps);
        }
        if (capa === 'sandbox') {
          const spec = parseJson<any>(specJson, { lang: 'python', code: 'print("hello")' });
          return planSandbox(spec);
        }
        if (capa === 'memory') {
          const spec = parseJson<any>(specJson, { kind: 'semantic', query: 'buscar' });
          return planMemory(spec);
        }
        throw new Error(`capa desconocida: ${capa}`);
      },
    });
  }

  if (opts.tools?.includes('zernio')) {
    tools.zernio_accounts = tool({
      description: 'Zernio MCP — cuentas y perfiles: lista cuentas conectadas (accounts_list), detalle por plataforma (accounts_get), lista perfiles (profiles_list). Usa para descubrir account_id antes de publicar.',
      parameters: z.object({
        accion: z.enum(['list', 'get', 'profiles_list', 'profiles_get']),
        platform: z.string().max(50).optional(),
        profile_id: z.string().max(100).optional(),
      }),
      execute: async ({ accion, platform, profile_id }) => {
        const client = createZernioClient();
        if (accion === 'list') return client.callTool('accounts_list', {});
        if (accion === 'get') {
          if (!platform) throw new Error('get requiere platform');
          return client.callTool('accounts_get', { platform });
        }
        if (accion === 'profiles_list') return client.callTool('profiles_list', {});
        if (accion === 'profiles_get') {
          if (!profile_id) throw new Error('profiles_get requiere profile_id');
          return client.callTool('profiles_get', { profile_id });
        }
        throw new Error(`accion desconocida: ${accion}`);
      },
    });
    tools.zernio_posts = tool({
      description: 'Zernio MCP — posts: crea (draft/scheduled/publish_now), cross-post multi-plataforma, lista, detalle, update, delete, retry. Para publicar programado o inmediato en twitter/instagram/linkedin/tiktok/youtube/etc.',
      parameters: z.object({
        accion: z.enum(['create', 'cross_post', 'list', 'get', 'update', 'delete', 'publish_now']),
        content: z.string().max(5000).optional(),
        platform: z.string().max(50).optional(),
        platforms: z.string().max(300).optional(),
        account_id: z.string().max(100).optional(),
        post_id: z.string().max(100).optional(),
        is_draft: z.boolean().optional(),
        publish_now: z.boolean().optional(),
        schedule_minutes: z.number().int().min(0).max(525600).optional(),
        media_urls: z.string().max(2000).optional(),
        title: z.string().max(500).optional(),
      }),
      execute: async (args) => {
        const client = createZernioClient();
        switch (args.accion) {
          case 'create':
            if (!args.content || !args.platform) throw new Error('create requiere content + platform');
            return client.callTool('posts_create', {
              content: args.content,
              platform: args.platform,
              ...(args.account_id ? { account_id: args.account_id } : {}),
              ...(args.is_draft !== undefined ? { is_draft: args.is_draft } : {}),
              ...(args.publish_now !== undefined ? { publish_now: args.publish_now } : {}),
              ...(args.schedule_minutes !== undefined ? { schedule_minutes: args.schedule_minutes } : {}),
              ...(args.media_urls ? { media_urls: args.media_urls } : {}),
              ...(args.title ? { title: args.title } : {}),
            } as Record<string, unknown>);
          case 'cross_post':
            if (!args.content || !args.platforms) throw new Error('cross_post requiere content + platforms');
            return client.callTool('posts_cross_post', {
              content: args.content,
              platforms: args.platforms,
              ...(args.account_id ? { account_ids: args.account_id } : {}),
              ...(args.is_draft !== undefined ? { is_draft: args.is_draft } : {}),
              ...(args.publish_now !== undefined ? { publish_now: args.publish_now } : {}),
              ...(args.media_urls ? { media_urls: args.media_urls } : {}),
            } as Record<string, unknown>);
          case 'list':
            return client.callTool('posts_list', { ...(args.platform ? { status: args.platform } : {}) });
          case 'get':
            if (!args.post_id) throw new Error('get requiere post_id');
            return client.callTool('posts_get', { post_id: args.post_id });
          case 'publish_now':
            if (!args.content || !args.platform) throw new Error('publish_now requiere content + platform');
            return client.callTool('posts_publish_now', { content: args.content, platform: args.platform, ...(args.account_id ? { account_id: args.account_id } : {}) } as Record<string, unknown>);
          default:
            throw new Error(`accion desconocida: ${args.accion}`);
        }
      },
    });
    tools.zernio_analytics = tool({
      description: 'Zernio MCP — analytics: métricas por post/cuenta/plataforma (analytics_get_analytics, daily_metrics, best_time_to_post). Usa para medir engagement y cerrar el loop.',
      parameters: z.object({
        accion: z.enum(['analytics', 'daily', 'best_time']),
        post_id: z.string().max(100).optional(),
        platform: z.string().max(50).optional(),
        account_id: z.string().max(100).optional(),
      }),
      execute: async ({ accion, post_id, platform, account_id }) => {
        const client = createZernioClient();
        if (accion === 'analytics') return client.callTool('analytics_get_analytics', { ...(post_id ? { post_id } : {}), ...(platform ? { platform } : {}), ...(account_id ? { account_id } : {}) });
        if (accion === 'daily') return client.callTool('analytics_get_daily_metrics', { ...(platform ? { platform } : {}), ...(account_id ? { account_id } : {}) });
        if (accion === 'best_time') return client.callTool('analytics_get_best_time_to_post', { ...(platform ? { platform } : {}) });
        throw new Error(`accion desconocida: ${accion}`);
      },
    });
    tools.zernio_media = tool({
      description: 'Zernio MCP — media: genera URL de upload (media_generate_upload_link) y chequea estado (media_check_upload_status). Usa para adjuntar imágenes/videos a posts.',
      parameters: z.object({
        accion: z.enum(['generate_link', 'check_status']),
        token: z.string().max(200).optional(),
      }),
      execute: async ({ accion, token }) => {
        const client = createZernioClient();
        if (accion === 'generate_link') return client.callTool('media_generate_upload_link', {});
        if (accion === 'check_status') {
          if (!token) throw new Error('check_status requiere token');
          return client.callTool('media_check_upload_status', { token });
        }
        throw new Error(`accion desconocida: ${accion}`);
      },
    });
  }  if (opts.tools?.includes('content-engine')) {
    tools.content_generate = tool({
      description:
        'Content Engine: genera contenido derivado (blog post, video script, social caption, thread) desde fuentes internas (ebooks, cursos). Determinista, keyless, bilingüe es/ar.',
      parameters: z.object({
        sourceId: z.string().describe('ID de la fuente (ej: ebook-threejs, course-react)'),
        type: z.enum(['blog-post', 'video-script', 'social-caption', 'thread']).describe('Tipo de contenido derivado'),
        idioma: z.enum(['es', 'ar']).default('es').describe('Idioma destino'),
        dryRun: z.boolean().default(false).describe('Si true, genera sin escribir archivos'),
      }),
      execute: async ({ sourceId, type, idioma, dryRun }) => {
        const { generateDerivedContent } = await import('../tools/content-engine');
        const { ALL_CONTENT_SOURCES } = await import('../tools/content-sources');
        const source = ALL_CONTENT_SOURCES.find((s) => s.id === sourceId);
        if (!source) return { error: `Fuente no encontrada: ${sourceId}. Disponibles: ${ALL_CONTENT_SOURCES.map((s) => s.id).join(', ')}` };
        return generateDerivedContent(source, { type, idioma, dryRun });
      },
    });
    tools.content_batch = tool({
      description:
        'Content Engine batch: genera múltiples contenidos derivados de varias fuentes en una sola llamada.',
      parameters: z.object({
        sourceIds: z.array(z.string()).optional().describe('IDs de fuentes (vacío = todas)'),
        types: z.array(z.enum(['blog-post', 'video-script', 'social-caption', 'thread'])).describe('Tipos de contenido'),
        idiomas: z.array(z.enum(['es', 'ar'])).default(['es']).describe('Idiomas'),
        dryRun: z.boolean().default(false),
      }),
      execute: async ({ sourceIds, types, idiomas, dryRun }) => {
        const { generateBatch } = await import('../tools/content-engine');
        const { ALL_CONTENT_SOURCES } = await import('../tools/content-sources');
        const sources = sourceIds
          ? ALL_CONTENT_SOURCES.filter((s) => sourceIds.includes(s.id))
          : ALL_CONTENT_SOURCES;
        if (sources.length === 0) return { error: 'Ninguna fuente encontrada' };
        return generateBatch(sources, { types, idiomas, dryRun });
      },
    });
    tools.content_sources = tool({
      description: 'Content Engine: lista todas las fuentes de contenido disponibles (ebooks, cursos).',
      parameters: z.object({}),
      execute: async () => {
        const { ALL_CONTENT_SOURCES } = await import('../tools/content-sources');
        return ALL_CONTENT_SOURCES.map((s) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          level: s.level,
          topics: s.topics,
          chapters: s.chapters?.length ?? 0,
          lessons: s.lessons?.length ?? 0,
        }));
      },
    });
  }

  if (opts.tools?.includes('sandbox')) {
    tools.sandbox_run = tool({
      description:
        'Sandbox aislado (E2B Fase B): ejecuta código python/javascript/typescript/bash. Si E2B_API_KEY → nube E2B; si no → local plan (no exec). Fail-soft, nunca evalúa sin allowlist.',
      parameters: z.object({
        lang: z.enum(['python', 'javascript', 'typescript', 'bash']),
        code: z.string().min(1).max(10000),
        timeoutMs: z.number().int().min(1000).max(60000).optional(),
      }),
      execute: async ({ lang, code, timeoutMs }) => executeSandbox({ lang, code, timeoutMs }),
    });
  }

  // --- Creativo: creative coding physics engine ---
  if (opts.tools?.includes('creativo')) {
    tools.creativity_run = tool({
      description:
        'Creative coding physics engine: bounce simulation (gravity, restitution, collisions), scene planning (random ball placement), impact sound synthesis (sine+noise envelope), and HTML5 canvas rendering. Deterministic, seeded, keyless. Use to create interactive physics-based visual art.',
      parameters: z.object({
        accion: z.enum(['simulate', 'scene', 'sound', 'render']),
        ballJson: z.string().optional(),
        count: z.number().int().min(1).max(50).optional(),
        seed: z.number().int().optional(),
        width: z.number().int().min(64).max(2048).optional(),
        height: z.number().int().min(64).max(2048).optional(),
        intensity: z.number().min(0).max(1).optional(),
        durationSec: z.number().min(0.01).max(5).optional(),
      }),
      execute: async ({ accion, ballJson, count, seed, width, height, intensity, durationSec }) => {
        const { simulateBall, planScene, soundImpact, renderCanvasHtml } = await import('../tools/creativo');
        switch (accion) {
          case 'simulate': {
            const ball = parseJson(ballJson, { x: 100, y: 50, vx: 3, vy: 0, r: 12, mass: 1 });
            return simulateBall(ball);
          }
          case 'scene':
            return planScene({ count, seed, width, height });
          case 'sound':
            return soundImpact(intensity ?? 0.5, { durationSec });
          case 'render': {
            const scene = planScene({ count, seed, width, height });
            return { html: renderCanvasHtml(scene, { width, height }) };
          }
          default:
            return { ok: false, error: 'unknown accion' };
        }
      },
    });
  }

  // --- Chaos: attractor exploration engine ---
  if (opts.tools?.includes('chaos')) {
    tools.chaos_attractor = tool({
      description:
        'Deterministic chaos attractor engine: Lorenz, Rössler, Chen, Aizawa with RK4 integration, dual trajectories (butterfly effect), and divergence metrics. Select an attractor, adjust initial conditions, watch sensitivity to initial conditions unfold. Deterministic, keyless, zero deps.',
      parameters: z.object({
        accion: z.enum(['list', 'evaluate', 'trajectory']),
        attractor: z.string().optional(),
        stateJson: z.string().optional(),
        dt: z.number().min(0.001).max(0.1).optional(),
        steps: z.number().int().min(100).max(50000).optional(),
        epsilon: z.number().min(0.0001).max(1).optional(),
      }),
      execute: async ({ accion, attractor, stateJson, dt, steps, epsilon }) => {
        const { listAttractors, evaluateAttractor, createSecondaryIC, isValidState } = await import('../tools/chaos/attractors');
        const { createDualTrailBuffer } = await import('../tools/chaos/trajectory');
        switch (accion) {
          case 'list':
            return { attractors: listAttractors() };
          case 'evaluate': {
            const state = parseJson(stateJson, [0.1, 0, 0]) as readonly [number, number, number];
            if (!isValidState(state)) return { ok: false, error: 'invalid state vector' };
            return { next: evaluateAttractor(attractor ?? 'lorenz', state) };
          }
          case 'trajectory': {
            const state = parseJson(stateJson, [0.1, 0, 0]) as readonly [number, number, number];
            if (!isValidState(state)) return { ok: false, error: 'invalid state vector' };
            const config = {
              attractor: attractor ?? 'lorenz',
              dt: dt ?? 0.005,
              stepsPerFrame: 10,
              maxTrailPoints: Math.min(steps ?? 5000, 50000),
              opacityDecayWindow: 500,
            };
            const buffer = createDualTrailBuffer(config);
            const eps = epsilon ?? 0.001;
            const secondaryIC = createSecondaryIC(state, eps);
            const attractorFn = (await import('../tools/chaos/attractors')).evaluateAttractor;
            let s1 = state;
            let s2 = secondaryIC;
            const n = Math.min(steps ?? 5000, config.maxTrailPoints);
            for (let i = 0; i < n; i++) {
              s1 = attractorFn(config.attractor, s1);
              s2 = attractorFn(config.attractor, s2);
              buffer.pushPrimary(s1[0], s1[1], s1[2]);
              buffer.pushSecondary(s2[0], s2[1], s2[2]);
            }
            return {
              attractor: config.attractor,
              primaryPoints: buffer.getPrimaryCount(),
              secondaryPoints: buffer.getSecondaryCount(),
              note: 'Use the Three.js chaos-game UI for full visualization with Lyapunov estimation.',
            };
          }
          default:
            return { ok: false, error: 'unknown accion' };
        }
      },
    });
  }

  // --- Complexity Router: meta-cognitive query classifier ---
  if (opts.tools?.includes('complexity-router')) {
    tools.complexity_route = tool({
      description: 'Meta-cognitive complexity router: classifies query complexity into reflex/deliberate/meta tiers for fast-path vs slow-path routing. Based on SOFAI/CODA dual-process architecture.',
      parameters: z.object({
        action: z.enum(['classify', 'batch', 'stats']),
        query: z.string().optional(),
        queries: z.array(z.string()).optional(),
      }),
      execute: async (input) => {
        const { complexityRouterTool } = await import('../tools/complexity-router');
        return complexityRouterTool(input as any);
      },
    });
  }

  // --- Blackboard: shared knowledge space ---
  if (opts.tools?.includes('blackboard')) {
    tools.blackboard_manage = tool({
      description: 'Shared knowledge space for cross-agent coordination. Agents write findings, hypotheses, solutions, lessons. Other agents read and build on them. Implements the Blackboard pattern.',
      parameters: z.object({
        action: z.enum(['write', 'read', 'query', 'supersede', 'resolve', 'dismiss', 'compact', 'graph', 'reset']),
        entryId: z.string().optional(),
        supersederId: z.string().optional(),
        newContent: z.string().optional(),
        write: z.object({
          type: z.enum(['finding', 'hypothesis', 'solution', 'metric', 'lesson', 'task']),
          author: z.string(),
          topic: z.string(),
          content: z.string(),
          confidence: z.number().min(0).max(1).optional(),
          tags: z.array(z.string()).optional(),
          dependsOn: z.array(z.string()).optional(),
        }).optional(),
        query: z.object({
          type: z.enum(['finding', 'hypothesis', 'solution', 'metric', 'lesson', 'task']).optional(),
          status: z.enum(['active', 'resolved', 'superseded', 'dismissed']).optional(),
          author: z.string().optional(),
          topic: z.string().optional(),
          tags: z.array(z.string()).optional(),
          limit: z.number().optional(),
        }).optional(),
      }),
      execute: async (input) => {
        const { blackboardTool } = await import('../tools/blackboard');
        return blackboardTool(input as any);
      },
    });
  }

  // --- Batch Executor: parallel fan-out/fan-in ---
  if (opts.tools?.includes('batch-executor')) {
    tools.batch_execute = tool({
      description: 'Parallel fan-out/fan-in task execution. Plans parallel waves of independent tasks, tracks results, handles partial failures. Based on Google ADK ParallelAgent pattern.',
      parameters: z.object({
        action: z.enum(['plan', 'ready', 'complete', 'fail', 'skip', 'stats']),
        planId: z.string().optional(),
        planName: z.string().optional(),
        tasks: z.array(z.object({
          id: z.string().optional(),
          name: z.string(),
          description: z.string().default(''),
          inputs: z.record(z.string()).optional(),
          estimatedMs: z.number().default(1000),
          agent: z.string().optional(),
          dependsOn: z.array(z.string()).default([]),
        })).optional(),
        taskId: z.string().optional(),
        result: z.string().optional(),
        error: z.string().optional(),
        actualMs: z.number().optional(),
      }),
      execute: async (input) => {
        const { batchExecutorTool } = await import('../tools/batch-executor');
        return batchExecutorTool(input as any);
      },
    });
  }

  // --- Perf Optimizer: performance analysis ---
  if (opts.tools?.includes('perf-optimizer')) {
    tools.perf_analyze = tool({
      description: 'Performance analysis and optimization: scans code for anti-patterns (sync fs, serial awaits, barrel imports, N+1 queries), estimates Core Web Vitals budgets, suggests fixes. Keyless, deterministic.',
      parameters: z.object({
        action: z.enum(['scan', 'budget', 'suggest']),
        dir: z.string().optional(),
        ignore: z.array(z.string()).optional(),
        maxFiles: z.number().optional(),
        fileContent: z.string().optional(),
        ruleId: z.string().optional(),
      }),
      execute: async (input) => {
        const { perfOptimizerTool } = await import('../tools/perf-optimizer');
        return perfOptimizerTool(input as any);
      },
    });
  }

  // --- Tech Debt: technical debt tracker ---
  if (opts.tools?.includes('tech-debt')) {
    tools.debt_scan = tool({
      description: 'Technical debt tracker: scans code for TODO/FIXME/HACK markers, deprecated APIs, deep nesting, skipped tests, missing docs. Quantifies effort, prioritizes by impact, generates repayment schedules.',
      parameters: z.object({
        action: z.enum(['scan', 'repayment', 'prioritize']),
        dir: z.string().optional(),
        ignore: z.array(z.string()).optional(),
        maxFiles: z.number().optional(),
        maxHoursPerWeek: z.number().optional(),
        weeks: z.number().optional(),
      }),
      execute: async (input) => {
        const { techDebtTool } = await import('../tools/tech-debt');
        return techDebtTool(input as any);
      },
    });
  }

  // --- Feedback Analyzer: user feedback analysis ---
  if (opts.tools?.includes('feedback-analyzer')) {
    tools.feedback_analyze = tool({
      description: 'User feedback analysis: sentiment classification, feature request extraction, bug triage, feedback clustering by topic, prioritization by frequency and impact. Keyless, deterministic.',
      parameters: z.object({
        action: z.enum(['analyze', 'prioritize', 'trends']),
        feedback: z.array(z.object({
          text: z.string(),
          source: z.string().default('manual'),
          author: z.string().optional(),
          timestamp: z.string().optional(),
        })).optional(),
        report: z.any().optional(),
      }),
      execute: async (input) => {
        const { feedbackAnalyzerTool } = await import('../tools/feedback-analyzer');
        return feedbackAnalyzerTool(input as any);
      },
    });
  }

  // --- Release Manager: version and changelog ---
  if (opts.tools?.includes('release-manager')) {
    tools.release_manage = tool({
      description: 'Release management: parses conventional commits, generates changelogs, detects version bumps, checks deployment readiness (tests/lint/build/security), manages release lifecycle.',
      parameters: z.object({
        action: z.enum(['plan', 'changelog', 'readiness', 'bump']),
        version: z.string().optional(),
        bumpType: z.enum(['major', 'minor', 'patch', 'prerelease']).optional(),
        commits: z.array(z.string()).optional(),
        readiness: z.any().optional(),
      }),
      execute: async (input) => {
        const { releaseManagerTool } = await import('../tools/release-manager');
        return releaseManagerTool(input as any);
      },
    });
  }

  // --- Competitive Intel: market analysis ---
  if (opts.tools?.includes('competitive-intel')) {
    tools.competitive_scan = tool({
      description: 'Competitive intelligence: competitor profiles, feature matrix comparison, SWOT analysis, technology trend tracking, market positioning. Keyless, deterministic.',
      parameters: z.object({
        action: z.enum(['add-competitor', 'matrix', 'swot', 'report', 'compare', 'trends']),
        competitor: z.any().optional(),
        competitors: z.array(z.any()).optional(),
        position: z.any().optional(),
        trends: z.array(z.any()).optional(),
        featureA: z.string().optional(),
        featureB: z.string().optional(),
      }),
      execute: async (input) => {
        const { competitiveIntelTool } = await import('../tools/competitive-intel');
        return competitiveIntelTool(input as any);
      },
    });
  }

  // --- Cache check ---
  const lastUserMsg = [...opts.messages].reverse().find((m) => m.role === 'user');
  const cacheKey = JSON.stringify(opts.messages);
  const cached = responseCache.get(opts.system, cacheKey, opts.model ?? 'default');
  if (cached?.hit) {
    // Return cached response as a stream
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(cached.response));
        controller.close();
      },
    });
    return {
      toDataStreamResponse: () => new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'HIT' },
      }),
    };
  }

  // --- Mem0: inject user memory context (async, fail-soft) ---
  let systemPrompt = opts.system;
  if (opts.userId && lastUserMsg) {
    searchMemories(opts.userId, lastUserMsg.content)
      .then((memories) => {
        if (memories.length > 0) {
          const memBlock = memories.map((m) => `- ${m.memory}`).join('\n');
          // Note: system prompt is already set before stream starts, so we prepend via state
          systemPrompt += `\n\n## Contexto previo del usuario:\n${memBlock}`;
        }
      })
      .catch(() => {}); // Fail-soft
  }

  // --- Wrapped onFinish: store in mem0 + cache ---
  const originalOnFinish = opts.onFinish;
  const wrappedOnFinish = async (result: { text: string }) => {
    // Store in mem0
    if (opts.userId && lastUserMsg) {
      await storeMemory(opts.userId, [
        { role: 'user', content: lastUserMsg.content },
        { role: 'assistant', content: result.text },
      ]);
    }
    // Store in cache
    responseCache.set(opts.system, cacheKey, opts.model ?? 'default', result.text);
    // Call original onFinish
    await originalOnFinish?.(result);
  };

  return streamText({
    model: resolveModel(opts.model),
    system: systemPrompt,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    tools: Object.keys(tools).length ? tools : undefined,
    maxSteps: 4,
    onFinish: wrappedOnFinish,
  });
}
