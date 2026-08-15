import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createPrismaDb } from './db';
import type { DbAdapterOptions, PrismaClientFactoryOptions } from './db';

function fakeClient(overrides: Record<string, unknown> = {}) {
  return {
    $queryRawUnsafe: vi.fn(async () => [{}]),
    $disconnect: vi.fn(async () => undefined),
    $connect: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as PrismaClient;
}

describe('createPrismaDb', () => {
  it('creates an adapter with kind/name and an injected client', async () => {
    const client = fakeClient();
    const db = createPrismaDb({ client });
    expect(db.kind).toBe('db');
    expect(db.name).toBe('db');
    expect(db.client).toBe(client);
    await db.close();
  });

  it('ping returns true when SELECT 1 responds', async () => {
    const client = fakeClient();
    const db = createPrismaDb({ client });
    expect(await db.ping()).toBe(true);
    expect(client.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
    await db.close();
  });

  it('ping returns false when the query fails', async () => {
    const client = fakeClient({ $queryRawUnsafe: vi.fn(async () => { throw new Error('db down'); }) });
    const db = createPrismaDb({ client });
    expect(await db.ping()).toBe(false);
    await db.close();
  });

  it('shares a singleton client per datasourceUrl and frees it on close', async () => {
    const factory = vi.fn((_opts: PrismaClientFactoryOptions) => fakeClient()) as unknown as NonNullable<DbAdapterOptions['factory']>;
    const url = 'file:./singleton-a.db';
    const a = createPrismaDb({ datasourceUrl: url, factory });
    const b = createPrismaDb({ datasourceUrl: url, factory });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(a.client).toBe(b.client);
    expect(a.datasourceUrl).toBe(url);

    await a.close();
    const c = createPrismaDb({ datasourceUrl: url, factory });
    expect(factory).toHaveBeenCalledTimes(2);
    expect(c.client).not.toBe(a.client);
    await c.close();
  });

  it('passes datasourceUrl and logQueries to the factory', async () => {
    const factory = vi.fn((_opts: PrismaClientFactoryOptions) => fakeClient()) as unknown as NonNullable<DbAdapterOptions['factory']>;
    const url = 'file:./opts-b.db';
    const db = createPrismaDb({ datasourceUrl: url, logQueries: true, factory });
    expect(factory).toHaveBeenCalledWith({ datasourceUrl: url, logQueries: true });
    await db.close();
  });

  it('close is idempotent and disconnects once', async () => {
    const client = fakeClient();
    const db = createPrismaDb({ client });
    await db.close();
    await db.close();
    expect(client.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('ping returns false after close', async () => {
    const client = fakeClient();
    const db = createPrismaDb({ client });
    await db.close();
    expect(await db.ping()).toBe(false);
  });
});