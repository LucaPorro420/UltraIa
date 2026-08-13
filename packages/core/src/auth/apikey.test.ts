import { describe, expect, it } from 'vitest';
import { createApiKey, generateApiKey, hashApiKey, listApiKeys, revokeApiKey, verifyApiKey } from './apikey';
import type { Db } from '../db/client';

function fakeDb() {
  const apiKeys: any[] = [];
  const db = {
    apiKey: {
      create: async ({ data }: any) => {
        const r = { id: `k${apiKeys.length + 1}`, ...data };
        apiKeys.push(r);
        return r;
      },
      findFirst: async ({ where }: any) =>
        apiKeys.find(
          (x) =>
            (!where.blueprintId || x.blueprintId === where.blueprintId) &&
            (!where.keyHash || x.keyHash === where.keyHash),
        ) ?? null,
      findMany: async ({ where }: any) =>
        apiKeys
          .filter((x) => !where?.blueprintId || x.blueprintId === where.blueprintId)
          .map((x) => ({
            id: x.id,
            name: x.name,
            keyHash: x.keyHash,
            lastUsedAt: x.lastUsedAt,
            createdAt: x.createdAt,
          })),
      delete: async ({ where }: any) => {
        const i = apiKeys.findIndex((x) => x.id === where.id);
        if (i >= 0) apiKeys.splice(i, 1);
        return {};
      },
      update: async ({ where, data }: any) => {
        const r = apiKeys.find((x) => x.id === where.id);
        if (r) Object.assign(r, data);
        return r;
      },
    },
  };
  return db as unknown as Db;
}

describe('apikey', () => {
  it('hashes deterministically and keys are prefixed', () => {
    expect(hashApiKey('secret')).toBe(hashApiKey('secret'));
    const { key, keyHash } = generateApiKey();
    expect(key.startsWith('ua_')).toBe(true);
    expect(keyHash).toBe(hashApiKey(key));
  });

  it('creates, verifies and lists keys', async () => {
    const db = fakeDb();
    const { key } = await createApiKey(db, 'bp1', 'prod');
    const found = await verifyApiKey(db, key, 'bp1');
    expect(found?.name).toBe('prod');

    expect(await verifyApiKey(db, 'wrong', 'bp1')).toBeNull();
    expect(await verifyApiKey(db, 'ua_notprefixed', 'bp1')).toBeNull();
    expect(await verifyApiKey(db, key, 'other')).toBeNull();

    const list = await listApiKeys(db, 'bp1');
    expect(list).toHaveLength(1);
    expect(list[0].prefix.startsWith('ua_')).toBe(true);
    expect(list[0].name).toBe('prod');
  });

  it('revokes a key', async () => {
    const db = fakeDb();
    const { key } = await createApiKey(db, 'bp1', 'prod');
    const found = await verifyApiKey(db, key, 'bp1');
    await revokeApiKey(db, found!.id);
    expect(await verifyApiKey(db, key, 'bp1')).toBeNull();
  });
});
