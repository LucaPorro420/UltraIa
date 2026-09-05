import { z } from 'zod';

export const providerStrategySchema = z.enum(['fast', 'balanced', 'quality', 'local-first']);
export type ProviderStrategy = z.infer<typeof providerStrategySchema>;

export const providerStatusSchema = z.object({
  provider: z.string(),
  configured: z.boolean(),
  available: z.boolean(),
  capabilities: z.array(z.string()),
  status: z.enum(['healthy', 'degraded', 'unavailable']),
  latencyMs: z.number().nonnegative().nullable(),
  lastHealthCheck: z.number().nonnegative().nullable(),
  reason: z.string().max(240).nullable(),
});
export type ProviderStatus = z.infer<typeof providerStatusSchema>;

export const routingSummarySchema = z.object({
  strategy: providerStrategySchema,
  tier: z.string(),
  provider: z.string(),
  model: z.string(),
  fallbackCount: z.number().int().nonnegative(),
  reason: z.string().max(240),
});
export type RoutingSummary = z.infer<typeof routingSummarySchema>;

export const safeChatTelemetrySchema = z.object({
  provider: z.string().max(80),
  modelTier: z.string().max(40),
  strategy: providerStrategySchema,
  latencyMs: z.number().nonnegative(),
  cacheHit: z.boolean(),
  fallbackCount: z.number().int().nonnegative(),
  outcome: z.enum(['success', 'failure']),
  failureCategory: z.string().max(80).nullable().optional(),
});
export type SafeChatTelemetry = z.infer<typeof safeChatTelemetrySchema>;

export const telemetryAggregateSchema = z.object({
  windowStart: z.string(),
  provider: z.string(),
  strategy: providerStrategySchema,
  requestCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  cacheHits: z.number().int().nonnegative(),
  fallbackCount: z.number().int().nonnegative(),
  totalLatencyMs: z.number().nonnegative(),
});
export type TelemetryAggregate = z.infer<typeof telemetryAggregateSchema>;

/** Classifies an error without returning provider messages, URLs, or credentials. */
export function safeFailureCategory(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('timeout') || message.includes('abort')) return 'timeout';
  if (message.includes('unauthor') || message.includes('api key') || message.includes('token')) return 'configuration';
  if (message.includes('rate') || message.includes('quota') || message.includes('429')) return 'quota';
  if (message.includes('network') || message.includes('fetch') || message.includes('connect')) return 'network';
  return 'provider_error';
}
