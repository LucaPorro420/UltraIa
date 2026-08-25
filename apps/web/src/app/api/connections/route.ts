import { deleteConnection, listConnections, saveConnection } from '@ultraia/core';
import { prisma } from '@ultraia/core';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/context';

/**
 * F4 del IDE V0.1 — Gestión de conexiones de canales desde la interfaz.
 * Dominio: packages/core/src/domain/connections.ts (tokens cifrados AES-256-GCM).
 * Los secretos NUNCA se exponen: la lista devuelve máscara (••••últimos4).
 *
 * GET    /api/connections        → { connections, ephemeral }  (cualquier usuario logueado)
 * POST   /api/connections        → guarda/actualiza token      (solo ADMIN)
 * DELETE /api/connections?canal= → elimina conexión DB         (solo ADMIN)
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

const postSchema = z.object({
  canal: z.enum(CANALES),
  token: z.string().min(8).max(4096),
  meta: z.record(z.unknown()).optional(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  try {
    const connections = await listConnections(prisma);
    return Response.json({
      connections,
      ephemeral: !process.env.CONNECTIONS_SECRET,
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  let parsed;
  try {
    parsed = postSchema.safeParse(await req.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  const { canal, token, meta } = parsed.data;
  try {
    await saveConnection(prisma, canal, { token, meta });
    return Response.json({ ok: true, canal });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  const url = new URL(req.url);
  const canal = url.searchParams.get('canal') ?? '';
  if (!(CANALES as readonly string[]).includes(canal)) {
    return new Response('Invalid canal', { status: 400 });
  }
  const deleted = await deleteConnection(prisma, canal);
  return Response.json({ ok: deleted, canal });
}
