// -----------------------------------------------------------------------------
// zernio.ts — capability `zernio` (MCP Zernio 3.4.4)
// -----------------------------------------------------------------------------
// Cliente MCP determinista para https://mcp.zernio.com/mcp (verificado 28/08/2026).
// Zernio = API de scheduling social (accounts/posts/media/analytics/inbox).
// Protocolo MCP 2024-11-05: POST con {"jsonrpc":"2.0","id":N,"method":"..."} y
// respuesta SSE `event: message\ndata: {...}`. Sin dep `@modelcontextprotocol/sdk`:
// port fetch/SSE manual, keyless-first fail-soft, fetch inyectable (tests nunca red).
// -----------------------------------------------------------------------------

import { z } from 'zod';

export const ZERNIO_MCP_URL = 'https://mcp.zernio.com/mcp';
export const ZERNIO_PROTOCOL_VERSION = '2024-11-05';

// ---------------------------------------------------------------------------
// Schemas (derivados de tools/list real, 50+ tools)
// ---------------------------------------------------------------------------

export const zernioConfigSchema = z.object({
  url: z.string().url().optional(),
  apiKey: z.string().min(1).max(300).optional(),
  protocolVersion: z.string().min(1).max(20).optional(),
});

export type ZernioConfig = z.infer<typeof zernioConfigSchema>;

export const zernioToolSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  inputSchema: z.record(z.unknown()).optional(),
});

export type ZernioTool = z.infer<typeof zernioToolSchema>;

// Input schemas específicos (subset útil para UltraIa AutoPub)
export const zernioPostsCreateSchema = z.object({
  content: z.string().min(1).max(5000),
  platform: z.enum(['twitter', 'instagram', 'linkedin', 'tiktok', 'bluesky', 'facebook', 'youtube', 'pinterest', 'threads', 'metaads', 'openaiads']),
  account_id: z.string().max(100).optional(),
  profile_id: z.string().max(100).optional(),
  is_draft: z.boolean().optional(),
  publish_now: z.boolean().optional(),
  schedule_minutes: z.number().int().min(0).max(525600).optional(),
  media_urls: z.string().max(2000).optional(),
  title: z.string().max(500).optional(),
});

export const zernioCrossPostSchema = z.object({
  content: z.string().min(1).max(5000),
  platforms: z.string().min(1).max(300),
  account_ids: z.string().max(500).optional(),
  profile_id: z.string().max(100).optional(),
  is_draft: z.boolean().optional(),
  publish_now: z.boolean().optional(),
  media_urls: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

export function buildZernioHeaders(apiKey?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;
  return h;
}

export function buildMcpBody(id: number, method: string, params: Record<string, unknown> = {}): string {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params });
}

/** Parsea respuesta SSE de MCP: extrae el JSON de `data: {...}`. */
export function parseSseResponse(text: string): unknown {
  // MCP devuelve `event: message\ndata: {"jsonrpc":...}` (puede haber múltiples eventos, nos quedamos con el último data)
  const lines = text.split('\n');
  let lastData = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      lastData = trimmed.slice(5).trim();
    }
  }
  if (!lastData) throw new Error('SSE sin data: ' + text.slice(0, 200));
  return JSON.parse(lastData);
}

export function resolveZernioConfig(raw: ZernioConfig = {}): Required<ZernioConfig> {
  const parsed = zernioConfigSchema.parse(raw);
  return {
    url: parsed.url ?? process.env.ZERNIO_MCP_URL ?? ZERNIO_MCP_URL,
    apiKey: parsed.apiKey ?? process.env.ZERNIO_API_KEY ?? '',
    protocolVersion: parsed.protocolVersion ?? ZERNIO_PROTOCOL_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export type ZernioClient = {
  config: Required<ZernioConfig>;
  listTools(): Promise<{ ok: true; tools: ZernioTool[] } | { ok: false; reason: string }>;
  callTool(name: string, args?: Record<string, unknown>): Promise<{ ok: true; result: string } | { ok: false; reason: string }>;
  initialize(): Promise<{ ok: true; serverInfo: { name: string; version: string } } | { ok: false; reason: string }>;
};

export function createZernioClient(rawConfig: ZernioConfig = {}, fetchImpl?: typeof fetch): ZernioClient {
  const config = resolveZernioConfig(rawConfig);
  const doFetch = fetchImpl ?? fetch;
  let nextId = 1;

  async function mcpCall(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const body = buildMcpBody(nextId++, method, params);
    const headers = buildZernioHeaders(config.apiKey || undefined);
    const res = await doFetch(config.url, { method: 'POST', headers, body });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`MCP ${method} ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = parseSseResponse(text) as { result?: unknown; error?: { message?: string } };
    if ((data as { error?: unknown }).error) {
      const err = (data as { error: { message?: string } }).error;
      throw new Error(err.message ?? JSON.stringify(err).slice(0, 300));
    }
    return (data as { result: unknown }).result;
  }

  return {
    config,
    async initialize() {
      try {
        const result = (await mcpCall('initialize', {
          protocolVersion: config.protocolVersion,
          capabilities: {},
          clientInfo: { name: 'ultraia', version: '1.0.0' },
        })) as { serverInfo?: { name: string; version: string } };
        const serverInfo = result.serverInfo ?? { name: 'Zernio', version: 'unknown' };
        return { ok: true, serverInfo };
      } catch (e) {
        return { ok: false, reason: String((e as Error).message ?? e).slice(0, 500) };
      }
    },
    async listTools() {
      try {
        const result = (await mcpCall('tools/list', {})) as { tools?: ZernioTool[] };
        const tools = (result.tools ?? []).map((t) => zernioToolSchema.parse(t));
        return { ok: true, tools };
      } catch (e) {
        return { ok: false, reason: String((e as Error).message ?? e).slice(0, 500) };
      }
    },
    async callTool(name: string, args: Record<string, unknown> = {}) {
      try {
        const result = (await mcpCall('tools/call', { name, arguments: args })) as { content?: Array<{ text?: string; type?: string }> } | { result?: string };
        // FastMCP wrap: {content:[{type:"text",text:"..."}]} o {result:"..."} según zernio
        if (typeof (result as { result?: string }).result === 'string') {
          return { ok: true, result: (result as { result: string }).result };
        }
        const content = (result as { content?: Array<{ text?: string }> }).content;
        if (Array.isArray(content) && content[0]?.text) {
          return { ok: true, result: content[0].text! };
        }
        return { ok: true, result: JSON.stringify(result).slice(0, 5000) };
      } catch (e) {
        return { ok: false, reason: String((e as Error).message ?? e).slice(0, 500) };
      }
    },
  };
}

// Helpers de alto nivel (atajos para AutoPub)
export async function zernioAccountsList(client: ZernioClient) {
  return client.callTool('accounts_list', {});
}
export async function zernioPostsCreate(client: ZernioClient, input: z.infer<typeof zernioPostsCreateSchema>) {
  const parsed = zernioPostsCreateSchema.parse(input);
  return client.callTool('posts_create', parsed as unknown as Record<string, unknown>);
}
export async function zernioPostsCrossPost(client: ZernioClient, input: z.infer<typeof zernioCrossPostSchema>) {
  const parsed = zernioCrossPostSchema.parse(input);
  return client.callTool('posts_cross_post', parsed as unknown as Record<string, unknown>);
}
export async function zernioAnalytics(client: ZernioClient, params: Record<string, unknown> = {}) {
  return client.callTool('analytics_get_analytics', params);
}

export const zernio = {
  createZernioClient,
  buildZernioHeaders,
  buildMcpBody,
  parseSseResponse,
  resolveZernioConfig,
  ZERNIO_MCP_URL,
  zernioAccountsList,
  zernioPostsCreate,
  zernioPostsCrossPost,
  zernioAnalytics,
  zernioConfigSchema,
  zernioPostsCreateSchema,
  zernioCrossPostSchema,
};
