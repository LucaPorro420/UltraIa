import { createApiKey, listApiKeys, prisma, revokeApiKey } from '@ultraia/core';
import { z } from 'zod';
import { getBlueprintForUser } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({ agentId: z.string(), name: z.string().trim().max(100).optional() });

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

  const { key } = await createApiKey(prisma, parsed.data.agentId, parsed.data.name ?? 'default');
  return Response.json({ key });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const blueprint = await getBlueprintForUser(prisma, user.id, id);
  if (!blueprint) return new Response('Agent not found', { status: 404 });

  const keys = await listApiKeys(prisma, id);
  return Response.json(keys);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const keyId = new URL(req.url).searchParams.get('keyId');
  if (!keyId) return new Response('keyId query param required', { status: 400 });

  const blueprint = await getBlueprintForUser(prisma, user.id, id);
  if (!blueprint) return new Response('Agent not found', { status: 404 });

  const key = await prisma.apiKey.findFirst({ where: { id: keyId, blueprintId: id } });
  if (!key) return new Response('API key not found', { status: 404 });

  await revokeApiKey(prisma, keyId);
  return Response.json({ ok: true });
}

