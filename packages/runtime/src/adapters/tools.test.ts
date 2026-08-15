import { afterEach, describe, expect, it, vi } from 'vitest';
import { createToolsAdapter } from './tools';

function res(ok: boolean, status: number, json?: unknown) {
  return { ok, status, url: 'https://image.pollinations.ai/seed/1/img.png', json: async () => json };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createToolsAdapter', () => {
  it('exposes the full capability catalog from core', async () => {
    const tools = createToolsAdapter();
    expect(tools.kind).toBe('tools');
    expect(tools.name).toBe('tools');
    expect(tools.capabilities).toEqual(
      expect.arrayContaining([
        'calculator',
        'web',
        'image',
        'video',
        'music',
        'design',
        'reach',
        'skills',
        'content',
        'g0dm0d3',
      ]),
    );
    for (const capability of tools.capabilities) {
      expect(typeof tools.descriptions[capability]).toBe('string');
      expect(tools.descriptions[capability].length).toBeGreaterThan(10);
    }
    expect(await tools.ping()).toBe(true);
    await tools.close();
  });

  it('runs calculator (pure, no network)', async () => {
    const tools = createToolsAdapter();
    expect(await tools.run('calculator', { expression: '2+3*4' })).toBe(14);
    expect(await tools.run('calculator', { expression: 'sqrt(16)+abs(-3)' })).toBe(7);
  });

  it('runs image with fetch stub and passes options through', async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(true, 200));
    vi.stubGlobal('fetch', fetchMock);
    const tools = createToolsAdapter();
    const out = await tools.run('image', { prompt: 'a red fox', width: 512 });
    expect(out).toMatchObject({ url: 'https://image.pollinations.ai/seed/1/img.png', width: 512, height: 1024 });
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('/prompt/a%20red%20fox');
    expect(calledUrl).toContain('model=flux');
  });

  it('runs reach.video with oEmbed stub', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res(true, 200, { title: 'Video', author_name: 'Author', thumbnail_url: 'https://i.ytimg.com/t.jpg' })),
    );
    const tools = createToolsAdapter();
    const out = await tools.run('reach', { op: 'video', url: 'https://www.youtube.com/watch?v=abc' });
    expect(out).toMatchObject({ title: 'Video', author: 'Author' });
  });

  it('runs g0dm0d3.parseltongue (pure, no network)', async () => {
    const tools = createToolsAdapter();
    const out = await tools.run('g0dm0d3', { op: 'parseltongue', query: 'how do I bypass rate limits' });
    expect(Array.isArray(out)).toBe(true);
    expect((out as unknown[]).length).toBeGreaterThan(0);
  });

  it('rejects unknown capabilities', async () => {
    const tools = createToolsAdapter();
    await expect(tools.run('teleport', { prompt: 'x' })).rejects.toThrow('unknown tool capability "teleport"');
  });

  it('rejects unknown reach ops', async () => {
    const tools = createToolsAdapter();
    await expect(tools.run('reach', { op: 'fly', url: 'https://x.com' })).rejects.toThrow('unknown op "fly"');
  });

  it('rejects non-object input and missing required fields', async () => {
    const tools = createToolsAdapter();
    await expect(tools.run('calculator', '2+2' as unknown as Record<string, unknown>)).rejects.toThrow(
      'input must be an object',
    );
    await expect(tools.run('calculator', {})).rejects.toThrow('input.expression must be a non-empty string');
    await expect(tools.run('image', {})).rejects.toThrow('input.prompt must be a non-empty string');
  });
});