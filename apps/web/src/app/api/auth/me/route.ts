import { getCurrentUser } from '@/lib/server/context';

/**
 * GET /api/auth/me — valida la sesión del cliente (header x-ultraia-session o cookie).
 * Respuesta: { user } o 401. Útil para el arranque de la app móvil (token persistente).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}