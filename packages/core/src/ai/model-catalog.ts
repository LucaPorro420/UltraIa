// model-catalog.ts — curated catalog of FREE models across all supported providers.
//
// Keyless rule: OpenRouter `:free` models need ONLY the OPENROUTER_API_KEY (no per-vendor key).
// The free-tier models of other providers need their OWN free key (fail-soft when absent).
//
// This module is dependency-free and deterministic so it can be unit-tested offline. The
// orchestrator (ai/orchestrator.ts) consumes it for routing; docs/ORQUESTADOR-MODELOS.md
// documents "qué usar para qué".

import type { ProviderName } from './llm';

export type ModelTier = 'fast' | 'balanced' | 'reasoning' | 'coding' | 'vision';

export interface FreeModelSpec {
  /** Model id as passed to the provider SDK (e.g. 'google/gemma-2-9b-it:free'). */
  id: string;
  provider: ProviderName;
  label: string;
  tier: ModelTier;
  contextTokens: number;
  /** true => only the OPENROUTER_API_KEY is required (the `:free` OpenRouter tier). */
  keyless: boolean;
  notes?: string;
}

/**
 * Curated, starting catalog. Add/remove freely — this is the single source of truth the
 * orchestrator routes against. `:free` ids ROTATE on OpenRouter (they get retired
 * periodically) — refresh this block against https://openrouter.ai/api/v1/models
 * (pricing prompt+completion == '0') when routing starts hitting "No endpoints".
 * The rest are vendor free-tier defaults (require their own key).
 */
export const FREE_MODEL_CATALOG: FreeModelSpec[] = [
  // --- OpenRouter keyless `:free` tier (ONLY OpenRouter key needed) ---
  { id: 'liquid/lfm-2.5-2.6b:free', provider: 'openrouter', label: 'LFM 2.5 2.6B', tier: 'fast', contextTokens: 65536, keyless: true },
  { id: 'inclusionai/ling-3.0-flash-fin:free', provider: 'openrouter', label: 'Ling 3.0 Flash', tier: 'fast', contextTokens: 262144, keyless: true },
  { id: 'nvidia/nemotron-3.5-lightning:free', provider: 'openrouter', label: 'Nemotron 3.5 Lightning', tier: 'balanced', contextTokens: 1000000, keyless: true },
  { id: 'z-ai/glm-5.2:free', provider: 'openrouter', label: 'GLM 5.2', tier: 'balanced', contextTokens: 256000, keyless: true },
  { id: 'cohere/north-mini-code:free', provider: 'openrouter', label: 'North Mini Code', tier: 'coding', contextTokens: 256000, keyless: true },
  { id: 'poolside/laguna-s-2.1:free', provider: 'openrouter', label: 'Laguna S 2.1', tier: 'coding', contextTokens: 262144, keyless: true },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', provider: 'openrouter', label: 'Nemotron 3 Ultra 550B', tier: 'reasoning', contextTokens: 1000000, keyless: true },
  { id: 'thinkingmachines/inkling:free', provider: 'openrouter', label: 'Inkling (vision+audio)', tier: 'vision', contextTokens: 1048576, keyless: true },

  // --- Vendor free tiers (need their OWN free key; fail-soft when absent) ---
  { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash', tier: 'balanced', contextTokens: 1048576, keyless: false, notes: 'Visión + razonamiento, 1M ctx' },
  { id: 'gemini-2.5-flash-lite', provider: 'google', label: 'Gemini 2.5 Flash Lite', tier: 'fast', contextTokens: 1048576, keyless: false },
  { id: 'deepseek-chat', provider: 'deepseek', label: 'DeepSeek Chat', tier: 'balanced', contextTokens: 65536, keyless: false, notes: 'Razonamiento fuerte, barato' },
  { id: 'deepseek-reasoner', provider: 'deepseek', label: 'DeepSeek Reasoner', tier: 'reasoning', contextTokens: 65536, keyless: false },
  { id: 'qwen3.8-max-preview', provider: 'qwen', label: 'Qwen 3.8 Max', tier: 'balanced', contextTokens: 1000000, keyless: false, notes: 'Thinking mode + 1M ctx' },
  { id: 'qwen-plus', provider: 'qwen', label: 'Qwen Plus', tier: 'fast', contextTokens: 131072, keyless: false },
  { id: 'llama-3.1-8b-instant', provider: 'groq', label: 'Llama 3.1 8B Instant', tier: 'fast', contextTokens: 8192, keyless: false, notes: 'Latencia ultra-baja' },
  { id: 'llama-3.3-70b-versatile', provider: 'groq', label: 'Llama 3.3 70B Versatile', tier: 'balanced', contextTokens: 131072, keyless: false },
  { id: 'mistral-small-latest', provider: 'mistral', label: 'Mistral Small', tier: 'balanced', contextTokens: 32768, keyless: false },
  { id: 'open-mistral-7b', provider: 'mistral', label: 'Open Mistral 7B', tier: 'fast', contextTokens: 32768, keyless: false },
  { id: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo', provider: 'together', label: 'Llama 3.2 11B Vision', tier: 'vision', contextTokens: 16384, keyless: false, notes: 'Visión' },
  { id: 'meta-llama/Llama-3.1-8B-Instruct', provider: 'together', label: 'Llama 3.1 8B', tier: 'balanced', contextTokens: 131072, keyless: false },
  { id: 'meta-llama/Llama-3.1-8B-Instruct', provider: 'huggingface', label: 'Llama 3.1 8B (HF)', tier: 'balanced', contextTokens: 131072, keyless: false },
];

export function listFreeModels(opts: { provider?: ProviderName; tier?: ModelTier; keylessOnly?: boolean } = {}): FreeModelSpec[] {
  return FREE_MODEL_CATALOG.filter((m) => {
    if (opts.provider && m.provider !== opts.provider) return false;
    if (opts.tier && m.tier !== opts.tier) return false;
    if (opts.keylessOnly && !m.keyless) return false;
    return true;
  });
}

export function freeModelsByProvider(provider: ProviderName): FreeModelSpec[] {
  return listFreeModels({ provider });
}

export function catalogStats(): { total: number; keyless: number; byProvider: Record<string, number>; byTier: Record<string, number> } {
  const byProvider: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  let keyless = 0;
  for (const m of FREE_MODEL_CATALOG) {
    byProvider[m.provider] = (byProvider[m.provider] || 0) + 1;
    byTier[m.tier] = (byTier[m.tier] || 0) + 1;
    if (m.keyless) keyless++;
  }
  return { total: FREE_MODEL_CATALOG.length, keyless, byProvider, byTier };
}
