/**
 * Helpers de servidor del media hub del Studio (loop-104).
 * Compartidos por las rutas /api/library/assets y /api/assets/[id]/*.
 */

import { join } from 'node:path';
import { CloudService, LocalCloudAdapter, R2CloudAdapter } from '@ultraia/core';

/** Instancia de CloudService para assets (R2 si hay env; si no, local .ultraia/cloud). */
export function getStudioCloud(): CloudService {
  const workerUrl = process.env.CLOUDFLARE_R2_WORKER_URL;
  const token = process.env.CLOUDFLARE_R2_TOKEN;
  const adapter =
    workerUrl && token
      ? new R2CloudAdapter({ baseUrl: workerUrl, token, publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL })
      : new LocalCloudAdapter(process.env.ULTRAIA_CLOUD_DIR ?? join(process.cwd(), '..', '..', '.ultraia', 'cloud'));
  return new CloudService({ adapter });
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'text/html': 'html',
  'text/plain': 'txt',
};

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime]),
);

/** Extensión desde la URL (último segmento, sin query) o vacío. */
export function extFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const last = path.split('.').pop() ?? '';
    return /^[a-z0-9]{2,5}$/i.test(last) ? last.toLowerCase() : '';
  } catch {
    return '';
  }
}

/** Extensión efectiva: URL primero, luego content-type. */
export function effectiveExt(url: string, contentType?: string): string {
  return extFromUrl(url) || EXT_BY_MIME[(contentType ?? '').split(';')[0].trim()] || 'bin';
}

export interface ResolvedBytes {
  bytes: Uint8Array;
  mime: string;
  source: 'cloud' | 'proxy';
}

/**
 * Resuelve los BYTES de un asset: del cloud local/R2 si están allí, o por
 * proxy de su URL externa (las URLs de pollinations expiran; el binario no).
 */
export async function resolveAssetBytes(
  asset: { storage: string; cloudPath: string | null; url: string },
  cloud: CloudService,
): Promise<ResolvedBytes | null> {
  if (asset.storage === 'cloud' && asset.cloudPath) {
    const bytes = await cloud.adapter.read(asset.cloudPath);
    if (bytes) {
      const ext = asset.cloudPath.split('.').pop()?.toLowerCase() ?? '';
      return { bytes, mime: MIME_BY_EXT[ext] ?? 'application/octet-stream', source: 'cloud' };
    }
  }
  if (!asset.url || asset.url.startsWith('/')) return null;
  try {
    const res = await fetch(asset.url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, mime: res.headers.get('content-type') ?? 'application/octet-stream', source: 'proxy' };
  } catch {
    return null;
  }
}
