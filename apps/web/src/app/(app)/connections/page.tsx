import { listConnections } from '@ultraia/core';
import { prisma } from '@ultraia/core';
import { requireUser } from '@/lib/server/context';
import { ConnectionsClient } from './connections-client';

export const metadata = {
  title: 'Conexiones · UltraIa',
  description:
    'Gestiona las conexiones de canales de publicación: pega tu clave, prueba la conexión y consulta el estado — sin exponer secretos.',
};

export default async function ConnectionsPage() {
  const user = await requireUser();
  const connections = await listConnections(prisma);
  return (
    <ConnectionsClient
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
