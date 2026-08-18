/**
 * Tests del adapter Slack (AutoPub F4, iteración 40). CERO llamadas reales:
 * fetch inyectado + env limpiado por test.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  SLACK_PLATFORM,
  SLACK_MAX_VIDEO_BYTES,
  SLACK_MAX_CAPTION_CHARS,
  SLACK_FILES_UPLOAD_URL,
  isValidSlackBotToken,
  buildSlackCaption,
  createSlackAdapter,
} from './slack.js';

const REAL_ENV = { ...process.env };
const GOOD_TOKEN = 'xoxb-1234567890-abcdefghij';
const GOOD_CHANNEL = '#publicaciones';

beforeEach(() => {
  delete process.env.SLACK_BOT_TOKEN;
  delete process.env.SLACK_CHANNEL;
});

afterEach(() => {
  process.env = { ...REAL_ENV };
  vi.restoreAllMocks();
});

describe('isValidSlackBotToken', () => {
  it('acepta tokens xoxb- bien formados', () => {
    expect(isValidSlackBotToken(GOOD_TOKEN)).toBe(true);
  });
  it('rechaza vacíos, user tokens y formatos raros', () => {
    expect(isValidSlackBotToken('')).toBe(false);
    expect(isValidSlackBotToken('xoxp-123')).toBe(false);
    expect(isValidSlackBotToken('hola')).toBe(false);
  });
});

describe('buildSlackCaption', () => {
  it('combina título y descripción', () => {
    expect(buildSlackCaption({ title: 'T', description: 'D' })).toBe('T\n\nD');
  });
  it('trunca al máximo de Slack (4000)', () => {
    const caption = buildSlackCaption({ title: 'T', description: 'x'.repeat(9000) });
    expect(caption.length).toBeLessThanOrEqual(SLACK_MAX_CAPTION_CHARS);
  });
  it('usa fallback sin metadata', () => {
    expect(buildSlackCaption()).toBe('Contenido generado con IA');
  });
});

describe('createSlackAdapter — validate', () => {
  it('sin token → ok:false con razón clara', async () => {
    const adapter = createSlackAdapter({});
    const v = await adapter.validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('SLACK_BOT_TOKEN');
  });
  it('token mal formado → ok:false', async () => {
    const adapter = createSlackAdapter({ botToken: 'xoxp-123', channel: GOOD_CHANNEL });
    expect((await adapter.validate()).ok).toBe(false);
  });
  it('sin channel → ok:false', async () => {
    const adapter = createSlackAdapter({ botToken: GOOD_TOKEN });
    expect((await adapter.validate()).ok).toBe(false);
  });
  it('token + channel válidos → ok:true (options y env)', async () => {
    const adapter = createSlackAdapter({ botToken: GOOD_TOKEN, channel: GOOD_CHANNEL });
    expect((await adapter.validate()).ok).toBe(true);
    process.env.SLACK_BOT_TOKEN = GOOD_TOKEN;
    process.env.SLACK_CHANNEL = GOOD_CHANNEL;
    const fromEnv = createSlackAdapter({});
    expect((await fromEnv.validate()).ok).toBe(true);
  });
});

describe('createSlackAdapter — publish', () => {
  it('sin token → ok:false sin llamar fetch', async () => {
    const fetchFn = vi.fn();
    const adapter = createSlackAdapter({ botToken: '', fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4'), metadata: { title: 'T' } });
    expect(res.ok).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('sin video → ok:false con razón', async () => {
    const adapter = createSlackAdapter({ botToken: GOOD_TOKEN, channel: GOOD_CHANNEL, fetch: vi.fn() as unknown as typeof fetch });
    const res = await adapter.publish({ metadata: { title: 'T' } });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('No hay video');
  });

  it('video >1GiB → ok:false con razón de límite', async () => {
    const adapter = createSlackAdapter({ botToken: GOOD_TOKEN, channel: GOOD_CHANNEL, fetch: vi.fn() as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.alloc(SLACK_MAX_VIDEO_BYTES + 1) });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('1GiB');
  });

  it('envía multipart file+channels+title+initial_comment con Bearer y acepta {ok:true}', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, file: { id: 'F123', permalink: 'https://slack.com/files/T1/F123' } }),
    });
    const adapter = createSlackAdapter({ botToken: GOOD_TOKEN, channel: GOOD_CHANNEL, fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4DATA'), metadata: { title: 'Titulo' } });
    expect(res).toEqual({ platform: SLACK_PLATFORM, ok: true, id: 'F123', url: 'https://slack.com/files/T1/F123' });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SLACK_FILES_UPLOAD_URL);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${GOOD_TOKEN}`);
    const body = (init.body as Buffer).toString('utf8');
    expect(body).toContain('name="file"; filename="video.mp4"');
    expect(body).toContain('name="channels"');
    expect(body).toContain(GOOD_CHANNEL);
    expect(body).toContain('name="title"');
    expect(body).toContain('name="initial_comment"');
  });

  it('{ok:false, error} de la API → ok:false con la razón de Slack', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: 'not_in_channel' }),
    });
    const adapter = createSlackAdapter({ botToken: GOOD_TOKEN, channel: GOOD_CHANNEL, fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('not_in_channel');
  });

  it('error HTTP → ok:false con razón', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 429, statusText: 'Too Many Requests', json: async () => null });
    const adapter = createSlackAdapter({ botToken: GOOD_TOKEN, channel: GOOD_CHANNEL, fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('429');
  });

  it('error de red → ok:false con razón', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));
    const adapter = createSlackAdapter({ botToken: GOOD_TOKEN, channel: GOOD_CHANNEL, fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Red');
  });

  it('platform del adapter es slack', () => {
    expect(createSlackAdapter({ botToken: GOOD_TOKEN, channel: GOOD_CHANNEL }).platform).toBe(SLACK_PLATFORM);
  });
});