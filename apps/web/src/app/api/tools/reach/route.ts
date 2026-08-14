import { z } from 'zod';
import { readWeb, searchWeb, searchGitHub, parseRss, videoInfo } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  action: z.enum(['read', 'search', 'github', 'rss', 'video']),
  url: z.string().url().optional(),
  query: z.string().min(1).max(300).optional(),
  maxResults: z.number().int().min(1).max(20).optional(),
  maxItems: z.number().int().min(1).max(20).optional(),
  maxLength: z.number().int().min(500).max(50000).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const { action, url, query, maxResults, maxItems, maxLength } = parsed.data;

  try {
    switch (action) {
      case 'read': {
        if (!url) return new Response('url required', { status: 400 });
        return Response.json(await readWeb({ url, maxLength }));
      }
      case 'search': {
        if (!query) return new Response('query required', { status: 400 });
        return Response.json(await searchWeb({ query, maxResults }));
      }
      case 'github': {
        if (!query) return new Response('query required', { status: 400 });
        return Response.json(await searchGitHub({ query, maxResults }));
      }
      case 'rss': {
        if (!url) return new Response('url required', { status: 400 });
        return Response.json(await parseRss({ url, maxItems }));
      }
      case 'video': {
        if (!url) return new Response('url required', { status: 400 });
        return Response.json(await videoInfo({ url }));
      }
    }
  } catch (e) {
    return new Response((e as Error).message || 'Reach failed', { status: 502 });
  }
}