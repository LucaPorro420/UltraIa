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
  try {
    const draft = await generateBlueprintDraft(gateway, {
      name: parsed.data.name,
      taskDescription: parsed.data.taskDescription,
    });
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
