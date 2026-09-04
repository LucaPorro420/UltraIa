//! POST/DELETE /api/library/assets — save/remove generated assets to library + cloud.
import { z } from 'zod';
import { buildSavePlan, prisma, assertPublicUrl } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { effectiveExt, getStudioCloud } from '@/lib/server/studio-assets';

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  url: z.string().min(1).max(2048),
  provider: z.string().min(1).max(50),
  model: z.string().max(80).default(''),
  mediaType: z.enum(['image', 'audio', 'video', 'music', 'tts', 'design', 'text']).default('image'),
  seed: z.number().int().optional(),
  width: z.number().int().positive().max(8192).optional(),
  height: z.number().int().positive().max(8192).optional(),
  sourcePromptId: z.string().optional(),
  parentId: z.string().min(1).max(64).optional(),
  meta: z.record(z.unknown()).optional(),
  /** Studio v2: descargar el binario server-side y guardarlo durable en el cloud. */
  saveBinary: z.boolean().optional(),
});

/** GET /api/library/assets?mediaType=image,video&take=50 — "Mis creaciones" multi-media. */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const mediaTypes = (searchParams.get('mediaType') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const take = Math.min(Math.max(Number(searchParams.get('take')) || 100, 1), 100);

  const items = await prisma.generatedAsset.findMany({
    where: {
      userId: user.id,
      ...(mediaTypes.length > 0 ? { mediaType: { in: mediaTypes } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return Response.json({ items });
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const {
    prompt,
    url,
    provider,
    model,
    mediaType,
    seed,
    width,
    height,
    sourcePromptId,
    parentId,
    meta,
    saveBinary,
  } = parsed.data;

  const planResult = buildSavePlan({ prompt, url, provider, model, mediaType, seed });
  if (!planResult.ok) return Response.json({ errors: planResult.errors }, { status: 400 });
  const plan = planResult.plan;

  // Persistencia durable: bajar el binario y subirlo al cloud (R2 o local).
  let storage = 'external';
  let cloudPath: string | null = null;
  if (saveBinary) {
    try {
      assertPublicUrl(url); // H08: SSRF guard
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} al descargar el binario`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const ext = effectiveExt(url, res.headers.get('content-type') ?? undefined);
      const cloud = getStudioCloud();
      const saved = await cloud.upload(`${plan.fileName}.${ext}`, bytes, plan.cloudDir);
      storage = 'cloud';
      cloudPath = saved.path;
    } catch {
      // Fail-soft: la URL externa sigue siendo válida como fallback.
      storage = 'external';
    }
  }

  const asset = await prisma.generatedAsset.create({
    data: {
      userId: user.id,
      prompt,
      url: storage === 'cloud' && cloudPath ? `/api/assets/placeholder` : url,
      provider,
      model,
      seed: seed ?? null,
      width: width ?? 1024,
      height: height ?? 1024,
      sourcePromptId: sourcePromptId ?? null,
      parentId: parentId ?? null,
      storage,
      cloudPath,
      metaJson: meta ? JSON.stringify(meta) : null,
    },
  });

  // Canonical URL servida por nuestra API cuando hay binario durable.
  if (storage === 'cloud') {
    await prisma.generatedAsset.update({ where: { id: asset.id }, data: { url: `/api/assets/${asset.id}` } });
  }

  if (sourcePromptId) {
    await prisma.promptLibrary.update({
      where: { id: sourcePromptId },
      data: { useCount: { increment: 1 } },
    }).catch(() => undefined);
  }

  return Response.json(
    { id: asset.id, storage, cloudPath, parentId: parentId ?? null },
    { status: 201 },
  );
}
