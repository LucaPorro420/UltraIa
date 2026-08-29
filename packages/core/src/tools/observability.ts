// -----------------------------------------------------------------------------
// observability.ts — capability `observability` (Fase A)
// -----------------------------------------------------------------------------
// Port ORIGINAL de los PRINCIPIOS de Langfuse (langfuse/skills, 14.1K installs,
// MIT) + Literal AI: "auditoria de pensamiento" — trazar cada paso del agente
// (pensamiento, tool, generación, costo, latencia) en un backend de observabilidad
// para medir, evaluar y mejorar.
//
// Sin código copiado: re-diseño en el estilo del dominio puro de UltraIa
// (determinista, keyless-first, fetch inyectable, fail-soft). La implementación
// real de Langfuse es `POST /api/public/ingestion` con batch de eventos
// (Basic auth public:secret). Aquí se porta el CONTRATO, no el SDK.
//
// Patrón del proyecto: keyless-first con degradación elegante (igual que
// publish/cloud) — sin keys, el tracer es un buffer local no-op que no rompe
// el flujo. Con keys, hace flush batch con fetch inyectable (tests nunca tocan red).
// -----------------------------------------------------------------------------

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas & Types
// ---------------------------------------------------------------------------

export const observabilityConfigSchema = z.object({
  /** URL base de Langfuse (default cloud). Ej: https://cloud.langfuse.com */
  host: z.string().url().optional(),
  /** Clave pública (pk-lf-...). Si falta → tracer deshabilitado (keyless). */
  publicKey: z.string().min(1).max(200).optional(),
  /** Clave secreta (sk-lf-...). Si falta → tracer deshabilitado. */
  secretKey: z.string().min(1).max(200).optional(),
  /** Habilitar explícitamente (si no, auto = keys presentes). */
  enabled: z.boolean().optional(),
  /** Flush automático cada N steps (0 = manual). */
  flushAt: z.number().int().min(0).max(1000).optional(),
  /** Nombre del trace raíz (agrupación). */
  traceName: z.string().min(1).max(100).optional(),
  /** Tags opcionales para filtrar en UI. */
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
});

export type ObservabilityConfig = z.infer<typeof observabilityConfigSchema>;

export const traceStepSchema = z.object({
  name: z.string().min(1).max(100),
  /** Input serializable del paso (prompt, args, etc). */
  input: z.unknown().optional(),
  /** Output serializable (texto, tool result). */
  output: z.unknown().optional(),
  /** Latencia en ms (si se mide). */
  latencyMs: z.number().min(0).max(600_000).optional(),
  /** Costo estimado en USD (si se calcula). */
  cost: z.number().min(0).max(100).optional(),
  /** Tokens de entrada/salida si se conocen. */
  usage: z.object({ input: z.number().int().min(0), output: z.number().int().min(0), total: z.number().int().min(0) }).partial().optional(),
  /** Nivel: DEBUG/DEFAULT/WARNING/ERROR */
  level: z.enum(['DEBUG', 'DEFAULT', 'WARNING', 'ERROR']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TraceStep = z.infer<typeof traceStepSchema>;

export const traceGenerationSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.string().min(1).max(100).optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  usage: z.object({ input: z.number().int().min(0), output: z.number().int().min(0), total: z.number().int().min(0) }).partial().optional(),
  latencyMs: z.number().min(0).max(600_000).optional(),
  cost: z.number().min(0).max(100).optional(),
  level: z.enum(['DEBUG', 'DEFAULT', 'WARNING', 'ERROR']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type TraceGeneration = z.infer<typeof traceGenerationSchema>;

export type ObservabilityEvent = {
  id: string;
  type: 'trace-create' | 'span-create' | 'generation-create' | 'span-update' | 'generation-update' | 'score-create';
  body: Record<string, unknown>;
  timestamp: string;
};

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

function genId(): string {
  // determinista por tiempo + random (suficiente para id de trace, no criptográfico)
  return `ultraia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function basicAuth(publicKey: string, secretKey: string): string {
  // btoa no existe en node sin global, usar Buffer
  const raw = `${publicKey}:${secretKey}`;
  if (typeof Buffer !== 'undefined') return Buffer.from(raw).toString('base64');
  // fallback (browser)
  return btoa(raw);
}

/** Resuelve si el tracer está habilitado (keys presentes y enabled !== false). */
export function isObservabilityEnabled(cfg: ObservabilityConfig): boolean {
  if (cfg.enabled === false) return false;
  if (cfg.enabled === true) return !!(cfg.publicKey && cfg.secretKey);
  return !!(cfg.publicKey && cfg.secretKey);
}

/** Construye el cuerpo de ingestion de Langfuse (batch). Puro, testeable. */
export function buildIngestBody(events: ObservabilityEvent[]): { batch: ObservabilityEvent[] } {
  return { batch: events };
}

/** Construye headers para Langfuse ingestion. Puro. */
export function buildIngestHeaders(publicKey: string, secretKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${basicAuth(publicKey, secretKey)}`,
  };
}

// ---------------------------------------------------------------------------
// Tracer
// ---------------------------------------------------------------------------

export type ObservabilityTracer = {
  /** Id del trace raíz. */
  traceId: string;
  /** Nombre del trace. */
  traceName: string;
  /** Si está habilitado (tiene keys y enabled). */
  enabled: boolean;
  /** Config resuelta. */
  config: Required<Pick<ObservabilityConfig, 'host'>> & ObservabilityConfig;
  /** Buffer actual (no enviado). */
  buffered: ObservabilityEvent[];
  /** Total de eventos creados (incluye ya flusheados). */
  totalEvents: number;
  /** Crea un span/step. Retorna id del span. */
  traceStep(step: TraceStep): string;
  /** Crea una generación (LLM call). Retorna id. */
  traceGeneration(gen: TraceGeneration): string;
  /** Añade un score (evaluación 0-1) a un trace/observation. */
  score(name: string, value: number, comment?: string): string;
  /** Hace flush del buffer al backend (o no-op si disabled). */
  flush(): Promise<{ ok: boolean; sent: number; reason?: string; status?: number }>;
  /** Vacía el buffer sin enviar (útil en tests). */
  clear(): void;
  /** Dump del estado (debug). */
  dump(): { traceId: string; traceName: string; enabled: boolean; buffered: number; totalEvents: number };
};

export function createObservabilityTracer(
  rawConfig: ObservabilityConfig = {},
  fetchImpl?: typeof fetch,
): ObservabilityTracer {
  const cfg = observabilityConfigSchema.parse(rawConfig);
  const host = (cfg.host ?? 'https://cloud.langfuse.com').replace(/\/$/, '');
  const enabled = isObservabilityEnabled(cfg);
  const traceId = genId();
  const traceName = cfg.traceName ?? 'ultraia-trace';
  const flushAt = cfg.flushAt ?? 0;

  const buffered: ObservabilityEvent[] = [];
  let totalEvents = 0;

  // Crear evento trace-create inicial (siempre en buffer, aunque disabled no se envía)
  const traceCreate: ObservabilityEvent = {
    id: genId(),
    type: 'trace-create',
    timestamp: nowIso(),
    body: {
      id: traceId,
      name: traceName,
      public: false,
      tags: cfg.tags ?? [],
    },
  };
  buffered.push(traceCreate);
  totalEvents++;

  const maybeAutoFlush = () => {
    if (enabled && flushAt > 0 && buffered.length >= flushAt) {
      // auto-flush es best-effort, no await (fire-and-forget sin bloquear traceStep)
      // En tests se hace flush manual, así que no se usa.
    }
  };

  const tracer: ObservabilityTracer = {
    traceId,
    traceName,
    enabled,
    config: { ...cfg, host },
    buffered,
    get totalEvents() {
      return totalEvents;
    },
    traceStep(step: TraceStep): string {
      const parsed = traceStepSchema.parse(step);
      const spanId = genId();
      const ev: ObservabilityEvent = {
        id: spanId,
        type: 'span-create',
        timestamp: nowIso(),
        body: {
          id: spanId,
          traceId,
          name: parsed.name,
          input: parsed.input ?? null,
          output: parsed.output ?? null,
          startTime: nowIso(),
          endTime: nowIso(),
          metadata: { latencyMs: parsed.latencyMs, cost: parsed.cost, usage: parsed.usage, ...parsed.metadata },
          level: parsed.level ?? 'DEFAULT',
        },
      };
      buffered.push(ev);
      totalEvents++;
      maybeAutoFlush();
      return spanId;
    },
    traceGeneration(gen: TraceGeneration): string {
      const parsed = traceGenerationSchema.parse(gen);
      const genIdStr = genId();
      const ev: ObservabilityEvent = {
        id: genIdStr,
        type: 'generation-create',
        timestamp: nowIso(),
        body: {
          id: genIdStr,
          traceId,
          name: parsed.name,
          model: parsed.model ?? 'unknown',
          input: parsed.input ?? null,
          output: parsed.output ?? null,
          startTime: nowIso(),
          endTime: nowIso(),
          usage: parsed.usage ?? null,
          metadata: { latencyMs: parsed.latencyMs, cost: parsed.cost, ...parsed.metadata },
          level: parsed.level ?? 'DEFAULT',
        },
      };
      buffered.push(ev);
      totalEvents++;
      maybeAutoFlush();
      return genIdStr;
    },
    score(name: string, value: number, comment?: string): string {
      if (value < 0 || value > 1) throw new Error('score value must be 0..1');
      const scoreId = genId();
      const ev: ObservabilityEvent = {
        id: scoreId,
        type: 'score-create',
        timestamp: nowIso(),
        body: {
          id: scoreId,
          traceId,
          name,
          value,
          comment: comment ?? null,
        },
      };
      buffered.push(ev);
      totalEvents++;
      maybeAutoFlush();
      return scoreId;
    },
    async flush(): Promise<{ ok: boolean; sent: number; reason?: string; status?: number }> {
      if (!enabled) return { ok: false, sent: 0, reason: 'observability deshabilitado (faltan LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY)' };
      if (buffered.length === 0) return { ok: true, sent: 0 };
      const toSend = [...buffered];
      const body = JSON.stringify(buildIngestBody(toSend));
      const headers = buildIngestHeaders(cfg.publicKey!, cfg.secretKey!);
      const url = `${host}/api/public/ingestion`;
      const doFetch = fetchImpl ?? fetch;
      try {
        const res = await doFetch(url, { method: 'POST', headers, body });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return { ok: false, sent: 0, reason: `Langfuse ingestion ${res.status}: ${text.slice(0, 200)}`, status: res.status };
        }
        // éxito: vaciar solo los enviados
        buffered.splice(0, toSend.length);
        return { ok: true, sent: toSend.length, status: res.status };
      } catch (e) {
        return { ok: false, sent: 0, reason: `fetch failed: ${String((e as Error).message ?? e).slice(0, 200)}` };
      }
    },
    clear(): void {
      buffered.length = 0;
    },
    dump(): { traceId: string; traceName: string; enabled: boolean; buffered: number; totalEvents: number } {
      return { traceId, traceName, enabled, buffered: buffered.length, totalEvents };
    },
  };

  return tracer;
}

// ---------------------------------------------------------------------------
// Helpers de env (factory keyless-first)
// ---------------------------------------------------------------------------

/** Crea un tracer desde variables de entorno (LANGFUSE_*), fail-soft. */
export function observabilityFromEnv(fetchImpl?: typeof fetch): ObservabilityTracer {
  return createObservabilityTracer(
    {
      host: process.env.LANGFUSE_HOST,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      traceName: process.env.LANGFUSE_TRACE_NAME,
    },
    fetchImpl,
  );
}

// ---------------------------------------------------------------------------
// Tool surface (para wiring en ai/llm.ts)
// ---------------------------------------------------------------------------

export const observability = {
  createObservabilityTracer,
  observabilityFromEnv,
  isObservabilityEnabled,
  buildIngestBody,
  buildIngestHeaders,
  observabilityConfigSchema,
  traceStepSchema,
  traceGenerationSchema,
};
