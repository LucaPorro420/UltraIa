import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelOrchestrator } from './orchestrator';
import { AiUnavailableError } from './gateway';

const ALL_KEYS = [
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'DEEPSEEK_API_KEY',
  'DASHSCOPE_API_KEY',
  'OPENROUTER_API_KEY',
  'GROQ_API_KEY',
  'MISTRAL_API_KEY',
  'TOGETHER_API_KEY',
  'HUGGINGFACE_API_KEY',
];

describe('ModelOrchestrator', () => {
  let orch: ModelOrchestrator;
  beforeEach(() => {
    for (const k of ALL_KEYS) delete process.env[k];
    orch = new ModelOrchestrator();
  });
  afterEach(() => {
    for (const k of ALL_KEYS) delete process.env[k];
  });

  it('availableProviders always includes local ollama/lmstudio; adds keyed ones', () => {
    expect(orch.availableProviders()).toContain('ollama');
    expect(orch.availableProviders()).toContain('lmstudio');
    expect(orch.availableProviders()).not.toContain('openrouter');
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    expect(orch.availableProviders()).toContain('openrouter');
  });

  it('candidatesFor returns a non-empty, keyless-first list for a task tier', () => {
    const c = orch.candidatesFor({ taskType: 'chat' });
    expect(c.length).toBeGreaterThan(0);
    // keyless openrouter models first
    expect(c[0].provider).toBe('openrouter');
    expect(c[0].model.endsWith(':free')).toBe(true);
    // local fallback always present at the end
    expect(c[c.length - 1].provider).toBe('lmstudio');
    expect(c[c.length - 2].provider).toBe('ollama');
  });

  it('recommend returns the first candidate', () => {
    const r = orch.recommend({ taskType: 'coding' });
    expect(r.provider).toBe('openrouter'); // keyless :free coding model (e.g. cohere/north-mini-code)
    expect(r.model).toContain('code');
  });

  it('buildSystemContext injects mode + strategy guidance', () => {
    const sys = orch.buildSystemContext({ mode: 'P-B' }, 'Eres util.');
    expect(sys).toContain('Eres util.');
    expect(sys).toContain('MODO: P-B');
    expect(sys).toContain('agentic');
  });

  it('route throws AiUnavailableError when the forced provider key is missing', async () => {
    await expect(orch.route({ provider: 'groq', model: 'llama-3.1-8b-instant' })).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });

  it('route returns a model when the provider key is present', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    const m = await orch.route({ provider: 'openrouter', model: 'google/gemma-2-9b-it:free' });
    expect(m).toBeDefined();
  });

  it('withFailover retries the next candidate after a runtime error and succeeds', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    const fn = vi.fn().mockRejectedValueOnce(new Error('simulated 5xx')).mockResolvedValue('ok');
    const result = await orch.withFailover(fn, { taskType: 'chat' });
    expect(result).toBe('ok');
    // first candidate built+failed, second built+succeeded
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('withFailover throws after exhausting all candidates', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(orch.withFailover(fn, { taskType: 'chat' })).rejects.toThrow();
    expect(fn.mock.calls.length).toBeGreaterThan(1);
  });

  it('mode adjusts the selected tier (P-P -> reasoning)', () => {
    const r = orch.recommend({ mode: 'P-P' });
    expect(r.tier).toBe('reasoning');
  });
});
