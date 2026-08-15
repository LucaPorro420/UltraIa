import type { PrismaClient } from '@prisma/client';
import type { AiGateway, OmagRequest, OmagResult, ProviderName } from '@ultraia/core';

/**
 * Ports de integración con `@ultraia/core` (Fase C, parcial).
 *
 * El núcleo del runtime (`src/*.ts`, excepto `adapters/`) NO importa `@ultraia/core` ni
 * `@prisma/client` por path interno: los adapters son la ÚNICA frontera hacia el core y se
 * inyectan (ver ARCHITECTURE.md §7 — "Runtime usa adapters por inyección; nunca imports internos").
 *
 * Los tipos `PrismaClient`/`AiGateway`/`ProviderName` se importan type-only para tipar
 * correctamente lo que las funciones de dominio de core esperan (`Db = PrismaClient`,
 * `AiGateway`), sin arrastrar el runtime del core al construir.
 */

export interface AdapterInfo {
  /** Identificador corto del adapter, p.ej. `db` | `ai`. */
  readonly kind: string;
  /** Nombre legible del adapter (diagnóstico / logs). */
  readonly name: string;
}

/** Conexión a la base de datos gestionada por el runtime (envuelve el cliente Prisma). */
export interface DbAdapter extends AdapterInfo {
  readonly kind: 'db';
  /** Cliente Prisma subyacente — satisface `Db` de `@ultraia/core` para las funciones de dominio. */
  readonly client: PrismaClient;
  /** URL de conexión usada al crear el cliente (undefined si se inyectó un cliente externo). */
  readonly datasourceUrl?: string;
  /** Health-check ligero: `SELECT 1` — true si la DB responde. */
  ping(): Promise<boolean>;
  /** Cierra la conexión (idempotente) y libera el singleton si el adapter lo creó. */
  close(): Promise<void>;
}

/** Gateway LLM gestionado por el runtime (envuelve la implementación real de core). */
export interface AiGatewayAdapter extends AdapterInfo {
  readonly kind: 'ai';
  /** Proveedor activo (openai | google | ollama | lmstudio | deepseek). */
  readonly provider: ProviderName;
  /** Modelo explícito (undefined → usa el default del proveedor en core). */
  readonly model?: string;
  /** Gateway real de core (implementa `AiGateway`: generateStructured/chatText). */
  readonly gateway: AiGateway;
  /** Health-check de configuración: true si `resolveModel` construye el modelo (sin llamadas de pago). */
  ping(): Promise<boolean>;
  /** No-op por ahora (el gateway no tiene estado de conexión). */
  close(): Promise<void>;
}

/** Catálogo + despacho de tools de agente de core (keyless por diseño). */
export interface ToolsAdapter extends AdapterInfo {
  readonly kind: 'tools';
  /** Capabilities disponibles (derivadas de `TOOL_DESCRIPTIONS` de core). */
  readonly capabilities: readonly string[];
  /** Descripciones de cada capability (para LLM / UI). */
  readonly descriptions: Readonly<Record<string, string>>;
  /** Ejecuta una capability con un input plano; lanza Error si capability/op/campos inválidos. */
  run(capability: string, input?: Record<string, unknown>): Promise<unknown>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

/** Orquestador OMAG (sistema operativo de mundo multimedia) de core, keyless. */
export interface OmagAdapter extends AdapterInfo {
  readonly kind: 'omag';
  /** Orquestador subyacente (generadores/críticos default o custom). */
  readonly orchestrator: unknown;
  /** Ejecuta idea → plan → media field → generación → crítica (gateway inyectado si hay ai adapter). */
  run(request: Omit<OmagRequest, 'gateway'>): Promise<OmagResult>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

/** Contenedor de adapters de core que el runtime expone a módulos/agentes. */
export interface CorePorts extends AdapterInfo {
  readonly kind: 'core';
  readonly db?: DbAdapter;
  readonly ai?: AiGatewayAdapter;
  readonly tools?: ToolsAdapter;
  readonly omag?: OmagAdapter;
  /**
   * Salud agregada: false si no hay adapters configurados, o si algún adapter presente
   * no responde a su ping.
   */
  isHealthy(): Promise<boolean>;
  /** Cierra todos los adapters presentes (idempotente por adapter). */
  close(): Promise<void>;
}

export interface CorePortsOptions {
  db?: DbAdapter;
  ai?: AiGatewayAdapter;
  tools?: ToolsAdapter;
  omag?: OmagAdapter;
}