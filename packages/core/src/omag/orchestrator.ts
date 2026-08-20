import type { AiGateway } from '../ai/gateway';
import { adaptToMediaPlan, type DirectorPlan } from '../prompt/director';
import { loadTruthCorpus, searchTruth, type TruthFileLike } from '../tools/semantic-memory';
import { fuseCritiques, defaultCritics, type Critic } from './critics';
import { createMediaField, type MediaField, type Modality } from './mediafield';
import { defaultGenerators, type Generator, type GenerationResult } from './generators';
import { ErrorMemory, SceneMemory, CharacterMemory, StyleMemory, WorkingMemory, type MemoryHit } from './memory';
import { alignEffectsToCause } from './timeline';

export interface OmagRequest {
  idea: string;
  quality?: 'fast' | 'balanced' | 'high';
  modalities?: Modality[];
  maxIterations?: number;
  gateway?: AiGateway;
  /** Memoria experiencial: corpus de verdad verificada para consultar antes de planear. */
  memory?: {
    corpus: TruthFileLike[];
    hits?: number;
  };
}

export interface OmagResult {
  field: MediaField;
  results: GenerationResult[];
  critiques: Record<string, number>;
  iterations: number;
  overall: number;
  accepted: boolean;
  recommendations: string[];
  /** Hits de memoria experiencial recuperados (ausente si request.memory no se dio). */
  memoryHits?: MemoryHit[];
}

const THRESHOLDS: Record<NonNullable<OmagRequest['quality']>, number> = {
  fast: 0.5,
  balanced: 0.6,
  high: 0.75,
};

const MAX_ITERATIONS = 5;

function planToField(plan: DirectorPlan): MediaField {
  const field = createMediaField();
  field.environment.scene = plan.script || plan.images[0] || 'a cinematic scene';
  field.environment.shots = plan.shots;
  field.style.visual = { style: plan.style, motion: plan.motion, motions: plan.motions };
  field.style.audio = plan.bgm ? { music: plan.bgm } : {};
  field.camera.movement = plan.motion;
  field.metadata.plan = {
    language: plan.language,
    languageName: plan.languageName,
    shots: plan.shots,
    motions: plan.motions,
  };
  return field;
}

function applyFixes(field: MediaField, recommendations: string[]): MediaField {
  if (recommendations.some((r) => r.toLowerCase().includes('realign') || r.toLowerCase().includes('alignment'))) {
    alignEffectsToCause(field);
  }
  return field;
}

export class OmagOrchestrator {
  readonly working = new WorkingMemory();
  readonly scenes = new SceneMemory();
  readonly characters = new CharacterMemory();
  readonly styles = new StyleMemory();
  readonly errors = new ErrorMemory();

  constructor(
    readonly generators: Generator[] = defaultGenerators(),
    readonly critics: Critic[] = defaultCritics(),
  ) {}

  async run(request: OmagRequest): Promise<OmagResult> {
    const maxIterations = Math.max(1, request.maxIterations ?? MAX_ITERATIONS);
    const quality = request.quality ?? 'balanced';
    const threshold = THRESHOLDS[quality];

    // Memoria experiencial (SACD): consultar la verdad verificada antes de planear.
    let memoryHits: MemoryHit[] | undefined;
    let memoryContext = '';
    if (request.memory && request.memory.corpus.length > 0) {
      const docs = loadTruthCorpus(request.memory.corpus);
      memoryHits = searchTruth(docs, request.idea, request.memory.hits ?? 3);
      memoryContext = memoryHits.map((h) => `- ${h.texto} => ${h.respuesta} (score ${h.score})`).join('\n');
      this.working.setHits(memoryHits);
    }

    const plan: DirectorPlan = await adaptToMediaPlan(request.idea, {
      gateway: request.gateway,
      memoryContext,
    });
    let field = planToField(plan);
    field.metadata.modalities = request.modalities ?? (['image', 'video', 'music'] as Modality[]);
    if (memoryHits) field.metadata.memory = memoryHits;

    let results: GenerationResult[] = [];
    let fusion = fuseCritiques([]);
    let iterations = 0;

    for (iterations = 1; iterations <= maxIterations; iterations++) {
      this.working.set(field);
      this.styles.merge(field.style);

      const tasks = this.generators.filter((g) =>
        (field.metadata.modalities as string[]).includes(g.modality),
      );
      const prepared = [];
      for (const generator of tasks) {
        const ctx = { field, constraints: { durationSec: field.constraints.durationSec ?? 5 }, quality };
        const problems = generator.validate(ctx);
        if (problems.length) {
          this.errors.record({ errorType: 'generator_validation', cause: problems[0], solution: 'fix media field before generation' });
          continue;
        }
        await generator.prepare(ctx);
        const result = await generator.generate(ctx);
        result.metadata.modality = generator.modality;
        prepared.push(result);
      }
      results = prepared;

      const critiques = await Promise.all(
        this.critics.map(async (critic) => ({ name: critic.name, critique: await critic.critique({ field, results }) })),
      );
      fusion = fuseCritiques(critiques);
      this.scenes.push(field.world_id, String(field.environment.scene ?? ''), field.time);

      if (fusion.overall >= threshold) {
        for (const entity of field.entities) this.characters.remember(entity);
        return {
          field,
          results,
          critiques: fusion.breakdown,
          iterations,
          overall: fusion.overall,
          accepted: true,
          recommendations: fusion.recommendations,
          memoryHits,
        };
      }

      this.errors.record({
        errorType: 'critic_fusion',
        cause: fusion.errors.map((e) => e.message).join('; ') || 'below threshold',
        solution: 'apply fixes and regenerate',
      });
      if (iterations >= maxIterations) break;
      field = applyFixes(field, fusion.recommendations);
    }

    return {
      field,
      results,
      critiques: fusion.breakdown,
      iterations,
      overall: fusion.overall,
      accepted: false,
      recommendations: fusion.recommendations,
      memoryHits,
    };
  }
}