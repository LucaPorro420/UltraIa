/**
 * reddit.ts — Adapter de publicación para Reddit (AutoPub).
 *
 * Postea un link o self-post vía la Reddit API (oauth.reddit.com/api/submit).
 * fetch inyectable (patrón del repo) para tests sin red; token desde options o
 * REDDIT_ACCESS_TOKEN; subreddit desde options o REDDIT_SUBREDDIT. Fail-soft:
 * sin token/subreddit → validate() false con razón clara.
 */

import type { PublishInput, PublishResult, PublisherAdapter, PublishPlatform } from './publish';

export const REDDIT_PLATFORM = 'reddit';

export interface RedditAdapterOptions {
  accessToken?: string;
  subreddit?: string;
  fetchFn?: typeof fetch;
  tokenFromEnv?: () => string | undefined;
  subredditFromEnv?: () => string | undefined;
}

export function createRedditAdapter(options: RedditAdapterOptions = {}): PublisherAdapter {
  const token = () => options.accessToken ?? options.tokenFromEnv?.() ?? process.env.REDDIT_ACCESS_TOKEN;
  const subreddit = () => options.subreddit ?? options.subredditFromEnv?.() ?? process.env.REDDIT_SUBREDDIT;
  const fetchFn = options.fetchFn ?? globalThis.fetch;

  return {
    platform: REDDIT_PLATFORM as PublishPlatform,
    async validate() {
      if (!token()) return { ok: false, reason: 'REDDIT_ACCESS_TOKEN no configurado' };
      if (!subreddit()) return { ok: false, reason: 'REDDIT_SUBREDDIT no configurado' };
      return { ok: true };
    },
    async publish(input: PublishInput): Promise<PublishResult> {
      const accessToken = token();
      const sr = subreddit();
      if (!accessToken) return { platform: REDDIT_PLATFORM, ok: false, error: 'REDDIT_ACCESS_TOKEN no configurado' };
      if (!sr) return { platform: REDDIT_PLATFORM, ok: false, error: 'REDDIT_SUBREDDIT no configurado' };

      const meta = input.metadata ?? {};
      const title = (meta.title ?? 'UltraIa').slice(0, 300);
      const kind = input.videoUrl ? 'link' : 'self';
      const body = new URLSearchParams();
      body.set('sr', sr);
      body.set('kind', kind);
      body.set('title', title);
      body.set('api_type', 'json');
      if (kind === 'link') body.set('url', input.videoUrl as string);
      else body.set('text', `${(meta.description ?? '').slice(0, 39000)}\n\n${(meta.tags ?? []).join(' ')}`);

      try {
        const res = await fetchFn('https://oauth.reddit.com/api/submit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'UltraIa/1.0',
          },
          body: body.toString(),
        });
        const data = (await res.json().catch(() => ({}))) as {
          json?: { errors?: unknown[]; data?: { id?: string; name?: string } };
        };
        const id = data.json?.data?.id ?? data.json?.data?.name;
        if (!res.ok || !id) {
          return { platform: REDDIT_PLATFORM, ok: false, error: `Reddit submit falló: HTTP ${res.status}` };
        }
        return { platform: REDDIT_PLATFORM, ok: true, id, url: `https://reddit.com/${id}` };
      } catch (err) {
        return { platform: REDDIT_PLATFORM, ok: false, error: `Reddit error: ${(err as Error).message}` };
      }
    },
  };
}
