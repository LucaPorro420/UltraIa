/**
 * ============================================================================
 * LOGIN — Cómo entras al sitio (la puerta principal)
 * ============================================================================
 *
 * [EN] This file handles the login process. When you type your email and
 * password and click "Entrar", this code runs to verify who you are.
 *
 * [ES] Este archivo maneja el proceso de login. Cuando escribes tu email y
 * contraseña y haces clic en "Entrar", este código se ejecuta para verificar
 * quién eres.
 *
 * [EN] It's like a bouncer at a club: checks your ID (password), gives you
 * a wristband (token), and lets you in.
 *
 * [ES] Es como un guardia en un club: revisa tu ID (contraseña), te da una
 * pulsera (token), y te deja entrar.
 */

// [EN] Zod is a library that validates data (makes sure emails look like emails, etc.).
// [ES] Zod es una biblioteca que valida datos (se asegura de que los emails parezcan emails, etc.).
import { z } from 'zod';

// [EN] Import the tools we need from our core library (the "engine room" of the project).
// [ES] Importar las herramientas que necesitamos de nuestra biblioteca central (la "sala de máquinas" del proyecto).
import { assertStrongPassword, createSession, createWorkspace, hashPassword, prisma, verifyPassword } from '@ultraia/core';

// [EN] Import brute-force protection (stops hackers from guessing passwords).
// [ES] Importar protección contra fuerza bruta (detiene a los hackers de adivinar contraseñas).

import { isLockedOut, recordFailedAttempt, clearAttempts, getClientIp } from '@/lib/server/brute-force';

// [EN] Tell Next.js to always run this fresh (never use cached version for login).
// [ES] Decirle a Next.js que siempre ejecute esto nuevo (nunca usar versión cacheada para login).
export const dynamic = 'force-dynamic';

// ============================================================================
// SCHEMA — Las reglas de lo que aceptamos
// ============================================================================

/**
 * [EN] Define what the login form must contain:
 *   - email: must not be empty (can be email OR username)
 *   - password: must not be empty
 *
 * [ES] Definir qué debe contener el formulario de login:
 *   - email: no puede estar vacío (puede ser email O nombre de usuario)
 *   - password: no puede estar vacía
 */
const credentialsSchema = z.object({
  email: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// POST HANDLER — Qué pasa cuando haces clic en "Entrar"
// ============================================================================

/**
 * [EN] POST /api/auth/login — this function runs when you submit the login form.
 * [ES] POST /api/auth/login — esta función se ejecuta cuando envías el formulario de login.
 *
 * [EN] It returns a "token" (like a wristband) that proves you're logged in.
 * [ES] Devuelve un "token" (como una pulsera) que demuestra que estás dentro.
 */
export async function POST(req: Request) {
  // --- STEP 1: Validate the input ---
  // [EN] Try to parse the form data. If it's invalid, return an error.
  // [ES] Intentar leer los datos del formulario. Si son inválidos, devolver un error.
  const parsed = credentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });

  // --- STEP 2: Check brute-force lockout ---
  // [EN] Get the user's IP address (like their "address" on the internet).
  // [ES] Obtener la dirección IP del usuario (como su "dirección" en internet).
  const ip = getClientIp(req);
  const identifier = parsed.data.email;

  // [EN] Check if this IP has tried too many times (5 failures = locked for 15 minutes).
  // [ES] Verificar si esta IP ha intentado demasiadas veces (5 fallos = bloqueada por 15 minutos).
  const lockCheck = isLockedOut(ip, identifier);
  if (lockCheck.locked) {
    // [EN] Tell them to wait (HTTP 429 = "Too Many Requests").
    // [ES] Decirles que esperen (HTTP 429 = "Demasiadas Solicitudes").
    const retryAfterSec = Math.ceil(lockCheck.retryAfterMs / 1000);
    return Response.json(
      { error: `Too many failed attempts. Try again in ${retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  // --- STEP 3: Find the user ---
  // [EN] Look up the user by email OR username (depends on what they typed).
  // [ES] Buscar al usuario por email O nombre de usuario (depende de lo que escribieron).
  const user = identifier.includes('@')
    ? await prisma.user.findUnique({ where: { email: identifier } })
    : await prisma.user.findFirst({ where: { name: identifier } });

  // --- STEP 4: Check the password ---
  // [EN] If user not found OR password wrong, record the failure.
  // [ES] Si el usuario no fue encontrado O la contraseña es incorrecta, registrar el fallo.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    // [EN] Record this failed attempt (might lock them out after 5 failures).
    // [ES] Registrar este intento fallido (podría bloquearlos después de 5 fallos).
    const result = recordFailedAttempt(ip, identifier);
    if (result.locked) {
      const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
      return Response.json(
        { error: `Account locked due to too many failed attempts. Try again in ${retryAfterSec}s.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }
    // [EN] Generic error message (don't reveal if the email exists or not — security!).
    // [ES] Mensaje genérico (no revelar si el email existe o no — ¡seguridad!).
    return Response.json({ error: 'Invalid email/username or password' }, { status: 401 });
  }

  // --- STEP 5: Success! Create session ---
  // [EN] Clear any previous failed attempts (they got in!).
  // [ES] Limpiar cualquier intento fallido anterior (¡entraron!).
  clearAttempts(ip, identifier);

  // [EN] Create a session (the "wristband" — a random token valid for 30 days).
  // [ES] Crear una sesión (la "pulsera" — un token aleatorio válido por 30 días).
  const { token, expiresAt } = await createSession(prisma, user.id);

  // [EN] Send back the token + user info. The browser stores the token.
  // [ES] Devolver el token + info del usuario. El navegador guarda el token.
  return Response.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
