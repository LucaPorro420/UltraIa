// orchestrator.ts — ModelOrchestrator: enrutamiento automatico de modelo + modo con failover.
//
// Objetivo (pedido del usuario): "un orquestador que te ayude a cambiar de modelo y modo
// automaticamente para usar esa estructura y evitar fallas o errores".
//
// - Cambia de MODELO: selecciona el endpoint (provider+model) segun la tarea, el tier y la
//   disponibilidad de claves, priorizando los modelos `:free` keyless de OpenRouter.
// - Cambia de MODO: el modo operacional (P-P/P-B/L-T/S-D) y la estrategia de chat
//   (concise/agentic/reasoning/creative) ajustan tanto la seleccion de modelo como el system
//   prompt inyectado, para no perder intencion al conmutar.
// - FAILOVER: `route()` y `withFailover()` prueban candidatos en orden; si uno falta (clave) o
//   falla en runtime, conmutan al siguiente. Nunca cuelga (usa el timeout global de modelFetch).
//
// Depende de `modelFor` (llm.ts) y `FREE_MODEL_CATALOG` (model-catalog.ts). Es deterministico
// y keyless-first: no hace llamadas de red para decidir.

import type { LanguageModel } from 'ai';
import { modelFor, type ProviderName } from './llm';
import { FREE_MODEL_CATALOG, type FreeModelSpec, type ModelTier } from './model-catalog';
import { AiUnavailableError } from './gateway';
import type { OperationalMode } from '../tools/autolearn';

export type ChatStrategy = 'concise' | 'agentic' | 'reasoning' | 'creative';

export type TaskType =
  | 'chat'
  | 'coding'
  | 'reasoning'
  | 'vision'
  | 'fast'
  | 'agent'
  | 'summarize'
  | 'translate';

export interface RouteRequest {
  /** Tipo de tarea (ajusta el tier por defecto). */
  taskType?: TaskType;
  /** Modo operacional UltraIa (P-P / P-B / L-T / S-D). */
  mode?: OperationalMode;
  /** Estrategia de chat (override del modo). */
  strategy?: ChatStrategy;
  /** Tier forzado. */
  tier?: ModelTier;
  /** Proveedor preferido (se prueba primero si tiene el tier). */
  preferredProvider?: ProviderName;
  /** Fuerza un modelo concreto (id). Si lleva '/' se asume OpenRouter. */
  model?: string;
  /** Fuerza un proveedor concreto (requiere `model`). */
  provider?: ProviderName;
}

interface Candidate {
  provider: ProviderName;
  model: string;
  spec?: FreeModelSpec;
}

const TIER_BY_TASK: Record<TaskType, ModelTier> = {
  chat: 'balanced',
  coding: 'coding',
  reasoning: 'reasoning',
  vision: 'vision',
  fast: 'fast',
  agent: 'reasoning',
  summarize: 'fast',
  translate: 'fast',
};

const TIER_BY_MODE: Partial<Record<OperationalMode, ModelTier>> = {
  'P-P': 'reasoning',
  'P-B': 'coding',
  'L-T': 'balanced',
  'S-D': 'reasoning',
};

const STRATEGY_BY_MODE: Record<OperationalMode, ChatStrategy> = {
  'P-P': 'reasoning',
  'P-B': 'agentic',
  'L-T': 'concise',
  'S-D': 'creative',
};

const STRATEGY_GUIDANCE: Record<ChatStrategy, string> = {
  concise: 'Responde de forma concisa y directa, sin rodeos innecesarios; ve al grano.',
  agentic:
    'Actúa como un agente ejecutor: pasos concretos, usa herramientas si están disponibles y verifica el resultado antes de afirmar éxito.',
  reasoning:
    'Razona paso a paso antes de responder: separa hipótesis, evidencia y conclusión; señala incertidumbre cuando la haya.',
  creative:
    'Prioriza originalidad y calidad de diseño; explora variaciones antes de decidir y justifica la elección.',
};

const KEY_ENV: Partial<Record<ProviderName, string>> = {
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  qwen: 'DASHSCOPE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  together: 'TOGETHER_API_KEY',
  huggingface: 'HUGGINGFACE_API_KEY',
};

export class ModelOrchestrator {
  private primaryProvider(): ProviderName {
    return (process.env.ULTRAIA_PROVIDER as ProviderName) || 'ollama';
  }

  /** Proveedores con clave presente (los locales ollama/lmstudio no la requieren). */
  availableProviders(): ProviderName[] {
    const out: ProviderName[] = ['ollama', 'lmstudio'];
    for (const [p, env] of Object.entries(KEY_ENV)) {
      if (env && process.env[env]) out.push(p as ProviderName);
    }
    return out;
  }

  /** Estrategia de chat derivada del modo (o explicita). */
  strategyForMode(mode?: OperationalMode, strategy?: ChatStrategy): ChatStrategy {
    return strategy ?? (mode ? STRATEGY_BY_MODE[mode] : undefined) ?? 'concise';
  }

  /** Construye el system prompt completo inyectando modo + estrategia. */
  buildSystemContext(req: RouteRequest, baseSystem = ''): string {
    const strategy = this.strategyForMode(req.mode, req.strategy);
    const modeLabel = req.mode ?? 'auto';
    const head = `[MODO: ${modeLabel} | ESTRATEGIA: ${strategy}]`;
    const parts = [baseSystem, `${head}\n${STRATEGY_GUIDANCE[strategy]}`].filter(Boolean);
    return parts.join('\n\n');
  }

  /** Lista ordenada de candidatos (provider+model) para una peticion. */
  candidatesFor(req: RouteRequest): Candidate[] {
    // 1) Forzado explicito
    if (req.provider && req.model) return [{ provider: req.provider, model: req.model }];
    if (req.model && !req.provider) {
      const provider: ProviderName = req.model.includes('/') ? 'openrouter' : this.primaryProvider();
      return [{ provider, model: req.model }];
    }

    // 2) Tier objetivo
    const tier: ModelTier =
      req.tier ||
      (req.mode ? TIER_BY_MODE[req.mode] : undefined) ||
      (req.taskType ? TIER_BY_TASK[req.taskType] : undefined) ||
      'balanced';

    let pool = FREE_MODEL_CATALOG.filter((m) => m.tier === tier);
    if (req.preferredProvider) pool = pool.filter((m) => m.provider === req.preferredProvider);

    const primary = this.primaryProvider();
    const sorted = [...pool].sort((a, b) => {
      // proveedor primario primero, luego keyless, luego mayor contexto
      const pa = a.provider === primary ? 0 : 1;
      const pb = b.provider === primary ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (a.keyless !== b.keyless) return a.keyless ? -1 : 1;
      return b.contextTokens - a.contextTokens;
    });

    const candidates: Candidate[] = sorted.map((m) => ({ provider: m.provider, model: m.id, spec: m }));

    // 3) Fallback keyless si el tier no tuvo coincidencias
    if (!candidates.length) {
      const keyless = [...FREE_MODEL_CATALOG.filter((m) => m.keyless)].sort(
        (a, b) => b.contextTokens - a.contextTokens,
      );
      candidates.push(...keyless.map((m) => ({ provider: m.provider, model: m.id, spec: m })));
    }

    // 4) Fallback local (siempre disponible sin clave) al final de la cadena de failover
    if (!req.preferredProvider) {
      candidates.push({ provider: 'ollama', model: 'llama3.1' });
      candidates.push({ provider: 'lmstudio', model: 'qwen2.5-7b-instruct' });
    }

    return candidates;
  }

  /** Recomienda el primer candidato (para logging/transparencia) sin ejecutar nada. */
  recommend(req: RouteRequest = {}): { provider: ProviderName; model: string; tier: ModelTier } {
    const c = this.candidatesFor(req)[0];
    return { provider: c.provider, model: c.model, tier: c.spec?.tier ?? 'balanced' };
  }

  /**
   * Resuelve un LanguageModel para la peticion, conmutando entre candidatos hasta encontrar
   * uno construible (clave presente). Lanza AiUnavailableError solo si ninguno sirve.
   */
  async route(req: RouteRequest = {}): Promise<LanguageModel> {
    const candidates = this.candidatesFor(req);
    let lastErr: unknown;
    for (const c of candidates) {
      try {
        return modelFor(c.provider, c.model);
      } catch (e) {
        if (e instanceof AiUnavailableError) {
          lastErr = e;
          continue;
        }
        throw e;
      }
    }
    throw lastErr ?? new AiUnavailableError('Orchestrator: no hay endpoint de modelo disponible');
  }

  /**
   * Ejecuta `fn(model)` con failover automatico: si el modelo construible falla en runtime
   * (timeout, 4xx/5xx, network), conmuta al siguiente candidato. Garantiza "evitar fallas".
   */
  async withFailover<T>(
    fn: (model: LanguageModel) => Promise<T>,
    req: RouteRequest = {},
  ): Promise<T> {
    const candidates = this.candidatesFor(req);
    let lastErr: unknown;
    for (const c of candidates) {
      let model: LanguageModel;
      try {
        model = modelFor(c.provider, c.model);
      } catch (e) {
        if (e instanceof AiUnavailableError) {
          lastErr = e;
          continue;
        }
        throw e;
      }
      try {
        return await fn(model);
      } catch (e) {
        lastErr = e;
        // failover al siguiente candidato
      }
    }
    throw lastErr ?? new AiUnavailableError('Orchestrator: todos los endpoints fallaron');
  }
}

export function createOrchestrator(): ModelOrchestrator {
  return new ModelOrchestrator();
}

export const orchestrator = createOrchestrator();
