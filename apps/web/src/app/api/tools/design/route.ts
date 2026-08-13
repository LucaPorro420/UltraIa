import { z } from 'zod';
import { generateUiScreen } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({ prompt: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  try {
    const data = await generateUiScreen(parsed.data.prompt);
    return Response.json(data);
  } catch (e) {
    return new Response((e as Error).message || 'UI generation failed', { status: 502 });
  }
}
