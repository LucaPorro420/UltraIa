import { afterEach, describe, expect, it, vi } from 'vitest';
import { mixkit, searchMusic, searchSfx } from './content';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const SSE_MUSIC = [
  'event: message',
  'data: {"result":{"content":[{"type":"text","text":"[{\\"id\\":222,\\"name\\":\\"Chasing Shadows\\",\\"artist\\":\\"cinematic alex\\",\\"duration\\":91,\\"bpm\\":141,\\"url\\":\\"https://tunetank.com/track/222-chasing-shadows/\\",\\"preview\\":\\"https://d1s1y0ui543e5o.cloudfront.net/tracks/222/preview/56.mp3\\",\\"genres\\":[\\"Electronic\\",\\"Rock\\"],\\"moods\\":[\\"Energetic\\"],\\"themes\\":[\\"Gaming\\"]}]"}]},"jsonrpc":"2.0","id":1}',
  '',
].join('\n');

const SSE_SFX = [
  'event: message',
  'data: {"result":{"content":[{"type":"text","text":"[{\\"id\\":28692,\\"name\\":\\"Sink water drain\\",\\"duration\\":8,\\"preview\\":\\"https://d1s1y0ui543e5o.cloudfront.net/sfx/28692/csw7s.mp3\\",\\"waveform\\":\\"https://d1s1y0ui543e5o.cloudfront.net/sfx/28692/csw7s.json\\"}]"}]},"jsonrpc":"2.0","id":1}',
  '',
].join('\n');

function sseRes(body: string) {
  return { ok: true, status: 200, text: vi.fn().mockResolvedValue(body) };
}

describe('searchMusic (Tunetank MCP)', () => {
  it('rejects empty queries', async () => {
    await expect(searchMusic({ query: '  ' })).rejects.toThrow(/query/i);
  });

  it('parses the SSE response into tracks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseRes(SSE_MUSIC)));
    const out = await searchMusic({ query: 'cinematic', maxResults: 3 });
    expect(out.query).toBe('cinematic');
    expect(out.tracks).toHaveLength(1);
    expect(out.tracks[0].name).toBe('Chasing Shadows');
    expect(out.tracks[0].preview).toContain('cloudfront.net');
    expect(out.tracks[0].genres).toContain('Electronic');
  });

  it('sends the Accept header required by the MCP server', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseRes(SSE_MUSIC));
    vi.stubGlobal('fetch', fetchMock);
    await searchMusic({ query: 'epic' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Accept).toBe('application/json, text/event-stream');
  });
});

describe('searchSfx (Tunetank MCP)', () => {
  it('parses SFX results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseRes(SSE_SFX)));
    const out = await searchSfx({ query: 'water', maxResults: 5 });
    expect(out.sfx).toHaveLength(1);
    expect(out.sfx[0].name).toBe('Sink water drain');
    expect(out.sfx[0].waveform).toContain('.json');
  });

  it('throws on non-OK responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 406, text: vi.fn().mockResolvedValue('') }));
    await expect(searchSfx({ query: 'rain' })).rejects.toThrow(/406/);
  });
});

describe('mixkit (Jina read)', () => {
  it('builds the mixkit URL from a type', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          sseRes('Title: Mixkit — free sound effects\n# Free sound effects\n\nSome page text.'),
        )
        .mockResolvedValue(sseRes('ok')),
    );
    const out = await mixkit({ type: 'free-sound-effects' });
    expect(out.url).toContain('mixkit.co/free-sound-effects');
    expect(out.note).toContain('free');
  });

  it('accepts a full URL directly', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(sseRes('Title: Page\nbody content here'))
        .mockResolvedValue(sseRes('ok')),
    );
    const out = await mixkit({ type: 'https://mixkit.co/free-music/ambient/' });
    expect(out.url).toBe('https://mixkit.co/free-music/ambient/');
  });

  it('rejects empty types', async () => {
    await expect(mixkit({ type: '' })).rejects.toThrow(/type/i);
  });
});