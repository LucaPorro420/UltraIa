import { z } from 'zod';
import { searchMusic } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  query: z.string().min(1).max(80),
  duration: z.number().optional(),
  tolerance: z.number().optional(),
  maxResults: z.number().int().min(1).max(10).optional(),
});

/**
 * POST /api/tools/content/music — pista real keyless (Tunetank) para el
 * MusicPanel del Studio. Lección verificada: Tunetank solo matchea queries de
 * UNA palabra; el dominio ya hace fallback al primer token.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  try {
    const result = await searchMusic(parsed.data);
    return Response.json(result);
  } catch (e) {
    return new Response((e as Error).message || 'Music search failed', { status: 502 });
  }
}
