import { describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UltraRuntime } from '../runtime';

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ultraia-api-'));
}

function auth(runtime: UltraRuntime): { authorization: string } {
  return { authorization: `Bearer ${runtime.apiToken}` };
}

function post(base: string, route: string, token: string | undefined, body: unknown, extraHeaders: Record<string, string> = {}) {
  return fetch(`${base}${route}`, {
    method: 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

describe('UltraRuntime Local API (integration)', () => {
  it('starts the API, serves status/health and requires the token', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const url = await runtime.startLocalApi();
    try {
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(runtime.apiToken).toMatch(/^[0-9a-f]{64}$/);
      expect(runtime.localApiUrl).toBe(url);

      const noAuth = await fetch(`${url}/status`);
      expect(noAuth.status).toBe(401);

      const status = await fetch(`${url}/status`, { headers: auth(runtime) });
      expect(status.status).toBe(200);
      const body = (await status.json()) as { state: string; modules: { id: string }[] };
      expect(body.state).toBe('running');
      expect(body.modules.some((m) => m.id === 'system-api')).toBe(true);

      const health = await fetch(`${url}/health`, { headers: auth(runtime) });
      await expect(health.json()).resolves.toMatchObject({ status: 'healthy' });
    } finally {
      await runtime.stop();
      expect(runtime.localApiUrl).toBeUndefined();
      expect(runtime.apiToken).toBeUndefined();
    }
  });

  it('is idempotent and covered by api.* commands', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const first = await runtime.startLocalApi();
    const second = await runtime.startLocalApi();
    try {
      expect(second).toBe(first);
      expect(await runtime.commands.execute('api.url', {}, { role: 'user' })).toBe(first);
      await expect(runtime.commands.execute('api.start', {}, { role: 'user' })).rejects.toThrow();
      const started = (await runtime.commands.execute('api.start', {}, { role: 'operator' })) as { url: string };
      expect(started.url).toBe(first);
      expect(runtime.registry.get('system-api')?.capabilities).toContain('api.http');
      expect(runtime.registry.get('system-api')?.status).toBe('available');
    } finally {
      await runtime.stop();
    }
  });

  it('executes commands over HTTP with role validation', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const url = await runtime.startLocalApi();
    try {
      const ok = await post(url, '/commands/execute', runtime.apiToken, { command: 'system.status', role: 'user' });
      expect(ok.status).toBe(200);
      await expect(ok.json()).resolves.toMatchObject({ state: 'running' });

      const denied = await post(url, '/commands/execute', runtime.apiToken, {
        command: 'module.start',
        args: { id: 'x' },
        role: 'user',
      });
      expect(denied.status).toBe(400);
      await expect(denied.json()).resolves.toMatchObject({ error: expect.stringContaining('requires level') });

      const unknown = await post(url, '/commands/execute', runtime.apiToken, { command: 'nope' });
      expect(unknown.status).toBe(400);
    } finally {
      await runtime.stop();
    }
  });

  it('creates and queries tasks over HTTP', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const url = await runtime.startLocalApi();
    try {
      const created = await post(url, '/tasks', runtime.apiToken, { type: 'render', priority: 5 });
      expect(created.status).toBe(200);
      const task = (await created.json()) as { id: string; type: string; priority: number };
      expect(task.type).toBe('render');
      expect(task.priority).toBe(5);

      const fetched = await fetch(`${url}/tasks/${task.id}`, { headers: auth(runtime) });
      expect(fetched.status).toBe(200);
      await expect(fetched.json()).resolves.toMatchObject({ id: task.id, type: 'render' });

      const missing = await fetch(`${url}/tasks/does-not-exist`, { headers: auth(runtime) });
      expect(missing.status).toBe(404);
    } finally {
      await runtime.stop();
    }
  });

  it('stores and queries memory over HTTP (invalid types rejected)', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const url = await runtime.startLocalApi();
    try {
      const stored = await post(url, '/memory', runtime.apiToken, {
        type: 'DECISION',
        source: 'api.test',
        content: 'use ffmpeg for concat in the pipeline',
        importance: 0.7,
      });
      expect(stored.status).toBe(200);
      await expect(stored.json()).resolves.toMatchObject({ type: 'DECISION', source: 'api.test' });

      const invalid = await post(url, '/memory', runtime.apiToken, { type: 'NOT_A_TYPE', source: 'x', content: 'y' });
      expect(invalid.status).toBe(400);

      const found = await fetch(`${url}/memory?query=ffmpeg&budgetChars=200`, { headers: auth(runtime) });
      expect(found.status).toBe(200);
      const result = (await found.json()) as { selected: { content: string }[] };
      expect(result.selected.length).toBe(1);
      expect(result.selected[0].content).toContain('ffmpeg');
    } finally {
      await runtime.stop();
    }
  });

  it('never leaks secrets through /config', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    runtime.config.set('openai_key', 'sk-secret-123', true);
    runtime.config.set('theme', 'dark');
    const url = await runtime.startLocalApi();
    try {
      const res = await fetch(`${url}/config`, { headers: auth(runtime) });
      await expect(res.json()).resolves.toEqual({ openai_key: '***', theme: 'dark' });
    } finally {
      await runtime.stop();
    }
  });

  it('starts and stops registered modules through the API (404 for unknown)', async () => {
    const started = vi.fn();
    const runtime = UltraRuntime.create({
      root: tmpRoot(),
      projectRoot: tmpRoot(),
      loader: async () => ({ start: started }),
    });
    runtime.registerModules([
      { id: 'video', name: 'Video', version: '1.0.0', description: 'Video gen', category: 'video', capabilities: ['video.generate'], weight: 'HEAVY' },
    ]);
    await runtime.start();
    const url = await runtime.startLocalApi();
    try {
      const startRes = await post(url, '/modules/video/start', runtime.apiToken, {});
      expect(startRes.status).toBe(200);
      await expect(startRes.json()).resolves.toMatchObject({ id: 'video', status: 'active' });

      const stopRes = await post(url, '/modules/video/stop', runtime.apiToken, {});
      expect(stopRes.status).toBe(200);
      await expect(stopRes.json()).resolves.toMatchObject({ id: 'video', status: 'installed' });

      const missing = await post(url, '/modules/ghost/start', runtime.apiToken, {});
      expect(missing.status).toBe(404);
    } finally {
      await runtime.stop();
    }
  });

  it('streams runtime events over WebSocket', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const url = await runtime.startLocalApi();
    const port = new URL(url).port;
    const WS = (globalThis as unknown as { WebSocket: new (u: string) => {
      onopen: (() => void) | null;
      onmessage: ((ev: { data: string }) => void) | null;
      onerror: ((ev: unknown) => void) | null;
      close(): void;
    } }).WebSocket;
    const client = await new Promise<{ onopen: (() => void) | null; onmessage: ((ev: { data: string }) => void) | null; onerror: ((ev: unknown) => void) | null; close(): void }>((resolve, reject) => {
      const socket = new WS(`ws://127.0.0.1:${port}/events?token=${runtime.apiToken}`);
      const timer = setTimeout(() => reject(new Error('ws open timeout')), 5000);
      socket.onopen = () => {
        clearTimeout(timer);
        resolve(socket);
      };
      socket.onerror = () => {
        clearTimeout(timer);
        reject(new Error('ws connection error'));
      };
    });
    const nextMessage = () =>
      new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('ws message timeout')), 5000);
        client.onmessage = (ev) => {
          clearTimeout(timer);
          resolve(ev.data);
        };
      });
    try {
      const connected = JSON.parse(await nextMessage());
      expect(connected.type).toBe('connected');

      runtime.tasks.create('render');
      const event = JSON.parse(await nextMessage());
      expect(event.type).toBe('event');
      expect(event.topic).toBe('task.created');
      expect(event.payload).toMatchObject({ type: 'render' });
      client.close();
    } finally {
      await runtime.stop();
    }
  });

  it('stops cleanly and releases the port (token dropped)', async () => {
    const runtime = UltraRuntime.create({ root: tmpRoot(), projectRoot: tmpRoot() });
    await runtime.start();
    const url = await runtime.startLocalApi();
    const port = new URL(url).port;
    await runtime.stopLocalApi();
    expect(runtime.localApiUrl).toBeUndefined();
    expect(runtime.apiToken).toBeUndefined();
    await expect(fetch(`http://127.0.0.1:${port}/health`)).rejects.toThrow();
    await runtime.stop();
  });
});