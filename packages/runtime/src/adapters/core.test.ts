import { describe, expect, it, vi } from 'vitest';
import { createCorePorts } from './core';
import type { AiGatewayAdapter, DbAdapter, OmagAdapter, ToolsAdapter } from './ports';

function fakeDb(ping: boolean): DbAdapter {
  return {
    kind: 'db',
    name: 'db',
    client: {} as never,
    ping: vi.fn(async () => ping),
    close: vi.fn(async () => undefined),
  } as unknown as DbAdapter;
}

function fakeAi(ping: boolean): AiGatewayAdapter {
  return {
    kind: 'ai',
    name: 'ai',
    provider: 'ollama',
    gateway: {} as never,
    ping: vi.fn(async () => ping),
    close: vi.fn(async () => undefined),
  } as unknown as AiGatewayAdapter;
}

function fakeTools(ping: boolean): ToolsAdapter {
  return {
    kind: 'tools',
    name: 'tools',
    capabilities: [],
    descriptions: {},
    run: vi.fn(async () => undefined),
    ping: vi.fn(async () => ping),
    close: vi.fn(async () => undefined),
  } as unknown as ToolsAdapter;
}

function fakeOmag(ping: boolean): OmagAdapter {
  return {
    kind: 'omag',
    name: 'omag',
    orchestrator: {},
    run: vi.fn(async () => ({}) as never),
    ping: vi.fn(async () => ping),
    close: vi.fn(async () => undefined),
  } as unknown as OmagAdapter;
}

describe('createCorePorts', () => {
  it('reports unhealthy when no adapters are configured', async () => {
    const ports = createCorePorts();
    expect(ports.kind).toBe('core');
    expect(ports.name).toBe('core');
    expect(await ports.isHealthy()).toBe(false);
  });

  it('is healthy when all present adapters ping ok', async () => {
    const db = fakeDb(true);
    const ai = fakeAi(true);
    const ports = createCorePorts({ db, ai });
    expect(await ports.isHealthy()).toBe(true);
    expect(db.ping).toHaveBeenCalled();
    expect(ai.ping).toHaveBeenCalled();
  });

  it('is unhealthy when the db ping fails', async () => {
    const db = fakeDb(false);
    const ai = fakeAi(true);
    expect(await createCorePorts({ db, ai }).isHealthy()).toBe(false);
  });

  it('is unhealthy when the ai ping fails', async () => {
    const db = fakeDb(true);
    const ai = fakeAi(false);
    expect(await createCorePorts({ db, ai }).isHealthy()).toBe(false);
  });

  it('is healthy with only db configured', async () => {
    const db = fakeDb(true);
    expect(await createCorePorts({ db }).isHealthy()).toBe(true);
  });

  it('is healthy with the full adapter set (db+ai+tools+omag)', async () => {
    const ports = createCorePorts({ db: fakeDb(true), ai: fakeAi(true), tools: fakeTools(true), omag: fakeOmag(true) });
    expect(await ports.isHealthy()).toBe(true);
  });

  it('is unhealthy when any adapter (tools/omag) ping fails', async () => {
    expect(await createCorePorts({ tools: fakeTools(false) }).isHealthy()).toBe(false);
    expect(await createCorePorts({ omag: fakeOmag(false) }).isHealthy()).toBe(false);
  });

  it('close closes every configured adapter once', async () => {
    const db = fakeDb(true);
    const ai = fakeAi(true);
    const tools = fakeTools(true);
    const omag = fakeOmag(true);
    const ports = createCorePorts({ db, ai, tools, omag });
    await ports.close();
    expect(db.close).toHaveBeenCalledTimes(1);
    expect(ai.close).toHaveBeenCalledTimes(1);
    expect(tools.close).toHaveBeenCalledTimes(1);
    expect(omag.close).toHaveBeenCalledTimes(1);
  });

  it('close with no adapters resolves without error', async () => {
    await createCorePorts().close();
  });
});