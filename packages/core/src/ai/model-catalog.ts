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
 * orchestrator routes against. `:free` ids are stable on OpenRouter; the rest are the
 * vendor free-tier defaults (require their own key).
 */
export const FREE_MODEL_CATALOG: FreeModelSpec[] = [
  // --- OpenRouter keyless `:free` tier (ONLY OpenRouter key needed) ---
  { id: 'google/gemma-2-9b-it:free', provider: 'openrouter', label: 'Gemma 2 9B', tier: 'balanced', contextTokens: 8192, keyless: true },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', provider: 'openrouter', label: 'Llama 3.1 8B', tier: 'balanced', contextTokens: 8192, keyless: true },
  { id: 'meta-llama/llama-3.2-3b-instruct:free', provider: 'openrouter', label: 'Llama 3.2 3B', tier: 'fast', contextTokens: 8192, keyless: true },
  { id: 'mistralai/mistral-7b-instruct:free', provider: 'openrouter', label: 'Mistral 7B', tier: 'balanced', contextTokens: 8192, keyless: true },
  { id: 'qwen/qwen2.5-7b-instruct:free', provider: 'openrouter', label: 'Qwen 2.5 7B', tier: 'balanced', contextTokens: 32768, keyless: true },
  { id: 'qwen/qwen2.5-coder-7b-instruct:free', provider: 'openrouter', label: 'Qwen 2.5 Coder 7B', tier: 'coding', contextTokens: 32768, keyless: true },
  { id: 'deepseek/deepseek-r1-distill-llama-70b:free', provider: 'openrouter', label: 'DeepSeek R1 Distill 70B', tier: 'reasoning', contextTokens: 131072, keyless: true },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct:free', provider: 'openrouter', label: 'Nemotron 70B', tier: 'balanced', contextTokens: 131072, keyless: true },
  { id: 'cognitivecomputations/dolphin-mixtral-8x7b:free', provider: 'openrouter', label: 'Dolphin Mixtral 8x7B', tier: 'balanced', contextTokens: 32768, keyless: true },
  { id: 'thedrummer/unsloth-llama-3.3-70b:free', provider: 'openrouter', label: 'Llama 3.3 70B (Unsloth)', tier: 'balanced', contextTokens: 131072, keyless: true },

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
