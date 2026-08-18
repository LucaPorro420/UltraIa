/**
 * AutoPub F4 — adapter Slack (bot token + files.upload, gratis, sin app review).
 *
 * Fuente: `docs/APIS-GRATIS-2026.md` (verificado 2026): Slack gratis para bots; archivos
 * hasta 1 GiB en todos los planes; API `files.upload` responde JSON {ok, error, file}.
 * Port ORIGINAL de PRINCIPIOS (nada de código copiado).
 *
 * Diseño: fetch inyectable (patrón del repo) para tests sin red; token/channel desde options
 * o env (SLACK_BOT_TOKEN / SLACK_CHANNEL); cuerpo multipart con `buildMultipartBody`
 * (compartido con telegram.ts): campo `file` + `channels` + `title` + `initial_comment`.
 * Fail-soft: sin token/channel → validate() false con razón; video >1 GiB → ok:false;
 * JSON {ok:false, error} de la API → ok:false con la razón de Slack; errores HTTP/red →
 * ok:false (nunca lanza).
 */

import type { PublishInput, PublishResult, PublisherAdapter, PublishPlatform } from './publish';
import { buildMultipartBody, truncateCaption } from './telegram';

/** Plataforma del adapter. */
export const SLACK_PLATFORM = 'slack' as const;

/** Máximo de bytes para subir (Slack: 1 GiB en todos los planes). */
export const SLACK_MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
/** Máximo de caracteres del initial_comment (Slack: 4000). */
export const SLACK_MAX_CAPTION_CHARS = 4000;
/** Endpoint de subida de archivos. */
export const SLACK_FILES_UPLOAD_URL = 'https://slack.com/api/files.upload';

export interface SlackAdapterOptions {
  /** Token del bot (xoxb-...). Default: env SLACK_BOT_TOKEN. */
  botToken?: string;
  /** Canal destino (#general o C123...). Default: env SLACK_CHANNEL. */
  channel?: string;
  /** Fetch inyectable para tests. */
  fetch?: typeof fetch;
}

/** Es un token de bot de Slack bien formado (xoxb-). */
export function isValidSlackBotToken(token: string): boolean {
  return /^xoxb-[A-Za-z0-9-]+$/.test(token.trim());
}

/** Caption limitada al máximo de Slack (4000 chars) manteniendo UTF-8 íntegro. */
export function buildSlackCaption(metadata?: Partial<{ title: string; description: string }>): string {
  const title = metadata?.title?.trim();
  const desc = metadata?.description?.trim();
  const caption = [title, desc].filter(Boolean).join('\n\n');
  return truncateCaption(caption || 'Contenido generado con IA', SLACK_MAX_CAPTION_CHARS);
}

/** Resuelve el video: buffer directo o path vía fs (mismo patrón que telegram). */
async function slackVideoBytes(input: PublishInput): Promise<Buffer | null> {
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

/** Respuesta de la API de Slack: {ok:true, file:{id, permalink}} o {ok:false, error}. */
interface SlackFilesUploadResponse {
  ok: boolean;
  error?: string;
  file?: { id?: string; permalink?: string };
}

/**
 * Adapter Slack para la cola Publication. publica: files.upload con video + caption;
 * fail-soft: sin token/channel válido → ok:false con razón; video >1 GiB → ok:false;
 * {ok:false} de la API → ok:false con la razón de Slack; errores HTTP/red → ok:false.
 */
export function createSlackAdapter(options: SlackAdapterOptions = {}): PublisherAdapter {
  const platform: PublishPlatform = SLACK_PLATFORM as PublishPlatform;
  // `??`: options explícitas (incluso vacías) tienen precedencia sobre env.
  const botToken = options.botToken ?? process.env.SLACK_BOT_TOKEN ?? '';
  const channel = options.channel ?? process.env.SLACK_CHANNEL ?? '';
  const fetchImpl = options.fetch || globalThis.fetch;

  return {
    platform,
    validate: async () => createSlackAdapter.__validate(botToken, channel),
    publish: async (input: PublishInput): Promise<PublishResult> => {
      const valid = createSlackAdapter.__validate(botToken, channel);
      if (!valid.ok) return { platform, ok: false, error: valid.reason };
      const video = await slackVideoBytes(input);
      if (!video) return { platform, ok: false, error: 'No hay video disponible (videoPath/videoBuffer vacío o ilegible)' };
      if (video.length > SLACK_MAX_VIDEO_BYTES) {
        return { platform, ok: false, error: `Video supera el límite de Slack (${Math.round(video.length / 1024 / 1024 / 1024)}GiB > 1GiB)` };
      }
      const boundary = `----ultraia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      const { body, contentType } = buildMultipartBody(
        [
          { name: 'file', filename: 'video.mp4', contentType: 'video/mp4', data: video },
          { name: 'channels', value: channel },
          { name: 'title', value: input.metadata?.title?.slice(0, 255) || 'UltraIa' },
          { name: 'initial_comment', value: buildSlackCaption(input.metadata) },
        ],
        boundary,
      );
      try {
        const res = await fetchImpl(SLACK_FILES_UPLOAD_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': contentType },
          body,
        });
        const json = (await res.json().catch(() => null)) as SlackFilesUploadResponse | null;
        if (!res.ok || !json?.ok) {
          return { platform, ok: false, error: `Slack API ${res.status}: ${json?.error || res.statusText}` };
        }
        return { platform, ok: true, id: json.file?.id ?? '', url: json.file?.permalink ?? '' };
      } catch (err) {
        return { platform, ok: false, error: `Red: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}

/** Helper interno estático (tests): validación sin instanciar el adapter. */
createSlackAdapter.__validate = (botToken: string, channel: string): { ok: boolean; reason?: string } => {
  if (!botToken) return { ok: false, reason: 'SLACK_BOT_TOKEN no configurado (crear app bot en api.slack.com/apps)' };
  if (!isValidSlackBotToken(botToken)) return { ok: false, reason: 'SLACK_BOT_TOKEN no parece un token de bot (xoxb-...)' };
  if (!channel) return { ok: false, reason: 'SLACK_CHANNEL no configurado (#canal o C123...)' };
  return { ok: true };
};

export type SlackAdapter = ReturnType<typeof createSlackAdapter>;