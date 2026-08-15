import type { CorePorts, CorePortsOptions } from './ports';

/**
 * Contenedor de adapters a `@ultraia/core` (Fase C, parcial: db + ai).
 *
 * Los adapters de tools/omag se añadirán en la tarea #3 (Fase C resto) sin cambiar
 * esta interfaz: `CorePorts` es estable y el runtime lo inyecta donde lo necesite.
 */
export function createCorePorts(options: CorePortsOptions = {}): CorePorts {
  return {
    kind: 'core',
    name: 'core',
    db: options.db,
    ai: options.ai,

    async isHealthy(): Promise<boolean> {
      if (!options.db && !options.ai) return false;
      if (options.db && !(await options.db.ping())) return false;
      if (options.ai && !(await options.ai.ping())) return false;
      return true;
    },

    async close(): Promise<void> {
      await Promise.all(
        [options.db, options.ai].filter((a): a is NonNullable<typeof a> => a !== undefined).map((a) => a.close()),
      );
    },
  };
}