import { z } from 'zod';
import { generateImage } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  width: z.number().int().min(128).max(1792).optional(),
  height: z.number().int().min(128).max(1792).optional(),
  model: z.string().max(50).optional(),
  imageUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  try {
    const data = await generateImage(parsed.data);
    return Response.json(data);
  } catch (e) {
    return new Response((e as Error).message || 'Image generation failed', { status: 502 });
  }
}
