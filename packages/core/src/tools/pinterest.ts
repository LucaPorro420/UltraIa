/**
 * pinterest.ts — Adapter de publicación para Pinterest (API v5, AutoPub).
 *
 * Crea un Pin en el board configurado (board_id) con título, descripción y media
 * (video por link). fetch inyectable; token desde options o PINTEREST_ACCESS_TOKEN;
 * board desde options o PINTEREST_BOARD_ID. Fail-soft.
 */

import type { PublishInput, PublishResult, PublisherAdapter, PublishPlatform } from './publish';

export const PINTEREST_PLATFORM = 'pinterest';

export interface PinterestAdapterOptions {
  accessToken?: string;
  boardId?: string;
  fetchFn?: typeof fetch;
  tokenFromEnv?: () => string | undefined;
  boardIdFromEnv?: () => string | undefined;
}

export function createPinterestAdapter(options: PinterestAdapterOptions = {}): PublisherAdapter {
  const token = () => options.accessToken ?? options.tokenFromEnv?.() ?? process.env.PINTEREST_ACCESS_TOKEN;
  const boardId = () => options.boardId ?? options.boardIdFromEnv?.() ?? process.env.PINTEREST_BOARD_ID;
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  return {
    platform: PINTEREST_PLATFORM as PublishPlatform,
    async validate() {
      if (!token()) return { ok: false, reason: 'PINTEREST_ACCESS_TOKEN no configurado' };
      if (!boardId()) return { ok: false, reason: 'PINTEREST_BOARD_ID no configurado' };
      return { ok: true };
    },
    async publish(input: PublishInput): Promise<PublishResult> {
      const accessToken = token();
      const bid = boardId();
      if (!accessToken) return { platform: PINTEREST_PLATFORM, ok: false, error: 'PINTEREST_ACCESS_TOKEN no configurado' };
      if (!bid) return { platform: PINTEREST_PLATFORM, ok: false, error: 'PINTEREST_BOARD_ID no configurado' };
      if (!input.videoUrl) {
        return { platform: PINTEREST_PLATFORM, ok: false, error: 'Pinterest requiere video_url (video) para el pin' };
      }

      const meta = input.metadata ?? {};
      const title = (meta.title ?? 'UltraIa').slice(0, 100);
      const description = `${(meta.description ?? '').slice(0, 500)}\n\n${(meta.tags ?? []).join(' ')}`.slice(0, 800);
      const body = {
        board_id: bid,
        title,
        description,
        media: { media_type: 'video', video_link: input.videoUrl },
      };

      try {
        const res = await fetchFn('https://api.pinterest.com/v5/pins', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as { id?: string };
        if (!res.ok || !data.id) {
          return { platform: PINTEREST_PLATFORM, ok: false, error: `Pinterest falló: HTTP ${res.status}` };
        }
        return { platform: PINTEREST_PLATFORM, ok: true, id: data.id, url: `https://pinterest.com/pin/${data.id}/` };
      } catch (err) {
        return { platform: PINTEREST_PLATFORM, ok: false, error: `Pinterest error: ${(err as Error).message}` };
      }
    },
  };
}
