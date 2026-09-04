import { prisma, recordFeedback } from '@ultraia/core';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  conversationId: z.string(),
  messageSeq: z.number().int().positive(),
  rating: z.enum(['GOOD', 'BAD']),
  critique: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    include: { blueprint: true },
  });
  if (!conversation || conversation.blueprint.workspaceId !== user.workspaceId) {
    return new Response('Conversation not found', { status: 404 });
  }

  try {
    await recordFeedback(prisma, parsed.data);
  } catch (err) {
    return new Response('Feedback failed', { status: 400 });
  }
  return Response.json({ ok: true });
}
