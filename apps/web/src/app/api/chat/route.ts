import { chatStream, guardrailsBlock, prisma, AiUnavailableError } from '@ultraia/core';
import { z } from 'zod';
import { getBlueprintForUser, getActiveVersion } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  agentId: z.string(),
  conversationId: z.string(),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(16000) }))
    .min(1)
    .max(50),
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
  const { agentId, conversationId, messages } = parsed.data;

  const blueprint = await getBlueprintForUser(prisma, user.id, agentId);
  if (!blueprint) return new Response('Agent not found', { status: 404 });

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.blueprintId !== agentId) {
    return new Response('Conversation not found', { status: 404 });
  }

  const version = await getActiveVersion(prisma, agentId);
  if (!version) return new Response('No active version for this agent', { status: 409 });

  const tools = JSON.parse(version.tools) as string[];
  const guardrails = JSON.parse(version.guardrails) as string[];
  const lastUserText =
    [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  let result;
  try {
    result = chatStream({
      model: version.model,
      system: version.systemPrompt + guardrailsBlock(guardrails),
      messages,
      tools,
      onFinish: async ({ text }) => {
        const count = await prisma.message.count({ where: { conversationId } });
        const userSeq = count + 1;
        await prisma.message.createMany({
          data: [
            { conversationId, sequence: userSeq, role: 'user', content: lastUserText },
            { conversationId, sequence: userSeq + 1, role: 'assistant', content: text },
          ],
        });
        if (userSeq === 1) {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: lastUserText.slice(0, 60) },
          });
        }
      },
    });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return new Response(e.message, { status: 503 });
    }
    throw e;
  }

  return result.toDataStreamResponse();
}
