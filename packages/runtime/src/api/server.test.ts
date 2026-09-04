import { describe, expect, it } from 'vitest';
import { request as httpRequest } from 'node:http';
import { ApiError, LocalApiServer } from './server';
import type { ApiHandlers, LocalApiOptions } from './server';

const TOKEN = 'unit-token-0123456789abcdef';

type FakeApi = ApiHandlers & { emit(topic: string, payload: unknown): void };

function makeFake(): FakeApi {
  const listeners = new Set<(topic: string, payload: unknown) => void>();
  const fake: FakeApi = {
    health: async () => ({ status: 'healthy', checks: { runtime: { ok: true } } }),
    status: async () => ({ state: 'running', version: '0.1.0' }),
    listModules: async () => [{ id: 'system', status: 'available' }],
    startModule: async (id) => ({ id, status: 'active' }),
    stopModule: async (id) => ({ id, status: 'installed' }),
    executeCommand: async (body) => {
      if (body.command === 'missing') throw new ApiError(404, 'command not found');
      if (body.command === 'boom') throw new Error('command failed');
      return { command: body.command, args: body.args ?? null, role: body.role ?? 'user' };
    },
    createTask: async (body) => ({ id: 't1', type: body.type, status: 'QUEUED' }),
    getTask: async (id) => {
      if (id === 't1') return { id, type: 'render', status: 'COMPLETED' };
      throw new ApiError(404, `task not found: ${id}`);
    },
    storeMemory: async (body) => ({ id: 'm1', ...body }),
    queryMemory: async (query, types, budgetChars) => ({
      selected: [],
      text: '',
      usedChars: 0,
      dropped: 0,
      query: query ?? null,
      types: types ?? null,
      budgetChars: budgetChars ?? null,
    }),
    configSummary: () => ({ api_key: '***', theme: 'dark' }),
    bridgeMessage: async (body) => ({ ok: true, body }),
    subscribeEvents: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: async () => undefined,
    emit: (topic, payload) => {
      for (const listener of listeners) listener(topic, payload);
    },
  };
  return fake;
}

async function startServer(opts: Partial<LocalApiOptions> = {}): Promise<{ server: LocalApiServer; fake: FakeApi; base: string }> {
  const fake = makeFake();
  const server = new LocalApiServer({ token: TOKEN, handlers: fake, ...opts });
  await server.listen();
  return { server, fake, base: server.url() };
}

const AUTH = { authorization: `Bearer ${TOKEN}` };

interface WsClient {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  close(): void;
}

const WS = (globalThis as unknown as { WebSocket: new (url: string) => WsClient }).WebSocket;

function openWs(url: string): Promise<WsClient> {
  return new Promise((resolve, reject) => {
    const ws = new WS(url);
    const timer = setTimeout(() => reject(new Error('ws open timeout')), 5000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve(ws);
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error('ws connection error'));
    };
  });
}

function nextMessage(ws: WsClient): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ws message timeout')), 5000);
    ws.onmessage = (ev) => {
      clearTimeout(timer);
      resolve(ev.data);
    };
  });
}

/** Raw HTTP request (fetch forbids overriding the Host header). */
function rawStatus(port: number, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, path: '/status', headers: { host, authorization: `Bearer ${TOKEN}` } }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.end();
  });
}

describe('LocalApiServer', () => {
  it('requires a valid Bearer token (401 otherwise)', async () => {
    const { server, base } = await startServer();
    try {
      const noAuth = await fetch(`${base}/health`);
      expect(noAuth.status).toBe(401);
      const badAuth = await fetch(`${base}/health`, { headers: { authorization: 'Bearer wrong-token' } });
      expect(badAuth.status).toBe(401);
      const ok = await fetch(`${base}/health`, { headers: AUTH });
      expect(ok.status).toBe(200);
      await expect(ok.json()).resolves.toMatchObject({ status: 'healthy' });
    } finally {
      await server.close();
    }
  });

  it('rejects non-loopback hosts and foreign origins (403)', async () => {
    const { server, base } = await startServer();
    try {
      const port = Number(new URL(base).port);
      const badHost = await rawStatus(port, 'evil.example.com');
      expect(badHost).toBe(403);
      const badOrigin = await fetch(`${base}/status`, { headers: { ...AUTH, origin: 'https://evil.example.com' } });
      expect(badOrigin.status).toBe(403);
      const goodOrigin = await fetch(`${base}/status`, {
        headers: { ...AUTH, origin: `http://127.0.0.1:${port}` },
      });
      expect(goodOrigin.status).toBe(200);
      const goodHost = await rawStatus(port, `127.0.0.1:${port}`);
      expect(goodHost).toBe(200);
    } finally {
      await server.close();
    }
  });

  it('returns 404 for unknown routes', async () => {
    const { server, base } = await startServer();
    try {
      const res = await fetch(`${base}/nope`, { headers: AUTH });
      expect(res.status).toBe(404);
    } finally {
      await server.close();
    }
  });

  it('returns 400 for invalid JSON bodies and 413 for oversized ones', async () => {
    const { server, base } = await startServer({ maxBodyBytes: 64 });
    try {
      const invalid = await fetch(`${base}/tasks`, {
        method: 'POST',
        headers: { ...AUTH, 'content-type': 'application/json' },
        body: 'not-json{{',
      });
      expect(invalid.status).toBe(400);

      const big = JSON.stringify({ type: 'render', source: 'x'.repeat(200) });
      const oversized = await fetch(`${base}/tasks`, {
        method: 'POST',
        headers: { ...AUTH, 'content-type': 'application/json' },
        body: big,
      });
      expect(oversized.status).toBe(413);
    } finally {
      await server.close();
    }
  });

  it('enforces the per-peer rate limit (429 + Retry-After)', async () => {
    const { server, base } = await startServer({ rateLimit: { windowMs: 60_000, max: 2 } });
    try {
      expect((await fetch(`${base}/health`, { headers: AUTH })).status).toBe(200);
      expect((await fetch(`${base}/health`, { headers: AUTH })).status).toBe(200);
      const limited = await fetch(`${base}/health`, { headers: AUTH });
      expect(limited.status).toBe(429);
      expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });

  it('maps handler errors to their statuses (ApiError vs generic)', async () => {
    const { server, base } = await startServer();
    try {
      const post = (body: unknown) =>
        fetch(`${base}/commands/execute`, {
          method: 'POST',
          headers: { ...AUTH, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      const notFound = await post({ command: 'missing' });
      expect(notFound.status).toBe(404);
      const failed = await post({ command: 'boom' });
      expect(failed.status).toBe(400);
      await expect(failed.json()).resolves.toMatchObject({ error: 'command failed' });
      const ok = await post({ command: 'status', args: { deep: true }, role: 'admin' });
      expect(ok.status).toBe(200);
      await expect(ok.json()).resolves.toMatchObject({ command: 'status', role: 'admin' });
    } finally {
      await server.close();
    }
  });

  it('routes tasks and memory, and 404s missing resources', async () => {
    const { server, base } = await startServer();
    try {
      const created = await fetch(`${base}/tasks`, {
        method: 'POST',
        headers: { ...AUTH, 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'render' }),
      });
      expect(created.status).toBe(200);
      await expect(created.json()).resolves.toMatchObject({ id: 't1', type: 'render' });

      const task = await fetch(`${base}/tasks/t1`, { headers: AUTH });
      expect(task.status).toBe(200);
      await expect(task.json()).resolves.toMatchObject({ type: 'render' });

      const missing = await fetch(`${base}/tasks/zzz`, { headers: AUTH });
      expect(missing.status).toBe(404);

      const memory = await fetch(`${base}/memory?query=ffmpeg&types=DECISION,ERROR&budgetChars=100`, { headers: AUTH });
      expect(memory.status).toBe(200);
      await expect(memory.json()).resolves.toMatchObject({ query: 'ffmpeg', types: 'DECISION,ERROR', budgetChars: 100 });
    } finally {
      await server.close();
    }
  });

  it('exposes a config summary with secrets masked', async () => {
    const { server, base } = await startServer();
    try {
      const res = await fetch(`${base}/config`, { headers: AUTH });
      await expect(res.json()).resolves.toEqual({ api_key: '***', theme: 'dark' });
    } finally {
      await server.close();
    }
  });

  it('streams runtime events over WebSocket (handshake + frames)', async () => {
    const { server, fake, base } = await startServer();
    const wsUrl = `ws://127.0.0.1:${new URL(base).port}/events?token=${TOKEN}`;
    const ws = await openWs(wsUrl);
    try {
      const connected = JSON.parse(await nextMessage(ws));
      expect(connected.type).toBe('connected');

      fake.emit('task.created', { id: 't42', type: 'render' });
      const event = JSON.parse(await nextMessage(ws));
      expect(event.type).toBe('event');
      expect(event.topic).toBe('task.created');
      expect(event.payload).toEqual({ id: 't42', type: 'render' });
      expect(typeof event.at).toBe('string');

      ws.close();
    } finally {
      await server.close();
    }
  });

  it('rejects WebSocket upgrades without a valid token', async () => {
    const { server, base } = await startServer();
    const port = new URL(base).port;
    try {
      await expect(openWs(`ws://127.0.0.1:${port}/events`)).rejects.toThrow();
      await expect(openWs(`ws://127.0.0.1:${port}/events?token=wrong`)).rejects.toThrow();
    } finally {
      await server.close();
    }
  });

  it('stops serving once closed (port released)', async () => {
    const { server, base } = await startServer();
    await server.close();
    await expect(fetch(`${base}/health`, { headers: AUTH })).rejects.toThrow();
  });
});