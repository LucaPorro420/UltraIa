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

export async function activateVersion(db: Db, blueprintId: string, versionId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const version = await tx.agentVersion.findFirst({ where: { id: versionId, blueprintId } });
    if (!version) throw new Error('Version not found');
    if (version.status === 'ACTIVE') return;
    await tx.agentVersion.updateMany({
      where: { blueprintId, status: 'ACTIVE' },
      data: { status: 'SUPERSEDED' },
    });
    await tx.agentVersion.update({ where: { id: versionId }, data: { status: 'ACTIVE' } });
  });
}
