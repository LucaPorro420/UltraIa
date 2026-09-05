import { FREE_MODEL_CATALOG } from './model-catalog';
import { ModelOrchestrator, type RouteRequest } from './orchestrator';
import type { ProviderName } from './llm';
import { latencyTracker } from './provider-stats';
import type { ProviderStatus, ProviderStrategy, RoutingSummary } from './contracts';
import type { ModelTier } from './model-catalog';

const TIER_BY_STRATEGY: Record<ProviderStrategy, ModelTier> = {
  fast: 'fast',
  balanced: 'balanced',
  quality: 'reasoning',
  'local-first': 'balanced',
};

const PROVIDER_CAPABILITIES: Partial<Record<ProviderName, string[]>> = {
  ollama: ['local', 'chat', 'coding'],
  lmstudio: ['local', 'chat', 'coding'],
  openrouter: ['chat', 'coding', 'reasoning', 'vision'],
  google: ['chat', 'reasoning', 'vision'],
  deepseek: ['chat', 'reasoning'],
  qwen: ['chat', 'reasoning', 'coding'],
  groq: ['chat', 'fast'],
  mistral: ['chat', 'coding'],
  together: ['chat', 'vision'],
  huggingface: ['chat', 'coding'],
  openai: ['chat', 'reasoning', 'vision'],
};

function envKey(provider: ProviderName): string | null {
  const keys: Partial<Record<ProviderName, string>> = {
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    qwen: 'DASHSCOPE_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
    groq: 'GROQ_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    together: 'TOGETHER_API_KEY',
    huggingface: 'HUGGINGFACE_API_KEY',
  };
  return keys[provider] ?? null;
}

export function providerStatus(orchestrator = new ModelOrchestrator()): ProviderStatus[] {
  const providers = [...new Set(FREE_MODEL_CATALOG.map((model) => model.provider).concat(['ollama', 'lmstudio']))] as ProviderName[];
  const available = new Set(orchestrator.availableProviders());
  return providers.sort().map((provider) => {
    const models = FREE_MODEL_CATALOG.filter((model) => model.provider === provider);
    const tracked = latencyTracker.scoreboard().filter((row) => row.provider === provider);
    const latencyMs = tracked.length
      ? Math.round(tracked.reduce((sum, row) => sum + row.latencyP50, 0) / tracked.length)
      : null;
    const lastHealthCheck = tracked.length
      ? Math.max(...tracked.map((row) => row.lastHealthCheck || row.lastUsed || 0)) || null
      : null;
    const down = tracked.some((row) => row.status === 'down');
    const configured = provider === 'ollama' || provider === 'lmstudio' || Boolean(envKey(provider) && process.env[envKey(provider)!]);
    return {
      provider,
      configured,
      available: available.has(provider) && !down,
      capabilities: [...new Set((PROVIDER_CAPABILITIES[provider] ?? []).concat(models.map((model) => model.tier)))].sort(),
      status: !available.has(provider) || down ? 'unavailable' : tracked.some((row) => row.status === 'degraded') ? 'degraded' : 'healthy',
      latencyMs,
      lastHealthCheck,
      reason: !configured ? 'not_configured' : down ? 'health_check_failed' : null,
    } satisfies ProviderStatus;
  });
}

export function routingSummary(
  request: Omit<RouteRequest, 'strategy'> & { strategy?: ProviderStrategy } = {},
  orchestrator = new ModelOrchestrator(),
): RoutingSummary {
  const strategy = request.strategy ?? 'balanced';
  const { strategy: _strategy, ...routeReq } = request;
  const candidates = orchestrator.candidatesFor(routeReq);
  const available = new Set(orchestrator.availableProviders());
  const selectedIndex = candidates.findIndex((candidate) => available.has(candidate.provider));
  const selected = candidates[Math.max(0, selectedIndex)];
  const fallbackCount = selectedIndex > 0 ? selectedIndex : 0;
  return {
    strategy,
    tier: selected?.spec?.tier ?? request.tier ?? TIER_BY_STRATEGY[strategy],
    provider: selected?.provider ?? 'unknown',
    model: selected?.model ?? 'unknown',
    fallbackCount,
    reason: selectedIndex > 0 ? 'preferred_candidate_unavailable' : strategy === 'local-first' ? 'local_first_strategy' : 'catalog_priority',
  };
}
