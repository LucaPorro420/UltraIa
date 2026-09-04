/**
 * ============================================================================
 * SESSION — Cómo se guarda tu sesión cuando entras al sitio
 * ============================================================================
 *
 * [EN] This file handles "sessions" — when you log in, the system creates a
 * secret code (token) that proves you're really you. It's like a wristband at
 * a concert: you show it once, and the bouncer lets you in every time after.
 *
 * [ES] Este archivo maneja "sesiones" — cuando entras al sitio, el sistema
 * crea un código secreto (token) que demuestra que eres tú. Es como una
 * pulsera en un concierto: la muestras una vez y el guardia te deja pasar
 * cada vez después.
 *
 * [EN] The token is NEVER saved as-is. We save a "hash" (a scrambled version)
 * so even if hackers steal our database, they can't use your token.
 *
 * [ES] El token NUNCA se guarda tal cual. Guardamos un "hash" (una versión
 * mezclada) para que, aunque los hackers roben nuestra base de datos, no
 * puedan usar tu token.
 */

// [EN] Import the database client type (what we use to talk to the database).
// [ES] Importar el tipo de cliente de base de datos (lo que usamos para hablar con la base de datos).
import type { Db } from '../db/client';

// ============================================================================
// CONSTANTS — Valores que no cambian
// ============================================================================

// [EN] The name of the cookie (a small file) that stores your session code in your browser.
// [ES] El nombre del cookie (un archivo pequeño) que guarda tu código de sesión en tu navegador.
export const SESSION_COOKIE = 'ultraia_session';

// [EN] How many days your login stays valid. 30 days = you don't have to log in again for a month.
// [ES] Cuántos días dura tu sesión. 30 días = no tienes que volver a entrar por un mes.
const SESSION_TTL_DAYS = 30;

// ============================================================================
// FUNCTIONS — Cosas que el programa puede hacer
// ============================================================================

/**
 * [EN] Turn a readable token into a scrambled "hash" so we can store it safely.
 * [ES] Convierte un token legible en un "hash" mezclado para poder guardarlo seguro.
 *
 * [EN] Example: "abc123" might become "x7F#mK9..." — you can't reverse it.
 * [ES] Ejemplo: "abc123" podría convertirse en "x7F#mK9..." — no se puede deshacer.
 */
export async function hashToken(token: string): Promise<string> {
  // [EN] Import the crypto (encryption) library from Node.js (the engine that runs our code).
  // [ES] Importar la biblioteca de crypto (cifrado) de Node.js (el motor que ejecuta nuestro código).
  const { createHash } = await import(/* webpackIgnore: true */ 'node:crypto');
  // [EN] SHA-256 is a famous algorithm that turns any text into a 64-character scrambled string.
  // [ES] SHA-256 es un algoritmo famoso que convierte cualquier texto en una cadena de 64 caracteres mezclados.
  return createHash('sha256').update(token).digest('base64url');
}

/**
 * [EN] Create a new session when someone logs in. Returns the token they'll use.
 * [ES] Crea una nueva sesión cuando alguien entra. Devuelve el token que usarán.
 *
 * [EN] Think of it like giving someone a new wristband at the concert entrance.
 * [ES] Piensa en ello como darle una pulsera nueva a alguien en la entrada del concierto.
 */
export async function createSession(db: Db, userId: string): Promise<{ token: string; expiresAt: Date }> {
  // [EN] Import randomBytes — generates cryptographically secure random numbers.
  // [ES] Importar randomBytes — genera números aleatorios seguros criptográficamente.
  const { randomBytes } = await import(/* webpackIgnore: true */ 'node:crypto');

  // [EN] Create a random token (32 bytes = very long random string). This is the "wristband code".
  // [ES] Crear un token aleatorio (32 bytes = cadena aleatoria muy larga). Este es el "código de pulsera".
  const token = randomBytes(32).toString('base64url');

  // [EN] Calculate when this session expires (now + 30 days).
  // [ES] Calcular cuándo expira esta sesión (ahora + 30 días).
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  // [EN] We store the HASH of the token, not the token itself. Safety first!
  // [ES] Guardamos el HASH del token, no el token mismo. ¡Seguridad primero!
  const tokenHash = await hashToken(token);

  // [EN] Save the session to the database (the "guest list" that remembers who's logged in).
  // [ES] Guardar la sesión en la base de datos (la "lista de invitados" que recuerda quién está dentro).
  await db.session.create({ data: { token: tokenHash, userId, expiresAt } });

  // [EN] Return the raw token (the user's browser will store this in a cookie).
  // [ES] Devolver el token sin mezclar (el navegador del usuario lo guardará en un cookie).
  return { token, expiresAt };
}

/**
 * [EN] Check if a token is valid and return the user's info. Called on every page load.
 * [ES] Verificar si un token es válido y devolver la info del usuario. Se llama en cada carga de página.
 *
 * [EN] Like the bouncer checking your wristband at every stage entrance.
 * [ES] Como el guardia revisando tu pulsera en cada entrada del escenario.
 */
export async function getSessionUser(
  db: Db,
  token: string | undefined | null,
): Promise<{ id: string; email: string; name: string | null; workspaceId: string; role: string } | null> {
  // [EN] If there's no token at all, the user isn't logged in.
  // [ES] Si no hay token, el usuario no ha entrado.
  if (!token) return null;

  // [EN] Hash the token they gave us, then look it up in the database.
  // [ES] Mezclar el token que nos dieron, luego buscarlo en la base de datos.
  const tokenHash = await hashToken(token);

  // [EN] Find the session AND the user info in one query (faster).
  // [ES] Encontrar la sesión Y la info del usuario en una sola consulta (más rápido).
  const session = await db.session.findUnique({ where: { token: tokenHash }, include: { user: { include: { workspaces: true } } } });

  // [EN] If no session found, the token is invalid or was deleted.
  // [ES] Si no se encontró sesión, el token es inválido o fue eliminado.
  if (!session) return null;

  // [EN] If the session has expired (older than 30 days), delete it and say "not logged in".
  // [ES] Si la sesión expiró (más vieja de 30 días), eliminarla y decir "no estás dentro".
  if (session.expiresAt < new Date()) {
    // [EN] .catch(() => undefined) means "if deletion fails, don't crash — just move on".
    // [ES] .catch(() => undefined) significa "si la eliminación falla, no crashear — seguir adelante".
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // [EN] Get the user's workspace (like their "team" or "project space").
  // [ES] Obtener el workspace del usuario (como su "equipo" o "espacio de proyecto").
  const workspace = session.user.workspaces[0];

  // [EN] If the user has no workspace, something's wrong — reject them.
  // [ES] Si el usuario no tiene workspace, algo está mal — rechazarlo.
  if (!workspace) return null;

  // [EN] Everything checks out! Return the user's info so the app knows who they are.
  // [ES] ¡Todo correcto! Devolver la info del usuario para que la app sepa quién es.
  return { id: session.user.id, email: session.user.email, name: session.user.name, workspaceId: workspace.id, role: session.user.role };
}

/**
 * [EN] Delete a session (log someone out). Burns the wristband so it can't be used again.
 * [ES] Eliminar una sesión (salir del sitio). Quemar la pulsera para que no se pueda usar de nuevo.
 */
export async function destroySession(db: Db, token: string): Promise<void> {
  // [EN] Hash the token and delete ALL matching sessions (there should only be one).
  // [ES] Mezclar el token y eliminar TODAS las sesiones que coincidan (debería haber solo una).
  const tokenHash = await hashToken(token);
  await db.session.deleteMany({ where: { token: tokenHash } });
}
