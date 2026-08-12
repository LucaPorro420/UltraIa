import { prisma } from '@ultraia/core';
import { z } from 'zod';
import { getBlueprintForUser, getActiveVersion } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({ agentId: z.string() });

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

  const blueprint = await getBlueprintForUser(prisma, user.id, parsed.data.agentId);
  if (!blueprint) return new Response('Agent not found', { status: 404 });

  const active = await getActiveVersion(prisma, parsed.data.agentId);
  if (!active) return new Response('No active version', { status: 409 });

  const conversation = await prisma.conversation.create({
    data: { blueprintId: parsed.data.agentId, agentVersionId: active.id, title: 'Conversation' },
  });
  return Response.json({ conversationId: conversation.id });
}
