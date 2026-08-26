import { createEmailCode, sendEmailCode } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { connection2faStore } from '@/lib/server/emailCodeStore';

const TTL_MS = 10 * 60 * 1000;

/**
 * Envía un código de seguridad por email para autorizar la conexión de una red
 * social (método "código vía mail"). El código NUNCA se devuelve en la respuesta;
 * se entrega por email (o se imprime en consola si no hay SMTP configurado).
 *
 * POST /api/connections/send-code  → { ok: true }  (solo ADMIN)
 */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  try {
    const { code } = await createEmailCode({
      email: user.email,
      purpose: 'connection_2fa',
      store: connection2faStore,
      ttlMs: TTL_MS,
    });
    const sent = await sendEmailCode({
      email: user.email,
      code,
      purpose: 'connection_2fa',
      ttlMs: TTL_MS,
    });
    if (!sent.ok) {
      return Response.json(
        { ok: false, error: sent.error ?? 'No se pudo enviar el código' },
        { status: 502 },
      );
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
