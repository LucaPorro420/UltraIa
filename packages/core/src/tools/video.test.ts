import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateVideo, generateVideoStoryboard, setVideoProvider } from './video';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setVideoProvider(null);
});

describe('generateVideo (keyless storyboard)', () => {
  it('builds a storyboard of generated frames when no provider is set', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/frame.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));
    const storyboard = await generateVideoStoryboard('a cat walking in the rain', 3);
    expect(storyboard.kind).toBe('storyboard');
    expect(storyboard.frames).toHaveLength(3);
    for (const f of storyboard.frames) {
      expect(f.url).toBe(finalUrl);
      expect(f.caption).toContain('Frame');
    }
  });

  it('uses a configured provider for real video', async () => {
    setVideoProvider({
      name: 'fake',
      generate: async (prompt) => ({ kind: 'video', prompt, url: 'https://video/fake.mp4', provider: 'fake' }),
    });
    const res = await generateVideo('a cat walking');
    expect(res.kind).toBe('video');
    if (res.kind === 'video') expect(res.url).toBe('https://video/fake.mp4');
  });
});
