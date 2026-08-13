'use server';

import { redirect } from 'next/navigation';
import { OpenAICompatibleGateway, createAgentBlueprint, generateBlueprintDraft, prisma } from '@ultraia/core';
import { z } from 'zod';
import { requireUser } from '@/lib/server/context';

const gateway = new OpenAICompatibleGateway();

export async function createAgentAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const user = await requireUser();
  const parsed = z
    .object({
      name: z.string().trim().max(100).optional(),
      taskDescription: z.string().trim().min(10).max(4000),
    })
    .safeParse({ name: formData.get('name') || undefined, taskDescription: formData.get('taskDescription') });
  if (!parsed.success) {
    return { error: 'Describe the task with at least 10 characters' };
  }
  const allowed = ['web', 'image', 'video', 'music', 'design'] as const;
  const tools = formData
    .getAll('tools')
    .map(String)
    .filter((t): t is (typeof allowed)[number] => (allowed as readonly string[]).includes(t));
  try {
    const draft = await generateBlueprintDraft(gateway, {
      name: parsed.data.name,
      taskDescription: parsed.data.taskDescription,
    });
    if (tools.length) draft.tools = tools as typeof draft.tools;
    const { blueprintId } = await createAgentBlueprint(prisma, {
      workspaceId: user.workspaceId,
      name: parsed.data.name ?? '',
      taskDescription: parsed.data.taskDescription,
      draft,
    });
    redirect(`/agents/${blueprintId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to design the agent' };
  }
  return null;
}

export async function deleteAgentAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const user = await requireUser();
  const agentId = String(formData.get('agentId') || '');
  if (!agentId) return { error: 'Missing agent id' };

  const blueprint = await prisma.agentBlueprint.findFirst({
    where: { id: agentId, workspace: { ownerId: user.id } },
  });
  if (!blueprint) return { error: 'Agent not found' };

  await prisma.agentBlueprint.delete({ where: { id: agentId } });
  redirect('/dashboard');
}

export async function cloneAgentAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const user = await requireUser();
  const agentId = String(formData.get('agentId') || '');
  if (!agentId) return { error: 'Missing agent id' };

  const source = await prisma.agentBlueprint.findFirst({
    where: { id: agentId, workspace: { ownerId: user.id } },
    include: { versions: { where: { status: 'ACTIVE' }, take: 1 } },
  });
  if (!source) return { error: 'Agent not found' };

  const active = source.versions[0];
  const created = await prisma.$transaction(async (tx) => {
    const bp = await tx.agentBlueprint.create({
      data: {
        workspaceId: user.workspaceId,
        name: `${source.name} (copy)`,
        taskDescription: source.taskDescription,
        evalInputs: source.evalInputs,
        isPublic: false,
      },
    });
    if (active) {
      await tx.agentVersion.create({
        data: {
          blueprintId: bp.id,
          versionNumber: 1,
          systemPrompt: active.systemPrompt,
          model: active.model,
          tools: active.tools,
          rubric: active.rubric,
          guardrails: active.guardrails,
          status: 'ACTIVE',
        },
      });
    }
    return bp;
  });

  redirect(`/agents/${created.id}`);
}
