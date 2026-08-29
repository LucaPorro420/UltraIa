import { describe, it, expect, vi } from 'vitest';
import {
  createObservabilityTracer,
  isObservabilityEnabled,
  buildIngestBody,
  buildIngestHeaders,
} from './observability';

describe('observability — Fase A (port Langfuse principios)', () => {
  it('disabled sin keys', () => {
    const t = createObservabilityTracer({});
    expect(t.enabled).toBe(false);
    expect(t.buffered.length).toBe(1); // trace-create
    expect(isObservabilityEnabled({})).toBe(false);
  });

  it('enabled con keys', () => {
    const t = createObservabilityTracer({ publicKey: 'pk-lf-test', secretKey: 'sk-lf-test' });
    expect(t.enabled).toBe(true);
    expect(isObservabilityEnabled({ publicKey: 'pk', secretKey: 'sk' })).toBe(true);
  });

  it('enabled=false fuerza disabled aunque haya keys', () => {
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk', enabled: false });
    expect(t.enabled).toBe(false);
  });

  it('traceStep encola span-create', () => {
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk' });
    const before = t.buffered.length;
    const id = t.traceStep({ name: 'tool-research', input: { q: 'hola' }, output: { ok: true } });
    expect(typeof id).toBe('string');
    expect(t.buffered.length).toBe(before + 1);
    expect(t.buffered.at(-1)!.type).toBe('span-create');
    expect(t.totalEvents).toBe(2);
  });

  it('traceGeneration encola generation-create', () => {
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk' });
    const id = t.traceGeneration({ name: 'chat', model: 'gpt-4o-mini', input: 'hi', output: 'hello' });
    expect(typeof id).toBe('string');
    expect(t.buffered.at(-1)!.type).toBe('generation-create');
  });

  it('score encola score-create y valida 0..1', () => {
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk' });
    const id = t.score('quality', 0.85, 'buen output');
    expect(typeof id).toBe('string');
    expect(t.buffered.at(-1)!.type).toBe('score-create');
    expect(() => t.score('bad', 1.5)).toThrow();
    expect(() => t.score('bad', -0.1)).toThrow();
  });

  it('clear vacia buffer sin tocar totalEvents', () => {
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk' });
    t.traceStep({ name: 's1' });
    const total = t.totalEvents;
    t.clear();
    expect(t.buffered.length).toBe(0);
    expect(t.totalEvents).toBe(total);
  });

  it('dump refleja estado', () => {
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk', traceName: 'my-trace' });
    const d = t.dump();
    expect(d.traceName).toBe('my-trace');
    expect(d.enabled).toBe(true);
    expect(d.buffered).toBe(1);
  });

  it('buildIngestBody y buildIngestHeaders puros', () => {
    const events: any[] = [{ id: '1', type: 'trace-create', body: { id: 'a' }, timestamp: new Date().toISOString() }];
    const body = buildIngestBody(events as any);
    expect(body.batch.length).toBe(1);
    const headers = buildIngestHeaders('pk-test', 'sk-test');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization.startsWith('Basic ')).toBe(true);
    // base64 decodifica a pk:sk
    const b64 = headers.Authorization.slice(6);
    const decoded = Buffer.from(b64, 'base64').toString();
    expect(decoded).toBe('pk-test:sk-test');
  });

  it('flush fail-soft si disabled', async () => {
    const t = createObservabilityTracer({});
    const res = await t.flush();
    expect(res.ok).toBe(false);
    expect(res.sent).toBe(0);
    expect(res.reason).toMatch(/deshabilitado/);
  });

  it('flush envia batch con fetch inyectable (mock)', async () => {
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }) as any);
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk', host: 'https://example.com' }, mockFetch as any);
    t.traceStep({ name: 's1', input: 'hi' });
    const res = await t.flush();
    expect(res.ok).toBe(true);
    expect(res.sent).toBe(2); // trace-create + span
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const url = call[0];
    const opts = call[1] as RequestInit & { headers: Record<string, string> };
    expect(url).toBe('https://example.com/api/public/ingestion');
    expect((opts.headers as Record<string, string>).Authorization.startsWith('Basic ')).toBe(true);
    expect(t.buffered.length).toBe(0); // vaciado
  });

  it('flush fail-soft si fetch lanza', async () => {
    const badFetch = vi.fn(async () => { throw new Error('network down'); });
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk' }, badFetch as any);
    t.traceStep({ name: 's1' });
    const res = await t.flush();
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/fetch failed/);
    expect(t.buffered.length).toBe(2); // no se vacía si falla
  });

  it('flush fail-soft si status no ok', async () => {
    const failFetch = vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' }) as any);
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk' }, failFetch as any);
    t.traceStep({ name: 's1' });
    const res = await t.flush();
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(res.reason).toMatch(/401/);
  });

  it('cap 100 steps en buffer (sin flush)', () => {
    const t = createObservabilityTracer({ publicKey: 'pk', secretKey: 'sk' });
    for (let i = 0; i < 105; i++) t.traceStep({ name: `s${i}` });
    expect(t.buffered.length).toBe(106); // 1 trace-create +105
    expect(t.totalEvents).toBe(106);
  });
});
