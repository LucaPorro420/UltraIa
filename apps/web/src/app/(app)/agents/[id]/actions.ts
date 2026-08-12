'use server';

import { revalidatePath } from 'next/cache';
import {
  OpenAICompatibleGateway,
  collectImprovementSignals,
  createProposedVersion,
  decideAndPromoteVersion,
  prisma,
  proposeImprovement,
  rejectVersion,
  runEvalRun,
} from '@ultraia/core';
import { requireUser } from '@/lib/server/context';

const gateway = new OpenAICompatibleGateway();

async function getBlueprint(agentId: string) {
  const user = await requireUser();
  const blueprint = await prisma.agentBlueprint.findFirst({
    where: { id: agentId, workspace: { ownerId: user.id } },
  });
  if (!blueprint) throw new Error('Agent not found');
  return { user, blueprint };
}

export async function proposeImprovementAction(agentId: string): Promise<{ ok: boolean; error?: string }> {
  const { blueprint } = await getBlueprint(agentId);
  const active = await prisma.agentVersion.findFirst({
    where: { blueprintId: agentId, status: 'ACTIVE' },
    orderBy: { versionNumber: 'desc' },
  });
  if (!active) return { ok: false, error: 'No active version' };
  try {
    const signals = await collectImprovementSignals(prisma, agentId);
    const proposal = await proposeImprovement(gateway, {
      taskDescription: blueprint.taskDescription,
      currentSystemPrompt: active.systemPrompt,
      rubric: JSON.parse(active.rubric) as string[],
      guardrails: JSON.parse(active.guardrails) as string[],
      signals,
    });
    await createProposedVersion(prisma, agentId, proposal);
    revalidatePath(`/agents/${agentId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Improvement failed' };
  }
}

export async function runEvalsAction(agentVersionId: string, agentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await runEvalRun(prisma, gateway, { agentVersionId });
    revalidatePath(`/agents/${agentId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Eval run failed' };
  }
}

export async function approveVersionAction(
  versionId: string,
  agentId: string,
  force = false,
): Promise<{ ok: boolean; error?: string; approved?: boolean; reason?: string }> {
  try {
    const outcome = await decideAndPromoteVersion(prisma, gateway, { proposedVersionId: versionId, force });
    revalidatePath(`/agents/${agentId}`);
    return { ok: true, approved: outcome.approved, reason: outcome.reason };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Approval failed' };
  }
}

export async function rejectVersionAction(versionId: string, agentId: string): Promise<{ ok: boolean }> {
  await rejectVersion(prisma, versionId);
  revalidatePath(`/agents/${agentId}`);
  return { ok: true };
}

export async function addEvalInputAction(
  agentId: string,
  input: string,
): Promise<{ ok: boolean; error?: string }> {
  const { blueprint } = await getBlueprint(agentId);
  if (!input.trim()) return { ok: false, error: 'Input is required' };
  try {
    const inputs = JSON.parse(blueprint.evalInputs || '[]') as string[];
    inputs.push(input.trim());
    await prisma.agentBlueprint.update({ where: { id: agentId }, data: { evalInputs: JSON.stringify(inputs) } });
    revalidatePath(`/agents/${agentId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to add eval input' };
  }
}
