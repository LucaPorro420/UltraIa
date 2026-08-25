import { getConnection, resolverTokensPorCanal, testConnection } from '@ultraia/core';
import { prisma } from '@ultraia/core';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/context';

/**
 * POST /api/connections/test — prueba una conexión por canal (solo ADMIN).
 * Resuelve el token (DB primero, .env fallback), ejecuta el test fail-soft del
 * dominio y persiste el resultado en la fila (estado / ultimoTestAt / ultimoError).
 */

const CANALES = [
  'youtube_shorts',
  'tiktok',
  'x',
  'instagram',
  'threads',
  'facebook',
  'linkedin',
  'telegram',
  'discord',
  'slack',
] as const;

const bodySchema = z.object({ canal: z.enum(CANALES) });

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  const { canal } = parsed.data;

  try {
    // Token: DB primero; si no hay fila, .env fallback (mismo criterio que publishDue).
    const resueltos = await resolverTokensPorCanal(prisma);
    const conn = resueltos.get(canal);
    if (!conn) {
      return Response.json({
        ok: false,
        reason: `Sin token configurado para ${canal} (ni en conexiones ni en entorno).`,
      });
    }

    const fuente = await getConnection(prisma, canal) ? 'db' : 'env';
    const result = await testConnection(canal, conn.accessToken);

    // Persistir el resultado si la fuente es DB (la fila existe).
    if (fuente === 'db') {
      await prisma.channelConnection.update({
        where: { canal },
        data: {
          estado: result.ok ? 'CONNECTED' : 'ERROR',
          ultimoTestAt: new Date(),
          ultimoError: result.ok ? null : (result.reason ?? 'test falló'),
        },
      }).catch(() => null);
    }

    return Response.json({ ...result, fuente, canal });
  } catch (e) {
    return Response.json(
      { ok: false, reason: (e as Error).message, canal },
      { status: 500 },
    );
  }
}
