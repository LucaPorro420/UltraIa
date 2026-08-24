import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioLibrary } from './audiolibrary';

function hasCommand(cmd: string): boolean {
  const res = spawnSync(cmd, ['-version'], { stdio: 'ignore', timeout: 5000 });
  return res.error == null;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function sampleLib(dir = '/tmp/audio') {
  return new AudioLibrary({ dir });
}

describe('AudioLibrary', () => {
  it('registers and searches pre-loaded samples', () => {
    const lib = sampleLib();
    lib.registerPreloaded([
      { id: 'rain', name: 'rain ambience' },
      { id: 'whoosh', name: 'whoosh transition' },
    ]);
    expect(lib.listPreloaded()).toHaveLength(2);
    const found = lib.findPreloaded('rain');
    expect(found[0].id).toBe('rain');
    expect(lib.findPreloaded('nope')).toHaveLength(0);
  });

  it('searches Tunetank music via searchMusic', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(
          'data: {"result":{"content":[{"type":"text","text":"[{\\"id\\":1,\\"name\\":\\"Track\\",\\"duration\\":30,\\"preview\\":\\"https://cdn/x.mp3\\"}]"}]},"jsonrpc":"2.0","id":1}',
        ),
      }),
    );
    const lib = sampleLib();
    const res = await lib.search({ query: 'cinematic', kind: 'music' });
    expect(res.items[0].name).toBe('Track');
    expect(res.items[0].url).toContain('cdn');
  });

  it('synthesizes and reports a beat without network', async () => {
    const lib = sampleLib();
    const result = await lib.saveSynth('beat', 'kick_loop', { durationSec: 1 });
    expect(result.kind).toBe('beat');
  });

  it('saveSample returns null when the download fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const lib = sampleLib();
    expect(await lib.saveSample('https://cdn/x.mp3', 'x')).toBeNull();
  });

  it('extractAudioFromVideo degrades with an actionable message', { timeout: 15_000 }, async () => {
    const lib = sampleLib();
    // Use a local nonexistent path so the test stays hermetic (no network / yt-dlp).
    // With ffmpeg installed the extraction fails with the yt-dlp guide; without it,
    // we get the ffmpeg install guide.
    const pattern = hasCommand('ffmpeg') ? /Could not extract audio/ : /winget install Gyan\.FFmpeg/;
    await expect(lib.extractAudioFromVideo('./does-not-exist-video.mp4', 'clip')).rejects.toThrow(pattern);
  });
});