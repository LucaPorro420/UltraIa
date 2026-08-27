/**
 * Tests del adapter Telegram (AutoPub F4, iteración 37). CERO llamadas reales:
 * fetch inyectado + env limpiado por test.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  TELEGRAM_PLATFORM,
  TELEGRAM_MAX_VIDEO_BYTES,
  TELEGRAM_MAX_CAPTION_CHARS,
  TELEGRAM_API_BASE,
  buildMultipartBody,
  truncateCaption,
  buildTelegramCaption,
  createTelegramAdapter,
} from './telegram.js';

const REAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});

afterEach(() => {
  process.env = { ...REAL_ENV };
});

describe('buildMultipartBody', () => {
  it('construye multipart con boundary, partes y cierre', () => {
    const { body, contentType } = buildMultipartBody(
      [
        { name: 'chat_id', value: '123' },
        { name: 'video', filename: 'v.mp4', contentType: 'video/mp4', data: Buffer.from('MP4DATA') },
      ],
      'BND',
    );
    const text = Buffer.from(body).toString('utf8');
    expect(contentType).toBe('multipart/form-data; boundary=BND');
    expect(text).toContain('--BND\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n123\r\n');
    expect(text).toContain('--BND\r\nContent-Disposition: form-data; name="video"; filename="v.mp4"\r\nContent-Type: video/mp4\r\n\r\nMP4DATA\r\n');
    expect(text.endsWith('--BND--\r\n')).toBe(true);
  });
});

describe('truncateCaption', () => {
  it('no trunca captions cortos', () => {
    expect(truncateCaption('hola', 10)).toBe('hola');
  });
  it('trunca al máximo y respeta límite', () => {
    const long = 'a'.repeat(2000);
    const cut = truncateCaption(long, TELEGRAM_MAX_CAPTION_CHARS);
    expect(cut.length).toBeLessThanOrEqual(TELEGRAM_MAX_CAPTION_CHARS);
    expect(cut).toBe('a'.repeat(TELEGRAM_MAX_CAPTION_CHARS));
  });
  it('no corta un par surrogate (emoji) a la mitad', () => {
    // 1023 a's (idx 0-1022) + high surrogate del emoji (idx 1023) = el corte cae EN el
    // high surrogate → truncateCaption debe descartarlo para no dejar huérfano.
    const caption = 'a'.repeat(1023) + '🎉' + 'x';
    const cut = truncateCaption(caption, TELEGRAM_MAX_CAPTION_CHARS);
    expect(cut.length).toBe(TELEGRAM_MAX_CAPTION_CHARS - 1);
    // El último char no debe ser un high surrogate huérfano.
    const code = cut.charCodeAt(cut.length - 1);
    expect(code >= 0xd800 && code <= 0xdbff).toBe(false);
  });
});

describe('buildTelegramCaption', () => {
  it('combina título y descripción', () => {
    expect(buildTelegramCaption({ title: 'T', description: 'D' })).toBe('T\n\nD');
  });
  it('usa fallback sin metadata', () => {
    expect(buildTelegramCaption()).toBe('Contenido generado con IA');
  });
});

describe('createTelegramAdapter — validate', () => {
  it('sin token → ok:false con razón clara', async () => {
    const adapter = createTelegramAdapter({});
    const v = await adapter.validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('TELEGRAM_BOT_TOKEN');
  });
  it('sin chatId → ok:false con razón clara', async () => {
    const adapter = createTelegramAdapter({ botToken: '123:ABC' });
    const v = await adapter.validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('TELEGRAM_CHAT_ID');
  });
  it('con token y chat → ok:true', async () => {
    const adapter = createTelegramAdapter({ botToken: '123:ABC', chatId: '@canal' });
    const v = await adapter.validate();
    expect(v.ok).toBe(true);
  });
  it('lee env TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'env:tok';
    process.env.TELEGRAM_CHAT_ID = 'env:chat';
    const v = await createTelegramAdapter({}).validate();
    expect(v.ok).toBe(true);
  });
  it('options tienen precedencia sobre env', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'env:tok';
    process.env.TELEGRAM_CHAT_ID = 'env:chat';
    const v = await createTelegramAdapter({ botToken: '', chatId: '' }).validate();
    expect(v.ok).toBe(false);
  });
});

describe('createTelegramAdapter — publish', () => {
  it('sin token → ok:false sin fetch', async () => {
    let called = false;
    const adapter = createTelegramAdapter({
      fetch: (async () => { called = true; return new Response(); }) as typeof fetch,
    });
    const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
    expect(r.ok).toBe(false);
    expect(called).toBe(false);
  });
  it('sin video → ok:false', async () => {
    const adapter = createTelegramAdapter({ botToken: 't', chatId: 'c' });
    const r = await adapter.publish({});
    expect(r.ok).toBe(false);
    expect(r.error).toContain('video');
  });
  it('video > 50MB → ok:false sin fetch', async () => {
    let called = false;
    const adapter = createTelegramAdapter({
      botToken: 't',
      chatId: 'c',
      fetch: (async () => { called = true; return new Response(); }) as typeof fetch,
    });
    const r = await adapter.publish({ videoBuffer: Buffer.alloc(TELEGRAM_MAX_VIDEO_BYTES + 1) });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('50MB');
    expect(called).toBe(false);
  });
  it('éxito: POST sendVideo con multipart, caption y message_id', async () => {
    let captured: { url: string; headers?: Record<string, string>; body?: unknown } | undefined;
    const adapter = createTelegramAdapter({
      botToken: 'tok:abc',
      chatId: '@canal',
      fetch: (async (url: string | URL, init?: { headers?: Record<string, string>; body?: unknown }) => {
        captured = { url: String(url), headers: init?.headers, body: init?.body };
        return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 });
      }) as typeof fetch,
    });
    const r = await adapter.publish({ videoBuffer: Buffer.from('MP4'), metadata: { title: 'Título', description: 'Desc' } });
    expect(r.ok).toBe(true);
    expect(r.id).toBe('42');
    expect(r.url).toContain('/42');
    expect(captured?.url).toBe(`${TELEGRAM_API_BASE}/bottok:abc/sendVideo`);
    expect((captured?.headers as Record<string, string>)?.['Content-Type']).toContain('multipart/form-data; boundary=');
    const text = Buffer.from(captured!.body as Buffer).toString('utf8');
    expect(text).toContain('name="chat_id"\r\n\r\n@canal');
    expect(text).toContain('name="video"; filename="video.mp4"\r\nContent-Type: video/mp4');
    expect(text).toContain('name="caption"\r\n\r\nTítulo\n\nDesc');
  });
  it('error API (400 con description) → ok:false con razón', async () => {
    const adapter = createTelegramAdapter({
      botToken: 't',
      chatId: 'c',
      fetch: (async () => new Response(JSON.stringify({ ok: false, error_code: 400, description: 'Bad Request: x' }), { status: 400 })) as typeof fetch,
    });
    const r = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('400');
    expect(r.error).toContain('Bad Request');
  });
  it('429 → reason con retry_after (fail-soft, no lanza)', async () => {
    const adapter = createTelegramAdapter({
      botToken: 't',
      chatId: 'c',
      fetch: (async () => new Response(JSON.stringify({ ok: false, error_code: 429, description: 'Too Many Requests', parameters: { retry_after: 12 } }), { status: 429 })) as typeof fetch,
    });
    const r = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('retry_after=12');
  });
  it('respuesta no-JSON → ok:false con status', async () => {
    const adapter = createTelegramAdapter({
      botToken: 't',
      chatId: 'c',
      fetch: (async () => new Response('no-json', { status: 502, statusText: 'Bad Gateway' })) as typeof fetch,
    });
    const r = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('502');
  });
  it('fetch lanza → ok:false con razón de red', async () => {
    const adapter = createTelegramAdapter({
      botToken: 't',
      chatId: 'c',
      fetch: (async () => { throw new Error('ECONNREFUSED'); }) as typeof fetch,
    });
    const r = await adapter.publish({ videoBuffer: Buffer.from('MP4') });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('ECONNREFUSED');
  });
  it('videoPath ilegible → ok:false con razón', async () => {
    const adapter = createTelegramAdapter({ botToken: 't', chatId: 'c' });
    const r = await adapter.publish({ videoPath: 'Z:\\no\\existe\\video.mp4' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('video');
  });
  it('platform es "telegram"', () => {
    expect(TELEGRAM_PLATFORM).toBe('telegram');
    expect(createTelegramAdapter({ botToken: 't', chatId: 'c' }).platform).toBe('telegram');
  });
});

describe('publish imagen (loop-131)', () => {
  it('imagen png → sendPhoto con multipart y content-type image/png', async () => {
    let captured: { url: string; body?: unknown } | undefined;
    const adapter = createTelegramAdapter({
      botToken: 'tok:abc',
      chatId: '@canal',
      fetch: (async (url: string | URL, init?: { body?: unknown }) => {
        captured = { url: String(url), body: init?.body };
        return new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), { status: 200 });
      }) as typeof fetch,
    });
    const r = await adapter.publish({ imageBuffer: Buffer.from('PNGDATA'), imageName: 'd.png', metadata: { title: 'T', description: 'D' } });
    expect(r.ok).toBe(true);
    expect(r.id).toBe('7');
    expect(captured?.url).toBe(`${TELEGRAM_API_BASE}/bottok:abc/sendPhoto`);
    const text = Buffer.from(captured!.body as Buffer).toString('utf8');
    expect(text).toContain('name="photo"; filename="d.png"');
    expect(text).toContain('Content-Type: image/png');
  });
  it('svg → sendDocument (no renderiza como foto)', async () => {
    let captured: { url: string } | undefined;
    const adapter = createTelegramAdapter({
      botToken: 't',
      chatId: 'c',
      fetch: (async (url: string | URL) => {
        captured = { url: String(url) };
        return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
      }) as typeof fetch,
    });
    const r = await adapter.publish({ imageBuffer: Buffer.from('<svg/>'), imageName: 'd.svg' });
    expect(r.ok).toBe(true);
    expect(captured?.url?.endsWith('/sendDocument')).toBe(true);
  });
  it('sin video ni imagen → ok:false con razón', async () => {
    const adapter = createTelegramAdapter({ botToken: 't', chatId: 'c' });
    const r = await adapter.publish({});
    expect(r.ok).toBe(false);
    expect(r.error).toContain('imagen');
  });
});