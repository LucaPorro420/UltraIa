//! POST /api/omag — OMAG world engine generation (idea → plan → media → critics).
import { z } from 'zod';
import { OmagOrchestrator } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  idea: z.string().min(1).max(4000),
  quality: z.enum(['fast', 'balanced', 'high']).optional(),
  modalities: z.array(z.enum(['image', 'audio', 'video', 'music'])).min(1).max(4).optional(),
  maxIterations: z.number().int().min(1).max(5).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  try {
    const orchestrator = new OmagOrchestrator();
    const result = await orchestrator.run(parsed.data);
    return Response.json({
      accepted: result.accepted,
      iterations: result.iterations,
      overall: result.overall,
      critiques: result.critiques,
      recommendations: result.recommendations,
      field: result.field,
      results: result.results.map((r) => ({
        modality: r.metadata.modality,
        provenance: r.provenance,
        confidence: r.confidence,
        inspect: orchestrator.generators.find((g) => g.modality === r.metadata.modality)?.inspect(r) ?? r.metadata,
      })),
    });
  } catch (e) {
    return new Response((e as Error).message || 'OMAG pipeline failed', { status: 502 });
  }
}