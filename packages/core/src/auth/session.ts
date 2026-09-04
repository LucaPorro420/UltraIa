import type { Db } from '../db/client';

export const SESSION_COOKIE = 'ultraia_session';
const SESSION_TTL_DAYS = 30;

/** SHA-256 hash of a session token — DB stores hash, never plaintext (C03 fix). */
export async function hashToken(token: string): Promise<string> {
  const { createHash } = await import(/* webpackIgnore: true */ 'node:crypto');
  return createHash('sha256').update(token).digest('base64url');
}

export async function createSession(db: Db, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const { randomBytes } = await import(/* webpackIgnore: true */ 'node:crypto');
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const tokenHash = await hashToken(token);
  await db.session.create({ data: { token: tokenHash, userId, expiresAt } });
  return { token, expiresAt };
}

export async function getSessionUser(
  db: Db,
  token: string | undefined | null,
): Promise<{ id: string; email: string; name: string | null; workspaceId: string; role: string } | null> {
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const session = await db.session.findUnique({ where: { token: tokenHash }, include: { user: { include: { workspaces: true } } } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const workspace = session.user.workspaces[0];
  if (!workspace) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name, workspaceId: workspace.id, role: session.user.role };
}

export async function destroySession(db: Db, token: string): Promise<void> {
  const tokenHash = await hashToken(token);
  await db.session.deleteMany({ where: { token: tokenHash } });
}
