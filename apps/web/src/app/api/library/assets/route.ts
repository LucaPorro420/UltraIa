import { z } from 'zod';
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  url: z.string().url(),
  provider: z.enum(['pollinations', 'meigen']),
  model: z.string().max(50),
  seed: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  sourcePromptId: z.string().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const items = await prisma.generatedAsset.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return Response.json({ items });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const { prompt, url, provider, model, seed, width, height, sourcePromptId } = parsed.data;

  const asset = await prisma.generatedAsset.create({
    data: {
      userId: user.id,
      prompt,
      url,
      provider,
      model,
      seed: seed ?? null,
      width: width ?? 1024,
      height: height ?? 1024,
      sourcePromptId: sourcePromptId ?? null,
    },
  });

  if (sourcePromptId) {
    await prisma.promptLibrary.update({
      where: { id: sourcePromptId },
      data: { useCount: { increment: 1 } },
    });
  }

  return Response.json({ id: asset.id }, { status: 201 });
}