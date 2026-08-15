import { OmagOrchestrator, type OmagRequest, type OmagResult } from '@ultraia/core';
import type { Critic, Generator } from '@ultraia/core';
import type { AiGatewayAdapter, OmagAdapter } from './ports';

/**
 * Adapter de OMAG (sistema operativo de mundo multimedia) para el runtime desktop.
 *
 * - Envuelve `OmagOrchestrator` de core con los generadores/críticos default (keyless).
 * - `run()` inyecta el `gateway` del ai adapter si está presente → el Director usa el LLM
 *   configurado; sin gateway degrada a plan local determinista (ver `adaptToMediaPlan`).
 * - `ping()` siempre true: OMAG es keyless por diseño (pollinations, edge-tts, Tunetank,
 *   storyboard, composición, síntesis procedural).
 */

export interface OmagAdapterOptions {
  /** Ai adapter (opcional): su gateway se inyecta al orquestador para el planning con LLM. */
  ai?: AiGatewayAdapter;
  /** Generadores custom (default: `defaultGenerators()` de core). */
  generators?: Generator[];
  /** Críticos custom (default: `defaultCritics()` de core). */
  critics?: Critic[];
}

export type OmagRunInput = Omit<OmagRequest, 'gateway'>;

export function createOmagAdapter(options: OmagAdapterOptions = {}): OmagAdapter {
  const orchestrator = new OmagOrchestrator(options.generators, options.critics);

  return {
    kind: 'omag',
    name: 'omag',
    orchestrator,

    async run(request: OmagRunInput): Promise<OmagResult> {
      return orchestrator.run({
        ...request,
        gateway: options.ai?.gateway,
      });
    },

    async ping(): Promise<boolean> {
      return true;
    },

    async close(): Promise<void> {
      // El orquestador no mantiene conexiones; no-op idempotente.
    },
  };
}