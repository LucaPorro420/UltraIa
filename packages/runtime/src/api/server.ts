import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { WebSocketConnection, wsAccept } from './ws';

/**
 * Handlers exposed by the Local API. Implemented by the runtime (see
 * runtime-handlers.ts) or by a fake in tests — the server never touches
 * runtime internals directly.
 */
export interface ApiHandlers {
  health(): unknown | Promise<unknown>;
  status(): unknown | Promise<unknown>;
  listModules(): unknown | Promise<unknown>;
  startModule(id: string): unknown | Promise<unknown>;
  stopModule(id: string): unknown | Promise<unknown>;
  executeCommand(body: Record<string, unknown>): unknown | Promise<unknown>;
  createTask(body: Record<string, unknown>): unknown | Promise<unknown>;
  getTask(id: string): unknown | Promise<unknown>;
  storeMemory(body: Record<string, unknown>): unknown | Promise<unknown>;
  queryMemory(query?: string, types?: string, budgetChars?: number): unknown | Promise<unknown>;
  configSummary(): unknown;
  /** Subscribe to runtime events for WS broadcasting. Returns an unsubscribe fn. */
  subscribeEvents(listener: (topic: string, payload: unknown) => void): () => void;
  /** Called when the server closes (reserved for host cleanup). */
  close(): Promise<void>;
}

export interface LocalApiOptions {
  /** Session token. Required on every request (Bearer header or ?token= for WS). */
  token: string;
  handlers: ApiHandlers;
  /** Bind address. Default 127.0.0.1 (loopback only). */
  host?: string;
  /** Port. Default 0 (ephemeral). */
  port?: number;
  /** Max JSON body in bytes. Default 64 KiB. */
  maxBodyBytes?: number;
  /** Fixed-window rate limit per peer. Default { windowMs: 60_000, max: 120 }. */
  rateLimit?: { windowMs: number; max: number };
}

/** Error with an explicit HTTP status, raised by handlers. */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const HOST_RE = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;
const ORIGIN_RE = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

const TOO_LARGE = Symbol('body-too-large');
const INVALID_JSON = Symbol('invalid-json');

interface Route {
  method: string;
  pattern: RegExp;
  paramCount: number;
  run: (url: URL, params: string[], body: unknown) => unknown | Promise<unknown>;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

/**
 * Loopback-only HTTP/WS API for the Shell. Every request needs the session
 * token (constant-time comparison), Host/Origin must be loopback (blocks DNS
 * rebinding and cross-origin browser calls), and rate limits are enforced per
 * peer. Bodies are capped. `GET /events` upgraded to WebSocket streams runtime
 * events (`module.*`, `task.*`, `health.*`, `resource.*`, `memory.*`, `api.*`).
 */
export class LocalApiServer {
  private readonly server = createServer();
  private readonly handlers: ApiHandlers;
  private readonly tokenHash: Buffer;
  private readonly host: string;
  private readonly port: number;
  private readonly maxBodyBytes: number;
  private readonly rateLimit: { windowMs: number; max: number };
  private readonly routes: Route[];
  private readonly buckets = new Map<string, RateBucket>();
  private readonly wsConnections = new Set<WebSocketConnection>();
  private urlValue?: string;
  private listening = false;
  private unsubscribeEvents?: () => void;

  constructor(private readonly options: LocalApiOptions) {
    this.handlers = options.handlers;
    this.tokenHash = createHash('sha256').update(options.token).digest();
    this.host = options.host ?? '127.0.0.1';
    this.port = options.port ?? 0;
    this.maxBodyBytes = options.maxBodyBytes ?? 64 * 1024;
    this.rateLimit = options.rateLimit ?? { windowMs: 60_000, max: 120 };
    this.routes = this.buildRoutes();
    this.server.on('request', (req, res) => void this.handleRequest(req, res));
    this.server.on('upgrade', (req, socket) => this.handleUpgrade(req, socket));
  }

  url(): string {
    return this.urlValue ?? '';
  }

  async listen(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, this.host, () => {
        this.server.removeListener('error', reject);
        resolve();
      });
    });
    const addr = this.server.address() as AddressInfo;
    this.urlValue = `http://${this.host}:${addr.port}`;
    this.listening = true;
    this.unsubscribeEvents = this.handlers.subscribeEvents((topic, payload) => {
      const message = JSON.stringify({ type: 'event', topic, payload, at: new Date().toISOString() });
      for (const ws of this.wsConnections) ws.send(message);
    });
  }

  async close(): Promise<void> {
    this.unsubscribeEvents?.();
    this.unsubscribeEvents = undefined;
    for (const ws of [...this.wsConnections]) ws.close(1001, 'server shutting down');
    this.wsConnections.clear();
    await this.handlers.close();
    if (this.listening) {
      await new Promise<void>((resolve) => this.server.close(() => resolve()));
      this.listening = false;
    }
  }

  private buildRoutes(): Route[] {
    const h = this.handlers;
    return [
      { method: 'GET', pattern: /^\/health$/, paramCount: 0, run: () => h.health() },
      { method: 'GET', pattern: /^\/status$/, paramCount: 0, run: () => h.status() },
      { method: 'GET', pattern: /^\/modules$/, paramCount: 0, run: () => h.listModules() },
      {
        method: 'POST',
        pattern: /^\/modules\/([^/]+)\/start$/,
        paramCount: 1,
        run: (_url, params) => h.startModule(params[0]),
      },
      {
        method: 'POST',
        pattern: /^\/modules\/([^/]+)\/stop$/,
        paramCount: 1,
        run: (_url, params) => h.stopModule(params[0]),
      },
      {
        method: 'POST',
        pattern: /^\/commands\/execute$/,
        paramCount: 0,
        run: (_url, _params, body) => h.executeCommand(body as Record<string, unknown>),
      },
      {
        method: 'POST',
        pattern: /^\/tasks$/,
        paramCount: 0,
        run: (_url, _params, body) => h.createTask(body as Record<string, unknown>),
      },
      {
        method: 'GET',
        pattern: /^\/tasks\/([^/]+)$/,
        paramCount: 1,
        run: (_url, params) => h.getTask(params[0]),
      },
      {
        method: 'POST',
        pattern: /^\/memory$/,
        paramCount: 0,
        run: (_url, _params, body) => h.storeMemory(body as Record<string, unknown>),
      },
      {
        method: 'GET',
        pattern: /^\/memory$/,
        paramCount: 0,
        run: (url) => h.queryMemory(url.searchParams.get('query') ?? undefined, url.searchParams.get('types') ?? undefined, intParam(url, 'budgetChars')),
      },
      { method: 'GET', pattern: /^\/config$/, paramCount: 0, run: () => h.configSummary() },
    ];
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.isRateLimited(req)) {
      const bucket = this.bucketFor(req);
      const resetAt = bucket?.resetAt ?? Date.now() + this.rateLimit.windowMs;
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
      return this.json(res, 429, { error: 'rate limit exceeded' });
    }
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
    } catch {
      return this.json(res, 400, { error: 'malformed url' });
    }
    const route = this.routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
    if (!route) return this.json(res, 404, { error: 'not found' });
    if (!this.validatePeer(req)) return this.json(res, 403, { error: 'forbidden' });
    if (!this.authorized(req)) return this.json(res, 401, { error: 'unauthorized' });
    let body: unknown = {};
    if (req.method === 'POST') {
      try {
        body = await this.readBody(req);
      } catch (err) {
        if (err === TOO_LARGE) {
          res.setHeader('Connection', 'close');
          return this.json(res, 413, { error: 'body too large' });
        }
        if (err === INVALID_JSON) return this.json(res, 400, { error: 'invalid json body' });
        return this.json(res, 500, { error: 'request aborted' });
      }
    }
    const match = url.pathname.match(route.pattern) ?? [];
    const params = match.slice(1).map((segment) => decodeURIComponent(segment));
    try {
      const result = await route.run(url, params, body);
      if (!res.writableEnded) this.json(res, 200, result === undefined ? null : result);
    } catch (err) {
      if (res.writableEnded) return;
      if (err instanceof ApiError) return this.json(res, err.status, { error: err.message });
      const message = err instanceof Error ? err.message : String(err);
      return this.json(res, 400, { error: message });
    }
  }

  private handleUpgrade(req: IncomingMessage, socket: Duplex): void {
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== '/events') {
      socket.destroy();
      return;
    }
    if (!this.validatePeer(req)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const token = url.searchParams.get('token');
    if (!token || !this.authorizedToken(token)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const key = req.headers['sec-websocket-key'];
    if (typeof key !== 'string') {
      socket.destroy();
      return;
    }
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`,
    );
    const ws = new WebSocketConnection(socket);
    this.wsConnections.add(ws);
    ws.onClose(() => this.wsConnections.delete(ws));
    ws.send(JSON.stringify({ type: 'connected', at: new Date().toISOString(), url: this.urlValue }));
  }

  private validatePeer(req: IncomingMessage): boolean {
    const host = req.headers.host;
    if (host && !HOST_RE.test(host)) return false;
    const origin = req.headers.origin;
    if (origin && !ORIGIN_RE.test(origin)) return false;
    return true;
  }

  private authorized(req: IncomingMessage): boolean {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
    return this.authorizedToken(header.slice('Bearer '.length));
  }

  private authorizedToken(token: string): boolean {
    const candidate = createHash('sha256').update(token).digest();
    return candidate.length === this.tokenHash.length && timingSafeEqual(candidate, this.tokenHash);
  }

  private bucketFor(req: IncomingMessage): RateBucket | undefined {
    const key = req.socket.remoteAddress ?? 'unknown';
    if (this.buckets.size > 1000) {
      const now = Date.now();
      for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
    }
    return this.buckets.get(key);
  }

  private isRateLimited(req: IncomingMessage): boolean {
    const key = req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.rateLimit.windowMs });
      return false;
    }
    bucket.count++;
    return bucket.count > this.rateLimit.max;
  }

  private readBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const declared = Number(req.headers['content-length'] ?? 0);
      let settled = false;
      if (declared > this.maxBodyBytes) {
        settled = true;
        reject(TOO_LARGE);
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      req.on('data', (chunk: Buffer) => {
        if (settled) return;
        size += chunk.length;
        if (size > this.maxBodyBytes) {
          settled = true;
          reject(TOO_LARGE);
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (settled) return;
        settled = true;
        if (chunks.length === 0) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(INVALID_JSON);
        }
      });
      req.on('error', () => {
        if (!settled) {
          settled = true;
          reject(new Error('request aborted'));
        }
      });
    });
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(data ?? ''),
    });
    res.end(data);
  }
}

function intParam(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null || raw.trim() === '') return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}