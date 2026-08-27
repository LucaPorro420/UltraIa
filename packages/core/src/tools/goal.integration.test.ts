import { describe, it, expect } from 'vitest';
import { runGoal, buildGoalDispatch, parseIntent, goalSystemPrompt } from './goal';

/** complete() que devuelve respuestas de una cola, en orden. */
function queuedComplete(responses: string[]) {
  let i = 0;
  return async (_system: string, _user: string): Promise<string> => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return r;
  };
}

describe('runGoal — encadenado de tools', () => {
  it('investigar -> crear -> responder encadena y termina con texto', async () => {
    const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
    const complete = queuedComplete([
      '```json\n{"tool":"research_search","args":{"q":"paisajes"}}\n```',
      '```json\n{"tool":"content_generate","args":{"tema":"viajes"}}\n```',
      'Listo: investigue y cree el borrador de viajes.',
    ]);
    const dispatch = async (tool: string, args: Record<string, unknown>) => {
      calls.push({ tool, args });
      return `OUT_${tool}`;
    };

    const res = await runGoal({
      goal: 'Haz una campana de viajes',
      tasks: ['Investiga y crea un post'],
      complete,
      dispatch,
      toolNames: ['research_search', 'content_generate'],
      maxStepsPerTask: 5,
    });

    expect(res.done).toBe(true);
    expect(res.results).toHaveLength(1);
    expect(calls.map((c) => c.tool)).toEqual(['research_search', 'content_generate']);
    expect(res.results[0].status).toBe('done');
    expect(res.results[0].output).toContain('Listo');
    expect(res.results[0].tool).toBe('content_generate');
  });

  it('captura el error de un tool y deja que el modelo responda con texto', async () => {
    const complete = queuedComplete([
      '```json\n{"tool":"content_generate","args":{}}\n```',
      'No pude crear el contenido por un fallo tecnico; aqui va un resumen manual.',
    ]);
    const dispatch = async () => {
      throw new Error('provider caido');
    };
    const res = await runGoal({
      goal: 'g',
      tasks: ['t'],
      complete,
      dispatch,
      toolNames: ['content_generate'],
      maxStepsPerTask: 5,
    });
    expect(res.results[0].status).toBe('done');
    expect(res.results[0].error).toBeDefined();
    expect(res.results[0].error).toContain('provider caido');
    expect(res.results[0].output).toContain('resumen manual');
  });

  it('marca error si el tool falla y el modelo nunca responde texto', async () => {
    const complete = queuedComplete(['```json\n{"tool":"content_generate","args":{}}\n```']);
    const dispatch = async () => {
      throw new Error('boom');
    };
    const res = await runGoal({
      goal: 'g',
      tasks: ['t'],
      complete,
      dispatch,
      toolNames: ['content_generate'],
      maxStepsPerTask: 3,
    });
    expect(res.results[0].status).toBe('error');
    expect(res.results[0].error).toContain('boom');
    expect(res.done).toBe(false);
  });

  it('respeta el presupuesto global de pasos', async () => {
    let count = 0;
    const complete = queuedComplete(['```json\n{"tool":"research_search","args":{}}\n```']);
    const dispatch = async () => {
      count++;
      return 'x';
    };
    const res = await runGoal({
      goal: 'g',
      tasks: ['t1', 't2', 't3'],
      complete,
      dispatch,
      toolNames: ['research_search'],
      maxStepsPerTask: 5,
      maxTotalSteps: 2,
    });
    // Solo 2 pasos globales => ninguna tarea llega a respuesta textual.
    expect(count).toBeLessThanOrEqual(2);
    expect(res.results.every((r) => r.status === 'error' || r.status === 'done')).toBe(true);
  });
});

describe('buildGoalDispatch — cobertura de subsystems', () => {
  it('expone los intents clave de creadores, planificador, investigacion, memoria, mensajeria y media-score', () => {
    const d = buildGoalDispatch();
    const keys = Object.keys(d);
    for (const k of [
      'content_generate',
      'content_redact',
      'content_script',
      'present_package',
      'travel_plan',
      'travel_take',
      'travel_lead',
      'skill_run',
      'planner_improve',
      'orchestrator_cycle',
      'research_read',
      'research_search',
      'research_github',
      'research_rss',
      'research_video',
      'vault_manage',
      'topic_briefs',
      'diagram_render',
      'diagram_timeline',
      'publish_submit',
      'telegram_send',
      'media_score',
      'memory_recall',
    ]) {
      expect(keys).toContain(k);
    }
    expect(keys.length).toBeGreaterThanOrEqual(23);
  });
});

describe('parseIntent / goalSystemPrompt', () => {
  it('parsea un tool-call y una respuesta de texto', () => {
    expect(parseIntent('```json\n{"tool":"x","args":{"a":1}}\n```')).toMatchObject({ type: 'tool', tool: 'x' });
    expect(parseIntent('Solo texto de respuesta').type).toBe('answer');
  });
  it('el system prompt menciona el objetivo y las tools', () => {
    const p = goalSystemPrompt('mi objetivo', ['a', 'b']);
    expect(p).toContain('mi objetivo');
    expect(p).toContain('a, b');
  });
});
