//! OMAG Critics — quality evaluation for generated media.
// Four built-in critics: TemporalSync (audio-video alignment), Identity
// (entity persistence), Causal (event causality), Multimodal (cross-modality
// coherence). fuseCritiques merges scores with dynamic priority weights.
import type { MediaField } from './mediafield';
import type { GenerationResult } from './generators';
import { checkSynchronization } from './timeline';
import { WorldTransitionEngine } from './world';

export interface Critique {
  score: number;
  errors: Array<{ code: string; message: string; location?: string }>;
  recommendations: string[];
}

export interface CritiqueContext {
  field: MediaField;
  results: GenerationResult[];
}

export interface Critic {
  name: string;
  critique(ctx: CritiqueContext): Promise<Critique> | Critique;
}

export class TemporalSyncCritic implements Critic {
  name = 'temporal-sync';

  critique(ctx: CritiqueContext): Critique {
    const issues = checkSynchronization(ctx.field);
    const score = issues.length ? Math.max(0, 1 - issues.length * 0.25) : 1;
    return {
      score,
      errors: issues.map((i) => ({ code: i.code, message: i.message, location: i.location })),
      recommendations: issues.length ? ['Realign audio effect starts to their visual cause'] : [],
    };
  }
}

export class IdentityCritic implements Critic {
  name = 'identity';

  critique(ctx: CritiqueContext): Critique {
    const issues = WorldTransitionEngine.validateState(ctx.field);
    const ids = new Set(ctx.field.entities.map((e) => e.id));
    const dupes = ctx.field.entities.filter((e, i) => [...ids][i] !== e.id).length;
    const dangling = issues.filter((i) => i.code.startsWith('dangling'));
    const score = dangling.length ? Math.max(0, 1 - dangling.length * 0.33) : 1;
    return {
      score,
      errors: dangling.map((i) => ({ code: i.code, message: i.message, location: i.location })),
      recommendations: dangling.length ? ['Restore referenced entities or drop the dangling references'] : [],
    };
  }
}

export class CausalCritic implements Critic {
  name = 'causal';

  critique(ctx: CritiqueContext): Critique {
    const errors: Array<{ code: string; message: string; location?: string }> = [];
    for (const event of ctx.field.events) {
      if (!event.effects.length) {
        errors.push({
          code: 'event_without_effects',
          message: `Event ${event.id} (${event.type}) declares no causal effects`,
          location: event.id,
        });
      }
      if (event.start + event.duration <= event.start && event.duration > 0) {
        errors.push({ code: 'negative_span', message: `Event ${event.id} has invalid duration`, location: event.id });
      }
    }
    const score = errors.length ? Math.max(0, 1 - errors.length * 0.33) : 1;
    return {
      score,
      errors,
      recommendations: errors.length ? ['Declare at least one effect per event'] : [],
    };
  }
}

export class MultimodalCritic implements Critic {
  name = 'multimodal';

  critique(ctx: CritiqueContext): Critique {
    const planned = new Set(ctx.field.metadata.modalities as string[] | undefined ?? []);
    const produced = new Set(ctx.results.map((r) => r.metadata.modality as string | undefined).filter(Boolean));
    const missing = [...planned].filter((m) => !produced.has(m));
    const score = missing.length ? Math.max(0, 1 - missing.length * 0.4) : 1;
    return {
      score,
      errors: missing.map((m) => ({ code: 'missing_modality', message: `Planned modality not produced: ${m}`, location: m })),
      recommendations: missing.length ? [`Run generation for missing modalities: ${missing.join(', ')}`] : [],
    };
  }
}

export function defaultCritics(): Critic[] {
  return [new TemporalSyncCritic(), new IdentityCritic(), new CausalCritic(), new MultimodalCritic()];
}

export interface FusionWeights {
  base?: Record<string, number>;
  priorities?: Record<string, number>;
}

export interface FusionResult {
  overall: number;
  breakdown: Record<string, number>;
  errors: Array<{ critic: string; code: string; message: string; location?: string }>;
  recommendations: string[];
}

export function fuseCritiques(
  critiques: Array<{ name: string; critique: Critique }>,
  opts: FusionWeights = {},
): FusionResult {
  const base = opts.base ?? {};
  const priorities = opts.priorities ?? {};
  let totalWeight = 0;
  const breakdown: Record<string, number> = {};
  for (const { name, critique } of critiques) {
    const boost = Math.max(0, Math.min(3, priorities[name] ?? 1));
    const weight = (base[name] ?? 1) * boost;
    totalWeight += weight;
    breakdown[name] = critique.score;
  }
  const overall = totalWeight ? critiques.reduce((sum, { name, critique }) => sum + (breakdown[name] * (base[name] ?? 1) * Math.max(0, Math.min(3, priorities[name] ?? 1))) / totalWeight, 0) : 0;
  return {
    overall,
    breakdown,
    errors: critiques.flatMap(({ name, critique }) =>
      critique.errors.map((e) => ({ critic: name, ...e })),
    ),
    recommendations: [...new Set(critiques.flatMap((c) => c.critique.recommendations))],
  };
}