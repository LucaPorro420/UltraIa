import { afterEach, describe, expect, it, vi } from 'vitest';
import { composeMusic, generateMusic, setMusicProvider, TunetankMusicProvider } from './music';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setMusicProvider(null);
});

describe('generateMusic (keyless composition)', () => {
  it('returns a structured composition when no provider is set', async () => {
    const comp = await composeMusic('a calm lo-fi track for focusing');
    expect(comp.kind).toBe('composition');
    expect(comp.title.length).toBeGreaterThan(0);
    expect(comp.sections.length).toBeGreaterThan(0);
    expect(comp.tempoBpm).toBeGreaterThanOrEqual(70);
    expect(comp.note).toMatch(/Keyless/i);
  });

  it('falls back to a default prompt when empty', async () => {
    const comp = await composeMusic('');
    expect(comp.kind).toBe('composition');
  });

  it('uses a configured provider for rendered audio', async () => {
    setMusicProvider({
      name: 'fake',
      generate: async (prompt) => ({ kind: 'audio', prompt, url: 'https://audio/fake.mp3', provider: 'fake' }),
    });
    const res = await generateMusic('an epic trailer cue');
    expect(res.kind).toBe('audio');
    if (res.kind === 'audio') expect(res.url).toBe('https://audio/fake.mp3');
  });
});

describe('TunetankMusicProvider', () => {
  it('reduces a multi-word prompt to a single token (Tunetank single-word lesson)', async () => {
    const searcher = vi.fn().mockResolvedValue({
      tracks: [{ preview: 'https://cdn.example/preview.mp3', name: 'Track' }],
    });
    const provider = new TunetankMusicProvider(searcher);
    const track = await provider.generate('cinematic epic trailer');
    expect(track.kind).toBe('audio');
    expect(searcher).toHaveBeenCalledWith('cinematic', 4);
    expect(track.url).toContain('cdn.example');
    expect(track.provider).toBe('tunetank');
  });

  it('throws when Tunetank returns no tracks', async () => {
    const provider = new TunetankMusicProvider(async () => ({ tracks: [] }));
    await expect(provider.generate('lofi')).rejects.toThrow(/no music/i);
  });

  it('falls back to a composition when the provider fails (pipeline stays alive)', async () => {
    setMusicProvider({
      name: 'broken',
      generate: async () => {
        throw new Error('network down');
      },
    });
    const res = await generateMusic('an epic trailer cue');
    expect(res.kind).toBe('composition');
  });
});
