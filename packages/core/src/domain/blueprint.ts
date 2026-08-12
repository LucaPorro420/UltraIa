import { z } from 'zod';
import type { AiGateway } from '../ai/gateway';
import { blueprintSchema, type BlueprintDraft } from '../ai/schemas';
import type { Db } from '../db/client';

const BLUEPRINT_SYSTEM = `You are UltraIa's Agent Architect: an expert at designing purpose-built AI agents.

Given a task description from a user, produce a complete agent blueprint with:
- name: short, product-like name (2-6 words)
- systemPrompt: the full system prompt the agent will run with. Make it precise, actionable, and include the task, expected input/output format, tone, constraints, and how to handle ambiguity. Never mention "you are an AI assistant" boilerplate; focus on role mastery.
- recommendedModel: pick a model name you would recommend (e.g. "gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1", "gpt-5-mini"). Prefer small models unless the task needs deep reasoning, in which case pick a stronger one.
- tools: which tools the agent may use. Only "calculator" is available. Use it for any task involving math.
- rubric: 3-6 evaluation criteria with a weight (0-1, weights need not sum to 1) and a description of what a good response looks like.
- guardrails: 2-5 hard rules the agent must always follow (safety, honesty, scope limits).
- suggestedEvalInputs: 3-5 realistic example user inputs that will be used to regression-test the agent.

Be concrete and specific. Quality over length.`;

export async function generateBlueprintDraft(
  gateway: AiGateway,
  input: { taskDescription: string; name?: string },
): Promise<BlueprintDraft> {
  if (!input.taskDescription.trim()) throw new Error('Task description is required');
  if (input.taskDescription.length > 4000) throw new Error('Task description is too long (max 4000 chars)');

  const prompt = [
    input.name ? `Suggested name: ${input.name}` : null,
    `Task description:\n${input.taskDescription.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const draft = await gateway.generateStructured<BlueprintDraft>({
    system: BLUEPRINT_SYSTEM,
    prompt,
    schema: blueprintSchema,
  });
  return blueprintSchema.parse(draft);
}

export async function createAgentBlueprint(
  db: Db,
  input: { workspaceId: string; name: string; taskDescription: string; draft: BlueprintDraft },
): Promise<{ blueprintId: string; versionId: string }> {
  return db.$transaction(async (tx) => {
    const blueprint = await tx.agentBlueprint.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.draft.name || input.name,
        taskDescription: input.taskDescription,
        evalInputs: JSON.stringify(input.draft.suggestedEvalInputs),
      },
    });
    const version = await tx.agentVersion.create({
      data: {
        blueprintId: blueprint.id,
        versionNumber: 1,
        systemPrompt: input.draft.systemPrompt,
        model: input.draft.recommendedModel,
        tools: JSON.stringify(input.draft.tools),
        rubric: JSON.stringify(input.draft.rubric),
        guardrails: JSON.stringify(input.draft.guardrails),
        status: 'ACTIVE',
      },
    });
    return { blueprintId: blueprint.id, versionId: version.id };
  });
}

export function parseBlueprintJson<T>(schema: z.ZodType<T>, raw: string): T {
  return schema.parse(JSON.parse(raw));
}
