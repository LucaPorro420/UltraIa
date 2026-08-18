/**
 * AutoPub F4 — adapter Telegram (canal de mensajería, 100% gratis, sin OAuth ni app review).
 *
 * Fuente: enlaces.txt → openclaw/openclaw (`.env.example`: TELEGRAM_BOT_TOKEN) + verificación
 * 2026: Telegram Bot API es GRATIS total (mensajes ilimitados, uso comercial, video ≤50MB,
 * storage gratis con file_id; rate 30 msg/s distintos / 1 msg/s mismo / 20 msg/min grupo).
 * Port ORIGINAL de PRINCIPIOS (nada de código copiado).
 *
 * Diseño: fetch inyectable (patrón del repo) para tests sin red; token/chat desde options o
 * env (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID); cuerpo multipart construido a mano (sin deps)
 * con boundary aleatorio; fail-soft: sin token → validate() false con razón; errores de API
 * → ok:false con razón (nunca lanza); 429 → reason con retry_after.
 */

import type { PublishInput, PublishResult, PublisherAdapter, PublishPlatform } from './publish.js';

/** Plataforma del adapter (la union de publish.ts se amplía en el wiring, NO aquí). */
export const TELEGRAM_PLATFORM = 'telegram' as const;

/** Máximo de bytes para sendVideo (Telegram: 50 MB para video). */
export const TELEGRAM_MAX_VIDEO_BYTES = 50 * 1024 * 1024;
/** Máximo de caracteres del caption (Telegram: 1024). */
export const TELEGRAM_MAX_CAPTION_CHARS = 1024;
/** Endpoint base del Bot API. */
export const TELEGRAM_API_BASE = 'https://api.telegram.org';

export interface TelegramAdapterOptions {
  /** Token del bot (de @BotFather). Default: env TELEGRAM_BOT_TOKEN. */
  botToken?: string;
  /** Chat/channel destino (id numérico o @username). Default: env TELEGRAM_CHAT_ID. */
  chatId?: string;
  /** Fetch inyectable para tests. */
  fetch?: typeof fetch;
}

/** Responde { ok:true, result:{ message_id } } en éxito. */
interface TelegramSendResponse {
  ok: boolean;
  description?: string;
  error_code?: number;
  result?: { message_id?: number };
  parameters?: { retry_after?: number };
}

function randomBoundary(): string {
  return `----ultraia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Construye un cuerpo multipart/form-data en un Buffer (sin deps).
 * Cada parte: --boundary\r\nContent-Disposition...\r\n\r\n<value>\r\n; cierre --boundary--\r\n.
 * El retorno se tipa como Uint8Array (Buffer ES un Uint8Array) para que el body
 * sea asignable a BodyInit bajo lib DOM del tsconfig de web (Buffer<ArrayBufferLike>
 * de @types/node nuevo NO es asignable a BodyInit).
 */
export function buildMultipartBody(parts: Array<{ name: string; value?: string; filename?: string; contentType?: string; data?: Uint8Array }>, boundary: string): { body: Uint8Array; contentType: string } {
  const chunks: Uint8Array[] = [];
  const push = (s: string) => chunks.push(Buffer.from(s, 'utf8'));
  for (const part of parts) {
    push(`--${boundary}\r\n`);
    if (part.filename) {
      push(`Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`);
      push(`Content-Type: ${part.contentType || 'application/octet-stream'}\r\n\r\n`);
      chunks.push(part.data || Buffer.alloc(0));
    } else {
      push(`Content-Disposition: form-data; name="${part.name}"\r\n\r\n`);
      push(part.value || '');
    }
    push('\r\n');
  }
  push(`--${boundary}--\r\n`);
  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** Trunca un caption a los límites de Telegram (1024 chars) manteniendo UTF-8 íntegro. */
export function truncateCaption(caption: string, max = TELEGRAM_MAX_CAPTION_CHARS): string {
  if (caption.length <= max) return caption;
  const cut = caption.slice(0, max);
  // Evita cortar un par surrogate (emoji) a la mitad.
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) return cut.slice(0, -1);
  return cut;
}

/** Caption bilingüe es/ar a partir de los metadatos (patrón buildBilingualMetadata). */
export function buildTelegramCaption(metadata?: Partial<{ title: string; description: string }>): string {
  const title = metadata?.title?.trim();
  const desc = metadata?.description?.trim();
  const caption = [title, desc].filter(Boolean).join('\n\n');
  return truncateCaption(caption || 'Contenido generado con IA');
}

/** Resuelve el video: buffer directo o path vía fs (como videoBytes de publish.ts). */
async function telegramVideoBytes(input: PublishInput): Promise<Buffer | null> {
  if (input.videoBuffer) return input.videoBuffer;
  if (input.videoPath) {
    try {
      const fs = await import('node:fs');
      return fs.readFileSync(input.videoPath);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Adapter Telegram para la cola Publication. publica: sendVideo con caption bilingüe;
 * fail-soft: sin token/chat → ok:false con razón; video >50MB → ok:false; errores HTTP y
 * red → ok:false con razón (429 incluye retry_after).
 */
export function createTelegramAdapter(options: TelegramAdapterOptions = {}): PublisherAdapter {
  const platform: PublishPlatform = TELEGRAM_PLATFORM as PublishPlatform;
  // `??`: options explícitas (incluso vacías) tienen precedencia sobre env.
  const botToken = options.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? '';
  const chatId = options.chatId ?? process.env.TELEGRAM_CHAT_ID ?? '';
  const fetchImpl = options.fetch || globalThis.fetch;

  return {
    platform,
    validate: async () => createTelegramAdapter.__validate(botToken, chatId),
    publish: async (input: PublishInput): Promise<PublishResult> => {
      const valid = createTelegramAdapter.__validate(botToken, chatId);
      if (!valid.ok) return { platform, ok: false, error: valid.reason };
      const video = await telegramVideoBytes(input);
      if (!video) return { platform, ok: false, error: 'No hay video disponible (videoPath/videoBuffer vacío o ilegible)' };
      if (video.length > TELEGRAM_MAX_VIDEO_BYTES) {
        return { platform, ok: false, error: `Video supera el límite de Telegram (${Math.round(video.length / 1024 / 1024)}MB > 50MB)` };
      }
      const boundary = randomBoundary();
      const { body, contentType } = buildMultipartBody(
        [
          { name: 'chat_id', value: chatId },
          { name: 'video', filename: 'video.mp4', contentType: 'video/mp4', data: video },
          { name: 'caption', value: buildTelegramCaption(input.metadata) },
        ],
        boundary,
      );
      try {
        const res = await fetchImpl(`${TELEGRAM_API_BASE}/bot${botToken}/sendVideo`, {
          method: 'POST',
          headers: { 'Content-Type': contentType },
          body,
        });
        const json = (await res.json().catch(() => null)) as TelegramSendResponse | null;
        if (!res.ok || !json?.ok) {
          const code = json?.error_code ?? res.status;
          const extra = json?.parameters?.retry_after ? `; retry_after=${json.parameters.retry_after}s` : '';
          return { platform, ok: false, error: `Telegram API ${code}: ${json?.description || res.statusText}${extra}` };
        }
        return { platform, ok: true, id: String(json.result?.message_id ?? ''), url: `https://t.me/c/${chatId.replace('@', '')}/${json.result?.message_id ?? ''}` };
      } catch (err) {
        return { platform, ok: false, error: `Red: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}

/** Helper interno estático (tests): validación sin instanciar el adapter. */
createTelegramAdapter.__validate = (botToken: string, chatId: string): { ok: boolean; reason?: string } => {
  if (!botToken) return { ok: false, reason: 'TELEGRAM_BOT_TOKEN no configurado (crear bot con @BotFather)' };
  if (!chatId) return { ok: false, reason: 'TELEGRAM_CHAT_ID no configurado (id numérico o @username)' };
  return { ok: true };
};

export type TelegramAdapter = ReturnType<typeof createTelegramAdapter>;