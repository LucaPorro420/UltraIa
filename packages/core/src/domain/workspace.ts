import type { Db } from '../db/client';

export async function createWorkspace(
  db: Db,
  input: { ownerId: string; name: string },
): Promise<{ id: string }> {
  return db.workspace.create({ data: { ownerId: input.ownerId, name: input.name } });
}
