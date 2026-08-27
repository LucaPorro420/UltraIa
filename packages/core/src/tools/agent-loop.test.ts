import { describe, it, expect, vi } from 'vitest';
import {
  runAgentLoop,
  type AgentLoopStepContext,
  type RunAgentLoopOpts,
  type AgentGoalRun,
} from './agent-loop';

function fakeGoalResult(output = 'ok'): AgentGoalRun {
  return {
    goal: 'g',
    results: [{ taskId: 't', task: 't', status: 'done', output }],
    done: true,
  };
}

/** Ejecuta el loop con un execute que devuelve un GoalResult y registra el orden. */
function runWithOrder(opts: Partial<RunAgentLoopOpts> = {}) {
  const order: string[] = [];
  const make = (name: string) => (async () => { order.push(name); }) as never;
  return {
    order,
    result: runAgentLoop({
      objective: 'obj',
      tasks: ['t1'],
      recall: make('recall'),
      plan: make('plan'),
      execute: async (ctx: AgentLoopStepContext) => {
        order.push('execute');
        return fakeGoalResult(`out-${ctx.iteration}`);
      },
      verify: make('verify'),
      test: make('test'),
      learn: make('learn'),
      ...opts,
    }),
  };
}

describe('runAgentLoop', () => {
  it('corre los pasos en orden por iteración', async () => {
    const { order, result } = runWithOrder({ maxIterations: 1 });
    const r = await result;
    expect(order).toEqual(['recall', 'plan', 'execute', 'verify', 'test', 'learn']);
    expect(r.iterations).toBe(1);
  });

  it('requiere execute y lanza si falta', async () => {
    // @ts-expect-error probamos el camino de error
    await expect(runAgentLoop({ objective: 'x', tasks: ['t'] })).rejects.toThrow(/execute/);
  });

  it('respeta maxIterations', async () => {
    let calls = 0;
    const r = await runAgentLoop({
      objective: 'o',
      tasks: ['t'],
      maxIterations: 3,
      execute: async () => {
        calls++;
        return fakeGoalResult();
      },
    });
    expect(calls).toBe(3);
    expect(r.iterations).toBe(3);
  });

  it('se detiene temprano si verify marca shouldStop', async () => {
    let calls = 0;
    const r = await runAgentLoop({
      objective: 'o',
      tasks: ['t'],
      maxIterations: 5,
      execute: async () => {
        calls++;
        return fakeGoalResult();
      },
      verify: async (ctx) => {
        if (ctx.iteration >= 1) return { shouldStop: true };
      },
    });
    expect(calls).toBe(2); // iteración 0 y 1 (la 1 dispara stop)
    expect(r.stopped).toBe(true);
  });

  it('captura errores de execute y detiene el loop', async () => {
    const r = await runAgentLoop({
      objective: 'o',
      tasks: ['t'],
      maxIterations: 4,
      execute: async () => {
        throw new Error('boom');
      },
    });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('boom');
    expect(r.stopped).toBe(true);
    expect(r.iterations).toBe(0);
  });

  it('propaga la memoria acumulada entre iteraciones', async () => {
    const r = await runAgentLoop({
      objective: 'o',
      tasks: ['t'],
      maxIterations: 2,
      execute: async () => fakeGoalResult(),
      learn: async (ctx) => {
        ctx.memory[`seen_${ctx.iteration}`] = true;
      },
    });
    expect(r.memory).toHaveProperty('seen_0');
    expect(r.memory).toHaveProperty('seen_1');
  });

  it('plan puede refinar objetivo y tareas', async () => {
    const r = await runAgentLoop({
      objective: 'original',
      tasks: ['a'],
      maxIterations: 2,
      execute: async (ctx) => fakeGoalResult(ctx.objective),
      plan: async (ctx) => {
        if (ctx.iteration === 0) return { objective: 'refinado', tasks: ['a', 'b'] };
      },
    });
    // La segunda iteración debe usar el objetivo refinado.
    expect(r.objective).toBe('refinado');
    expect(r.finalTasks).toEqual(['a', 'b']);
    expect(r.results[1].results[0].output).toBe('refinado');
  });

  it('shouldStop del caller corta el bucle', async () => {
    let calls = 0;
    const r = await runAgentLoop({
      objective: 'o',
      tasks: ['t'],
      maxIterations: 5,
      execute: async () => {
        calls++;
        return fakeGoalResult();
      },
      shouldStop: (ctx) => ctx.iteration >= 2,
    });
    expect(calls).toBe(3);
    expect(r.stopped).toBe(true);
  });
});
