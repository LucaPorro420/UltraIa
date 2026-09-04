//! POST /api/content/generate-due — batch generate content for all/selected sources.
import { z } from 'zod';
import { generateBatch, ALL_CONTENT_SOURCES } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const GenerateDueSchema = z.object({
  /** Specific source IDs to generate for. Empty = all. */
  sourceIds: z.array(z.string()).optional(),
  /** Types to generate. Default: all 4. */
  types: z
    .array(z.enum(['blog-post', 'video-script', 'social-caption', 'thread']))
    .default(['blog-post', 'video-script', 'social-caption', 'thread']),
  /** Idiomas. Default: ['es', 'ar']. */
  idiomas: z.array(z.enum(['es', 'ar'])).default(['es', 'ar']),
  /** Actually write files. Default: false (dry run). */
  write: z.boolean().default(false),
});

/**
 * POST /api/content/generate-due
 *
 * Batch content generation for all or selected sources.
 * Used by cerebro and manual triggers.
 * Auth: ADMIN or authenticated user.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = GenerateDueSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sourceIds, types, idiomas, write } = parsed.data;

  const sources = sourceIds
    ? ALL_CONTENT_SOURCES.filter((s) => sourceIds.includes(s.id))
    : ALL_CONTENT_SOURCES;

  if (sources.length === 0) {
    return Response.json({ error: 'No matching sources found' }, { status: 404 });
  }

  const result = await generateBatch(sources, {
    types,
    idiomas,
    dryRun: !write,
  });

  return Response.json({
    generated: result.totalFiles,
    totalWords: result.totalWords,
    sources: result.sources.map((s) => ({
      sourceId: s.sourceId,
      sourceTitle: s.sourceTitle,
      type: s.type,
      idioma: s.idioma,
      fileCount: s.files.length,
      words: s.files.reduce((sum, f) => sum + f.content.wordCount, 0),
    })),
    dryRun: !write,
  });
}
