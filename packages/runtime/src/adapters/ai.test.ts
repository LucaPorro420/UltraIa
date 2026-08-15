import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCoreAiGateway } from './ai';

const ENV_KEYS = ['ULTRAIA_PROVIDER', 'ULTRAIA_MODEL', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'] as const;

describe('createCoreAiGateway', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('defaults to ollama (local, no keys) and pings healthy', async () => {
    const ai = createCoreAiGateway();
    expect(ai.kind).toBe('ai');
    expect(ai.name).toBe('ai');
    expect(ai.provider).toBe('ollama');
    expect(ai.gateway).toBeDefined();
    expect(await ai.ping()).toBe(true);
    await ai.close();
  });

  it('google without GOOGLE_API_KEY pings unhealthy', async () => {
    const ai = createCoreAiGateway({ provider: 'google' });
    expect(ai.provider).toBe('google');
    expect(await ai.ping()).toBe(false);
  });

  it('google with a key pings healthy', async () => {
    process.env.GOOGLE_API_KEY = 'fake-key-for-test';
    const ai = createCoreAiGateway({ provider: 'google' });
    expect(await ai.ping()).toBe(true);
  });

  it('deepseek/openai without keys ping unhealthy', async () => {
    expect(await createCoreAiGateway({ provider: 'deepseek' }).ping()).toBe(false);
    expect(await createCoreAiGateway({ provider: 'openai' }).ping()).toBe(false);
  });

  it('applies model override and sets ULTRAIA_MODEL', async () => {
    const ai = createCoreAiGateway({ model: 'llama3.1' });
    expect(ai.model).toBe('llama3.1');
    expect(process.env.ULTRAIA_MODEL).toBe('llama3.1');
    expect(await ai.ping()).toBe(true);
  });

  it('does not clobber an existing ULTRAIA_PROVIDER when not provided', async () => {
    process.env.ULTRAIA_PROVIDER = 'google';
    const ai = createCoreAiGateway();
    expect(ai.provider).toBe('google');
  });

  it('close is a no-op (idempotent)', async () => {
    const ai = createCoreAiGateway();
    await ai.close();
    await ai.close();
    expect(await ai.ping()).toBe(true);
  });
});