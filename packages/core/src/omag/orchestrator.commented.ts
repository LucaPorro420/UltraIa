/**
 * @file OmagOrchestrator.ts
 * @description Motor central del pipeline OMAG (Open Media Agent Graph).
 *              Orquesta: IDEA -> Plan Director -> MediaField -> Generadores -> Críticos -> Correction Loop.
 *              Sin entrenamiento: los generadores son render backends (keyless); el núcleo es el OS del mundo.
 *
 * [EN] Core engine of the OMAG pipeline (Open Media Agent Graph).
 *      Orchestrates: IDEA -> Director Plan -> MediaField -> Generators -> Critics -> Correction Loop.
 *      No training: generators are render backends (keyless); the core is the world OS.
 *
 * [ES] Motor central del pipeline OMAG (Open Media Agent Graph).
 *      Orquesta: IDEA -> Plan Director -> MediaField -> Generadores -> Críticos -> Correction Loop.
 *      Sin entrenamiento: los generadores son render backends (keyless); el núcleo es el OS del mundo.
 */

// ============================================================================
// IMPORTS
// ============================================================================
import type { AiGateway } from '../ai/gateway';                    // [EN] LLM gateway interface for Director plan generation.
                                                                   // [ES] Interfaz gateway LLM para generar plan Director.
import { adaptToMediaPlan, type DirectorPlan } from '../prompt/director'; // [EN] Converts raw idea into structured media plan via LLM.
                                                                         // [ES] Convierte idea cruda en plan de medios estructurado vía LLM.
import { loadTruthCorpus, searchTruth, type TruthFileLike } from '../tools/semantic-memory'; // [EN] SACD memory: verified truth corpus retrieval before planning.
                                                                                                // [ES] Memoria SACD: recuperación de corpus de verdad verificada antes de planear.
import { fuseCritiques, defaultCritics, type Critic } from './critics';   // [EN] Critic fusion with dynamic priority weights; built-in critics.
                                                                          // [ES] Fusión de críticas con pesos dinámicos por prioridad; críticos integrados.
import { createMediaField, type MediaField, type Modality } from './mediafield'; // [EN] MediaField schema (entities, relations, events, timeline, memories).
                                                                                  // [ES] Esquema MediaField (entidades, relaciones, eventos, timeline, memorias).
import { defaultGenerators, type Generator, type GenerationResult } from './generators'; // [EN] Keyless generator adapters (image, video, music, audio, VFX, design).
                                                                                          // [ES] Adapters generadores keyless (imagen, video, música, audio, VFX, diseño).
import { ErrorMemory, SceneMemory, CharacterMemory, StyleMemory, WorkingMemory, type MemoryHit } from './memory'; // [EN] Memory subsystems: working/scene/character/style/error.
                                                                                                                   // [ES] Subsistemas de memoria: working/scene/character/style/error.
import { alignEffectsToCause } from './timeline';                          // [EN] Resets effect delays to re-sync with causal events.
                                                                          // [ES] Resetea delays de efectos para resincronizar con eventos causales.

// ============================================================================
// TYPES / INTERFACES
// ============================================================================

/**
 * [EN] Input request for the OMAG pipeline.
 * [ES] Petición de entrada para el pipeline OMAG.
 */
export interface OmagRequest {
  /** [EN] The creative idea / prompt in natural language.
   *  [ES] La idea creativa / prompt en lenguaje natural. */
  idea: string;

  /** [EN] Quality tier controls critic threshold and generator steps.
   *       fast=0.5 / balanced=0.6 / high=0.75 (fusion.overall must exceed).
   *  [ES] Nivel de calidad controla umbral de críticos y pasos de generadores.
   *       fast=0.5 / balanced=0.6 / high=0.75 (fusion.overall debe superar). */
  quality?: 'fast' | 'balanced' | 'high';

  /** [EN] Modalities to generate (subset of image/audio/video/music).
   *       Default: all three visual+audio.
   *  [ES] Modalidades a generar (subconjunto de image/audio/video/music).
   *       Default: las tres visual+audio. */
  modalities?: Modality[];

  /** [EN] Maximum correction iterations (1..5). Default 5.
   *  [ES] Iteraciones máximas de corrección (1..5). Default 5. */
  maxIterations?: number;

  /** [EN] Optional custom AiGateway (for testing or specific provider).
   *  [ES] AiGateway opcional personalizado (para testing o proveedor específico). */
  gateway?: AiGateway;

  /** [EN] Experiential memory (SACD): verified truth corpus to query before planning.
   *       If provided, top-k hits are injected as memoryContext into the Director prompt.
   *  [ES] Memoria experiencial (SACD): corpus de verdad verificada para consultar antes de planear.
   *       Si se da, top-k hits se inyectan como memoryContext en el prompt Director. */
  memory?: {
    corpus: TruthFileLike[];
    hits?: number;   // [EN] Top-k hits to retrieve (default 3). [ES] Top-k hits a recuperar (default 3).
  };
}

/**
 * [EN] Result of a full OMAG run (accepted or rejected after max iterations).
 * [ES] Resultado de una ejecución OMAG completa (aceptada o rechazada tras max iteraciones).
 */
export interface OmagResult {
  /** [EN] Final MediaField (world state) after all iterations. [ES] MediaField final (estado del mundo) tras todas las iteraciones. */
  field: MediaField;
  /** [EN] Generation artifacts per modality from the last iteration. [ES] Artefactos de generación por modalidad de la última iteración. */
  results: GenerationResult[];
  /** [EN] Critic breakdown scores (per critic name -> 0..1). [ES] Desglose de puntuaciones de críticos (por nombre -> 0..1). */
  critiques: Record<string, number>;
  /** [EN] Number of iterations actually executed. [ES] Número de iteraciones ejecutadas realmente. */
  iterations: number;
  /** [EN] Fused overall score (0..1). [ES] Puntuación fusionada overall (0..1). */
  overall: number;
  /** [EN] True if fusion.overall >= quality threshold. [ES] True si fusion.overall >= umbral de calidad. */
  accepted: boolean;
  /** [EN] Actionable recommendations from critics for next iteration. [ES] Recomendaciones accionables de críticos para siguiente iteración. */
  recommendations: string[];
  /** [EN] Memory hits retrieved (undefined if request.memory not provided). [ES] Hits de memoria recuperados (undefined si no se dio request.memory). */
  memoryHits?: MemoryHit[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** [EN] Critic fusion thresholds per quality tier. Higher = stricter acceptance.
 *  [ES] Umbrales de fusión de críticos por nivel de calidad. Mayor = aceptación más estricta. */
const THRESHOLDS: Record<NonNullable<OmagRequest['quality']>, number> = {
  fast: 0.5,       // [EN] Low bar for quick iterations. [ES] Barra baja para iteraciones rápidas.
  balanced: 0.6,   // [EN] Default balanced quality. [ES] Calidad balanceada por defecto.
  high: 0.75,      // [EN] High bar for production-ready output. [ES] Barra alta para salida lista para producción.
};

/** [EN] Hard cap on correction loop iterations (prevents infinite loops).
 *  [ES] Límite duro de iteraciones del bucle de corrección (previene bucles infinitos). */
const MAX_ITERATIONS = 5;

// ============================================================================
// HELPER FUNCTIONS (module-scoped, not class methods)
// ============================================================================

/**
 * [EN] Convert a DirectorPlan into a MediaField (world initialization).
 *      Populates environment.scene, shots, style (visual/audio), camera, metadata.
 * [ES] Convierte un DirectorPlan en MediaField (inicialización del mundo).
 *       Pobla environment.scene, shots, style (visual/audio), camera, metadata.
 */
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

/**
 * [EN] Apply critic recommendations as field mutations before next iteration.
 *      Currently only handles alignment recommendations (resets effect delays).
 * [ES] Aplica recomendaciones de críticos como mutaciones de field antes de la siguiente iteración.
 *       Actualmente solo maneja recomendaciones de alineación (resetea delays de efectos). */
function applyFixes(field: MediaField, recommendations: string[]): MediaField {
  if (recommendations.some((r) => r.toLowerCase().includes('realign') || r.toLowerCase().includes('alignment'))) {
    alignEffectsToCause(field);
  }
  return field;
}

// ============================================================================
// MAIN CLASS: OmagOrchestrator
// ============================================================================

/**
 * [EN] OMAG Orchestrator: runs the full correction loop.
 *      Maintains 5 memory subsystems across iterations.
 *      Generators and Critics are injected (defaults provided) for testability.
 *
 * [ES] Orquestador OMAG: ejecuta el bucle completo de corrección.
 *      Mantiene 5 subsistemas de memoria entre iteraciones.
 *      Generadores y Críticos se inyectan (defaults proporcionados) para testeabilidad.
 */
export class OmagOrchestrator {
  // --- Memory subsystems (persist across iterations) ---
  readonly working = new WorkingMemory();    // [EN] Current field snapshot per iteration. [ES] Snapshot del field actual por iteración.
  readonly scenes = new SceneMemory();       // [EN] Scene descriptions indexed by world_id + time. [ES] Descripciones de escenas indexadas por world_id + time.
  readonly characters = new CharacterMemory(); // [EN] Entity identities remembered across runs. [ES] Identidades de entidades recordadas entre ejecuciones.
  readonly styles = new StyleMemory();       // [EN] Visual/audio style patterns merged each iteration. [ES] Patrones de estilo visual/audio fusionados cada iteración.
  readonly errors = new ErrorMemory();       // [EN] Generation/validation errors for learning. [ES] Errores de generación/validación para aprendizaje.

  /**
   * [EN] Construct orchestrator with custom or default generators/critics.
   * [ES] Construye orquestador con generadores/críticos personalizados o por defecto.
   */
  constructor(
    readonly generators: Generator[] = defaultGenerators(),
    readonly critics: Critic[] = defaultCritics(),
  ) {}

  /**
   * [EN] Execute the full OMAG pipeline for a request.
   *      Steps:
   *      1. Experiential memory lookup (SACD) -> memoryContext for Director.
   *      2. Director LLM call -> DirectorPlan.
   *      3. Plan -> MediaField (world init).
   *      4. Loop (1..maxIterations):
   *         a. Update working/style memories.
   *         b. Filter generators by requested modalities.
   *         c. Validate + prepare + generate each generator.
   *         d. Run all critics in parallel -> fuseCritiques.
   *         e. If overall >= threshold: accept, update memories, return.
   *         f. Else: record error, applyFixes, continue.
   *      5. If maxIterations reached without acceptance: return rejected result.
   *
   * [ES] Ejecuta el pipeline OMAG completo para una petición.
   *      Pasos:
   *      1. Búsqueda memoria experiencial (SACD) -> memoryContext para Director.
   *      2. Llamada Director LLM -> DirectorPlan.
   *      3. Plan -> MediaField (inicialización mundo).
   *      4. Bucle (1..maxIterations):
   *         a. Actualizar memorias working/style.
   *         b. Filtrar generadores por modalidades pedidas.
   *         c. Validar + preparar + generar cada generador.
   *         d. Ejecutar todos los críticos en paralelo -> fuseCritiques.
   *         e. Si overall >= umbral: aceptar, actualizar memorias, retornar.
   *         f. Sino: registrar error, applyFixes, continuar.
   *      5. Si se alcanza maxIterations sin aceptación: retornar resultado rechazado.
   */
  async run(request: OmagRequest): Promise<OmagResult> {
    // [EN] Clamp iterations to [1, MAX_ITERATIONS].
    // [ES] Clampear iteraciones a [1, MAX_ITERATIONS].
    const maxIterations = Math.max(1, request.maxIterations ?? MAX_ITERATIONS);
    const quality = request.quality ?? 'balanced';
    const threshold = THRESHOLDS[quality];

    // --- 1. Experiential Memory (SACD) ---
    let memoryHits: MemoryHit[] | undefined;
    let memoryContext = '';
    if (request.memory && request.memory.corpus.length > 0) {
      const docs = loadTruthCorpus(request.memory.corpus);
      memoryHits = searchTruth(docs, request.idea, request.memory.hits ?? 3);
      // [EN] Format hits as bullet list for Director prompt injection.
      // [ES] Formatear hits como lista de viñetas para inyección en prompt Director.
      memoryContext = memoryHits.map((h) => `- ${h.texto} => ${h.respuesta} (score ${h.score})`).join('\n');
      this.working.setHits(memoryHits);
    }

    // --- 2. Director Plan (LLM) ---
    const plan: DirectorPlan = await adaptToMediaPlan(request.idea, {
      gateway: request.gateway,
      memoryContext,
    });

    // --- 3. World Initialization ---
    let field = planToField(plan);
    field.metadata.modalities = request.modalities ?? (['image', 'video', 'music'] as Modality[]);
    if (memoryHits) field.metadata.memory = memoryHits;

    // --- 4. Correction Loop ---
    let results: GenerationResult[] = [];
    let fusion = fuseCritiques([]); // [EN] Empty fusion for iteration 0. [ES] Fusión vacía para iteración 0.
    let iterations = 0;

    for (iterations = 1; iterations <= maxIterations; iterations++) {
      // [EN] Memory updates at start of each iteration.
      // [ES] Actualizaciones de memoria al inicio de cada iteración.
      this.working.set(field);
      this.styles.merge(field.style);

      // [EN] Filter generators by requested modalities.
      // [ES] Filtrar generadores por modalidades solicitadas.
      const tasks = this.generators.filter((g) =>
        (field.metadata.modalities as string[]).includes(g.modality),
      );

      // [EN] Sequential validate/prepare/generate (generators may have side effects).
      // [ES] Validar/preparar/generar secuencial (generadores pueden tener side effects).
      const prepared = [];
      for (const generator of tasks) {
        const ctx = { field, constraints: { durationSec: field.constraints.durationSec ?? 5 }, quality };
        const problems = generator.validate(ctx);
        if (problems.length) {
          this.errors.record({ errorType: 'generator_validation', cause: problems[0], solution: 'fix media field before generation' });
          continue; // [EN] Skip this generator, continue with others. [ES] Saltar este generador, continuar con los otros.
        }
        await generator.prepare(ctx);
        const result = await generator.generate(ctx);
        result.metadata.modality = generator.modality;
        prepared.push(result);
      }
      results = prepared;

      // --- Critics (parallel) ---
      const critiques = await Promise.all(
        this.critics.map(async (critic) => ({ name: critic.name, critique: await critic.critique({ field, results }) })),
      );
      fusion = fuseCritiques(critiques);

      // [EN] Record scene for memory.
      // [ES] Registrar escena para memoria.
      this.scenes.push(field.world_id, String(field.environment.scene ?? ''), field.time);

      // --- Acceptance Check ---
      if (fusion.overall >= threshold) {
        // [EN] On success: remember entities for character continuity.
        // [ES] En éxito: recordar entidades para continuidad de personajes.
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

      // --- Rejection: record error + apply fixes for next iteration ---
      this.errors.record({
        errorType: 'critic_fusion',
        cause: fusion.errors.map((e) => e.message).join('; ') || 'below threshold',
        solution: 'apply fixes and regenerate',
      });
      if (iterations >= maxIterations) break;
      field = applyFixes(field, fusion.recommendations);
    }

    // --- Max iterations exhausted without acceptance ---
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