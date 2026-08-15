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

export interface PublishMetadata {
  title: string;
  description: string;
  tags: string[];
  privacyStatus: 'public' | 'private' | 'unlisted';
}

export interface PublishInput {
  /** Ruta del MP4 final (9:16, <60s). */
  videoPath?: string;
  /** Buffer del video (alternativa a videoPath, útil en runtime sin fs). */
  videoBuffer?: Buffer;
  metadata?: Partial<PublishMetadata>;
}

export interface PublishResult {
  platform: 'youtube' | 'tiktok';
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export interface PublisherAdapter {
  platform: 'youtube' | 'tiktok';
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

/** Crea los adaptadores por defecto (YT + TikTok). */
export function createDefaultPublishers(): PublisherAdapter[] {
  return [createYouTubeAdapter(), createTikTokAdapter()];
}

export const publish = { createYouTubeAdapter, createTikTokAdapter, createDefaultPublishers, publishToAll, buildBilingualMetadata };