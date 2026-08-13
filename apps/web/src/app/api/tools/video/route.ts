import { z } from 'zod';
import { generateVideo } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  frames: z.number().int().min(1).max(8).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  try {
    const data = await generateVideo(parsed.data.prompt, { frames: parsed.data.frames });
    return Response.json(data);
  } catch (e) {
    return new Response((e as Error).message || 'Video generation failed', { status: 502 });
  }
}
