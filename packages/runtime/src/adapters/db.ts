import { PrismaClient } from '@prisma/client';
import type { DbAdapter } from './ports';

/**
 * Adapter de base de datos para el runtime desktop.
 *
 * - Singleton perezoso por `datasourceUrl` (patrón del `globalForPrisma` de
 *   `packages/core/src/db/client.ts`): dos llamadas con la misma URL comparten cliente.
 * - `factory` inyectable para tests (evita arrancar el engine de Prisma en unit tests).
 * - `client` inyectable para reutilizar una conexión ya existente (shell/Next).
 * - `ping()` = `SELECT 1`; `close()` idempotente y libera el singleton propio.
 */

export interface PrismaClientFactoryOptions {
  datasourceUrl?: string;
  logQueries?: boolean;
}

export type PrismaClientFactory = (options: PrismaClientFactoryOptions) => PrismaClient;

export interface DbAdapterOptions {
  /** URL de conexión (p.ej. `file:./.ultraia/db/dev.db`). Clave del singleton. */
  datasourceUrl?: string;
  /** Log de queries de Prisma (equivale a `ULTRAIA_LOG_QUERIES=1` del core). */
  logQueries?: boolean;
  /** Cliente ya construido (se usa tal cual; no entra al singleton). */
  client?: PrismaClient;
  /** Factory del cliente (default: `new PrismaClient(...)`). Solo tests. */
  factory?: PrismaClientFactory;
}

const singleton = new Map<string, PrismaClient>();

function defaultFactory(options: PrismaClientFactoryOptions): PrismaClient {
  return new PrismaClient({
    ...(options.datasourceUrl ? { datasourceUrl: options.datasourceUrl } : {}),
    log: options.logQueries ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

export function createPrismaDb(options: DbAdapterOptions = {}): DbAdapter {
  const key = options.datasourceUrl ?? 'default';
  let client = options.client;

  if (!client) {
    client = singleton.get(key);
    if (!client) {
      client = (options.factory ?? defaultFactory)({
        datasourceUrl: options.datasourceUrl,
        logQueries: options.logQueries,
      });
      singleton.set(key, client);
    }
  }

  let closed = false;
  const ownsClient = !options.client;

  return {
    kind: 'db',
    name: 'db',
    client,
    datasourceUrl: options.datasourceUrl,

    async ping(): Promise<boolean> {
      if (closed) return false;
      try {
        await client.$queryRawUnsafe('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },

    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      try {
        await client.$disconnect();
      } catch {
        // cerrar no debe tumbar el runtime (patrón Recovery)
      }
      if (ownsClient) {
        singleton.delete(key);
      }
    },
  };
}