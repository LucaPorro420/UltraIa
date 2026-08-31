import { describe, expect, it } from 'vitest';
import { searchMusic, searchSfx } from './content';

// Skip live integration tests when TUNETANK_MCP_URL is not set (CI, offline)
const describeLive = process.env.TUNETANK_MCP_URL ? describe : describe.skip;

describeLive('content tools — live integration (Tunetank MCP)', () => {
  it('searches real music tracks', async () => {
    const out = await searchMusic({ query: 'cinematic', maxResults: 3 });
    expect(out.tracks.length).toBeGreaterThan(0);
    expect(out.tracks[0].name).toBeTruthy();
    expect(out.tracks[0].preview).toMatch(/^https:\/\//);
  }, 20_000);

  it('searches real sound effects', async () => {
    const out = await searchSfx({ query: 'rain', maxResults: 3 });
    expect(out.sfx.length).toBeGreaterThan(0);
    expect(out.sfx[0].name).toBeTruthy();
    expect(out.sfx[0].preview).toMatch(/^https:\/\//);
  }, 20_000);
});