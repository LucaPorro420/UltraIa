import { describe, expect, it } from 'vitest';
import {
  counterSchedulerPlugin,
  createHarness,
  defineSeam,
  echoToolPlugin,
  type HarnessContext,
  type HarnessPlugin,
} from './harness';

function makePlugin(id: string, opts: { dependsOn?: string[]; onActivate?: (ctx: HarnessContext) => void; onDeactivate?: (ctx: HarnessContext) => void } = {}): HarnessPlugin {
  return {
    id,
    kind: 'observer',
    dependsOn: opts.dependsOn,
    activate(ctx) {
      opts.onActivate?.(ctx);
    },
    deactivate(ctx) {
      opts.onDeactivate?.(ctx);
    },
  };
}

describe('boot: validación del árbol', () => {
  it('activa en orden topológico (dependencia antes que dependiente)', () => {
    const order: string[] = [];
    const a = makePlugin('base-a', { onActivate: () => order.push('a') });
    const b = makePlugin('child-b', { dependsOn: ['base-a'], onActivate: () => order.push('b') });
    const h = createHarness({ plugins: [b, a] }); // desordenado a propósito
    const res = h.boot();
    expect(res.ok).toBe(true);
    expect(order).toEqual(['a', 'b']);
  });

  it('dependencia faltante → boot falla con mensaje claro y NO activa nada', () => {
    const calls: string[] = [];
    const a = makePlugin('solo-a', { onActivate: () => calls.push('a') });
    const h = createHarness({ plugins: [a, makePlugin('needs-missing', { dependsOn: ['no-existe'] })] });
    const res = h.boot();
    expect(res.ok).toBe(false);
    expect(res.error).toContain("dependencia 'no-existe' de 'needs-missing'");
    expect(calls).toEqual([]);
  });

  it('ciclo de dependencias → error', () => {
    const h = createHarness({ plugins: [makePlugin('x1', { dependsOn: ['x2'] }), makePlugin('x2', { dependsOn: ['x1'] })] });
    const res = h.boot();
    expect(res.ok).toBe(false);
    expect(res.error).toContain('ciclo');
  });

  it('id inválido → error (patrón ^[a-z0-9][a-z0-9-]{1,63}$)', () => {
    const h = createHarness({ plugins: [makePlugin('MAL_ID'), makePlugin('ok-id')] });
    const res = h.boot();
    expect(res.ok).toBe(false);
    expect(res.error).toContain("id de plugin invalido: 'MAL_ID'");
  });

  it('plugin duplicado → error', () => {
    const h = createHarness({ plugins: [makePlugin('dup'), makePlugin('dup')] });
    const res = h.boot();
    expect(res.ok).toBe(false);
    expect(res.error).toContain("plugin duplicado: 'dup'");
  });

  it('boot doble → error; run sin boot → error', () => {
    const h = createHarness({ plugins: [echoToolPlugin] });
    expect(h.run({ tool: 'echo', args: { value: 1 } }).ok).toBe(false);
    expect(h.boot().ok).toBe(true);
    expect(h.boot().ok).toBe(false);
    expect(h.boot().error).toContain('ya iniciado');
  });

  it('activate que lanza → rollback: deactivate de los ya activados', () => {
    const deactivated: string[] = [];
    const a = makePlugin('first', { onDeactivate: () => deactivated.push('first') });
    const bad = makePlugin('boom', {
      onActivate: () => {
        throw new Error('falla en activate');
      },
    });
    const h = createHarness({ plugins: [a, bad] });
    const res = h.boot();
    expect(res.ok).toBe(false);
    expect(res.error).toContain("plugin 'boom' fallo al activar");
    expect(deactivated).toContain('first');
  });
});

describe('shutdown: unwind de efectos', () => {
  it('desactiva en orden inverso al de activación', () => {
    const order: string[] = [];
    const a = makePlugin('base-a', { onDeactivate: () => order.push('a') });
    const b = makePlugin('child-b', { dependsOn: ['base-a'], onDeactivate: () => order.push('b') });
    const h = createHarness({ plugins: [a, b] });
    h.boot();
    const res = h.shutdown();
    expect(res.ok).toBe(true);
    expect(order).toEqual(['b', 'a']); // inverso
    expect(h.dump().plugins.every((p) => !p.active)).toBe(true);
  });

  it('deactivate opcional: plugin sin deactivate no rompe el shutdown', () => {
    const h = createHarness({ plugins: [echoToolPlugin] });
    h.boot();
    expect(h.shutdown().ok).toBe(true);
  });

  it('deactivate que lanza → fail-soft: recolecta error y sigue con los demás', () => {
    const deactivated: string[] = [];
    const bad = makePlugin('bad-tear', {
      onDeactivate: () => {
        throw new Error('tear falló');
      },
    });
    const good = makePlugin('good-tear', { onDeactivate: () => deactivated.push('good') });
    const h = createHarness({ plugins: [bad, good] });
    h.boot();
    const res = h.shutdown();
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toContain("deactivate de 'bad-tear' fallo");
    expect(deactivated).toContain('good');
  });

  it('efectos reversibles: listener des-suscrito tras shutdown (emit posterior no llega)', () => {
    let seen = 0;
    let ctxRef: HarnessContext | undefined;
    const listener = makePlugin('listener', {
      onActivate: (ctx) => {
        ctxRef = ctx;
        ctx.events.on('pulso', () => {
          seen += 1;
        });
      },
    });
    const h = createHarness({ plugins: [listener] });
    h.boot();
    ctxRef!.events.emit('pulso');
    expect(seen).toBe(1);
    h.shutdown();
    ctxRef!.events.emit('pulso'); // el runtime ya no tiene el listener
    expect(seen).toBe(1);
  });
});

describe('run: tools de plugins activos', () => {
  it('ejecuta la tool de un plugin activo', () => {
    const h = createHarness({ plugins: [echoToolPlugin] });
    h.boot();
    const res = h.run({ tool: 'echo', args: { value: 42 } });
    expect(res.ok).toBe(true);
    expect(res.result).toBe(42);
  });

  it('tool desconocida → ok:false con razón', () => {
    const h = createHarness({ plugins: [echoToolPlugin] });
    h.boot();
    const res = h.run({ tool: 'no-existe' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("'no-existe' no registrada");
  });

  it('handler que lanza → ok:false sin propagar', () => {
    const plugin: HarnessPlugin = {
      id: 'thrower',
      kind: 'tool',
      activate() {
        /* noop */
      },
      tools: {
        boom: () => {
          throw new Error('kaboom');
        },
      },
    };
    const h = createHarness({ plugins: [plugin] });
    h.boot();
    const res = h.run({ tool: 'boom' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('kaboom');
  });
});

describe('scheduler determinista', () => {
  it('ejecuta tareas programadas solo cuando el tick == at (reloj inyectable)', () => {
    const runs: number[] = [];
    const plugin: HarnessPlugin = {
      id: 'job-runner',
      kind: 'scheduler',
      schedule: [
        { at: 1, run: () => runs.push(1) },
        { at: 3, run: () => runs.push(3) },
      ],
      activate() {
        /* noop */
      },
    };
    let t = 0;
    const h = createHarness({ plugins: [plugin], clock: { now: () => t } });
    h.boot();
    t = 1;
    h.tick();
    expect(runs).toEqual([1]);
    t = 2;
    h.tick();
    expect(runs).toEqual([1]);
    t = 3;
    h.tick();
    expect(runs).toEqual([1, 3]);
  });

  it('counterSchedulerPlugin: ejecuta en sus ticks y emite el evento tick', () => {
    const ticks: unknown[] = [];
    const observer: HarnessPlugin = {
      id: 'tick-obs',
      kind: 'observer',
      activate(ctx) {
        ctx.events.on('tick', (t) => ticks.push(t));
      },
    };
    const plugin = counterSchedulerPlugin({ every: 2, max: 3 });
    const h = createHarness({ plugins: [plugin, observer] });
    h.boot();
    for (let i = 0; i < 6; i++) h.tick();
    expect(ticks).toEqual([2, 4, 6]);
  });
});

describe('seams y estado', () => {
  it('defineSeam: register/resolve provider; sin provider → error claro', () => {
    const seam = defineSeam<{ name: string }>('llm');
    const holder = makePlugin('holder', {
      onActivate: (ctx) => {
        expect(seam.register(ctx, { name: 'deepseek' })).toBe(true);
        expect(seam.register(ctx, { name: 'otro' })).toBe(false); // ya hay provider
      },
    });
    const consumer = makePlugin('consumer', {
      onActivate: (ctx) => {
        expect(seam.resolve(ctx).name).toBe('deepseek');
      },
    });
    const h = createHarness({ plugins: [holder, consumer] });
    expect(h.boot().ok).toBe(true);
    expect(h.dump().services).toContain('llm');
    // resolver sin provider en un harness aparte:
    const empty = createHarness({ plugins: [makePlugin('solo')] });
    empty.boot();
    const emptyHolder = makePlugin('probe-seam', {
      onActivate: (ctx) => {
        try {
          seam.resolve(ctx);
          throw new Error('no debió resolver');
        } catch (err) {
          expect((err as Error).message).toContain("seam 'llm' sin provider");
        }
      },
    });
    const h2 = createHarness({ plugins: [emptyHolder] });
    expect(h2.boot().ok).toBe(true);
  });

  it('state namespaced por plugin: misma clave no colisiona', () => {
    const values: unknown[] = [];
    const a = makePlugin('alpha', { onActivate: (ctx) => ctx.state.set('clave', 'a') });
    const b = makePlugin('beta', {
      onActivate: (ctx) => {
        ctx.state.set('clave', 'b');
        values.push(ctx.state.get('clave'));
      },
    });
    const h = createHarness({ plugins: [a, b] });
    h.boot();
    expect(values).toEqual(['b']);
  });

  it('dump: plugins activos + seams registrados', () => {
    const seam = defineSeam<unknown>('fs');
    const p = makePlugin('servidor-fs', { onActivate: (ctx) => seam.register(ctx, {}) });
    const h = createHarness({ plugins: [p] });
    h.boot();
    expect(h.dump().plugins).toEqual([{ id: 'servidor-fs', kind: 'observer', active: true }]);
    expect(h.dump().services).toEqual(['fs']);
  });
});