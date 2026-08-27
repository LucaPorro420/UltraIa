/**
 * Tests del adapter Discord (AutoPub F4, iteración 40). CERO llamadas reales:
 * fetch inyectado + env limpiado por test.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  DISCORD_PLATFORM,
  DISCORD_MAX_VIDEO_BYTES,
  DISCORD_MAX_CAPTION_CHARS,
  DISCORD_WEBHOOK_BASE,
  isValidDiscordWebhook,
  buildDiscordCaption,
  createDiscordAdapter,
} from './discord.js';
import { buildMultipartBody } from './telegram.js';

const REAL_ENV = { ...process.env };
const GOOD_WEBHOOK = `${DISCORD_WEBHOOK_BASE}/1234567890/AbCdEfGhIjKlMnOpQrStUv`;

beforeEach(() => {
  delete process.env.DISCORD_WEBHOOK_URL;
});

afterEach(() => {
  process.env = { ...REAL_ENV };
  vi.restoreAllMocks();
});

describe('isValidDiscordWebhook', () => {
  it('acepta webhooks bien formados', () => {
    expect(isValidDiscordWebhook(GOOD_WEBHOOK)).toBe(true);
  });
  it('rechaza URLs vacías, mal formadas o de otros dominios', () => {
    expect(isValidDiscordWebhook('')).toBe(false);
    expect(isValidDiscordWebhook('https://discord.com/api/webhooks/123')).toBe(false);
    expect(isValidDiscordWebhook('https://evil.com/api/webhooks/123/abc')).toBe(false);
    expect(isValidDiscordWebhook('https://discord.com/api/webhooks/abc/def')).toBe(false);
  });
});

describe('buildDiscordCaption', () => {
  it('combina título y descripción', () => {
    expect(buildDiscordCaption({ title: 'T', description: 'D' })).toBe('T\n\nD');
  });
  it('trunca al máximo de Discord (2000)', () => {
    const caption = buildDiscordCaption({ title: 'T', description: 'x'.repeat(5000) });
    expect(caption.length).toBeLessThanOrEqual(DISCORD_MAX_CAPTION_CHARS);
  });
  it('usa fallback sin metadata', () => {
    expect(buildDiscordCaption()).toBe('Contenido generado con IA');
  });
});

describe('createDiscordAdapter — validate', () => {
  it('sin webhook → ok:false con razón clara', async () => {
    const adapter = createDiscordAdapter({});
    const v = await adapter.validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('DISCORD_WEBHOOK_URL');
  });
  it('webhook mal formado → ok:false', async () => {
    const adapter = createDiscordAdapter({ webhookUrl: 'https://discord.com/api/webhooks/123' });
    expect((await adapter.validate()).ok).toBe(false);
  });
  it('webhook válido → ok:true', async () => {
    const adapter = createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK });
    expect((await adapter.validate()).ok).toBe(true);
  });
  it('lee el webhook desde env', async () => {
    process.env.DISCORD_WEBHOOK_URL = GOOD_WEBHOOK;
    const adapter = createDiscordAdapter({});
    expect((await adapter.validate()).ok).toBe(true);
  });
});

describe('createDiscordAdapter — publish', () => {
  it('sin webhook → ok:false sin llamar fetch', async () => {
    const fetchFn = vi.fn();
    const adapter = createDiscordAdapter({ webhookUrl: '', fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4'), metadata: { title: 'T' } });
    expect(res.ok).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('sin video → ok:false con razón', async () => {
    const adapter = createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK, fetch: vi.fn() as unknown as typeof fetch });
    const res = await adapter.publish({ metadata: { title: 'T' } });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('No hay video');
  });

  it('video >10MB → ok:false con razón de límite gratis', async () => {
    const adapter = createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK, fetch: vi.fn() as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.alloc(DISCORD_MAX_VIDEO_BYTES + 1) });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('10MB');
  });

  it('envía multipart file + payload_json y acepta 204', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 204, statusText: 'No Content' });
    const adapter = createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK, fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4DATA'), metadata: { title: 'Mi titulo', description: 'Mi desc' } });
    expect(res).toEqual({ platform: DISCORD_PLATFORM, ok: true, url: GOOD_WEBHOOK.replace('/api/webhooks/', '/channels/') });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(GOOD_WEBHOOK);
    const body = (init.body as Buffer).toString('utf8');
    expect(body).toContain('name="file"; filename="video.mp4"');
    expect(body).toContain('name="payload_json"');
    expect(body).toContain('"content":"Mi titulo\\n\\nMi desc"');
  });

  it('error HTTP → ok:false con razón', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });
    const adapter = createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK, fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('403');
  });

  it('error de red → ok:false con razón', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    const adapter = createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK, fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Red');
  });

  it('platform del adapter es discord', () => {
    expect(createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK }).platform).toBe(DISCORD_PLATFORM);
  });

  it('imagen png → POST webhook con multipart file image/png (loop-131)', async () => {
    let captured: { url: string; body?: unknown } | undefined;
    const fetchFn = vi.fn().mockImplementation(async (url: string | URL, init?: { body?: unknown }) => {
      captured = { url: String(url), body: init?.body };
      return new Response(null, { status: 204 });
    });
    const adapter = createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK, fetch: fetchFn as unknown as typeof fetch });
    const res = await adapter.publish({ imageBuffer: Buffer.from('IMGDATA'), imageName: 'd.png', metadata: { title: 'T', description: 'D' } });
    expect(res.ok).toBe(true);
    const text = Buffer.from(captured!.body as Buffer).toString('utf8');
    expect(text).toContain('name="file"; filename="d.png"');
    expect(text).toContain('Content-Type: image/png');
  });
  it('sin video ni imagen → ok:false', async () => {
    const adapter = createDiscordAdapter({ webhookUrl: GOOD_WEBHOOK });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('imagen');
  });
});

describe('buildMultipartBody compartido (discord usa el de telegram.js)', () => {
  it('payload_json es un JSON string válido parseable', () => {
    const { body } = buildMultipartBody([{ name: 'payload_json', value: JSON.stringify({ content: 'hola' }) }], 'B');
    const text = Buffer.from(body).toString('utf8');
    const m = text.match(/name="payload_json"\r\n\r\n(\{.*?\})\r\n/s);
    expect(m).toBeTruthy();
    expect(JSON.parse(m![1])).toEqual({ content: 'hola' });
  });
});