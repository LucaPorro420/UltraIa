import { describe, it, expect, vi } from 'vitest';
import {
  HOLAGPT_MODELS, HOLAGPT_IMAGE_MODELS, HOLAGPT_BASE_URL,
  holagptChat, holagptImage, holagptSearch, holagptAudio, holagptModels,
  holagptConfigured, holagptStatus, holagptChatSchema, holagptImageSchema,
} from './holagpt';

function fakeFetch(res: { ok: boolean; status?: number; json?: unknown; text?: string; headers?: Record<string, string> }) {
  return vi.fn(async () => ({
    ok: res.ok,
    status: res.status ?? 200,
    headers: { get: (k: string) => res.headers?.[k.toLowerCase()] ?? null } as unknown as Headers,
    json: async () => res.json,
    text: async () => res.text ?? JSON.stringify(res.json ?? ''),
  })) as unknown as (input: string, init?: RequestInit) => Promise<Response>;
}

describe('holagpt', () => {
  it('constantes', () => {
    expect(HOLAGPT_MODELS.length).toBeGreaterThanOrEqual(7);
    expect(HOLAGPT_IMAGE_MODELS).toContain('flux');
    expect(HOLAGPT_BASE_URL).toContain('holagpt');
  });

  it('schemas validan', () => {
    expect(() => holagptChatSchema.parse({ messages: [] })).toThrow();
    expect(() => holagptChatSchema.parse({ messages: [{ role: 'user', content: 'hola' }] })).not.toThrow();
    expect(() => holagptImageSchema.parse({ prompt: '' })).toThrow();
    expect(() => holagptImageSchema.parse({ prompt: 'un gato' })).not.toThrow();
  });

  it('holagptConfigured false sin key', () => {
    const prev = process.env.HOLAGPT_API_KEY; delete process.env.HOLAGPT_API_KEY; delete process.env.HOLOGPT_API_KEY;
    expect(holagptConfigured()).toBe(false);
    expect(holagptStatus().configured).toBe(false);
    if (prev) process.env.HOLAGPT_API_KEY = prev;
  });

  it('holagptConfigured true con apiKey opt', () => {
    expect(holagptConfigured({ apiKey: 'sk-test' })).toBe(true);
  });

  it('holagptChat OK', async () => {
    const f = fakeFetch({ ok: true, json: { choices: [{ message: { content: 'hola mundo' } }], model: 'gemini-2.5-flash', usage: { prompt_tokens: 2, completion_tokens: 2, total_tokens: 4 } } });
    const r = await holagptChat({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'hola' }] }, { fetchFn: f as unknown as typeof fetch, apiKey: 'sk-x' });
    expect(r.text).toBe('hola mundo');
    expect(r.usage?.total_tokens).toBe(4);
  });

  it('holagptChat error 401', async () => {
    const f = fakeFetch({ ok: false, status: 401, text: 'unauthorized' });
    await expect(holagptChat({ model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'hola' }] }, { fetchFn: f as unknown as typeof fetch, apiKey: 'bad' })).rejects.toThrow('401');
  });

  it('holagptImage OK', async () => {
    const f = fakeFetch({ ok: true, json: { data: [{ url: 'https://cdn.example/img.png', revised_prompt: 'a cat' }] } });
    const r = await holagptImage({ prompt: 'un gato', model: 'flux' }, { fetchFn: f as unknown as typeof fetch, apiKey: 'sk-x' });
    expect(r.url).toContain('cdn.example');
    expect(r.revisedPrompt).toBe('a cat');
  });

  it('holagptImage error sin url', async () => {
    const f = fakeFetch({ ok: true, json: { data: [] } });
    await expect(holagptImage({ prompt: 'x', model: 'flux' }, { fetchFn: f as unknown as typeof fetch, apiKey: 'sk-x' })).rejects.toThrow('sin url');
  });

  it('holagptSearch OK', async () => {
    const f = fakeFetch({ ok: true, json: { results: [{ title: 'T', url: 'https://a.com', snippet: 's', source: 'web' }] } });
    const r = await holagptSearch({ query: 'ultraia' }, { fetchFn: f as unknown as typeof fetch, apiKey: 'sk-x' });
    expect(r.results[0].url).toBe('https://a.com');
  });

  it('holagptModels lista', async () => {
    const f = fakeFetch({ ok: true, json: { data: [{ id: 'gpt-5' }, { id: 'flux' }] } });
    const r = await holagptModels({ fetchFn: f as unknown as typeof fetch, apiKey: 'sk-x' });
    expect(r).toContain('gpt-5');
  });

  it('holagptAudio tts JSON', async () => {
    const f = fakeFetch({ ok: true, json: { url: 'https://cdn.example/audio.mp3' }, headers: { 'content-type': 'application/json' } });
    const r = await holagptAudio({ action: 'tts', text: 'hola' }, { fetchFn: f as unknown as typeof fetch, apiKey: 'sk-x' });
    expect(r.url).toContain('cdn.example');
  });

  it('holagptAudio stt OK', async () => {
    const f = fakeFetch({ ok: true, json: { text: 'hola mundo' } });
    const r = await holagptAudio({ action: 'stt', audioUrl: 'https://cdn.example/a.mp3' }, { fetchFn: f as unknown as typeof fetch, apiKey: 'sk-x' });
    expect(r.text).toBe('hola mundo');
  });

  it('holagptAudio tts sin text falla', async () => {
    const f = fakeFetch({ ok: true, json: {} });
    await expect(holagptAudio({ action: 'tts' } as unknown as { action: 'tts' }, { fetchFn: f as unknown as typeof fetch, apiKey: 'sk-x' })).rejects.toThrow();
  });

  it('holagptChat sin apiKey lanza antes de fetch', async () => {
    const prev = process.env.HOLAGPT_API_KEY; delete process.env.HOLAGPT_API_KEY; delete process.env.HOLOGPT_API_KEY;
    const f = fakeFetch({ ok: true, json: { choices: [{ message: { content: '' } }] } });
    await expect(holagptChat({ messages: [{ role: 'user', content: 'hola' }] }, { fetchFn: f as unknown as typeof fetch })).rejects.toThrow('HOLAGPT_API_KEY');
    if (prev) process.env.HOLAGPT_API_KEY = prev;
  });
});
