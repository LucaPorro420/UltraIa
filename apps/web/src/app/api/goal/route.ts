import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';
import { runGoal, buildGoalDispatch, resolveModel } from '@ultraia/core';
import { generateText } from 'ai';
import { z } from 'zod';

const Body = z.object({
  goal: z.string().min(1).max(2000),
  tasks: z.array(z.string().min(1).max(2000)).min(1).max(20),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { goal, tasks, model } = parsed.data;

  const complete = async (system: string, userPrompt: string): Promise<string> => {
    const r = await generateText({ model: resolveModel(model), system, prompt: userPrompt });
    return r.text;
  };
  const dispatchMap = buildGoalDispatch();
  const dispatch = async (tool: string, args: Record<string, unknown>): Promise<unknown> => {
    const fn = dispatchMap[tool];
    if (!fn) throw new Error(`Herramienta no mapeada en /goal: ${tool}`);
    return fn(args);
  };

  try {
    const result = await runGoal({
      goal,
      tasks,
      complete,
      dispatch,
      toolNames: Object.keys(dispatchMap),
      maxStepsPerTask: 5,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
