import { describe, it, expect } from 'vitest';
import { createWhatsAppAdapter, WHATSAPP_PLATFORM } from './whatsapp';

function makeFetch(impl: (url: string, init?: any) => any) {
  return ((url: any, init?: any) => Promise.resolve(impl(String(url), init))) as unknown as typeof fetch;
}

describe('whatsapp adapter', () => {
  it('platform is whatsapp', () => {
    expect((createWhatsAppAdapter() as any).platform).toBe('whatsapp');
    expect(WHATSAPP_PLATFORM).toBe('whatsapp');
  });

  it('validate fails without token', async () => {
    const a = createWhatsAppAdapter({ phoneNumberId: 'pid', to: '123' });
    const r = await a.validate();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/WHATSAPP_ACCESS_TOKEN/);
  });

  it('validate fails without phone id', async () => {
    const a = createWhatsAppAdapter({ accessToken: 'tok', to: '123' });
    const r = await a.validate();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/WHATSAPP_PHONE_NUMBER_ID/);
  });

  it('validate fails without to', async () => {
    const a = createWhatsAppAdapter({ accessToken: 'tok', phoneNumberId: 'pid' });
    const r = await a.validate();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/WHATSAPP_TO/);
  });

  it('publish video success', async () => {
    let sent: any = null;
    const fetch = makeFetch((url, init) => {
      sent = { url, body: JSON.parse(init.body), headers: init.headers };
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.1' }] }) };
    });
    const a = createWhatsAppAdapter({ accessToken: 'tok', phoneNumberId: 'pid', to: '521234', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://example.com/v.mp4', metadata: { title: 'Hola', description: 'Mundo' } });
    expect(res.ok).toBe(true);
    expect(res.id).toBe('wamid.1');
    expect(sent.url).toContain('/pid/messages');
    expect(sent.body.type).toBe('video');
    expect(sent.body.video.link).toBe('https://example.com/v.mp4');
    expect(sent.headers.Authorization).toBe('Bearer tok');
  });

  it('publish text success (no videoUrl)', async () => {
    let sent: any = null;
    const fetch = makeFetch((_url, init) => {
      sent = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.2' }] }) };
    });
    const a = createWhatsAppAdapter({ accessToken: 'tok', phoneNumberId: 'pid', to: '521234', fetchFn: fetch });
    const res = await a.publish({ metadata: { title: 'Hola', description: 'Mundo' } });
    expect(res.ok).toBe(true);
    expect(sent.type).toBe('text');
    expect(sent.text.body).toContain('Hola');
  });

  it('publish fails soft on HTTP error', async () => {
    const fetch = makeFetch(() => ({ ok: false, status: 401, json: async () => ({ error: { message: 'bad token' } }) }));
    const a = createWhatsAppAdapter({ accessToken: 'tok', phoneNumberId: 'pid', to: '521234', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://x/v.mp4' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/HTTP 401/);
  });

  it('publish fails soft on network error', async () => {
    const fetch = makeFetch(() => { throw new Error('conn'); });
    const a = createWhatsAppAdapter({ accessToken: 'tok', phoneNumberId: 'pid', to: '521234', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://x/v.mp4' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/conn/);
  });
});
