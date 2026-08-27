import { listConnections, buildConnectionCatalog, groupCatalogByCategory } from '@ultraia/core';
import { prisma } from '@ultraia/core';
import { requireUser } from '@/lib/server/context';
import { ConnectionsClient } from './connections-client';

export const metadata = {
  title: 'Conexiones · UltraIa',
  description:
    'Centro de integraciones: todas las conexiones necesarias o previstas del proyecto (redes, IA, nube, monetización) con estado y gestión segura.',
};

export default async function ConnectionsPage() {
  const user = await requireUser();
  const connections = await listConnections(prisma);
  const connectedChannels = connections.filter((c) => c.conectado).map((c) => c.canal);
  const catalog = buildConnectionCatalog({
    connectedChannels,
    env: process.env as unknown as Record<string, string | undefined>,
  });
  const groups = groupCatalogByCategory(catalog);
  return (
    <ConnectionsClient
      groups={groups}
      initialConnections={connections.map((c) => ({
        ...c,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        ultimoTestAt: c.ultimoTestAt ? c.ultimoTestAt.toISOString() : null,
      }))}
      isAdmin={user.role === 'ADMIN'}
      ephemeral={!process.env.CONNECTIONS_SECRET}
    />
  );
}
