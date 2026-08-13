import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { blueprint: true },
  });
  if (!conversation || conversation.blueprint.workspaceId !== user.workspaceId) {
    return new Response('Conversation not found', { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { sequence: 'asc' },
  });
  return Response.json(
    messages.map((m) => ({ id: m.id, role: m.role, content: m.content, sequence: m.sequence })),
  );
}
