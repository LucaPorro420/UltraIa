//! POST /api/content — generate derived content from sources (blog/video/social/thread).
import { z } from 'zod';
import { generateDerivedContent, generateBatch, ALL_CONTENT_SOURCES } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const GenerateSchema = z.object({
  sourceId: z.string().min(1),
  type: z.enum(['blog-post', 'video-script', 'social-caption', 'thread']),
  idioma: z.enum(['es', 'ar']).default('es'),
  dryRun: z.boolean().default(false),
});

const BatchSchema = z.object({
  sourceIds: z.array(z.string()).optional(),
  types: z.array(z.enum(['blog-post', 'video-script', 'social-caption', 'thread'])).min(1),
  idiomas: z.array(z.enum(['es', 'ar'])).default(['es']),
  dryRun: z.boolean().default(false),
});

export async function GET() {
  // List available sources
  const sources = ALL_CONTENT_SOURCES.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    level: s.level,
    topics: s.topics,
    chapters: s.chapters?.length ?? 0,
    lessons: s.lessons?.length ?? 0,
  }));
  return Response.json({ sources, total: sources.length });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // Batch mode
  if (Array.isArray(body.types) && body.types.length > 1) {
    const parsed = BatchSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

    const { sourceIds, types, idiomas, dryRun } = parsed.data;
    const sources = sourceIds
      ? ALL_CONTENT_SOURCES.filter((s) => sourceIds.includes(s.id))
      : ALL_CONTENT_SOURCES;

    if (sources.length === 0) {
      return Response.json({ error: 'No matching sources found' }, { status: 404 });
    }

    const result = generateBatch(sources, { types, idiomas, dryRun });
    return Response.json(result);
  }

  // Single mode
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sourceId, type, idioma, dryRun } = parsed.data;
  const source = ALL_CONTENT_SOURCES.find((s) => s.id === sourceId);
  if (!source) {
    return Response.json(
      { error: `Source not found: ${sourceId}. Available: ${ALL_CONTENT_SOURCES.map((s) => s.id).join(', ')}` },
      { status: 404 },
    );
  }

  const result = generateDerivedContent(source, { type, idioma, dryRun });
  return Response.json(result);
}
