import type { Db } from '../db/client';

export async function getActiveVersion(db: Db, blueprintId: string) {
  return db.agentVersion.findFirst({
    where: { blueprintId, status: 'ACTIVE' },
    orderBy: { versionNumber: 'desc' },
  });
}

export async function listVersions(db: Db, blueprintId: string) {
  return db.agentVersion.findMany({
    where: { blueprintId },
    orderBy: { versionNumber: 'desc' },
    include: {
      evalRuns: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { cases: true },
      },
    },
  });
}

export async function getBlueprintForUser(db: Db, userId: string, blueprintId: string) {
  return db.agentBlueprint.findFirst({
    where: {
      id: blueprintId,
      workspace: { ownerId: userId },
    },
    include: { versions: { orderBy: { versionNumber: 'desc' } } },
  });
}

export async function rejectVersion(db: Db, versionId: string): Promise<void> {
  await db.agentVersion.updateMany({
    where: { id: versionId, status: 'PENDING' },
    data: { status: 'REJECTED' },
  });
}
