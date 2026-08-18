/**
 * AutoPub F4 — Distribución: PublisherAdapter + adaptadores YouTube Shorts y TikTok.
 *
 * Port TS del RF-12 verificado (`ULTRAIA/integracionesImplementacion/src/publish.py`):
 *   - YouTube Shorts: YouTube Data API v3, upload resumable (POST → Location → PUT).
 *   - TikTok: Content Posting API v2, Direct Post de 2 pasos (init → PUT al upload_url).
 *
 * Diseño: fetch inyectable (patrón del repo) para tests sin red; tokens desde options o
 * env (YOUTUBE_ACCESS_TOKEN / TIKTOK_ACCESS_TOKEN); metadatos bilingües es/ar por defecto
 * (mismo patrón que RF-12). Fail-soft: sin token → validate() false con razón clara.
 */

import { createTelegramAdapter } from './telegram.js';
import { createDiscordAdapter } from './discord.js';
import { createSlackAdapter } from './slack.js';

export interface PublishMetadata {
  title: string;
  description: string;
  tags: string[];
  privacyStatus: 'public' | 'private' | 'unlisted';
}

export type PublishPlatform = 'youtube' | 'tiktok' | 'x' | 'instagram' | 'threads' | 'telegram' | 'discord' | 'slack';

export interface PublishInput {
  /** Ruta del MP4 final (9:16, <60s). */
  videoPath?: string;
  /** Buffer del video (alternativa a videoPath, útil en runtime sin fs). */
  videoBuffer?: Buffer;
  /** URL pública del video (requerida por IG Reels y Threads — container flow). */
  videoUrl?: string;
  metadata?: Partial<PublishMetadata>;
}

export interface PublishResult {
  platform: PublishPlatform;
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export interface PublisherAdapter {
  platform: PublishPlatform;
  /** Sube el video a la plataforma. Devuelve ok:false + error si algo falla (no lanza). */
  publish(input: PublishInput): Promise<PublishResult>;
  /** Sin token o sin fuente de video → false con razón. */
  validate(): Promise<{ ok: boolean; reason?: string }>;
}

export const DEFAULT_METADATA: PublishMetadata = {
  title: 'El Futuro de la IA | مستقبل الذكاء الاصطناعي #Shorts',
  description:
    'Descubre cómo la inteligencia artificial está transformando el mundo.\n' +
    'اكتشف كيف يغير الذكاء الاصطناعي العالم اليوم.\n\n' +
    '#IA #ArtificialIntelligence #الذكاء_الاصطناعي #Tech #Futuro',
  tags: ['IA', 'Inteligencia Artificial', 'Tecnologia', 'Shorts', 'الذكاء الاصطناعي', 'تكنولوجيا', 'المستقبل'],
  privacyStatus: 'public',
};

const YOUTUBE_SCOPED_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const TIKTOK_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const X_MEDIA_UPLOAD_URL = 'https://upload.x.com/1.1/media/upload.json';
const X_TWEETS_URL = 'https://api.x.com/2/tweets';
/** Instagram Graph API v21 (Reels container flow: create → publish). */
export const IG_MEDIA_URL = 'https://graph.instagram.com/v21.0';
/** Threads Graph API v1.0 (container flow: threads → threads_publish). */
export const THREADS_MEDIA_URL = 'https://graph.threads.net/v1.0';
/** Límite de chunk del media upload de X: 5 MiB por APPEND. */
export const X_CHUNK_BYTES = 5 * 1024 * 1024;

/** Cuerpo form-urlencoded para las llamadas Graph API de Meta (sin deps). */
export function formBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

/** Metadatos bilingües es/ar a partir del título (port de build_metadata_from_script). */
export function buildBilingualMetadata(title: string, plainScript?: string): PublishMetadata {
  const tags = ['IA', 'Inteligencia Artificial', 'Shorts', 'Tecnologia', 'الذكاء الاصطناعي', 'تكنولوجيا', 'المستقبل'];
  const descEs = `${title}\n\nContenido generado con IA. #IA #Shorts`;
  const descAr = plainScript || title;
  return {
    title: `${title} | الذكاء الاصطناعي #Shorts`,
    description: `${descEs}\n${descAr}\n\n${tags.map((t) => `#${t}`).join(' ')}`,
    tags,
    privacyStatus: 'public',
  };
}

/** Resuelve la fuente de video: path (fs) o buffer. */
async function videoBytes(input: PublishInput): Promise<Buffer | null> {
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

function mergedMetadata(input: PublishInput): PublishMetadata {
  return { ...DEFAULT_METADATA, ...(input.metadata || {}) };
}

// ------------------------------------------------------------------- YouTube

export interface YouTubeAdapterOptions {
  accessToken?: string;
  fetchFn?: typeof fetch;
  /** Default: env YOUTUBE_ACCESS_TOKEN. */
  tokenFromEnv?: () => string | undefined;
}

export function createYouTubeAdapter(options: YouTubeAdapterOptions = {}): PublisherAdapter {
  const token = () => options.accessToken ?? options.tokenFromEnv?.() ?? process.env.YOUTUBE_ACCESS_TOKEN;
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  return {
    platform: 'youtube',
    async validate() {
      if (!token()) return { ok: false, reason: 'YOUTUBE_ACCESS_TOKEN no configurado' };
      return { ok: true };
    },
    async publish(input) {
      const accessToken = token();
      if (!accessToken) return { platform: 'youtube', ok: false, error: 'YOUTUBE_ACCESS_TOKEN no configurado' };
      const bytes = await videoBytes(input);
      if (!bytes) return { platform: 'youtube', ok: false, error: 'No se pudo leer el video (videoPath o videoBuffer requerido)' };
      const meta = mergedMetadata(input);
      try {
        // Paso 1: iniciar carga resumible → Location con uploadUrl
        const init = await fetchFn(YOUTUBE_SCOPED_UPLOAD_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              title: meta.title,
              description: meta.description,
              tags: meta.tags,
              categoryId: '28', // Ciencia y Tecnología
            },
            status: {
              privacyStatus: meta.privacyStatus,
              selfDeclaredMadeForKids: false,
            },
          }),
        });
        const uploadUrl = init.headers.get('location');
        if (!init.ok || !uploadUrl) {
          return { platform: 'youtube', ok: false, error: `YouTube init falló: HTTP ${init.status}` };
        }
        // Paso 2: subir binario al uploadUrl
        const up = await fetchFn(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(bytes.length) },
          body: new Uint8Array(bytes),
        });
        const data = (await up.json().catch(() => ({}))) as { id?: string };
        if (!up.ok || !data.id) {
          return { platform: 'youtube', ok: false, error: `YouTube upload falló: HTTP ${up.status}` };
        }
        return { platform: 'youtube', ok: true, id: data.id, url: `https://youtube.com/shorts/${data.id}` };
      } catch (err) {
        return { platform: 'youtube', ok: false, error: `YouTube error: ${(err as Error).message}` };
      }
    },
  };
}

// -------------------------------------------------------------------- TikTok

export interface TikTokAdapterOptions {
  accessToken?: string;
  fetchFn?: typeof fetch;
  tokenFromEnv?: () => string | undefined;
}

export function createTikTokAdapter(options: TikTokAdapterOptions = {}): PublisherAdapter {
  const token = () => options.accessToken ?? options.tokenFromEnv?.() ?? process.env.TIKTOK_ACCESS_TOKEN;
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  return {
    platform: 'tiktok',
    async validate() {
      if (!token()) return { ok: false, reason: 'TIKTOK_ACCESS_TOKEN no configurado' };
      return { ok: true };
    },
    async publish(input) {
      const accessToken = token();
      if (!accessToken) return { platform: 'tiktok', ok: false, error: 'TIKTOK_ACCESS_TOKEN no configurado' };
      const bytes = await videoBytes(input);
      if (!bytes) return { platform: 'tiktok', ok: false, error: 'No se pudo leer el video (videoPath o videoBuffer requerido)' };
      const meta = mergedMetadata(input);
      const fileSize = bytes.length;
      const titleWithHashtags = `${meta.title} ${meta.tags.map((t) => `#${t}`).join(' ')}`.slice(0, 150);
      try {
        // Paso A: inicializar carga (Direct Post, 2 pasos)
        const init = await fetchFn(TIKTOK_INIT_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify({
            post_info: {
              title: titleWithHashtags,
              privacy_level: 'PUBLIC_TO_EVERYONE',
              disable_duet: false,
              disable_stitch: false,
              disable_comment: false,
            },
            source_info: {
              source: 'FILE_UPLOAD',
              video_size: fileSize,
              chunk_size: fileSize,
              total_chunk_count: 1,
            },
          }),
        });
        const initData = (await init.json().catch(() => ({}))) as { data?: { upload_url?: string; publish_id?: string }; error?: { code?: string } };
        if (!init.ok || initData.error?.code !== 'ok' || !initData.data?.upload_url) {
          return { platform: 'tiktok', ok: false, error: `TikTok init falló: HTTP ${init.status} (${initData.error?.code || 'unknown'})` };
        }
        // Paso B: subir binario al upload_url
        const up = await fetchFn(initData.data.upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': String(fileSize),
            'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
          },
          body: new Uint8Array(bytes),
        });
        if (up.status !== 200 && up.status !== 201) {
          return { platform: 'tiktok', ok: false, error: `TikTok upload falló: HTTP ${up.status}` };
        }
        return { platform: 'tiktok', ok: true, id: initData.data.publish_id };
      } catch (err) {
        return { platform: 'tiktok', ok: false, error: `TikTok error: ${(err as Error).message}` };
      }
    },
  };
}

// ----------------------------------------------------------------------- X (Twitter)

/** QUÉ ES: texto del post X (título + primera línea + hashtags) con cap de 280 chars.
// PARA QUÉ: el tweet v2 exige texto ≤280; determinista y testeable sin red.
// POR QUÉ: mismo patrón que captionFor — el adapter no inventa copy. */
export function buildXPostText(meta: PublishMetadata): string {
  const tags = meta.tags.map((t) => `#${t}`).join(' ');
  const firstLine = meta.description.split('\n')[0].trim();
  return `${meta.title}\n\n${firstLine}\n\n${tags}`.slice(0, 280);
}

/** QUÉ ES: cuerpo multipart/form-data del APPEND del media upload de X (sin deps).
// PARA QUÉ: subir el chunk en base64 con command/media_id/segment_index/media_data.
// POR QUÉ: X exige form-data; construirlo a mano evita una dependencia nueva. */
export function xAppendMultipartBody(
  mediaId: string,
  segmentIndex: number,
  chunkBase64: string,
  boundary: string,
): string {
  const b = `--${boundary}`;
  const parts = [
    `${b}\r\nContent-Disposition: form-data; name="command"\r\n\r\nAPPEND\r\n`,
    `${b}\r\nContent-Disposition: form-data; name="media_id"\r\n\r\n${mediaId}\r\n`,
    `${b}\r\nContent-Disposition: form-data; name="segment_index"\r\n\r\n${segmentIndex}\r\n`,
    `${b}\r\nContent-Disposition: form-data; name="media_data"\r\n\r\n${chunkBase64}\r\n`,
    `${b}--\r\n`,
  ];
  return parts.join('');
}

export interface XAdapterOptions {
  accessToken?: string;
  fetchFn?: typeof fetch;
  /** Default: env X_ACCESS_TOKEN. */
  tokenFromEnv?: () => string | undefined;
  /** Default 5 MiB (límite X por APPEND). */
  chunkBytes?: number;
  /** Texto fijo del tweet (default: buildXPostText(metadata)). */
  text?: string;
}

/** QUÉ ES: adapter X API v2 (tweet con video vía media upload v1.1 chunked).
// PARA QUÉ: F4 paso 4 — canal X (Free: 17 posts/24h POR APP, sin app review, verificado 17/08).
// POR QUÉ: mismo patrón fail-soft/fetch inyectable que YouTube y TikTok. */
export function createXAdapter(options: XAdapterOptions = {}): PublisherAdapter {
  const token = () => options.accessToken ?? options.tokenFromEnv?.() ?? process.env.X_ACCESS_TOKEN;
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const chunkBytes = options.chunkBytes ?? X_CHUNK_BYTES;

  return {
    platform: 'x',
    async validate() {
      if (!token()) return { ok: false, reason: 'X_ACCESS_TOKEN no configurado' };
      return { ok: true };
    },
    async publish(input) {
      const accessToken = token();
      if (!accessToken) return { platform: 'x', ok: false, error: 'X_ACCESS_TOKEN no configurado' };
      const bytes = await videoBytes(input);
      if (!bytes) return { platform: 'x', ok: false, error: 'No se pudo leer el video (videoPath o videoBuffer requerido)' };
      const meta = mergedMetadata(input);
      const text = options.text ?? buildXPostText(meta);
      try {
        // Paso 1: INIT del media upload (chunked upload v1.1)
        const init = await fetchFn(X_MEDIA_UPLOAD_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'INIT', media_type: 'video/mp4', total_bytes: bytes.length }),
        });
        const initData = (await init.json().catch(() => ({}))) as { media_id_string?: string };
        if (!init.ok || !initData.media_id_string) {
          return { platform: 'x', ok: false, error: `X INIT falló: HTTP ${init.status}` };
        }
        const mediaId = initData.media_id_string;

        // Paso 2: APPEND por chunk (≤5 MiB) con multipart manual
        const boundary = `ultraia-${mediaId}`;
        const totalChunks = Math.max(1, Math.ceil(bytes.length / chunkBytes));
        for (let i = 0; i < totalChunks; i++) {
          const chunk = bytes.subarray(i * chunkBytes, (i + 1) * chunkBytes);
          const body = xAppendMultipartBody(mediaId, i, Buffer.from(chunk).toString('base64'), boundary);
          const app = await fetchFn(X_MEDIA_UPLOAD_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body,
          });
          if (!app.ok) {
            return { platform: 'x', ok: false, error: `X APPEND ${i} falló: HTTP ${app.status}` };
          }
        }

        // Paso 3: FINALIZE
        const fin = await fetchFn(X_MEDIA_UPLOAD_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'FINALIZE', media_id: mediaId }),
        });
        if (!fin.ok) {
          return { platform: 'x', ok: false, error: `X FINALIZE falló: HTTP ${fin.status}` };
        }

        // Paso 4: tweet v2 con el media
        const tw = await fetchFn(X_TWEETS_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, media: { media_ids: [mediaId] } }),
        });
        const twData = (await tw.json().catch(() => ({}))) as { data?: { id?: string } };
        if (!tw.ok || !twData.data?.id) {
          return { platform: 'x', ok: false, error: `X tweet falló: HTTP ${tw.status}` };
        }
        return { platform: 'x', ok: true, id: twData.data.id, url: `https://x.com/i/status/${twData.data.id}` };
      } catch (err) {
        return { platform: 'x', ok: false, error: `X error: ${(err as Error).message}` };
      }
    },
  };
}

// -------------------------------------------------------------- Meta (IG Reels)

export interface InstagramAdapterOptions {
  accessToken?: string;
  /** ID de la cuenta IG Business/Creator (Graph API). */
  igUserId?: string;
  fetchFn?: typeof fetch;
  /** Default: env IG_ACCESS_TOKEN. */
  tokenFromEnv?: () => string | undefined;
  /** Default: env IG_USER_ID. */
  userIdFromEnv?: () => string | undefined;
  /** URL pública del video Reels (también acepta PublishInput.videoUrl). */
  videoUrl?: string;
}

/** QUÉ ES: adapter Instagram Reels vía Instagram Graph API (container flow).
// PARA QUÉ: F4 paso 5 — canal Meta (sin app review para negocio propio, Standard
// Access, permisos instagram_business_content_publish + instagram_basic, verificado 17/08).
// POR QUÉ: mismo patrón fail-soft/fetch inyectable que YouTube/TikTok/X. */
export function createInstagramAdapter(options: InstagramAdapterOptions = {}): PublisherAdapter {
  const token = () => options.accessToken ?? options.tokenFromEnv?.() ?? process.env.IG_ACCESS_TOKEN;
  const userId = () => options.igUserId ?? options.userIdFromEnv?.() ?? process.env.IG_USER_ID;
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  return {
    platform: 'instagram',
    async validate() {
      if (!token()) return { ok: false, reason: 'IG_ACCESS_TOKEN no configurado' };
      if (!userId()) return { ok: false, reason: 'IG_USER_ID no configurado' };
      return { ok: true };
    },
    async publish(input) {
      const accessToken = token();
      const igUserId = userId();
      if (!accessToken) return { platform: 'instagram', ok: false, error: 'IG_ACCESS_TOKEN no configurado' };
      if (!igUserId) return { platform: 'instagram', ok: false, error: 'IG_USER_ID no configurado' };
      const videoUrl = options.videoUrl ?? input.videoUrl;
      if (!videoUrl) {
        return { platform: 'instagram', ok: false, error: 'IG Reels requiere video_url público (PublishInput.videoUrl o options.videoUrl)' };
      }
      const meta = mergedMetadata(input);
      const caption = meta.title.slice(0, 2200);
      try {
        // Paso 1: crear container REELS → creation_id
        const create = await fetchFn(`${IG_MEDIA_URL}/${igUserId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody({
            media_type: 'REELS',
            video_url: videoUrl,
            caption,
            access_token: accessToken,
          }),
        });
        const createData = (await create.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
        if (!create.ok || !createData.id) {
          return { platform: 'instagram', ok: false, error: `IG media create falló: HTTP ${create.status} (${createData.error?.message || 'sin id'})` };
        }
        // Paso 2: publicar el container → media id
        const pub = await fetchFn(`${IG_MEDIA_URL}/${igUserId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody({ creation_id: createData.id, access_token: accessToken }),
        });
        const pubData = (await pub.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
        if (!pub.ok || !pubData.id) {
          return { platform: 'instagram', ok: false, error: `IG media_publish falló: HTTP ${pub.status} (${pubData.error?.message || 'sin id'})` };
        }
        return { platform: 'instagram', ok: true, id: pubData.id, url: `https://www.instagram.com/reel/${pubData.id}/` };
      } catch (err) {
        return { platform: 'instagram', ok: false, error: `Instagram error: ${(err as Error).message}` };
      }
    },
  };
}

// --------------------------------------------------------------- Meta (Threads)

export interface ThreadsAdapterOptions {
  accessToken?: string;
  /** ID de usuario de Threads (Graph API v1.0). */
  threadsUserId?: string;
  fetchFn?: typeof fetch;
  /** Default: env THREADS_ACCESS_TOKEN. */
  tokenFromEnv?: () => string | undefined;
  /** Default: env THREADS_USER_ID. */
  userIdFromEnv?: () => string | undefined;
  /** URL pública del video (también acepta PublishInput.videoUrl). */
  videoUrl?: string;
}

/** QUÉ ES: adapter Threads vía Threads Graph API (container flow).
// PARA QUÉ: F4 paso 5 — canal Meta Threads (mismo estándar que IG: sin app review
// para negocio propio; token con permisos de publicación).
// POR QUÉ: mismo patrón fail-soft/fetch inyectable; sin url devuelta (id como TikTok). */
export function createThreadsAdapter(options: ThreadsAdapterOptions = {}): PublisherAdapter {
  const token = () => options.accessToken ?? options.tokenFromEnv?.() ?? process.env.THREADS_ACCESS_TOKEN;
  const userId = () => options.threadsUserId ?? options.userIdFromEnv?.() ?? process.env.THREADS_USER_ID;
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  return {
    platform: 'threads',
    async validate() {
      if (!token()) return { ok: false, reason: 'THREADS_ACCESS_TOKEN no configurado' };
      if (!userId()) return { ok: false, reason: 'THREADS_USER_ID no configurado' };
      return { ok: true };
    },
    async publish(input) {
      const accessToken = token();
      const threadsUserId = userId();
      if (!accessToken) return { platform: 'threads', ok: false, error: 'THREADS_ACCESS_TOKEN no configurado' };
      if (!threadsUserId) return { platform: 'threads', ok: false, error: 'THREADS_USER_ID no configurado' };
      const videoUrl = options.videoUrl ?? input.videoUrl;
      if (!videoUrl) {
        return { platform: 'threads', ok: false, error: 'Threads requiere video_url público (PublishInput.videoUrl o options.videoUrl)' };
      }
      const meta = mergedMetadata(input);
      const text = meta.title.slice(0, 500);
      try {
        // Paso 1: crear container → creation_id
        const create = await fetchFn(`${THREADS_MEDIA_URL}/${threadsUserId}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody({
            media_type: 'VIDEO',
            video_url: videoUrl,
            text,
            access_token: accessToken,
          }),
        });
        const createData = (await create.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
        if (!create.ok || !createData.id) {
          return { platform: 'threads', ok: false, error: `Threads create falló: HTTP ${create.status} (${createData.error?.message || 'sin id'})` };
        }
        // Paso 2: publicar el container → thread id
        const pub = await fetchFn(`${THREADS_MEDIA_URL}/${threadsUserId}/threads_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody({ creation_id: createData.id, access_token: accessToken }),
        });
        const pubData = (await pub.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
        if (!pub.ok || !pubData.id) {
          return { platform: 'threads', ok: false, error: `Threads publish falló: HTTP ${pub.status} (${pubData.error?.message || 'sin id'})` };
        }
        return { platform: 'threads', ok: true, id: pubData.id };
      } catch (err) {
        return { platform: 'threads', ok: false, error: `Threads error: ${(err as Error).message}` };
      }
    },
  };
}

// ------------------------------------------------------------------- helpers

/** Corre todos los adapters sobre el mismo input y agrega resultados. */
export async function publishToAll(adapters: PublisherAdapter[], input: PublishInput): Promise<PublishResult[]> {
  const results: PublishResult[] = [];
  for (const adapter of adapters) {
    const v = await adapter.validate();
    if (!v.ok) {
      results.push({ platform: adapter.platform, ok: false, error: v.reason || 'no validado' });
      continue;
    }
    results.push(await adapter.publish(input));
  }
  return results;
}

/** Crea los adaptadores por defecto (YT + TikTok; opcionalmente X — canal F4 paso 4 — y Meta IG/Threads — paso 5 — y Telegram — paso 6 — y Discord/Slack — paso 7).
// includeX/includeMeta/includeTelegram/includeDiscord/includeSlack=false por defecto para no cambiar el comportamiento de las colas existentes. */
export function createDefaultPublishers(opts: { includeX?: boolean; includeMeta?: boolean; includeTelegram?: boolean; includeDiscord?: boolean; includeSlack?: boolean } = {}): PublisherAdapter[] {
  const base = [createYouTubeAdapter(), createTikTokAdapter()];
  if (opts.includeX) base.push(createXAdapter());
  if (opts.includeMeta) base.push(createInstagramAdapter(), createThreadsAdapter());
  if (opts.includeTelegram) base.push(createTelegramAdapter());
  if (opts.includeDiscord) base.push(createDiscordAdapter());
  if (opts.includeSlack) base.push(createSlackAdapter());
  return base;
}

export const publish = { createYouTubeAdapter, createTikTokAdapter, createXAdapter, createInstagramAdapter, createThreadsAdapter, createTelegramAdapter, createDiscordAdapter, createSlackAdapter, createDefaultPublishers, publishToAll, buildBilingualMetadata, buildXPostText, xAppendMultipartBody, formBody, IG_MEDIA_URL, THREADS_MEDIA_URL };