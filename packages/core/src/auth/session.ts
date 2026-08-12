import { randomBytes } from 'node:crypto';
import type { Db } from '../db/client';

export const SESSION_COOKIE = 'ultraia_session';
const SESSION_TTL_DAYS = 30;

export async function createSession(db: Db, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

export async function getSessionUser(
  db: Db,
  token: string | undefined | null,
): Promise<{ id: string; email: string; name: string | null; workspaceId: string } | null> {
  if (!token) return null;
  const session = await db.session.findUnique({ where: { token }, include: { user: { include: { workspaces: true } } } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const workspace = session.user.workspaces[0];
  if (!workspace) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name, workspaceId: workspace.id };
}

export async function destroySession(db: Db, token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } });
}
