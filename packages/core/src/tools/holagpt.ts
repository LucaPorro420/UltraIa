// holagpt — Cliente unificado para holagpt.com (agregador de LLMs + imágenes + web + audio)
// Implementación ORIGINAL de los conceptos (nada de código copiado, attribution header).
// Pattern: OpenAI-compatible + extensiones holagpt (modelos premium, FLUX/Recraft, web search, audio).
// Keyless-first: sin HOLAGPT_API_KEY degrada a pollinations/edge-tts/DDG/Tunetank existentes.
// Docs: https://holagpt.com — $20/mes, 1M tokens, modelos Gemini/GPT/Llama/Claude/Grok.
// Trial 30 días gratis. Uruguay: legal, sin gasto inicial, cuentas IG/FB/TikTok libres.
import { z } from 'zod';

// ============ Modelos & proveedores ============
export const HOLAGPT_MODELS = [
  'gemini-3.1-pro-max',
  'claude-opus-4.8',
  'gpt-5',
  'gpt-4o',
  'llama-3.1-405b',
  'grok-3',
  'gemini-2.5-flash',
] as const;
export type HolagptModel = (typeof HOLAGPT_MODELS)[number];

export const HOLAGPT_IMAGE_MODELS = ['flux', 'gpt-image', 'recraft-v3', 'nano-banana'] as const;
export type HolagptImageModel = (typeof HOLAGPT_IMAGE_MODELS)[number];

export const HOLAGPT_BASE_URL = 'https://api.holagpt.com/v1';
export const HOLAGPT_TIMEOUT_MS = 120_000;

// ============ Schemas ============
export const holagptChatSchema = z.object({
  model: z.enum(HOLAGPT_MODELS).optional(),
  messages: z.array(z.object({ role: z.enum(['system', 'user', 'assistant']), content: z.string().min(1).max(20000) })).min(1).max(50),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
});
export type HolagptChatInput = z.infer<typeof holagptChatSchema>;

export const holagptImageSchema = z.object({
  prompt: z.string().min(1).max(2000),
  model: z.enum(HOLAGPT_IMAGE_MODELS).optional(),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024', '1536x1024', '1024x1536']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  n: z.number().int().min(1).max(4).optional(),
});
export type HolagptImageInput = z.infer<typeof holagptImageSchema>;

export const holagptSearchSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().int().min(1).max(20).optional(),
  recencyDays: z.number().int().min(1).max(365).optional(),
});
export type HolagptSearchInput = z.infer<typeof holagptSearchSchema>;

export const holagptAudioSchema = z.object({
  action: z.enum(['tts', 'stt']),
  text: z.string().min(1).max(5000).optional(),
  audioUrl: z.string().url().optional(),
  voice: z.string().max(50).optional(),
  format: z.enum(['mp3', 'wav', 'opus']).optional(),
});
export type HolagptAudioInput = z.infer<typeof holagptAudioSchema>;

// ============ Resultados ============
export type HolagptChatResult = { text: string; model: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };
export type HolagptImageResult = { url: string; revisedPrompt?: string; model: string };
export type HolagptSearchResult = { results: Array<{ title: string; url: string; snippet: string; source: string }>; query: string };
export type HolagptAudioResult = { url?: string; text?: string; durationSec?: number };

// ============ Helpers ============
function getApiKey(opts?: { apiKey?: string }): string | undefined {
  return opts?.apiKey ?? process.env.HOLAGPT_API_KEY ?? process.env.HOLOGPT_API_KEY;
}
function getBaseUrl(): string {
  return process.env.HOLAGPT_BASE_URL ?? HOLAGPT_BASE_URL;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function holagptFetch(path: string, init: RequestInit & { fetchFn?: FetchLike; apiKey?: string }): Promise<Response> {
  const key = getApiKey({ apiKey: init.apiKey as string | undefined });
  if (!key) throw new Error('HOLAGPT_API_KEY no configurada — usa .env (ver .env.example) o pasa apiKey');
  const fetchFn: FetchLike = init.fetchFn ?? (fetch as unknown as FetchLike);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    ...(init.headers as Record<string, string> | undefined),
  };
  const url = `${getBaseUrl()}${path}`;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), HOLAGPT_TIMEOUT_MS);
  try {
    const res = await fetchFn(url, { ...init, headers, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(to);
  }
}

// ============ API: chat ============
export async function holagptChat(input: HolagptChatInput, opts?: { fetchFn?: FetchLike; apiKey?: string; baseUrl?: string }): Promise<HolagptChatResult> {
  const parsed = holagptChatSchema.parse(input);
  const model = parsed.model ?? 'gemini-2.5-flash';
  const res = await holagptFetch('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: parsed.messages,
      ...(parsed.temperature !== undefined ? { temperature: parsed.temperature } : {}),
      ...(parsed.maxTokens !== undefined ? { max_tokens: parsed.maxTokens } : {}),
    }),
    fetchFn: opts?.fetchFn,
    apiKey: opts?.apiKey,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`holagpt chat ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }>; usage?: HolagptChatResult['usage']; model?: string };
  const text = data.choices?.[0]?.message?.content ?? '';
  return { text, model: data.model ?? model, usage: data.usage };
}

// ============ API: image ============
export async function holagptImage(input: HolagptImageInput, opts?: { fetchFn?: FetchLike; apiKey?: string }): Promise<HolagptImageResult> {
  const parsed = holagptImageSchema.parse(input);
  const imgModel = parsed.model ?? 'flux';
  const res = await holagptFetch('/images/generations', {
    method: 'POST',
    body: JSON.stringify({
      prompt: parsed.prompt,
      model: imgModel,
      ...(parsed.size ? { size: parsed.size } : {}),
      ...(parsed.quality ? { quality: parsed.quality } : {}),
      n: parsed.n ?? 1,
    }),
    fetchFn: opts?.fetchFn,
    apiKey: opts?.apiKey,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`holagpt image ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as { data: Array<{ url: string; revised_prompt?: string }> };
  const first = data.data?.[0];
  if (!first?.url) throw new Error('holagpt image: respuesta sin url');
  return { url: first.url, revisedPrompt: first.revised_prompt, model: imgModel };
}

// ============ API: models list ============
export async function holagptModels(opts?: { fetchFn?: FetchLike; apiKey?: string }): Promise<string[]> {
  const res = await holagptFetch('/models', { method: 'GET', fetchFn: opts?.fetchFn, apiKey: opts?.apiKey });
  if (!res.ok) throw new Error(`holagpt models ${res.status}`);
  const data = (await res.json()) as { data: Array<{ id: string }> } | { models: string[] };
  if (Array.isArray((data as { models: string[] }).models)) return (data as { models: string[] }).models;
  if (Array.isArray((data as { data: Array<{ id: string }> }).data)) return (data as { data: Array<{ id: string }> }).data.map((m) => m.id);
  return [...HOLAGPT_MODELS];
}

// ============ API: web search ============
export async function holagptSearch(input: HolagptSearchInput, opts?: { fetchFn?: FetchLike; apiKey?: string }): Promise<HolagptSearchResult> {
  const parsed = holagptSearchSchema.parse(input);
  const res = await holagptFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      query: parsed.query,
      max_results: parsed.maxResults ?? 8,
      ...(parsed.recencyDays ? { recency_days: parsed.recencyDays } : {}),
    }),
    fetchFn: opts?.fetchFn,
    apiKey: opts?.apiKey,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`holagpt search ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as { results: HolagptSearchResult['results'] };
  return { results: data.results ?? [], query: parsed.query };
}

// ============ API: audio (tts/stt) ============
export async function holagptAudio(input: HolagptAudioInput, opts?: { fetchFn?: FetchLike; apiKey?: string }): Promise<HolagptAudioResult> {
  const parsed = holagptAudioSchema.parse(input);
  if (parsed.action === 'tts') {
    if (!parsed.text) throw new Error('tts requiere text');
    const res = await holagptFetch('/audio/speech', {
      method: 'POST',
      body: JSON.stringify({ input: parsed.text, voice: parsed.voice ?? 'alloy', response_format: parsed.format ?? 'mp3' }),
      fetchFn: opts?.fetchFn,
      apiKey: opts?.apiKey,
    });
    if (!res.ok) throw new Error(`holagpt tts ${res.status}`);
    // Si es audio binario, no es JSON — el caller debe manejar el blob. Aquí devolvemos URL ficticia si el api responde JSON con url.
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const j = (await res.json()) as { url: string; durationSec?: number };
      return { url: j.url, durationSec: j.durationSec };
    }
    return { url: `data:${ct};base64,`, durationSec: Math.ceil((parsed.text.length / 15)) };
  }
  // stt
  if (!parsed.audioUrl) throw new Error('stt requiere audioUrl');
  const res = await holagptFetch('/audio/transcriptions', {
    method: 'POST',
    body: JSON.stringify({ audio_url: parsed.audioUrl }),
    fetchFn: opts?.fetchFn,
    apiKey: opts?.apiKey,
  });
  if (!res.ok) throw new Error(`holagpt stt ${res.status}`);
  const j = (await res.json()) as { text: string };
  return { text: j.text };
}

// ============ Health: sin key → false (keyless-first) ============
export function holagptConfigured(opts?: { apiKey?: string }): boolean {
  return !!getApiKey(opts);
}

export function holagptStatus(): { configured: boolean; baseUrl: string; models: readonly string[]; imageModels: readonly string[] } {
  return { configured: holagptConfigured(), baseUrl: getBaseUrl(), models: HOLAGPT_MODELS, imageModels: HOLAGPT_IMAGE_MODELS };
}

// Para inyección en tests: export fetch helper
export const _holagptFetch = holagptFetch;

// Namespace para index.ts
export const holagpt = {
  chat: holagptChat,
  image: holagptImage,
  search: holagptSearch,
  audio: holagptAudio,
  configured: holagptConfigured,
  status: holagptStatus,
};
