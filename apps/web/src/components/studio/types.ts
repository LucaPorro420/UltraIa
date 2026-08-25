'use client';

/** Tipos y helpers compartidos de los paneles del Studio (loop-104). */

export type Cap = 'web' | 'image' | 'video' | 'music' | 'design' | 'branding' | 'chat';

export type AssetMediaType = 'image' | 'audio' | 'video' | 'music' | 'tts' | 'design' | 'text';

/** Borrador de asset que un panel produce al generar; lo persiste AssetActions. */
export interface AssetDraft {
  prompt: string;
  url: string;
  provider: string;
  model?: string;
  mediaType: AssetMediaType;
  seed?: number;
  width?: number;
  height?: number;
  parentId?: string;
  meta?: Record<string, unknown>;
}

/** Fila devuelta por /api/library/assets (subset usado por la UI). */
export interface AssetRecord {
  id: string;
  prompt: string;
  provider: string;
  model: string;
  mediaType: string;
  url: string;
  width: number;
  height: number;
  storage: string;
  cloudPath: string | null;
  parentId: string | null;
  metaJson: string | null;
  createdAt: string;
}

export async function postJson<T>(url: string, body: unknown, opts?: { timeoutMs?: number }): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 120_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => 'Request failed');
      throw new Error(msg || `Request failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

/** Extrae metaJson parseado con fallback seguro. */
export function parseMeta(asset: Pick<AssetRecord, 'metaJson'>): Record<string, unknown> {
  if (!asset.metaJson) return {};
  try {
    const v = JSON.parse(asset.metaJson);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
