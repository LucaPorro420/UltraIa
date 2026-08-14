import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  genEngineMusicProvider,
  genEngineTts,
  genEngineVideoProvider,
  registerGenEngineIfHealthy,
} from './gen-engine';
import { generateMusic, setMusicProvider } from './music';
import { generateVideo, setVideoProvider } from './video';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setVideoProvider(null);
  setMusicProvider(null);
});

function stubFetch(payload: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload }),
  );
}

describe('genEngineVideoProvider', () => {
  it('proxies to /generate/video and exposes an absolute URL', async () => {
    stubFetch({ provider: 'local', url: '/media/video.mp4' });
    setVideoProvider(genEngineVideoProvider());
    const res = await generateVideo('a cat', { frames: 3, durationSec: 5 });
    expect(res.kind).toBe('video');
    if (res.kind === 'video') {
      expect(res.provider).toBe('local');
      expect(res.url).toBe('http://localhost:8000/media/video.mp4');
    }
  });

  it('uses a storyboard frame when the engine returns no url', async () => {
    stubFetch({ provider: 'storyboard', frames: ['https://img/1'] });
    setVideoProvider(genEngineVideoProvider());
    const res = await generateVideo('a dog', { frames: 1 });
    expect(res.kind).toBe('video');
    if (res.kind === 'video') expect(res.url).toBe('https://img/1');
  });

  it('throws when the engine is unreachable (caller can fall back)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    setVideoProvider(genEngineVideoProvider());
    await expect(generateVideo('boom')).rejects.toThrow();
  });
});

describe('genEngineMusicProvider', () => {
  it('proxies to /generate/music', async () => {
    stubFetch({ provider: 'local', url: '/media/music.wav' });
    setMusicProvider(genEngineMusicProvider());
    const res = await generateMusic('calm piano', { durationSec: 30 });
    expect(res.kind).toBe('audio');
    if (res.kind === 'audio') {
      expect(res.provider).toBe('local');
      expect(res.url).toBe('http://localhost:8000/media/music.wav');
    }
  });
});

describe('genEngineTts', () => {
  it('returns the audio URL from the engine', async () => {
    stubFetch({ provider: 'edge-tts', url: '/media/tts.mp3' });
    const url = await genEngineTts('hola', 'es');
    expect(url).toBe('http://localhost:8000/media/tts.mp3');
  });

  it('returns null when the engine is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await genEngineTts('hola', 'es')).toBeNull();
  });
});

describe('registerGenEngineIfHealthy', () => {
  it('registers music+video providers when /health responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );
    const active = await registerGenEngineIfHealthy({ url: 'http://engine:8000' });
    expect(active).toBe(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ provider: 'local', url: '/media/m.wav' }) }),
    );
    const music = await generateMusic('calm piano');
    expect(music.kind).toBe('audio');
    if (music.kind === 'audio') expect(music.url).toContain('http://engine:8000');
  });

  it('keeps providers unset when the engine is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const active = await registerGenEngineIfHealthy({ url: 'http://engine:8000' });
    expect(active).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, url: 'https://image.pollinations.ai/seed/1/frame.png' }),
    );
    const video = await generateVideo('a cat');
    expect(video.kind).toBe('storyboard');
  });
});