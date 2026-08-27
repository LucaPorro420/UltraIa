import { describe, it, expect, vi } from 'vitest';
import { runGoal, parseIntent, goalSystemPrompt, type RunGoalOpts } from './goal';

/** Dispatcher mock que registra llamadas y devuelve un string por defecto. */
function makeDispatch(opts?: {
  onCall?: (tool: string, args: Record<string, unknown>) => void;
  failTools?: string[];
}) {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const dispatch = vi.fn(async (tool: string, args: Record<string, unknown>) => {
    calls.push({ tool, args });
    opts?.onCall?.(tool, args);
    if (opts?.failTools?.includes(tool)) throw new Error(`fallo simulado en ${tool}`);
    return `resultado(${tool})`;
  });
  return { dispatch, calls };
}

/** complete mock que devuelve respuestas de una cola en orden. */
function makeCompleteQueue(responses: string[]) {
  const calls: Array<{ system: string; user: string }> = [];
  let i = 0;
  const complete = vi.fn(async (system: string, user: string) => {
    calls.push({ system, user });
    const r = responses[i] ?? responses[responses.length - 1] ?? '';
    i++;
    return r;
  });
  return { complete, calls };
}

describe('parseIntent', () => {
  it('detecta respuesta de texto plano', () => {
    const r = parseIntent('Esto es una respuesta directa.');
    expect(r.type).toBe('answer');
    expect(r.text).toContain('respuesta directa');
  });

  it('detecta tool en bloque ```json', () => {
    const r = parseIntent('```json\n{"tool":"publish","args":{"x":1}}\n```');
    expect(r.type).toBe('tool');
    expect(r.tool).toBe('publish');
    expect(r.args).toEqual({ x: 1 });
  });

  it('detecta tool en JSON inline', () => {
    const r = parseIntent('{"tool":"research","args":{}}');
    expect(r.type).toBe('tool');
    expect(r.tool).toBe('research');
  });

  it('JSON sin "tool" se trata como answer', () => {
    const r = parseIntent('```json\n{"foo":1}\n```');
    expect(r.type).toBe('answer');
  });

  it('texto con markdown pero sin JSON válido -> answer', () => {
    const r = parseIntent('Haz esto:\n- paso 1\n- paso 2');
    expect(r.type).toBe('answer');
  });
});

describe('goalSystemPrompt', () => {
  it('enumera las herramientas disponibles', () => {
    const p = goalSystemPrompt('Hacer X', ['a', 'b']);
    expect(p).toContain('Hacer X');
    expect(p).toContain('a, b');
  });

  it('maneja lista vacía sin romper', () => {
    const p = goalSystemPrompt('G', []);
    expect(p).toContain('ninguna');
  });
});

describe('runGoal', () => {
  it('tarea con respuesta directa (sin tool)', async () => {
    const { dispatch } = makeDispatch();
    const { complete } = makeCompleteQueue(['Respuesta final de la tarea.']);
    const res = await runGoal({
      goal: 'g',
      tasks: ['t1'],
      complete,
      dispatch,
      toolNames: ['publish'],
    });
    expect(res.results).toHaveLength(1);
    expect(res.results[0].status).toBe('done');
    expect(res.results[0].output).toBe('Respuesta final de la tarea.');
    expect(res.results[0].tool).toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
    expect(res.done).toBe(true);
  });

  it('tarea con tool: despacha y luego finaliza con respuesta del modelo', async () => {
    const { dispatch, calls } = makeDispatch();
    // Tras el tool, el modelo recibe el resultado y responde con texto (finaliza).
    const { complete } = makeCompleteQueue([
      '```json\n{"tool":"publish","args":{"id":7}}\n```',
      'Publicado correctamente.',
    ]);
    const res = await runGoal({
      goal: 'g',
      tasks: ['publicar algo'],
      complete,
      dispatch,
      toolNames: ['publish'],
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(calls[0]).toEqual({ tool: 'publish', args: { id: 7 } });
    expect(res.results[0].status).toBe('done');
    expect(res.results[0].tool).toBe('publish');
    expect(res.results[0].output).toBe('Publicado correctamente.');
  });

  it('encadena memoria entre tareas (el resultado del tool se inyecta en la siguiente)', async () => {
    const { dispatch } = makeDispatch();
    const { complete, calls } = makeCompleteQueue([
      '{"tool":"research","args":{}}', // tarea 1 -> tool
      'Conclusion basada en lo anterior.', // tarea 2 -> answer
    ]);
    const res = await runGoal({
      goal: 'g',
      tasks: ['investigar', 'redactar'],
      complete,
      dispatch,
      toolNames: ['research'],
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(res.results).toHaveLength(2);
    // La segunda llamada al modelo recibió el contexto de memoria con el resultado del tool.
    const secondUser = calls[1]?.user ?? '';
    expect(secondUser).toContain('resultado(research)');
    expect(res.results[1].output).toBe('Conclusion basada en lo anterior.');
  });

  it('error de un tool aísla la tarea pero el goal continúa', async () => {
    const { dispatch } = makeDispatch({ failTools: ['boom'] });
    const { complete } = makeCompleteQueue([
      '{"tool":"boom","args":{}}', // tarea 1, intento 1 -> falla
      '{"tool":"boom","args":{}}', // tarea 1, intento 2 -> falla
      '{"tool":"boom","args":{}}', // tarea 1, intento 3 -> falla (agota maxSteps)
      'Recuperado con texto.', // tarea 2 ok
    ]);
    const res = await runGoal({
      goal: 'g',
      tasks: ['malo', 'bueno'],
      complete,
      dispatch,
      toolNames: ['boom'],
      maxStepsPerTask: 3,
    });
    expect(res.results[0].status).toBe('error');
    expect(res.results[0].output).toContain('fallo simulado');
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(res.results[1].status).toBe('done');
    expect(res.results[1].output).toBe('Recuperado con texto.');
    expect(res.done).toBe(false);
  });

  it('respeta maxStepsPerTask y finaliza con el último resultado', async () => {
    const { dispatch, calls } = makeDispatch();
    // El modelo SIEMPRE devuelve tool (nunca answer) -> debe capar en maxSteps=3.
    const { complete } = makeCompleteQueue(Array(10).fill('{"tool":"loop","args":{}}'));
    const res = await runGoal({
      goal: 'g',
      tasks: ['infinito'],
      complete,
      dispatch,
      toolNames: ['loop'],
      maxStepsPerTask: 3,
    });
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(calls.every((c) => c.tool === 'loop')).toBe(true);
    expect(res.results[0].status).toBe('done');
    expect(res.results[0].output).toBe('resultado(loop)');
  });

  it('invoca callbacks onTaskStart/onTaskEnd', async () => {
    const { dispatch } = makeDispatch();
    const { complete } = makeCompleteQueue(['ok']);
    const starts: string[] = [];
    const ends: string[] = [];
    await runGoal({
      goal: 'g',
      tasks: ['t1', 't2'],
      complete,
      dispatch,
      onTaskStart: (t) => starts.push(t),
      onTaskEnd: (r) => ends.push(r.task),
    });
    expect(starts).toEqual(['t1', 't2']);
    expect(ends).toEqual(['t1', 't2']);
  });
});
