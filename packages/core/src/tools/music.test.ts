import { afterEach, describe, expect, it, vi } from 'vitest';
import { composeMusic, generateMusic, setMusicProvider } from './music';

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
