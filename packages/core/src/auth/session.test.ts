import { describe, expect, it } from 'vitest';
import { createSession, destroySession, getSessionUser } from './session';
import type { Db } from '../db/client';

function fakeDb(seed: { user: any; workspace: any }) {
  const users = [{ ...seed.user, workspaces: [seed.workspace] }];
  const sessions: any[] = [];
  const db = {
    session: {
      create: async ({ data }: any) => {
        const s = { id: `s${sessions.length + 1}`, ...data };
        sessions.push(s);
        return s;
      },
      findUnique: async ({ where }: any) => {
        const s = sessions.find((x) => (where.id ? x.id === where.id : x.token === where.token));
        if (!s) return null;
        return { ...s, user: { ...users[0], workspaces: users[0].workspaces } };
      },
      delete: async ({ where }: any) => {
        const i = sessions.findIndex((x) => x.id === where.id);
        if (i >= 0) sessions.splice(i, 1);
        return {};
      },
      deleteMany: async ({ where }: any) => {
        const i = sessions.findIndex((x) => x.token === where.token);
        if (i >= 0) sessions.splice(i, 1);
        return {};
      },
    },
  };
  return db as unknown as Db;
}

describe('session', () => {
  it('creates and resolves a session user', async () => {
    const db = fakeDb({ user: { id: 'u1', email: 'a@b.c', name: 'A' }, workspace: { id: 'w1' } });
    const { token } = await createSession(db, 'u1');
    expect(token.length).toBeGreaterThan(10);
    const user = await getSessionUser(db, token);
    expect(user?.id).toBe('u1');
    expect(user?.workspaceId).toBe('w1');
    expect(user?.name).toBe('A');
  });

  it('rejects expired sessions', async () => {
    const db = fakeDb({ user: { id: 'u1', email: 'a@b.c', name: 'A' }, workspace: { id: 'w1' } });
    const { token } = await createSession(db, 'u1');
    (db as any).session.findUnique = async () => ({
      id: 's1',
      userId: 'u1',
      token,
      expiresAt: new Date(Date.now() - 1000),
      user: { id: 'u1', email: 'a@b.c', name: 'A', workspaces: [{ id: 'w1' }] },
    });
    expect(await getSessionUser(db, token)).toBeNull();
  });

  it('returns null for missing tokens', async () => {
    const db = fakeDb({ user: { id: 'u1', email: 'a@b.c', name: 'A' }, workspace: { id: 'w1' } });
    expect(await getSessionUser(db, undefined)).toBeNull();
    expect(await getSessionUser(db, 'nope')).toBeNull();
  });

  it('destroys a session', async () => {
    const db = fakeDb({ user: { id: 'u1', email: 'a@b.c', name: 'A' }, workspace: { id: 'w1' } });
    const { token } = await createSession(db, 'u1');
    await destroySession(db, token);
    expect(await getSessionUser(db, token)).toBeNull();
  });
});
