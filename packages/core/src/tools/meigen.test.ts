import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateMeigenImage, listMeigenModels, resetMeigenModelCache } from './meigen';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetMeigenModelCache();
  delete process.env.MEIGEN_API_TOKEN;
  delete process.env.MEIGEN_API_BASE;
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue('') };
}

describe('listMeigenModels', () => {
  it('lists active models from the public endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, models: [{ id: 'gpt-image-2', name: 'GPT Image 2', media_type: 'image' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const models = await listMeigenModels();
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('gpt-image-2');
    expect(fetchMock).toHaveBeenCalledWith('https://www.meigen.ai/api/models?active=true', expect.anything());
  });

  it('caches models for an hour (no second fetch)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ models: [{ id: 'a', name: 'A', media_type: 'image' }] }));
    vi.stubGlobal('fetch', fetchMock);
    await listMeigenModels();
    await listMeigenModels();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list on malformed payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ models: 'nope' })));
    const models = await listMeigenModels();
    expect(models).toEqual([]);
  });
});

describe('generateMeigenImage', () => {
  it('requires a prompt and an API token', async () => {
    await expect(generateMeigenImage({ prompt: '' })).rejects.toThrow(/prompt is required/i);
    await expect(generateMeigenImage({ prompt: '  ' })).rejects.toThrow(/prompt is required/i);
    await expect(generateMeigenImage({ prompt: 'a' })).rejects.toThrow(/MEIGEN_API_TOKEN/i);
  });

  it('rejects prompts longer than 4000 chars', async () => {
    process.env.MEIGEN_API_TOKEN = 'meigen_sk_test';
    await expect(generateMeigenImage({ prompt: 'x'.repeat(4001) })).rejects.toThrow(/too long/i);
  });

  it('submits, polls and returns the completed image with candidates', async () => {
    process.env.MEIGEN_API_TOKEN = 'meigen_sk_test';
    const submitResponse = jsonResponse({ generationId: 'gen_1', creditsUsed: 3 });
    const statusCompleted = jsonResponse({
      status: 'completed',
      imageUrl: 'https://images.meigen.ai/img.png',
      imageUrls: ['https://images.meigen.ai/img.png', 'https://images.meigen.ai/alt.png'],
      aspectRatio: '1:1',
      pollHintSeconds: 0,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(submitResponse)
      .mockResolvedValueOnce(statusCompleted);
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateMeigenImage({ prompt: 'a red apple', modelId: 'gpt-image-2', aspectRatio: '1:1' });

    expect(result.url).toBe('https://images.meigen.ai/img.png');
    expect(result.candidates).toHaveLength(2);
    expect(result.generationId).toBe('gen_1');
    expect(result.creditsUsed).toBe(3);
    expect(result.modelId).toBe('gpt-image-2');
    const submitCall = fetchMock.mock.calls[0];
    expect(submitCall[0]).toBe('https://www.meigen.ai/api/generate/v2');
    expect(submitCall[1].headers.Authorization).toBe('Bearer meigen_sk_test');
    const body = JSON.parse(submitCall[1].body);
    expect(body).toMatchObject({ prompt: 'a red apple', modelId: 'gpt-image-2', aspectRatio: '1:1' });
  });

  it('throws when the generation fails upstream', async () => {
    process.env.MEIGEN_API_TOKEN = 'meigen_sk_test';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ generationId: 'gen_1' }))
        .mockResolvedValueOnce(jsonResponse({ status: 'failed', error: 'content policy' })),
    );
    await expect(generateMeigenImage({ prompt: 'a' })).rejects.toThrow(/content policy/i);
  });

  it('throws when the status is unexpected', async () => {
    process.env.MEIGEN_API_TOKEN = 'meigen_sk_test';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ generationId: 'gen_1' }))
        .mockResolvedValueOnce(jsonResponse({ status: 'weird' })),
    );
    await expect(generateMeigenImage({ prompt: 'a' })).rejects.toThrow(/unexpected status/i);
  });

  it('throws when the API returns no generationId', async () => {
    process.env.MEIGEN_API_TOKEN = 'meigen_sk_test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: false })));
    await expect(generateMeigenImage({ prompt: 'a' })).rejects.toThrow(/generationId/i);
  });

  it('surfaces HTTP errors with the response body', async () => {
    process.env.MEIGEN_API_TOKEN = 'meigen_sk_test';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue('rate limited'),
        json: vi.fn(),
      }),
    );
    await expect(generateMeigenImage({ prompt: 'a' })).rejects.toThrow(/429/);
  });
});
