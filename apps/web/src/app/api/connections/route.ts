import { deleteConnection, listConnections, saveConnection, verifyEmailCode } from '@ultraia/core';
import { prisma } from '@ultraia/core';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/context';
import { connection2faStore } from '@/lib/server/emailCodeStore';

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
  'youtube',
  'tiktok',
  'x',
  'instagram',
  'threads',
  'facebook',
  'linkedin',
  'pinterest',
  'reddit',
  'medium',
  'substack',
  'patreon',
  'twitch',
  'whatsapp',
  'telegram',
  'discord',
  'slack',
  'email',
  'outlook',
  'github',
  'gitlab',
] as const;

const postSchema = z.object({
  canal: z.enum(CANALES),
  token: z.string().min(8).max(4096),
  meta: z.record(z.unknown()).optional(),
  // Método de seguridad "código vía mail": el alta de una conexión exige un
  // código de 6 dígitos enviado al email del admin (purpose: 'connection_2fa').
  code: z.string().min(4).max(10),
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

  const { canal, token, meta, code } = parsed.data;

  // Puerta 2FA por email antes de persistir cualquier token de red social.
  const verified = await verifyEmailCode({
    email: user.email,
    purpose: 'connection_2fa',
    code,
    store: connection2faStore,
  });
  if (!verified.ok) {
    return Response.json(
      { ok: false, verified: false, reason: verified.reason ?? 'invalid' },
      { status: 401 },
    );
  }

  try {
    await saveConnection(prisma, canal, { token, meta });
    return Response.json({ ok: true, canal, verified: true });
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
