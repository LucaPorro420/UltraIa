import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateImage } from './image';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('generateImage', () => {
  it('returns a hotlinkable image URL from the keyless API', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/123/result.png';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }),
    );
    const img = await generateImage({ prompt: 'a photoreal sunset over mountains' });
    expect(img.url).toBe(finalUrl);
    expect(img.prompt).toBe('a photoreal sunset over mountains');
    expect(img.width).toBe(1024);
    expect(img.height).toBe(1024);
    expect(img.model).toBe('flux');
    expect(typeof img.seed).toBe('number');
  });

  it('clamps dimensions and requires a prompt', async () => {
    await expect(generateImage({ prompt: '' })).rejects.toThrow(/required/i);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, url: 'https://x/y.png' }),
    );
    const img = await generateImage({ prompt: 'x', width: 99999, height: 1 });
    expect(img.width).toBe(1792);
    expect(img.height).toBe(128);
  });

  it('surfaces upstream HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, url: '' }));
    await expect(generateImage({ prompt: 'x' })).rejects.toThrow(/status 503/i);
  });
});
