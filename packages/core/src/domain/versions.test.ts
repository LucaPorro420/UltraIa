import { describe, expect, it } from 'vitest';
import { activateVersion, rejectVersion } from './versions';
import type { Db } from '../db/client';

function fakeDb() {
  const versions = [
    { id: 'v1', blueprintId: 'bp1', status: 'ACTIVE', versionNumber: 1 },
    { id: 'v2', blueprintId: 'bp1', status: 'SUPERSEDED', versionNumber: 2 },
    { id: 'v3', blueprintId: 'bp1', status: 'PENDING', versionNumber: 3 },
  ];
  const db = {
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(db),
    agentVersion: {
      findFirst: async ({ where }: any) =>
        versions.find((v) => (!where.id || v.id === where.id) && (!where.blueprintId || v.blueprintId === where.blueprintId)) ??
        null,
      updateMany: async ({ where, data }: any) => {
        for (const v of versions) {
          if ((!where.blueprintId || v.blueprintId === where.blueprintId) && (!where.status || v.status === where.status)) {
            Object.assign(v, data);
          }
        }
        return {};
      },
      update: async ({ where, data }: any) => {
        const v = versions.find((x) => x.id === where.id);
        if (v) Object.assign(v, data);
        return v;
      },
    },
  };
  return { db: db as unknown as Db, versions };
}

describe('versions', () => {
  it('rejects a pending version', async () => {
    const { db, versions } = fakeDb();
    await rejectVersion(db, 'v3');
    expect(versions.find((v) => v.id === 'v3')!.status).toBe('REJECTED');
  });

  it('rolls back to a superseded version', async () => {
    const { db, versions } = fakeDb();
    await activateVersion(db, 'bp1', 'v2');
    expect(versions.find((v) => v.id === 'v1')!.status).toBe('SUPERSEDED');
    expect(versions.find((v) => v.id === 'v2')!.status).toBe('ACTIVE');
  });

  it('is a no-op when rolling back to the active version', async () => {
    const { db, versions } = fakeDb();
    await activateVersion(db, 'bp1', 'v1');
    expect(versions.find((v) => v.id === 'v1')!.status).toBe('ACTIVE');
  });

  it('throws when the version does not belong to the blueprint', async () => {
    const { db } = fakeDb();
    await expect(activateVersion(db, 'bp1', 'nope')).rejects.toThrow();
  });
});
