export interface MeigenGenerateOptions {
  prompt: string;
  modelId?: string;
  aspectRatio?: string;
  resolution?: string;
  quality?: 'low' | 'medium' | 'high';
  referenceImages?: string[];
  duration?: number;
  tier?: string;
  idempotencyKey?: string;
}

export interface MeigenImageResult {
  prompt: string;
  url: string;
  modelId: string;
  aspectRatio: string;
  generationId: string;
  creditsUsed: number;
  /** Midjourney-style models return multiple candidates. */
  candidates: string[];
}

export interface MeigenModelInfo {
  id: string;
  name: string;
  provider: string;
  media_type: 'image' | 'video';
  supported_ratios: string[];
  max_reference_images: number;
  estimatedTiming?: { p50?: number; p90?: number };
}

const API_BASE = 'https://www.meigen.ai/api';
const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 5 * 60_000;
const POLL_INTERVAL_MS = 4_000;
const DEFAULT_MODEL = 'gpt-image-2';
const MODEL_CACHE_TTL_MS = 60 * 60_000;

let modelCache: { at: number; models: MeigenModelInfo[] } | null = null;

function apiKey(): string {
  const key = process.env.MEIGEN_API_TOKEN || '';
  if (!key) throw new Error('MEIGEN_API_TOKEN is not set — MeiGen cloud provider is disabled');
  return key;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`MeiGen request failed: ${(e as Error).message}`);
  }
  clearTimeout(timer);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`MeiGen API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

interface GenerateResponse {
  success?: boolean;
  generationId?: string;
  status?: string;
  creditsUsed?: number;
  modelId?: string;
  aspectRatio?: string;
}

interface StatusResponse {
  status?: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  mediaType?: string;
  error?: string | null;
  aspectRatio?: string;
  pollHintSeconds?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** List active MeiGen models (public endpoint, no auth). Cached 1h — the API itself caches too. */
export async function listMeigenModels(): Promise<MeigenModelInfo[]> {
  if (modelCache && Date.now() - modelCache.at < MODEL_CACHE_TTL_MS) return modelCache.models;
  const data = await fetchJson<{ success: boolean; models: MeigenModelInfo[] }>('/models?active=true');
  const models = Array.isArray(data.models) ? data.models : [];
  modelCache = { at: Date.now(), models };
  return models;
}

/**
 * Generate an image with MeiGen cloud (GPT Image 2, Nanobanana, Midjourney…).
 * Async job: submits, then polls GET /api/generate/v2/status/:id until completed.
 * Docs: https://docs.meigen.ai/en/api-reference/endpoint/generate.md
 */
export async function generateMeigenImage(opts: MeigenGenerateOptions): Promise<MeigenImageResult> {
  const prompt = (opts.prompt || '').trim();
  if (!prompt) throw new Error('Prompt is required');
  if (prompt.length > 4000) throw new Error('Prompt too long (max 4000 chars)');
  const key = apiKey();

  const body: Record<string, unknown> = {
    prompt,
    modelId: opts.modelId || DEFAULT_MODEL,
  };
  if (opts.aspectRatio) body.aspectRatio = opts.aspectRatio;
  if (opts.resolution) body.resolution = opts.resolution;
  if (opts.quality) body.quality = opts.quality;
  if (opts.referenceImages?.length) body.referenceImages = opts.referenceImages;
  if (opts.duration) body.duration = opts.duration;
  if (opts.tier) body.tier = opts.tier;
  if (opts.idempotencyKey) body.idempotencyKey = opts.idempotencyKey;

  const submitted = await fetchJson<GenerateResponse>('/generate/v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!submitted.generationId) {
    throw new Error(`MeiGen did not return a generationId (success=${String(submitted.success)})`);
  }
  const generationId = submitted.generationId;

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const status = await fetchJson<StatusResponse>(`/generate/v2/status/${generationId}`);
    if (status.status === 'completed') {
      const candidates = (status.imageUrls || []).filter(Boolean);
      const url = status.imageUrl || candidates[0] || '';
      if (!url) throw new Error('MeiGen completed but returned no image URL');
      return {
        prompt,
        url,
        modelId: body.modelId as string,
        aspectRatio: status.aspectRatio || opts.aspectRatio || 'auto',
        generationId,
        creditsUsed: submitted.creditsUsed ?? 0,
        candidates,
      };
    }
    if (status.status === 'failed') {
      throw new Error(`MeiGen generation failed: ${status.error || 'unknown error'}`);
    }
    if (status.status && status.status !== 'processing' && status.status !== 'queued') {
      throw new Error(`MeiGen generation ended with unexpected status "${status.status}"`);
    }
    if (Date.now() > deadline) {
      throw new Error(`MeiGen generation timed out after ${POLL_TIMEOUT_MS / 1000}s`);
    }
    const hint = status.pollHintSeconds ?? POLL_INTERVAL_MS / 1000;
    await sleep(Math.max(1_500, Math.min(hint * 1000, 10_000)));
  }
}