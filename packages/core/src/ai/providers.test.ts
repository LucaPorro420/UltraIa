import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { modelFor, resolveModel, type ProviderName } from './llm';
import { AiUnavailableError } from './gateway';
import { FREE_MODEL_CATALOG, listFreeModels, freeModelsByProvider, catalogStats } from './model-catalog';

function clearProviderEnv() {
  for (const k of [
    'OPENROUTER_API_KEY',
    'GROQ_API_KEY',
    'MISTRAL_API_KEY',
    'TOGETHER_API_KEY',
    'HUGGINGFACE_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'DEEPSEEK_API_KEY',
    'DASHSCOPE_API_KEY',
  ]) {
    delete process.env[k];
  }
}

describe('modelFor (explicit provider+model, no local fallback)', () => {
  const prev: Record<string, string | undefined> = {};
  beforeEach(() => {
    clearProviderEnv();
    prev.ULTRAIA_PROVIDER = process.env.ULTRAIA_PROVIDER;
  });
  afterEach(() => {
    clearProviderEnv();
    if (prev.ULTRAIA_PROVIDER === undefined) delete process.env.ULTRAIA_PROVIDER;
    else process.env.ULTRAIA_PROVIDER = prev.ULTRAIA_PROVIDER;
  });

  it('throws AiUnavailableError when the provider key is missing', () => {
    expect(() => modelFor('openrouter', 'google/gemma-2-9b-it:free')).toThrow(AiUnavailableError);
    expect(() => modelFor('groq', 'llama-3.1-8b-instant')).toThrow(AiUnavailableError);
    expect(() => modelFor('mistral', 'mistral-small-latest')).toThrow(AiUnavailableError);
    expect(() => modelFor('together', 'meta-llama/Llama-3.1-8B-Instruct')).toThrow(AiUnavailableError);
    expect(() => modelFor('huggingface', 'meta-llama/Llama-3.1-8B-Instruct')).toThrow(AiUnavailableError);
  });

  it('returns a defined model when the provider key is present', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    expect(modelFor('openrouter', 'google/gemma-2-9b-it:free')).toBeDefined();
    // default-name path also works
    process.env.GROQ_API_KEY = 'gsk-test';
    expect(modelFor('groq')).toBeDefined();
  });

  it('accepts every ProviderName union value without throwing at build time (key set)', () => {
    const keys: Record<ProviderName, string> = {
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY',
      ollama: 'OPENAI_API_KEY', // not used for key check
      lmstudio: 'OPENAI_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      qwen: 'DASHSCOPE_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      groq: 'GROQ_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      together: 'TOGETHER_API_KEY',
      huggingface: 'HUGGINGFACE_API_KEY',
    };
    for (const p of Object.keys(keys) as ProviderName[]) {
      if (p === 'ollama' || p === 'lmstudio') {
        // local providers never throw (no key required)
        expect(modelFor(p, 'x')).toBeDefined();
        continue;
      }
      process.env[keys[p]] = 'test-key';
      expect(() => modelFor(p, 'x')).not.toThrow();
    }
  });
});

describe('resolveModel local-first fallback masks missing keys', () => {
  const prev = { ULTRAIA_PROVIDER: process.env.ULTRAIA_PROVIDER, OPENROUTER: process.env.OPENROUTER_API_KEY };
  beforeEach(() => clearProviderEnv());
  afterEach(() => {
    clearProviderEnv();
    if (prev.ULTRAIA_PROVIDER === undefined) delete process.env.ULTRAIA_PROVIDER;
    else process.env.ULTRAIA_PROVIDER = prev.ULTRAIA_PROVIDER;
    if (prev.OPENROUTER === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prev.OPENROUTER;
  });

  it('does not throw for a keyless remote provider (falls back to local ollama/lmstudio)', () => {
    process.env.ULTRAIA_PROVIDER = 'openrouter';
    expect(() => resolveModel('google/gemma-2-9b-it:free')).not.toThrow();
    expect(resolveModel('google/gemma-2-9b-it:free')).toBeDefined();
  });
});

describe('FREE_MODEL_CATALOG', () => {
  it('has a well-formed, unique catalog', () => {
    expect(FREE_MODEL_CATALOG.length).toBeGreaterThan(15);
    const ids = new Set(FREE_MODEL_CATALOG.map((m) => `${m.provider}:${m.id}`));
    expect(ids.size).toBe(FREE_MODEL_CATALOG.length);
    for (const m of FREE_MODEL_CATALOG) {
      expect(m.contextTokens).toBeGreaterThan(0);
      expect(['fast', 'balanced', 'reasoning', 'coding', 'vision']).toContain(m.tier);
    }
  });

  it('keylessOnly returns only OpenRouter :free models', () => {
    const keyless = listFreeModels({ keylessOnly: true });
    expect(keyless.length).toBeGreaterThan(0);
    expect(keyless.every((m) => m.keyless && m.provider === 'openrouter')).toBe(true);
    expect(keyless.every((m) => m.id.endsWith(':free'))).toBe(true);
  });

  it('groups by provider and tier', () => {
    const stats = catalogStats();
    expect(stats.total).toBe(FREE_MODEL_CATALOG.length);
    expect(stats.keyless).toBeGreaterThan(0);
    expect(stats.byProvider['openrouter']).toBeGreaterThan(0);
    expect(Object.keys(stats.byTier).length).toBeGreaterThan(0);
  });

  it('freeModelsByProvider filters correctly', () => {
    expect(freeModelsByProvider('groq').some((m) => m.id.includes('llama'))).toBe(true);
    expect(freeModelsByProvider('openrouter').every((m) => m.keyless)).toBe(true);
  });
});
