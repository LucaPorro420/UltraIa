import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';
import {
  prioritize,
  type PriorityExperiment,
  type Rule,
  type ModuleBottleneck,
} from '@ultraia/core';

/**
 * POST /api/prioritize
 * Ejecuta el motor de priorizacion estilo Meta-IA (capability `prioritize`).
 * Body: { experiments: PriorityExperiment[], rules?, bottlenecks? }
 * Devuelve PrioritizeResult (analyzedRules, weakRules, bottlenecks, ranked, best, libraryUpdate).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const raw = Array.isArray(body?.experiments) ? (body.experiments as unknown[]) : null;
    if (!raw || raw.length === 0) {
      return NextResponse.json({ error: 'Se requiere experiments[] (no vacio).' }, { status: 400 });
    }

    const experiments: PriorityExperiment[] = raw.map((e, i) => {
      const o = e as Record<string, unknown>;
      const name = typeof o.name === 'string' && o.name ? o.name : `Experimento ${i + 1}`;
      return {
        id: typeof o.id === 'string' && o.id ? o.id : `exp-${i + 1}`,
        objective: typeof o.objective === 'string' && o.objective ? o.objective : name,
        impact: Number(o.impact ?? 0.5),
        confidence: Number(o.confidence ?? 0.5),
        learningValue: Number(o.learningValue ?? 0.5),
        urgency: Number(o.urgency ?? 0.5),
        computeCost: Number(o.computeCost ?? 0.3),
        notes: typeof o.notes === 'string' ? o.notes : undefined,
      };
    });

    const rules: Rule[] = Array.isArray(body?.rules)
      ? (body.rules as unknown[]).map((r, i) => {
          const o = r as Record<string, unknown>;
          return {
            id: typeof o.id === 'string' && o.id ? o.id : `rule-${i + 1}`,
            description: typeof o.description === 'string' ? o.description : '',
            confidence: Number(o.confidence ?? 0.5),
            impact: Number(o.impact ?? 0.5),
          };
        })
      : [];

    const bottlenecks: ModuleBottleneck[] = Array.isArray(body?.bottlenecks)
      ? (body.bottlenecks as unknown[]).map((b, i) => {
          const o = b as Record<string, unknown>;
          return {
            module: typeof o.module === 'string' && o.module ? o.module : `module-${i + 1}`,
            impactGlobal: Number(o.impactGlobal ?? 0.5),
          };
        })
      : [];

    const result = prioritize.autoPrioritizeCycle({ experiments, rules, bottlenecks });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
