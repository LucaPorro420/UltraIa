import { z } from 'zod';
import { fetchWebContent } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  try {
    const data = await fetchWebContent(parsed.data.url);
    return Response.json(data);
  } catch (e) {
    return new Response((e as Error).message || 'Fetch failed', { status: 502 });
  }
}
