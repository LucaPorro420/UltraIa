import type { Db } from '../db/client';

export async function generateApiKey(): Promise<{ key: string; keyHash: string }> {
  const { randomBytes } = await import(/* webpackIgnore: true */ 'node:crypto');
  const key = `ua_${randomBytes(24).toString('base64url')}`;
  return { key, keyHash: await hashApiKey(key) };
}

export async function hashApiKey(key: string): Promise<string> {
  const { createHash } = await import(/* webpackIgnore: true */ 'node:crypto');
  return createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(db: Db, blueprintId: string, name: string): Promise<{ key: string; keyHash: string }> {
  const { key, keyHash } = await generateApiKey();
  await db.apiKey.create({ data: { blueprintId, name, keyHash } });
  return { key, keyHash };
}

export async function verifyApiKey(
  db: Db,
  key: string | null,
  blueprintId: string,
): Promise<{ id: string; name: string } | null> {
  if (!key || !key.startsWith('ua_')) return null;
  const keyHash = await hashApiKey(key);
  const record = await db.apiKey.findFirst({ where: { blueprintId, keyHash } });
  if (!record) return null;
  await db.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return { id: record.id, name: record.name };
}

export type ApiKeyInfo = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export async function listApiKeys(db: Db, blueprintId: string): Promise<ApiKeyInfo[]> {
  const rows = await db.apiKey.findMany({
    where: { blueprintId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, keyHash: true, lastUsedAt: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: `ua_${r.keyHash.slice(0, 8)}`,
    lastUsedAt: r.lastUsedAt,
    createdAt: r.createdAt,
  }));
}

export async function revokeApiKey(db: Db, id: string): Promise<void> {
  await db.apiKey.delete({ where: { id } });
}
