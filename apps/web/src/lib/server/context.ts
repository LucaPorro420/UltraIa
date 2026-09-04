import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma, SESSION_COOKIE, getSessionUser } from '@ultraia/core';

const HEADER_TOKEN = 'x-ultraia-session';

// QUÉ ES: extrae el token de sesión de un Request (móvil) o de la cookie httpOnly (web).
// PARA QUÉ: la app móvil (Expo) autentica con header x-ultraia-session porque no puede
// usar cookies httpOnly; el navegador sigue usando la cookie. Mismo token (createSession).
// POR QUÉ: una sola sesión sirve a ambos clientes sin duplicar la lógica de auth.
// H03 FIX: Authorization header eliminado — solo x-ultraia-session para móvil.
function tokenFromRequest(req?: Request): string | null {
  if (req) {
    const header = req.headers.get(HEADER_TOKEN);
    if (header) return header.trim();
  }
  return null;
}

export async function getCurrentUser(req?: Request) {
  const token = tokenFromRequest(req);
  if (token) return getSessionUser(prisma, token);
  const cookieStore = await cookies();
  return getSessionUser(prisma, cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireUser(req?: Request) {
  const user = await getCurrentUser(req);
  if (!user) redirect('/login');
  return user;
}

export async function optionalUser() {
  return getCurrentUser();
}
