// -----------------------------------------------------------------------------
// harness.ts — capability `harness`
// -----------------------------------------------------------------------------
// Port ORIGINAL de los PRINCIPIOS de DeepSeek Harness (deepseek-ai/deepseek-harness,
// MIT, enlaces.txt linea 804): "everything is a plugin" — runtime de agente donde NO
// existe un core privilegiado: cada capacidad (tool, scheduler, observer, provider)
// es un plugin que contribuye servicios, eventos y efectos REVERSIBLES a un contexto
// compartido; los registros se deshacen cuando el plugin se desactiva.
// Sin codigo copiado: re-diseno en el estilo del dominio puro de UltraIa
// (determinista, sin red, reloj inyectable). Fuente: learning/sources/deepseek-harness.md.
// -----------------------------------------------------------------------------

export type HarnessPluginKind = 'tool' | 'scheduler' | 'observer' | 'provider';

/** Resultado de un handler de tool de plugin: determinista, nunca lanza. */
export interface ToolCallResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface HarnessEvents {
  /** Suscribe un listener; devuelve la funcion para des-suscribir. */
  on(event: string, listener: (payload: unknown) => void): () => void;
  emit(event: string, payload?: unknown): void;
}

export interface HarnessContext {
  log(level: 'debug' | 'info' | 'warn' | 'error', msg: string): void;
  events: HarnessEvents;
  /** Estado compartido con claves NAMESPACED por plugin (`<pluginId>:<clave>`). */
  state: Map<string, unknown>;
  services: {
    /** Registra un provider de seam. false si ya existia uno con ese nombre. */
    register<T>(name: string, provider: T): boolean;
    /** Resuelve el provider de un seam; lanza si no hay ninguno. */
    resolve<T>(name: string): T;
  };
}

export interface HarnessPlugin {
  id: string;
  kind: HarnessPluginKind;
  /** Plugins que deben estar ACTIVOS antes que este (orden topologico). */
  dependsOn?: string[];
  /** Tools que expone (kind 'tool'): nombre -> handler determinista. */
  tools?: Record<string, (args: Record<string, unknown>) => ToolCallResult>;
  /** Tareas programadas (kind 'scheduler'): corren cuando el tick == at. */
  schedule?: Array<{ at: number; run: () => void }>;
  activate(ctx: HarnessContext): void;
  /** Opcional: el runtime igualmente deshace sus efectos (listeners, tools, schedule). */
  deactivate?(ctx: HarnessContext): void;
}

export interface HarnessOptions {
  plugins: HarnessPlugin[];
  /** Reloj de ticks inyectable (tests deterministas). Default: cuenta interna. */
  clock?: { now(): number };
  /** Logger opcional (default: no-op). */
  logger?: (level: string, msg: string) => void;
}

export interface HarnessRuntime {
  /** Valida TODO el arbol antes de activar nada (ids, duplicados, ciclos, deps). */
  boot(): { ok: boolean; error?: string };
  /** Ejecuta una tool de un plugin activo. Tool desconocida -> ok:false con razon. */
  run(task: { tool: string; args?: Record<string, unknown> }): ToolCallResult;
  /** Avanza el reloj un tick y ejecuta las tareas programadas que vencen. */
  tick(): void;
  /** Desactiva en orden inverso; fail-soft (recolecta errores) y siempre deshace efectos. */
  shutdown(): { ok: boolean; errors: string[] };
  /** Estado del arbol: plugins (activos/inactivos) y seams registrados. */
  dump(): { plugins: Array<{ id: string; kind: HarnessPluginKind; active: boolean }>; services: string[] };
}

/** Patron de id de plugin: mismo contrato que los modulos del runtime desktop. */
const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

// ------------------------------------------------------------------- defineSeam

/** QUÉ ES: una "costura" (seam) — capacidad intercambiable con 3 roles: Service
// Definition (esta funcion), Service Provider (register) y Consumer (resolve).
// PARA QUÉ: port del concepto de seams de DeepSeek Harness: cambiar un provider
// cambia todo el producto sin tocar a los consumidores.
// POR QUÉ: el patron register/resolve mantiene el runtime desacoplado. */
export function defineSeam<T>(name: string) {
  return {
    name,
    register(ctx: HarnessContext, provider: T): boolean {
      return ctx.services.register<T>(name, provider);
    },
    resolve(ctx: HarnessContext): T {
      return ctx.services.resolve<T>(name);
    },
  };
}

// ------------------------------------------------------------------- orden topologico

/** QUÉ ES: orden de activacion (Kahn) respetando dependsOn; si hay ciclo -> error.
// PARA QUÉ: boot() necesita saber que plugin va antes que que otro.
// POR QUÉ: sin core privilegiado, el orden lo decide la estructura del grafo. */
function topoOrder(plugins: HarnessPlugin[]): HarnessPlugin[] | { error: string } {
  const byId = new Map(plugins.map((p) => [p.id, p]));
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const p of plugins) {
    indegree.set(p.id, 0);
    adj.set(p.id, []);
  }
  for (const p of plugins) {
    for (const dep of p.dependsOn ?? []) {
      if (!byId.has(dep)) return { error: `dependencia '${dep}' de '${p.id}' no existe en el arbol` };
      adj.get(dep)!.push(p.id);
      indegree.set(p.id, (indegree.get(p.id) ?? 0) + 1);
    }
  }
  const queue = plugins.filter((p) => (indegree.get(p.id) ?? 0) === 0).map((p) => p.id);
  const order: HarnessPlugin[] = [];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(byId.get(id)!);
    for (const next of adj.get(id) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if ((indegree.get(next) ?? 0) === 0) queue.push(next);
    }
  }
  if (order.length !== plugins.length) return { error: 'ciclo de dependencias detectado en el arbol de plugins' };
  return order;
}

// ------------------------------------------------------------------- createHarness

/** QUÉ ES: el runtime de agente donde TODO es plugin. boot() valida el arbol completo
// antes de activar nada; shutdown() deshace los efectos en orden inverso (unwind).
// PARA QUÉ: port de "no privileged core": extender el runtime = montar un plugin al
// lado de los demas, nada mas.
// POR QUÉ: dominio puro determinista — sin red, sin I/O; el modelo de razonamiento
// elige que arbol montar via la tool harness_manage. */
export function createHarness(options: HarnessOptions): HarnessRuntime {
  const logger = options.logger ?? (() => undefined);
  const plugins = [...options.plugins];
  const state = new Map<string, unknown>();
  const services = new Map<string, unknown>();
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  const byPlugin = new Map<string, { plugin: HarnessPlugin; ctx: HarnessContext }>();
  const activationOrder: string[] = [];
  const listenersByPlugin = new Map<string, Set<(payload: unknown) => void>>();
  const unsubs = new Map<(payload: unknown) => void, () => void>();
  let tickCount = 0;
  let booted = false;
  const now = () => (options.clock ? options.clock.now() : tickCount);

  const events: HarnessEvents = {
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return () => listeners.get(event)?.delete(listener);
    },
    emit(event, payload) {
      for (const l of [...(listeners.get(event) ?? [])]) l(payload);
    },
  };

  /** on() trackeado por plugin: el runtime guarda la unsub y la ejecuta en shutdown
  // aunque el plugin no defina deactivate() — efectos reversibles garantizados. */
  const trackedOn = (pluginId: string) => (event: string, listener: (payload: unknown) => void) => {
    const wrapped = (payload: unknown) => listener(payload);
    if (!listenersByPlugin.has(pluginId)) listenersByPlugin.set(pluginId, new Set());
    listenersByPlugin.get(pluginId)!.add(wrapped);
    const unsub = events.on(event, wrapped);
    unsubs.set(wrapped, unsub);
    return () => {
      unsub();
      listenersByPlugin.get(pluginId)?.delete(wrapped);
      unsubs.delete(wrapped);
    };
  };

  const pluginCtx = (plugin: HarnessPlugin): HarnessContext => {
    const namespaced = new Map<string, unknown>();
    return {
      log: (level, msg) => logger(level, `[${plugin.id}] ${msg}`),
      events: { on: trackedOn(plugin.id), emit: events.emit.bind(events) },
      state: {
        set: (k: string, v: unknown) => {
          state.set(`${plugin.id}:${k}`, v);
          return namespaced;
        },
        get: (k: string) => state.get(`${plugin.id}:${k}`),
        has: (k: string) => state.has(`${plugin.id}:${k}`),
        delete: (k: string) => state.delete(`${plugin.id}:${k}`),
        clear: () => undefined,
        get size() {
          return 0;
        },
        forEach: (cb: (value: unknown, key: string, map: Map<string, unknown>) => void) => {
          for (const [k, v] of state) {
            if (k.startsWith(`${plugin.id}:`)) cb(v, k.slice(plugin.id.length + 1), namespaced);
          }
        },
        entries: function* entries() {
          for (const [k, v] of state) {
            if (k.startsWith(`${plugin.id}:`)) yield [k.slice(plugin.id.length + 1), v] as [string, unknown];
          }
        },
        keys: function* keys() {
          for (const k of state.keys()) {
            if (k.startsWith(`${plugin.id}:`)) yield k.slice(plugin.id.length + 1);
          }
        },
        values: function* values() {
          for (const [k, v] of state) {
            if (k.startsWith(`${plugin.id}:`)) yield v;
          }
        },
        [Symbol.iterator]: function* iterator() {
          for (const [k, v] of state) {
            if (k.startsWith(`${plugin.id}:`)) yield [k.slice(plugin.id.length + 1), v] as [string, unknown];
          }
        },
      } as unknown as Map<string, unknown>,
      services: {
        register: <T>(name: string, provider: T) => {
          if (services.has(name)) return false;
          services.set(name, provider);
          return true;
        },
        resolve: <T>(name: string) => {
          if (!services.has(name)) throw new Error(`seam '${name}' sin provider registrado`);
          return services.get(name) as T;
        },
      },
    };
  };

  return {
    boot() {
      if (booted) return { ok: false, error: 'harness ya iniciado (shutdown antes de re-bootear)' };
      const seen = new Set<string>();
      for (const p of plugins) {
        if (!PLUGIN_ID_RE.test(p.id)) return { ok: false, error: `id de plugin invalido: '${p.id}' (^[a-z0-9][a-z0-9-]{1,63}$)` };
        if (seen.has(p.id)) return { ok: false, error: `plugin duplicado: '${p.id}'` };
        seen.add(p.id);
      }
      const order = topoOrder(plugins);
      if ('error' in order) return { ok: false, error: order.error };
      for (const p of order) {
        const ctx = pluginCtx(p);
        byPlugin.set(p.id, { plugin: p, ctx });
        try {
          p.activate(ctx);
          activationOrder.push(p.id);
          logger('info', `plugin '${p.id}' activo`);
        } catch (err) {
          for (const id of [...activationOrder].reverse()) {
            const entry = byPlugin.get(id)!;
            try {
              entry.plugin.deactivate?.(entry.ctx);
            } catch {
              /* fail-soft en rollback */
            }
          }
          return { ok: false, error: `plugin '${p.id}' fallo al activar: ${(err as Error).message}` };
        }
      }
      booted = true;
      return { ok: true };
    },

    run(task) {
      if (!booted) return { ok: false, error: 'harness sin boot()' };
      for (const id of activationOrder) {
        const { plugin } = byPlugin.get(id)!;
        const handler = plugin.tools?.[task.tool];
        if (handler) {
          try {
            return handler(task.args ?? {});
          } catch (err) {
            return { ok: false, error: `tool '${task.tool}' lanzo: ${(err as Error).message}` };
          }
        }
      }
      return { ok: false, error: `tool '${task.tool}' no registrada en ningun plugin activo` };
    },

    tick() {
      tickCount += 1;
      const t = now();
      for (const id of activationOrder) {
        const { plugin } = byPlugin.get(id)!;
        for (const job of plugin.schedule ?? []) {
          if (job.at === t) {
            try {
              job.run();
            } catch (err) {
              logger('warn', `tarea de '${plugin.id}' en tick ${t} fallo: ${(err as Error).message}`);
            }
          }
        }
      }
    },

    shutdown() {
      const errors: string[] = [];
      for (const unsub of unsubs.values()) {
        try {
          unsub();
        } catch {
          /* fail-soft en des-suscripcion */
        }
      }
      unsubs.clear();
      listenersByPlugin.clear();
      for (const id of [...activationOrder].reverse()) {
        const entry = byPlugin.get(id)!;
        try {
          entry.plugin.deactivate?.(entry.ctx);
        } catch (err) {
          errors.push(`deactivate de '${id}' fallo: ${(err as Error).message}`);
        }
      }
      byPlugin.clear();
      activationOrder.length = 0;
      services.clear();
      booted = false;
      return { ok: errors.length === 0, errors };
    },

    dump() {
      return {
        plugins: plugins.map((p) => ({ id: p.id, kind: p.kind, active: byPlugin.has(p.id) })),
        services: [...services.keys()].sort(),
      };
    },
  };
}

// ------------------------------------------------------------------- plugins de ejemplo

/** QUÉ ES: plugin de ejemplo que expone tools deterministas (echo/identity/now).
// PARA QUÉ: probar run() y servir de plantilla declarativa para harness_manage. */
export const echoToolPlugin: HarnessPlugin = {
  id: 'echo-tool',
  kind: 'tool',
  activate() {
    /* sin efectos */
  },
  tools: {
    echo: (args) => ({ ok: true, result: args.value ?? null }),
    identity: (args) => ({ ok: true, result: args }),
    now: () => ({ ok: true, result: { tick: 0 } }),
  },
};

/** QUÉ ES: plugin scheduler determinista: cada `every` ticks emite 'tick' y cuenta.
// PARA QUÉ: port de "background work" del harness: jobs programados por ticks.
// POR QUÉ: reloj del runtime inyectable -> tests sin timers reales. */
export function counterSchedulerPlugin(options: { every?: number; max?: number; id?: string } = {}): HarnessPlugin {
  const every = options.every ?? 2;
  const max = options.max ?? 10;
  const schedule: NonNullable<HarnessPlugin['schedule']> = [];
  let hits = 0;
  let ctxRef: HarnessContext | undefined;
  for (let t = every; t <= every * max; t += every) {
    schedule.push({
      at: t,
      run: () => {
        hits += 1;
        ctxRef?.state.set('hits', hits);
        ctxRef?.events.emit('tick', t);
      },
    });
  }
  return {
    id: options.id ?? 'counter-scheduler',
    kind: 'scheduler',
    schedule,
    activate(ctx) {
      ctxRef = ctx;
      ctx.state.set('hits', 0);
    },
    deactivate() {
      ctxRef = undefined;
    },
  };
}

export const harness = { createHarness, defineSeam, echoToolPlugin, counterSchedulerPlugin, PLUGIN_ID_RE };