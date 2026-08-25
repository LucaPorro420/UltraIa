import { prisma } from '@ultraia/core';
import { requireUser } from '@/lib/server/context';
import { WorkspaceClient } from './workspace-client';

export const metadata = {
  title: 'Workspace · UltraIa',
  description:
    'Entorno multi-panel de UltraIa: varios agentes y modos en ventanas simultáneas, redimensionables e independientes.',
};

export default async function WorkspacePage() {
  const user = await requireUser();
  const blueprints = await prisma.agentBlueprint.findMany({
    where: { workspace: { ownerId: user.id } },
    select: { id: true, name: true, taskDescription: true },
    orderBy: { name: 'asc' },
  });
  return (
    <WorkspaceClient
      userName={user.name ?? user.email ?? 'user'}
      agents={blueprints.map((b) => ({ id: b.id, name: b.name, taskDescription: b.taskDescription }))}
    />
  );
}
