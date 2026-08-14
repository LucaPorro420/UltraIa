import { z } from 'zod';
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  promptId: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  const existing = await prisma.favoritePrompt.findUnique({
    where: { userId_promptId: { userId: user.id, promptId: parsed.data.promptId } },
  });
  if (existing) {
    await prisma.favoritePrompt.delete({ where: { id: existing.id } });
    return Response.json({ favorite: false });
  }

  await prisma.favoritePrompt.create({
    data: { userId: user.id, promptId: parsed.data.promptId },
  });
  return Response.json({ favorite: true });
}