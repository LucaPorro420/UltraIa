import { describe, it, expect, vi } from 'vitest';
import {
  buildZernioHeaders,
  buildMcpBody,
  parseSseResponse,
  resolveZernioConfig,
  createZernioClient,
  ZERNIO_MCP_URL,
} from './zernio';

describe('zernio — MCP Zernio 3.4.4', () => {
  it('buildZernioHeaders sin y con key', () => {
    const h1 = buildZernioHeaders();
    expect(h1['Content-Type']).toBe('application/json');
    expect(h1.Authorization).toBeUndefined();
    const h2 = buildZernioHeaders('sk-test');
    expect(h2.Authorization).toBe('Bearer sk-test');
  });

  it('buildMcpBody', () => {
    const b = buildMcpBody(1, 'tools/list', {});
    const j = JSON.parse(b);
    expect(j.jsonrpc).toBe('2.0');
    expect(j.method).toBe('tools/list');
  });

  it('parseSseResponse extrae último data', () => {
    const sse = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n';
    const j = parseSseResponse(sse) as { result: { tools: unknown[] } };
    expect(j.result.tools).toEqual([]);
    // múltiples eventos
    const sse2 = 'event: message\ndata: {"id":1}\nevent: message\ndata: {"id":2,"result":{"ok":true}}\n';
    const j2 = parseSseResponse(sse2) as { id: number };
    expect(j2.id).toBe(2);
  });

  it('parseSseResponse lanza sin data', () => {
    expect(() => parseSseResponse('no sse here')).toThrow();
  });

  it('resolveZernioConfig defaults', () => {
    const c = resolveZernioConfig({});
    expect(c.url).toBe(ZERNIO_MCP_URL);
    expect(c.protocolVersion).toBe('2024-11-05');
  });

  it('resolveZernioConfig respeta env', () => {
    const prev = process.env.ZERNIO_MCP_URL;
    process.env.ZERNIO_MCP_URL = 'https://example.com/mcp';
    const c = resolveZernioConfig({});
    expect(c.url).toBe('https://example.com/mcp');
    if (prev === undefined) delete process.env.ZERNIO_MCP_URL;
    else process.env.ZERNIO_MCP_URL = prev;
  });

  it('listTools mock SSE', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"accounts_list","description":"x"}]}}\n';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => sseBody }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, mockFetch as unknown as typeof fetch);
    const res = await client.listTools();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.tools[0].name).toBe('accounts_list');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('callTool posts_create mock', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"result":"post created id=123"}}\n';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => sseBody }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, mockFetch as unknown as typeof fetch);
    const res = await client.callTool('posts_create', { content: 'hola', platform: 'twitter' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result).toContain('post created');
  });

  it('callTool con content array FastMCP wrap', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"hello"}]}}\n';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => sseBody }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, mockFetch as unknown as typeof fetch);
    const res = await client.callTool('accounts_list', {});
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result).toBe('hello');
  });

  it('initialize mock', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"name":"Zernio","version":"3.4.4"}}}\n';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => sseBody }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, mockFetch as unknown as typeof fetch);
    const res = await client.initialize();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.serverInfo.name).toBe('Zernio');
  });

  it('fail-soft si fetch lanza', async () => {
    const badFetch = vi.fn(async () => { throw new Error('network down'); });
    const client = createZernioClient({ url: 'https://example.com/mcp' }, badFetch as unknown as typeof fetch);
    const res = await client.listTools();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/network down/);
  });

  it('fail-soft si status no ok', async () => {
    const failFetch = vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, failFetch as unknown as typeof fetch);
    const res = await client.callTool('posts_create', { content: 'x', platform: 'twitter' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/401/);
  });

  it('headers incluyen Bearer si hay apiKey', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n';
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = vi.fn(async (_url: string, opts: RequestInit) => {
      capturedHeaders = opts.headers as Record<string, string>;
      return { ok: true, status: 200, text: async () => sseBody } as unknown as Response;
    });
    const client = createZernioClient({ url: 'https://example.com/mcp', apiKey: 'sk-123' }, mockFetch as unknown as typeof fetch);
    await client.listTools();
    expect(capturedHeaders.Authorization).toBe('Bearer sk-123');
  });

  it('schemas validan posts_create', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"result":"ok"}}\n';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => sseBody }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, mockFetch as unknown as typeof fetch);
    // llamada válida
    const ok = await client.callTool('posts_create', { content: 'hola', platform: 'twitter' });
    expect(ok.ok).toBe(true);
  });

  it('zernio analytics helper', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"result":"analytics data"}}\n';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => sseBody }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, mockFetch as unknown as typeof fetch);
    const res = await client.callTool('analytics_get_analytics', { platform: 'twitter' });
    expect(res.ok).toBe(true);
  });

  it('listTools con respuesta vacía', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => sseBody }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, mockFetch as unknown as typeof fetch);
    const res = await client.listTools();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.tools.length).toBe(0);
  });

  it('callTool error field en SSE', async () => {
    const sseBody = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"error":{"message":"account not found"}}\n';
    const mockFetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => sseBody }) as unknown as Response);
    const client = createZernioClient({ url: 'https://example.com/mcp' }, mockFetch as unknown as typeof fetch);
    const res = await client.callTool('posts_create', { content: 'x', platform: 'twitter' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/account not found/);
  });
});
