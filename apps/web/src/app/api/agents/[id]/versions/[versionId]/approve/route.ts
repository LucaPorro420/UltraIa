import { OpenAICompatibleGateway, decideAndPromoteVersion, prisma, rejectVersion } from '@ultraia/core';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({ versionId: z.string(), force: z.boolean().optional() });

async function ownsVersion(user: { id: string }, versionId: string): Promise<boolean> {
  const version = await prisma.agentVersion.findUnique({
    where: { id: versionId },
    include: { blueprint: { include: { workspace: true } } },
  });
  return Boolean(version && version.blueprint.workspace.ownerId === user.id);
}

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

  if (!(await ownsVersion(user, parsed.data.versionId))) {
    return new Response('Version not found', { status: 404 });
  }

  try {
    const outcome = await decideAndPromoteVersion(prisma, new OpenAICompatibleGateway(), {
      proposedVersionId: parsed.data.versionId,
      force: parsed.data.force,
    });
    return Response.json(outcome);
  } catch (err) {
    return new Response('Approval failed', { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const versionId = new URL(req.url).searchParams.get('versionId');
  if (!versionId) return new Response('versionId query param required', { status: 400 });

  if (!(await ownsVersion(user, versionId))) {
    return new Response('Version not found', { status: 404 });
  }
  await rejectVersion(prisma, versionId);
  return Response.json({ ok: true });
}
