/**
 * AutoPub F4 — adapter Discord (webhook, 100% gratis, sin OAuth ni app review).
 *
 * Fuente: `docs/APIS-GRATIS-2026.md` (verificado 2026): Discord gratis para bots/webhooks,
 * límite de subida 10 MiB en servidores sin boost (25 MiB boost nivel 1).
 * Port ORIGINAL de PRINCIPIOS (nada de código copiado).
 *
 * Diseño: fetch inyectable (patrón del repo) para tests sin red; webhook URL desde options o
 * env (DISCORD_WEBHOOK_URL); cuerpo multipart construido con `buildMultipartBody` (compartido
 * con telegram.ts): campo `file` (video) + campo `payload_json` (caption). Fail-soft: sin
 * webhook válido → validate() false con razón; video >10 MiB → ok:false; errores HTTP/red →
 * ok:false con razón (nunca lanza). Discord responde 204 No Content en éxito.
 */

import type { PublishInput, PublishResult, PublisherAdapter, PublishPlatform } from './publish.js';
import { buildMultipartBody, truncateCaption } from './telegram.js';

/** Plataforma del adapter. */
export const DISCORD_PLATFORM = 'discord' as const;

/** Máximo de bytes para subir sin boost (Discord: 10 MiB gratis). */
export const DISCORD_MAX_VIDEO_BYTES = 10 * 1024 * 1024;
/** Máximo de caracteres de un mensaje (Discord: 2000). */
export const DISCORD_MAX_CAPTION_CHARS = 2000;
/** Base de la API de webhooks. */
export const DISCORD_WEBHOOK_BASE = 'https://discord.com/api/webhooks';

export interface DiscordAdapterOptions {
  /** URL completa del webhook (https://discord.com/api/webhooks/{id}/{token}). Default: env DISCORD_WEBHOOK_URL. */
  webhookUrl?: string;
  /** Fetch inyectable para tests. */
  fetch?: typeof fetch;
}

/** Es una URL de webhook de Discord bien formada (id + token). */
export function isValidDiscordWebhook(url: string): boolean {
  return /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.trim());
}

/** Caption limitada al máximo de Discord (2000 chars) manteniendo UTF-8 íntegro. */
export function buildDiscordCaption(metadata?: Partial<{ title: string; description: string }>): string {
  const title = metadata?.title?.trim();
  const desc = metadata?.description?.trim();
  const caption = [title, desc].filter(Boolean).join('\n\n');
  return truncateCaption(caption || 'Contenido generado con IA', DISCORD_MAX_CAPTION_CHARS);
}

/** Resuelve el video: buffer directo o path vía fs (mismo patrón que telegram). */
async function discordVideoBytes(input: PublishInput): Promise<Buffer | null> {
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
 * Adapter Discord para la cola Publication. publica: webhook con video + caption;
 * fail-soft: sin webhook válido → ok:false con razón; video >10 MiB → ok:false; errores
 * HTTP (no-2xx) y red → ok:false con razón (nunca lanza).
 */
export function createDiscordAdapter(options: DiscordAdapterOptions = {}): PublisherAdapter {
  const platform: PublishPlatform = DISCORD_PLATFORM as PublishPlatform;
  // `??`: options explícitas (incluso vacías) tienen precedencia sobre env.
  const webhookUrl = options.webhookUrl ?? process.env.DISCORD_WEBHOOK_URL ?? '';
  const fetchImpl = options.fetch || globalThis.fetch;

  return {
    platform,
    validate: async () => createDiscordAdapter.__validate(webhookUrl),
    publish: async (input: PublishInput): Promise<PublishResult> => {
      const valid = createDiscordAdapter.__validate(webhookUrl);
      if (!valid.ok) return { platform, ok: false, error: valid.reason };
      const video = await discordVideoBytes(input);
      if (!video) return { platform, ok: false, error: 'No hay video disponible (videoPath/videoBuffer vacío o ilegible)' };
      if (video.length > DISCORD_MAX_VIDEO_BYTES) {
        return { platform, ok: false, error: `Video supera el límite gratis de Discord (${Math.round(video.length / 1024 / 1024)}MB > 10MB; boost Nivel 1 sube a 25MB)` };
      }
      const caption = buildDiscordCaption(input.metadata);
      // payload_json debe ser un JSON string válido; content dentro del límite de 2000.
      const payloadJson = JSON.stringify({ content: caption });
      const boundary = `----ultraia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      const { body, contentType } = buildMultipartBody(
        [
          { name: 'file', filename: 'video.mp4', contentType: 'video/mp4', data: video },
          { name: 'payload_json', value: payloadJson },
        ],
        boundary,
      );
      try {
        const res = await fetchImpl(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': contentType },
          body,
        });
        // Discord responde 204 No Content en éxito (sin cuerpo JSON).
        if (!res.ok) return { platform, ok: false, error: `Discord HTTP ${res.status}: ${res.statusText}` };
        return { platform, ok: true, url: webhookUrl.replace('/api/webhooks/', '/channels/') };
      } catch (err) {
        return { platform, ok: false, error: `Red: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}

/** Helper interno estático (tests): validación sin instanciar el adapter. */
createDiscordAdapter.__validate = (webhookUrl: string): { ok: boolean; reason?: string } => {
  if (!webhookUrl) return { ok: false, reason: 'DISCORD_WEBHOOK_URL no configurado (crear webhook en Ajustes > Integraciones del canal)' };
  if (!isValidDiscordWebhook(webhookUrl)) return { ok: false, reason: 'DISCORD_WEBHOOK_URL no parece una URL de webhook válida' };
  return { ok: true };
};

export type DiscordAdapter = ReturnType<typeof createDiscordAdapter>;