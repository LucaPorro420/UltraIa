/**
 * emailCode.ts — Método de seguridad "código vía mail" (OTP por email).
 *
 * Primitiva pura y determinista para generar, almacenar (hasheado) y verificar
 * códigos numéricos enviados por email. Es la base del "método de seguridad
 * código vía mail" que protege el alta de cuentas y la conexión de redes sociales.
 *
 * Diseño keyless-first (sin dependencias externas): el envío real usa SMTP solo
 * si existen las variables de entorno SMTP_*; en caso contrario degrada a un
 * sender de consola (dev-log) que imprime el código. El almacenamiento del código
 * es inyectable (store en memoria por defecto, adaptable a Prisma).
 *
 * Todo es inyectable (clock, store, sender) para ser 100% testeable sin red.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createSmtpEmailSender } from './smtp';
import type { SmtpTransportFactory } from './smtp';

export const EmailPurposeSchema = z.enum([
  'email_verify',
  'connection_2fa',
  'login_otp',
  'password_reset',
]);
export type EmailPurpose = z.infer<typeof EmailPurposeSchema>;

export const EmailCodeInputSchema = z.object({
  email: z.string().email(),
  purpose: EmailPurposeSchema,
  length: z.number().int().min(4).max(10).optional(),
  ttlMs: z.number().int().positive().optional(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
});
export type EmailCodeInput = z.infer<typeof EmailCodeInputSchema>;

/** Registro persistido del código (siempre hasheado, nunca el plaintext). */
export interface EmailCodeRecord {
  email: string;
  purpose: EmailPurpose;
  hash: string; // sha256 del código
  expiresAt: number; // epoch ms
  attempts: number;
}

/**
 * Almacenamiento del código. Implementación por defecto en memoria; para
 * producción se puede adaptar a Prisma (tabla EmailCode) pasando otra impl.
 */
export interface EmailCodeStore {
  set(key: string, rec: EmailCodeRecord): Promise<void> | void;
  get(key: string): Promise<EmailCodeRecord | undefined> | EmailCodeRecord | undefined;
  delete(key: string): Promise<void> | void;
}

export interface Clock {
  now(): number;
}
export const systemClock: Clock = { now: () => Date.now() };

export class InMemoryEmailCodeStore implements EmailCodeStore {
  private map = new Map<string, EmailCodeRecord>();
  set(key: string, rec: EmailCodeRecord): void {
    this.map.set(key, rec);
  }
  get(key: string): EmailCodeRecord | undefined {
    return this.map.get(key);
  }
  delete(key: string): void {
    this.map.delete(key);
  }
  /** Elimina registros expirados (utilidad de mantenimiento). */
  purge(clock: Clock = systemClock): void {
    const now = clock.now();
    for (const [k, v] of this.map) {
      if (v.expiresAt < now) this.map.delete(k);
    }
  }
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutos
const DEFAULT_MAX_ATTEMPTS = 5;

export function keyFor(email: string, purpose: EmailPurpose): string {
  return `${purpose}:${email.toLowerCase()}`;
}

/** Genera un código numérico criptográficamente aleatorio de `length` dígitos. */
export function generateNumericCode(length = 6): string {
  if (length < 1 || length > 12) throw new Error(`length fuera de rango: ${length}`);
  const bytes = new Uint8Array(length);
  // node:crypto global; en edge/no-node degrada vía fallback determinista solo en test.
  const g = globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i++) out += String(bytes[i] % 10);
  return out;
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export interface CreateEmailCodeResult {
  code: string; // solo se conoce en el momento de la creación
  expiresAt: number;
}

export async function createEmailCode(
  input: EmailCodeInput & { store: EmailCodeStore; clock?: Clock },
): Promise<CreateEmailCodeResult> {
  const parsed = EmailCodeInputSchema.parse(input);
  const clock = input.clock ?? systemClock;
  const code = generateNumericCode(parsed.length ?? 6);
  const rec: EmailCodeRecord = {
    email: parsed.email.toLowerCase(),
    purpose: parsed.purpose,
    hash: hashCode(code),
    expiresAt: clock.now() + (parsed.ttlMs ?? DEFAULT_TTL_MS),
    attempts: 0,
  };
  await input.store.set(keyFor(parsed.email, parsed.purpose), rec);
  return { code, expiresAt: rec.expiresAt };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'invalid' | 'too_many_attempts' };

export async function verifyEmailCode(
  input: EmailCodeInput & {
    code: string;
    store: EmailCodeStore;
    clock?: Clock;
    maxAttempts?: number;
  },
): Promise<VerifyResult> {
  const parsed = EmailCodeInputSchema.parse(input);
  const clock = input.clock ?? systemClock;
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const key = keyFor(parsed.email, parsed.purpose);
  const rec = await input.store.get(key);
  if (!rec) return { ok: false, reason: 'not_found' };
  if (rec.expiresAt < clock.now()) {
    await input.store.delete(key);
    return { ok: false, reason: 'expired' };
  }
  if (rec.attempts >= maxAttempts) {
    await input.store.delete(key);
    return { ok: false, reason: 'too_many_attempts' };
  }
  const ok = constantTimeEqual(rec.hash, hashCode(input.code));
  if (!ok) {
    rec.attempts += 1;
    await input.store.set(key, rec);
    return { ok: false, reason: 'invalid' };
  }
  // single-use: se consume tras verificación correcta
  await input.store.delete(key);
  return { ok: true };
}

/* ----------------------------- Email sender ----------------------------- */

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }>;
}

/** Sender de desarrollo: imprime el código en consola (keyless, sin red). */
export function createConsoleEmailSender(): EmailSender {
  return {
    async send(msg) {
      // eslint-disable-next-line no-console
      console.log(`[email-code] to=${msg.to} subject="${msg.subject}"\n${msg.body}`);
      return { ok: true };
    },
  };
}

export interface SmtpOptions {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  /** Transporte SMTP inyectable (solo para tests). */
  transportFactory?: SmtpTransportFactory;
}

/**
 * Sender que usa SMTP real si hay configuración (SMTP_* o `opts`), y degrada a
 * console (dev-log) si no. El envío real es fail-soft: cualquier error de SMTP
 * devuelve `{ ok: false, error }` sin lanzar.
 */
export function createEnvEmailSender(opts: SmtpOptions = {}): EmailSender {
  const host = opts.host ?? process.env.SMTP_HOST;
  const user = opts.user ?? process.env.SMTP_USER;
  const pass = opts.pass ?? process.env.SMTP_PASS;
  const from = opts.from ?? process.env.SMTP_FROM ?? 'no-reply@ultraia.local';
  if (host && user && pass) {
    return {
      async send(msg) {
        const sender = await createSmtpEmailSender({
          host,
          port: opts.port,
          user,
          pass,
          from,
          transportFactory: opts.transportFactory,
        });
        return sender.send(msg);
      },
    };
  }
  const consoleSender = createConsoleEmailSender();
  return {
    async send(msg) {
      return consoleSender.send({ ...msg, subject: `[${from}] ${msg.subject}` });
    },
  };
}

function purposeToSubject(purpose: EmailPurpose): string {
  switch (purpose) {
    case 'email_verify':
      return 'Verifica tu correo en UltraIa';
    case 'connection_2fa':
      return 'Código de seguridad para conectar una red social';
    case 'login_otp':
      return 'Tu código de acceso UltraIa';
    case 'password_reset':
      return 'Restablece tu contraseña UltraIa';
  }
}

export async function sendEmailCode(input: {
  email: string;
  code: string;
  purpose: EmailPurpose;
  sender?: EmailSender;
  ttlMs?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const sender = input.sender ?? createEnvEmailSender();
  const minutes = Math.round((input.ttlMs ?? DEFAULT_TTL_MS) / 60000);
  const res = await sender.send({
    to: input.email,
    subject: purposeToSubject(input.purpose),
    body:
      `Tu código de verificación es: ${input.code}\n` +
      `Este código expira en ${minutes} minuto(s). Si no solicitaste esto, ignora este mensaje.`,
  });
  return { ok: res.ok, error: res.error };
}
