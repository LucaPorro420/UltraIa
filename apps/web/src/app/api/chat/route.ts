import {
  chatStream,
  guardrailsBlock,
  prisma,
  AiUnavailableError,
  runGoal,
  resolveModel,
  buildGoalDispatch,
} from '@ultraia/core';
import { z } from 'zod';
import { getBlueprintForUser, getActiveVersion } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { generateText } from 'ai';

const MODO_IDS = ['libre', 'plan', 'build', 'test', 'review', 'ship', 'simplify', 'p-p', 'p-b', 'l-t', 's-d'] as const;

/** Directivas de modo inyectadas al system prompt (F2 workspace multi-modo). */
const MODO_DIRECTIVES: Record<(typeof MODO_IDS)[number], string> = {
  libre: '',
  plan: 'MODO PLAN: antes de responder, desglosa la tarea en pasos numerados con criterios de verificacion; no implementes todavia.',
  build: 'MODO BUILD: ejecuta/implementa de forma concreta y accionable; entrega artefactos o pasos exactos, sin re-planificar.',
  test: 'MODO TEST: disena y ejecuta verificaciones; enumera casos, resultados esperados y como reproducirlos.',
  review: 'MODO REVIEW: audita criticamente lo ultimo discutido; lista riesgos, errores y mejoras priorizadas.',
  ship: 'MODO SHIP: prepara la entrega final; checklist de cierre, mensajes de commit y pasos de publicacion.',
  simplify: 'MODO SIMPLIFY: reduce complejidad; propone la version mas simple que cumpla lo pedido y elimina exceso.',
  'p-p': 'MODO P-P (Planificar): sensa el problema, investiga con herramientas disponibles y entrega un plan escrito con prediccion del resultado ANTES de actuar.',
  'p-b': 'MODO P-B (Construir): implementa segun el plan acordado, verifica el proyecto completo y reporta evidencia.',
  'l-t': 'MODO L-T (Aprender-Probar): consulta lecciones y verdades verificadas previas; define estrategia de prueba explicita.',
  's-d': 'MODO S-D (Especificar-Disenar): produce especificacion y decisiones de disenio ANTES de escribir solucion.',
};

const bodySchema = z.object({
  agentId: z.string(),
  conversationId: z.string(),
  modo: z.enum(MODO_IDS).optional(),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(16000) }))
    .min(1)
    .max(50),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const { agentId, conversationId, messages, modo } = parsed.data;

  // Parallel DB queries (rule: async-parallel) — all independent
  const [blueprint, conversation, version] = await Promise.all([
    getBlueprintForUser(prisma, user.id, agentId),
    prisma.conversation.findUnique({ where: { id: conversationId } }),
    getActiveVersion(prisma, agentId),
  ]);

  if (!blueprint) return new Response('Agent not found', { status: 404 });
  if (!conversation || conversation.blueprintId !== agentId) {
    return new Response('Conversation not found', { status: 404 });
  }
  if (!version) return new Response('No active version for this agent', { status: 409 });

  const tools = JSON.parse(version.tools) as string[];
  const guardrails = JSON.parse(version.guardrails) as string[];
  const lastUserText =
    [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  // --- Comando /goal: ejecutor autonomo de todo el proyecto ---
  if (lastUserText.trim().startsWith('/goal')) {
    return handleGoalCommand({ version, lastUserText, tools, guardrails, conversationId });
  }

  let result;
  try {
    const modoDirective = modo ? (MODO_DIRECTIVES[modo] ?? '') : '';
    result = chatStream({
      model: version.model,
      system:
        version.systemPrompt +
        guardrailsBlock(guardrails) +
        (modoDirective ? `\n\n${modoDirective}` : ''),
      messages,
      tools,
      userId: user.id,
      onFinish: async ({ text }) => {
        const count = await prisma.message.count({ where: { conversationId } });
        const userSeq = count + 1;
        await prisma.message.createMany({
          data: [
            { conversationId, sequence: userSeq, role: 'user', content: lastUserText },
            { conversationId, sequence: userSeq + 1, role: 'assistant', content: text },
          ],
        });
        if (userSeq === 1) {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: lastUserText.slice(0, 60) },
          });
        }
      },
    });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return new Response(e.message, { status: 503 });
    }
    throw e;
  }

  return result.toDataStreamResponse();
}

// --- /goal: el dispatch de tools se centraliza en buildGoalDispatch() (packages/core/src/tools/goal.ts) ---

async function handleGoalCommand(args: {
  version: { model: string; systemPrompt: string };
  lastUserText: string;
  tools: string[];
  guardrails: string[];
  conversationId: string;
}): Promise<Response> {
  const { version, lastUserText, tools, guardrails, conversationId } = args;
  const body = lastUserText.trim().replace(/^\/goal\s*/i, '');
  const lines = body.split('\n').map((s) => s.trim()).filter(Boolean);
  const goal = lines[0] ?? 'Ejecutar las tareas del proyecto';
  const taskLines = lines.slice(1);
  const tasks = taskLines.length ? taskLines : [goal];

  const complete = async (system: string, user: string): Promise<string> => {
    const r = await generateText({ model: resolveModel(version.model), system, prompt: user });
    return r.text;
  };

  const dispatchMap = buildGoalDispatch();
  const dispatch = async (tool: string, args: Record<string, unknown>): Promise<unknown> => {
    const fn = dispatchMap[tool];
    if (!fn) throw new Error(`Herramienta no mapeada en /goal: ${tool}`);
    return fn(args);
  };

  const { results, done } = await runGoal({
    goal,
    tasks,
    complete,
    dispatch,
    toolNames: Object.keys(dispatchMap),
    maxStepsPerTask: 5,
  });

  const report = results
    .map(
      (r) =>
        `- [${r.status === 'done' ? 'OK' : 'ERR'}] ${r.task}${r.tool ? ` (${r.tool})` : ''}: ${String(r.output).slice(0, 400)}`,
    )
    .join('\n');
  const summary = `Objetivo: ${goal}\nEstado: ${done ? 'COMPLETADO' : 'PARCIAL'}\n\nResultados:\n${report}`;

  // Presentar por el path de streaming existente para no romper la UI del chat.
  const result = chatStream({
    model: version.model,
    system:
      version.systemPrompt +
      guardrailsBlock(guardrails) +
      '\n\nEres el ejecutor autonomo de UltraIa. Presenta el resultado del goal de forma clara, en espanol, resaltando que herramientas se usaron y cual fue el resultado de cada tarea.',
    messages: [
      { role: 'user', content: `Objetivo: ${goal}\nTareas: ${tasks.join('; ')}` },
      { role: 'assistant', content: summary },
    ],
    tools,
    userId: user.id,
    onFinish: async ({ text }) => {
      const count = await prisma.message.count({ where: { conversationId } });
      const userSeq = count + 1;
      await prisma.message.createMany({
        data: [
          { conversationId, sequence: userSeq, role: 'user', content: lastUserText },
          { conversationId, sequence: userSeq + 1, role: 'assistant', content: text },
        ],
      });
      if (userSeq === 1) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { title: goal.slice(0, 60) },
        });
      }
    },
  });
  return result.toDataStreamResponse();
}
