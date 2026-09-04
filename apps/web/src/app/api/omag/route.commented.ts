/**
 * @file route.ts
 * @description API endpoint POST /api/omag — Single entry point for the entire OMAG pipeline.
 *              Auth required (session cookie or x-ultraia-session header). Zod-validated input.
 *              Returns accepted/rejected result with field, artifacts, critiques, recommendations.
 *
 * [EN] API endpoint POST /api/omag — Single entry point for the entire OMAG pipeline.
 *      Auth required (session cookie or x-ultraia-session header). Zod-validated input.
 *      Returns accepted/rejected result with field, artifacts, critiques, recommendations.
 *
 * [ES] Endpoint API POST /api/omag — Punto de entrada único para todo el pipeline OMAG.
 *      Auth requerido (cookie de sesión o header x-ultraia-session). Entrada validada con Zod.
 *      Devuelve resultado aceptado/rechazado con field, artefactos, críticas, recomendaciones.
 */

// ============================================================================
// IMPORTS
// ============================================================================
import { z } from 'zod';                                           // [EN] Runtime schema validation.
                                                                      // [ES] Validación de esquema en runtime.
import { OmagOrchestrator } from '@ultraia/core';                   // [EN] OMAG pipeline orchestrator (correction loop, generators, critics).
                                                                      // [ES] Orquestador pipeline OMAG (bucle de corrección, generadores, críticos).
import { getCurrentUser } from '@/lib/server/context';              // [EN] Server-side auth: reads session from cookie or x-ultraia-session header.
                                                                      // [ES] Auth server-side: lee sesión de cookie o header x-ultraia-session.

// ============================================================================
// REQUEST SCHEMA (Zod)
// ============================================================================

/** [EN] Validated request body for OMAG pipeline.
 *  [ES] Body de petición validado para pipeline OMAG. */
const bodySchema = z.object({
  /** [EN] Creative idea / prompt (1..4000 chars). [ES] Idea creativa / prompt (1..4000 chars). */
  idea: z.string().min(1).max(4000),

  /** [EN] Quality tier: fast (0.5), balanced (0.6), high (0.75). Default: balanced.
   *  [ES] Nivel de calidad: fast (0.5), balanced (0.6), high (0.75). Default: balanced. */
  quality: z.enum(['fast', 'balanced', 'high']).optional(),

  /** [EN] Modalities to generate (1..4). Default: image, video, music.
   *  [ES] Modalidades a generar (1..4). Default: image, video, music. */
  modalities: z.array(z.enum(['image', 'audio', 'video', 'music'])).min(1).max(4).optional(),

  /** [EN] Max correction iterations (1..5). Default: 5.
   *  [ES] Iteraciones máximas de corrección (1..5). Default: 5. */
  maxIterations: z.number().int().min(1).max(5).optional(),
});

// ============================================================================
// ROUTE HANDLER
// ============================================================================

/**
 * [EN] POST /api/omag — Execute OMAG pipeline for authenticated user.
 * [ES] POST /api/omag — Ejecuta pipeline OMAG para usuario autenticado. */
export async function POST(req: Request) {
  // --- Auth: session cookie or x-ultraia-session header ---
  const user = await getCurrentUser();                              // [EN] Reads session from cookie 'ultraia_session' or header 'x-ultraia-session' / 'Authorization: Bearer'.
                                                                      // [ES] Lee sesión de cookie 'ultraia_session' o header 'x-ultraia-session' / 'Authorization: Bearer'.
  if (!user) return new Response('Unauthorized', { status: 401 });  // [EN] No valid session -> 401. [ES] Sin sesión válida -> 401.

  // --- Validate input ---
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 }); // [EN] Zod validation failed -> 400. [ES] Validación Zod falló -> 400.

  try {
    // --- Run OMAG pipeline ---
    const orchestrator = new OmagOrchestrator();                     // [EN] Default generators (keyless: pollinations/meigen, storyboard, composition, edge-tts) + default critics.
                                                                      // [ES] Generadores por defecto (keyless: pollinations/meigen, storyboard, composición, edge-tts) + críticos por defecto.
    const result = await orchestrator.run(parsed.data);

    // --- Map results to response shape (include inspect per modality) ---
    return Response.json({
      accepted: result.accepted,
      iterations: result.iterations,
      overall: result.overall,
      critiques: result.critiques,                                  // [EN] Critic breakdown scores (name -> 0..1). [ES] Desglose de puntuaciones de críticos (nombre -> 0..1).
      recommendations: result.recommendations,                      // [EN] Actionable fixes for next iteration. [ES] Fixes accionables para siguiente iteración.
      field: result.field,                                          // [EN] Full MediaField (world state) — entities, relations, events, timeline, memories. [ES] MediaField completo (estado del mundo) — entidades, relaciones, eventos, timeline, memorias.
      results: result.results.map((r) => ({
        modality: r.metadata.modality,
        provenance: r.provenance,                                   // [EN] e.g. "image:meigen:gpt-image-2" or "video:keyless:storyboard". [ES] ej. "image:meigen:gpt-image-2" o "video:keyless:storyboard".
        confidence: r.confidence,                                   // [EN] Generator's self-reported confidence (0..1). [ES] Confianza auto-reportada del generador (0..1).
        // [EN] Generator-specific inspect (URLs, metadata) via orchestrator.generators.find.
        // [ES] Inspect específico del generador (URLs, metadata) vía orchestrator.generators.find.
        inspect: orchestrator.generators.find((g) => g.modality === r.metadata.modality)?.inspect(r) ?? r.metadata,
      })),
    });
  } catch (e) {
    // [EN] Any pipeline error -> 502 Bad Gateway (upstream failure).
    // [ES] Cualquier error del pipeline -> 502 Bad Gateway (fallo upstream).
    return new Response((e as Error).message || 'OMAG pipeline failed', { status: 502 });
  }
}