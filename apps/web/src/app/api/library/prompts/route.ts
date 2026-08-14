import { z } from 'zod';
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const CATEGORIES = [
  'Portrait',
  'Ads & Product',
  'Poster',
  'Illustration & 3D',
  'UI Design',
  'Video',
  'Wallpaper',
  'Branding',
  'Custom',
];

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base}-${Math.random().toString(16).slice(2, 10)}`;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const category = searchParams.get('category') || '';
  const onlyFavorites = searchParams.get('favorites') === '1';
  const cursor = searchParams.get('cursor') || undefined;
  const take = Math.min(Math.max(Number(searchParams.get('take')) || 24, 1), 100);

  const where = {
    ...(q
      ? {
          OR: [
            { prompt: { contains: q } },
            { tags: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(onlyFavorites ? { favorites: { some: { userId: user.id } } } : {}),
  };

  const [items, total, favoriteIds] = await Promise.all([
    prisma.promptLibrary.findMany({
      where,
      orderBy: [{ engagementRank: 'desc' }, { createdAt: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        prompt: true,
        category: true,
        tags: true,
        models: true,
        aspectRatio: true,
        imageUrl: true,
        sourceUrl: true,
        engagementRank: true,
        isUserSubmitted: true,
        useCount: true,
        createdAt: true,
      },
    }),
    prisma.promptLibrary.count({ where }),
    prisma.favoritePrompt.findMany({
      where: { userId: user.id },
      select: { promptId: true },
    }),
  ]);

  const favSet = new Set(favoriteIds.map((f) => f.promptId));
  const hasMore = items.length > take;
  const pageItems = hasMore ? items.slice(0, take) : items;

  return Response.json({
    items: pageItems.map((p) => ({ ...p, isFavorite: favSet.has(p.id) })),
    nextCursor: hasMore ? pageItems[pageItems.length - 1].id : null,
    total,
  });
}

const postSchema = z.object({
  prompt: z.string().min(20).max(4000),
  category: z.enum(CATEGORIES as [string, ...string[]]).default('Custom'),
  tags: z.array(z.string().max(30)).max(6).optional(),
  models: z.array(z.string().max(50)).max(4).optional(),
  aspectRatio: z.string().max(20).optional(),
  imageUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const { prompt, category, tags, models, aspectRatio, imageUrl } = parsed.data;

  const item = await prisma.promptLibrary.create({
    data: {
      slug: slugify(prompt),
      prompt,
      category,
      tags: JSON.stringify(tags || []),
      models: JSON.stringify(models || []),
      aspectRatio: aspectRatio || '1:1',
      imageUrl: imageUrl || null,
      isUserSubmitted: true,
      submitterId: user.id,
    },
  });

  return Response.json({ id: item.id }, { status: 201 });
}