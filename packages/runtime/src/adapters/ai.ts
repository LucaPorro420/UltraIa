import { AiUnavailableError, OpenAICompatibleGateway, resolveModel, type ProviderName } from '@ultraia/core';
import type { AiGatewayAdapter } from './ports';

/**
 * Adapter del gateway LLM para el runtime desktop.
 *
 * - Envuelve el gateway REAL de core (`OpenAICompatibleGateway` → `resolveModel()`).
 * - Aplica `ULTRAIA_PROVIDER` / `ULTRAIA_MODEL` SOLO si se proveen explícitamente: nunca
 *   sobrescribe valores ya presentes (mismo principio que el Installer con `.env`).
 * - `ping()` = intenta construir el modelo con `resolveModel` sin llamar a la API:
 *   - ollama/lmstudio → true sin claves (local, gratuito);
 *   - openai/google/deepseek sin key → el fallback local-first de core (#92) construye
 *     ollama/lmstudio sin red → true (el gateway SIEMPRE resuelve un modelo);
 *   - false solo si NI la cadena local puede construirse; nunca gasta tokens.
 */

export interface AiGatewayAdapterOptions {
  /** Proveedor (openai | google | ollama | lmstudio | deepseek). Default: env o 'ollama' en core. */
  provider?: ProviderName;
  /** Modelo explícito (default: `ULTRAIA_MODEL` o el default del proveedor en core). */
  model?: string;
}

export function createCoreAiGateway(options: AiGatewayAdapterOptions = {}): AiGatewayAdapter {
  if (options.provider !== undefined) {
    process.env.ULTRAIA_PROVIDER = options.provider;
  }
  if (options.model !== undefined) {
    process.env.ULTRAIA_MODEL = options.model;
  }

  const gateway = new OpenAICompatibleGateway();
  const provider = (options.provider ?? (process.env.ULTRAIA_PROVIDER as ProviderName | undefined) ?? 'ollama').toLowerCase() as ProviderName;

  return {
    kind: 'ai',
    name: 'ai',
    provider,
    model: options.model ?? process.env.ULTRAIA_MODEL,

    gateway,

    async ping(): Promise<boolean> {
      try {
        resolveModel(options.model ?? undefined);
        return true;
      } catch (error) {
        // AiUnavailableError = key faltante / proveedor no configurado → no está listo
        // cualquier otro error también → false (fail-safe, nunca lanza el ping)
        return error instanceof AiUnavailableError ? false : false;
      }
    },

    async close(): Promise<void> {
      // El gateway no mantiene conexiones propias; no-op idempotente.
    },
  };
}