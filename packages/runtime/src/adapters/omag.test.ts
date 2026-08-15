import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOmagAdapter } from './omag';
import type { AiGatewayAdapter } from './ports';
import type { AiGateway } from '@ultraia/core';

const FINAL_URL = 'https://image.pollinations.ai/seed/1/img.png';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function fakeGateway(text: string): AiGateway {
  return {
    generateStructured: async <T>() => ({}) as T,
    chatText: vi.fn(async () => text),
  };
}

function fakeAiAdapter(gateway: AiGateway): AiGatewayAdapter {
  return {
    kind: 'ai',
    name: 'ai',
    provider: 'ollama',
    gateway,
    ping: vi.fn(async () => true),
    close: vi.fn(async () => undefined),
  };
}

describe('createOmagAdapter', () => {
  it('exposes kind/name/orchestrator and pings healthy (keyless)', async () => {
    const omag = createOmagAdapter();
    expect(omag.kind).toBe('omag');
    expect(omag.name).toBe('omag');
    expect(omag.orchestrator).toBeDefined();
    expect(await omag.ping()).toBe(true);
    await omag.close();
  });

  it('runs idea → plan → media field → generation → critique keyless', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: FINAL_URL }));
    const omag = createOmagAdapter();
    const result = await omag.run({
      idea: 'Una mujer camina por una calle lluviosa. Una motocicleta pasa detrás de ella.',
      quality: 'fast',
      modalities: ['image', 'music'],
      maxIterations: 3,
    });
    expect(result.field.metadata.plan).toBeDefined();
    expect(result.field.environment.scene).toBeTruthy();
    expect(result.results.some((r) => r.metadata.modality === 'image')).toBe(true);
    expect(result.results.some((r) => r.metadata.modality === 'music')).toBe(true);
    expect(typeof result.overall).toBe('number');
    expect(typeof result.accepted).toBe('boolean');
    expect(result.iterations).toBeGreaterThanOrEqual(1);
  });

  it('injects the ai gateway when an ai adapter is present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: FINAL_URL }));
    const gateway = fakeGateway(
      '{"language":"fr","script":"La mer est calme","images":["calm sea at sunset"],"shots":1,"motion":"zoom-out","bgm":"ambient","style":"cinematic"}',
    );
    const omag = createOmagAdapter({ ai: fakeAiAdapter(gateway) });
    const result = await omag.run({ idea: 'la mer est calme', quality: 'fast', modalities: ['image'], maxIterations: 2 });
    expect(gateway.chatText).toHaveBeenCalled();
    expect(result.field.metadata.plan).toMatchObject({ language: 'fr' });
  });
});