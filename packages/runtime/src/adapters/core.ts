import type { CorePorts, CorePortsOptions } from './ports';

/**
 * Contenedor de adapters a `@ultraia/core` (Fase C, parcial: db + ai).
 *
 * Los adapters de tools/omag se añadirán en la tarea #3 (Fase C resto) sin cambiar
 * esta interfaz: `CorePorts` es estable y el runtime lo inyecta donde lo necesite.
 */
export function createCorePorts(options: CorePortsOptions = {}): CorePorts {
  const adapters = [options.db, options.ai, options.tools, options.omag].filter(
    (a): a is NonNullable<typeof a> => a !== undefined,
  );

  return {
    kind: 'core',
    name: 'core',
    db: options.db,
    ai: options.ai,
    tools: options.tools,
    omag: options.omag,

    async isHealthy(): Promise<boolean> {
      if (!adapters.length) return false;
      for (const adapter of adapters) {
        if (!(await adapter.ping())) return false;
      }
      return true;
    },

    async close(): Promise<void> {
      await Promise.all(adapters.map((a) => a.close()));
    },
  };
}