import { OpenAICompatibleGateway, getLastEvalRun, prisma, runEvalRun } from '@ultraia/core';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({ agentVersionId: z.string() });

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

  const version = await prisma.agentVersion.findUnique({
    where: { id: parsed.data.agentVersionId },
    include: { blueprint: { include: { workspace: true } } },
  });
  if (!version || version.blueprint.workspace.ownerId !== user.id) {
    return new Response('Version not found', { status: 404 });
  }

  try {
    const summary = await runEvalRun(prisma, new OpenAICompatibleGateway(), {
      agentVersionId: parsed.data.agentVersionId,
    });
    return Response.json(summary);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Eval run failed', { status: 400 });
  }
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const agentVersionId = new URL(req.url).searchParams.get('agentVersionId');
  if (!agentVersionId) return new Response('agentVersionId query param required', { status: 400 });

  const version = await prisma.agentVersion.findUnique({
    where: { id: agentVersionId },
    include: { blueprint: { include: { workspace: true } } },
  });
  if (!version || version.blueprint.workspace.ownerId !== user.id) {
    return new Response('Version not found', { status: 404 });
  }
  const run = await getLastEvalRun(prisma, agentVersionId);
  return Response.json(run);
}
