/**
 * AutoPub — adapter Zernio (unificado: 16 plataformas en UNA llamada).
 *
 * NOTA: `zernio.ts` es WIP de una sesión concurrente (cliente MCP de Zernio, capability
 * `zernio`). Este archivo es el adapter de PUBLICACIÓN de UltraIa (PublisherAdapter) y vive
 * aparte para no colisionar con el trabajo de la sesión concurrente. Juntos cubren Zernio
 * en las dos capas: el agente (MCP) y el pipeline AutoPub (adapter).
 *
 * Fuente: `docs/RAZONAMIENTO-ZERNIO.md` + llms.txt de Zernio (verificado 2026):
 *   - Zernio publica en 16 plataformas (IG, TikTok, YouTube, X, LinkedIn, Threads, Pinterest,
 *     Reddit, Bluesky, WhatsApp, Telegram, Discord, Snapchat, Facebook, Google Business, ...)
 *     con una sola integración (API key).
 *   - REST Base URL: https://zernio.com/api/v1
 *     · POST /v1/posts  → { profileId?, platforms:[{platform,accountId}], content,
 *                            mediaItems:[{type,url}], scheduledFor, publishNow, isDraft }
 *     · POST /v1/media/presign → { uploadUrl, publicUrl } → PUT bytes (URL pública requerida).
 *   - Auth: Bearer ZERNIO_API_KEY (env) o OAuth 2.1.
 *
 * Diseño: fetch inyectable (patrón del repo) para tests sin red; API key desde options o
 * env (ZERNIO_API_KEY); profile id opcional desde options o env (ZERNIO_PROFILE_ID).
 * Fail-soft: sin key → validate() false; errores HTTP/red → ok:false (nunca lanza).
 * Si no se pasan plataformas, descubre las cuentas activas vía GET /v1/accounts.
 */

import type { PublishInput, PublishResult, PublisherAdapter, PublishPlatform } from './publish';

/** Plataforma del adapter. */
export const ZERNIO_PLATFORM = 'zernio' as const;
/** Base URL de la API REST de Zernio. */
export const ZERNIO_API_URL = 'https://zernio.com/api/v1';

/** Es una API key de Zernio presente (cualquier string no vacío). */
export function isValidZernioApiKey(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 0;
}

/** Caption de Zernio a partir de metadata (incluye hashtags). */
export function buildZernioCaption(metadata?: Partial<{ title: string; description: string; tags: string[] }>): string {
  const title = metadata?.title?.trim();
  const desc = metadata?.description?.trim();
  const tags = (metadata?.tags || []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
  const caption = [title, desc, tags].filter(Boolean).join('\n\n');
  return caption || 'Contenido generado con IA';
}

/** Lee bytes de video/imagen: buffer directo o path vía fs. */
async function zernioBytes(pathOrBuffer?: string | Buffer): Promise<Buffer | null> {
  if (Buffer.isBuffer(pathOrBuffer)) return pathOrBuffer;
  if (typeof pathOrBuffer === 'string') {
    try {
      const fs = await import('node:fs');
      return fs.readFileSync(pathOrBuffer);
    } catch {
      return null;
    }
  }
  return null;
}

/** Content-type por extensión de archivo (imagen). */
function imageContentType(name?: string): string {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

export interface ZernioAdapterOptions {
  /** API key Zernio. Default: env ZERNIO_API_KEY. */
  apiKey?: string;
  /** Profile ID Zernio (opcional). Default: env ZERNIO_PROFILE_ID. */
  profileId?: string;
  /** Lista de plataformas objetivo. Si falta, Zernio descubre cuentas activas. */
  platforms?: string[];
  /** Mapa plataforma→accountId Zernio. */
  accountIds?: Record<string, string>;
  /** Fetch inyectable para tests. */
  fetch?: typeof fetch;
}

/** Cuenta activa de Zernio (de GET /v1/accounts). */
interface ZernioAccount {
  platform?: string;
  accountId?: string;
  status?: string;
}

/** Respuesta de Zernio a POST /v1/posts. */
interface ZernioPostResponse {
  _id?: string;
  status?: string;
  message?: string;
  error?: string;
}

/**
 * Adapter Zernio para la cola Publication y el tool publish_submit. publica en N
 * plataformas con una sola llamada; fail-soft en todo error. Si no hay plataformas
 * explícitas, descubre cuentas activas vía GET /v1/accounts.
 */
export function createZernioAdapter(options: ZernioAdapterOptions = {}): PublisherAdapter {
  const platform: PublishPlatform = ZERNIO_PLATFORM as PublishPlatform;
  const apiKey = options.apiKey ?? process.env.ZERNIO_API_KEY ?? '';
  const profileId = options.profileId ?? process.env.ZERNIO_PROFILE_ID ?? '';
  const defaultPlatforms = options.platforms ?? [];
  const accountIds = options.accountIds ?? {};
  const fetchImpl = options.fetch || globalThis.fetch;

  return {
    platform,
    validate: async () => createZernioAdapter.__validate(apiKey),
    publish: async (input: PublishInput): Promise<PublishResult> => {
      const valid = createZernioAdapter.__validate(apiKey);
      if (!valid.ok) return { platform, ok: false, error: valid.reason };

      // 1) Plataformas objetivo.
      const targetPlatforms =
        input.zernioPlatforms && input.zernioPlatforms.length > 0
          ? input.zernioPlatforms
          : defaultPlatforms.length > 0
            ? defaultPlatforms
            : await discoverPlatforms(fetchImpl, apiKey, profileId);
      if (targetPlatforms.length === 0) {
        return { platform, ok: false, error: 'Sin plataformas Zernio objetivo ni cuentas activas detectadas' };
      }
      const platforms = targetPlatforms.map((p) => ({ platform: p, accountId: accountIds[p] }));

      // 2) Caption.
      const content = input.text?.trim() || buildZernioCaption(input.metadata);
      if (!content) return { platform, ok: false, error: 'Sin contenido (text o metadata)' };

      // 3) Media.
      const mediaItems = await resolveMedia(fetchImpl, apiKey, profileId, input);

      // 4) Payload + POST.
      const payload: Record<string, unknown> = {
        platforms,
        content,
        mediaItems,
        publishNow: !input.scheduledFor,
      };
      if (profileId) payload.profileId = profileId;
      if (input.scheduledFor) payload.scheduledFor = input.scheduledFor;

      try {
        const res = await fetchImpl(`${ZERNIO_API_URL}/posts`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = (await res.json().catch(() => null)) as ZernioPostResponse | null;
        if (!res.ok || !json || !json._id) {
          const reason = json?.error || json?.message || res.statusText || `HTTP ${res.status}`;
          return { platform, ok: false, error: `Zernio ${res.status}: ${reason}` };
        }
        return { platform, ok: true, id: json._id, url: `${ZERNIO_API_URL}/posts/${json._id}` };
      } catch (err) {
        return { platform, ok: false, error: `Red: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}

/** Helper estático: validación de API key. */
createZernioAdapter.__validate = (apiKey: string): { ok: boolean; reason?: string } => {
  if (!isValidZernioApiKey(apiKey)) return { ok: false, reason: 'ZERNIO_API_KEY no configurado (obtener en zernio.com)' };
  return { ok: true };
};

/** Descubre cuentas activas vía GET /v1/accounts (fail-soft → []). */
async function discoverPlatforms(fetchImpl: typeof fetch, apiKey: string, profileId: string): Promise<string[]> {
  try {
    const url = profileId ? `${ZERNIO_API_URL}/accounts?profileId=${encodeURIComponent(profileId)}` : `${ZERNIO_API_URL}/accounts`;
    const res = await fetchImpl(url, { method: 'GET', headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return [];
    const json = (await res.json().catch(() => null)) as { accounts?: ZernioAccount[] } | null;
    const accounts = json?.accounts || [];
    return accounts.filter((a) => a.platform && a.status !== 'disabled').map((a) => a.platform as string);
  } catch {
    return [];
  }
}

/** Resuelve mediaItems: URL pública directa o upload vía presign. */
async function resolveMedia(
  fetchImpl: typeof fetch,
  apiKey: string,
  _profileId: string,
  input: PublishInput,
): Promise<{ type: 'image' | 'video'; url: string }[]> {
  // Video explícito (URL pública).
  if (input.videoUrl) return [{ type: 'video', url: input.videoUrl }];
  // Video local → upload.
  const videoBuf = await zernioBytes(input.videoBuffer ?? input.videoPath);
  if (videoBuf) {
    const url = await uploadBuffer(fetchImpl, apiKey, videoBuf, 'video/mp4', 'video.mp4');
    if (url) return [{ type: 'video', url }];
  }
  // Imagen explícita (URL pública).
  if (input.imageUrl) return [{ type: 'image', url: input.imageUrl }];
  // Imagen local → upload.
  const imageBuf = await zernioBytes(input.imageBuffer);
  if (imageBuf) {
    const url = await uploadBuffer(fetchImpl, apiKey, imageBuf, imageContentType(input.imageName), input.imageName || 'image.png');
    if (url) return [{ type: 'image', url }];
  }
  return [];
}

/** Sube bytes vía presign (POST /v1/media/presign → PUT). Devuelve publicUrl o ''. */
async function uploadBuffer(
  fetchImpl: typeof fetch,
  apiKey: string,
  bytes: Buffer,
  contentType: string,
  filename: string,
): Promise<string> {
  try {
    const presignRes = await fetchImpl(`${ZERNIO_API_URL}/media/presign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, contentType }),
    });
    if (!presignRes.ok) return '';
    const presign = (await presignRes.json().catch(() => null)) as { uploadUrl?: string; publicUrl?: string } | null;
    if (!presign?.uploadUrl || !presign?.publicUrl) return '';
    const putRes = await fetchImpl(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: bytes as unknown as NonNullable<RequestInit['body']>,
    });
    if (!putRes.ok) return '';
    return presign.publicUrl;
  } catch {
    return '';
  }
}

export type ZernioAdapter = ReturnType<typeof createZernioAdapter>;
