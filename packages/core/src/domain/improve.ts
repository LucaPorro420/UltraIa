import { z } from 'zod';
import type { AiGateway } from '../ai/gateway';
import { improvementProposalSchema, type ImprovementProposal } from '../ai/schemas';
import type { Db } from '../db/client';
import { parseBlueprintJson } from './blueprint';
import { getLastEvalRun, regressionGate, runEvalRun } from './eval';

const IMPROVE_SYSTEM = `You are UltraIa's Agent Improvement Engine. You review real usage feedback and failed evaluations of an AI agent and propose a strictly better system prompt.
Rules:
- Keep the agent's core purpose unchanged.
- Fix concrete, recurring problems the evidence shows. Do not invent problems.
- Preserve what works. Change only what the evidence justifies.
- The new prompt must remain self-contained (it replaces the old one entirely).
- Summarize changes clearly: what you changed and why.`;

export interface ImprovementSignal {
  critiques: string[];
  failedCases: Array<{ input: string; output: string; notes: string }>;
}

export async function collectImprovementSignals(
  db: Db,
  blueprintId: string,
  opts: { badFeedbackLimit?: number; failedCaseLimit?: number } = {},
): Promise<ImprovementSignal> {
  const badFeedback = await db.feedback.findMany({
    where: { conversation: { blueprintId }, rating: 'BAD' },
    orderBy: { createdAt: 'desc' },
    take: opts.badFeedbackLimit ?? 20,
    include: { conversation: true },
  });
  const critiques = badFeedback
    .map((f) => f.critique)
    .filter((c): c is string => Boolean(c && c.trim()))
    .map((c) => c.trim());

  const lastRuns = await db.evalRun.findMany({
    where: { agentVersion: { blueprintId }, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { cases: { where: { verdict: 'FAIL' } } },
  });
  const failedCases = lastRuns
    .flatMap((run) => run.cases)
    .slice(0, opts.failedCaseLimit ?? 10)
    .map((c) => ({ input: c.input, output: c.actualOutput, notes: c.notes }));

  return { critiques, failedCases };
}

export async function proposeImprovement(
  gateway: AiGateway,
  input: {
    taskDescription: string;
    currentSystemPrompt: string;
    rubric: string[];
    guardrails: string[];
    signals: ImprovementSignal;
  },
): Promise<ImprovementProposal> {
  if (input.signals.critiques.length === 0 && input.signals.failedCases.length === 0) {
    throw new Error('No improvement signals yet: add BAD feedback or run evaluations first');
  }
  const prompt = [
    `Agent purpose: ${input.taskDescription}`,
    `Current system prompt:\n${input.currentSystemPrompt}`,
    `Evaluation criteria: ${input.rubric.join(' | ')}`,
    `Guardrails: ${input.guardrails.join(' | ')}`,
    `Negative feedback critiques (${input.signals.critiques.length}):`,
    input.signals.critiques.map((c) => `- ${c}`).join('\n') || '(none)',
    `Failed evaluation cases (${input.signals.failedCases.length}):`,
    input.signals.failedCases.map((c, i) => `${i + 1}. input: ${c.input}\n   output: ${c.output.slice(0, 500)}\n   judge notes: ${c.notes}`).join('\n') || '(none)',
  ].join('\n\n');

  const proposal = await gateway.generateStructured<ImprovementProposal>({
    system: IMPROVE_SYSTEM,
    prompt,
    schema: improvementProposalSchema,
  });
  return improvementProposalSchema.parse(proposal);
}

export async function createProposedVersion(
  db: Db,
  blueprintId: string,
  proposal: ImprovementProposal,
): Promise<{ versionId: string; versionNumber: number }> {
  const active = await db.agentVersion.findFirst({
    where: { blueprintId, status: 'ACTIVE' },
    orderBy: { versionNumber: 'desc' },
  });
  if (!active) throw new Error('No active version found');
  const versionNumber = active.versionNumber + 1;
  const version = await db.agentVersion.create({
    data: {
      blueprintId,
      versionNumber,
      systemPrompt: proposal.suggestedSystemPrompt,
      model: active.model,
      tools: active.tools,
      rubric: active.rubric,
      guardrails: active.guardrails,
      status: 'PENDING',
      changeSummary: proposal.changeSummary,
    },
  });
  return { versionId: version.id, versionNumber };
}

export async function decideAndPromoteVersion(
  db: Db,
  gateway: AiGateway,
  input: { proposedVersionId: string; force?: boolean },
): Promise<{ approved: boolean; reason: string; proposedAvgScore: number | null; currentAvgScore: number | null }> {
  const proposed = await db.agentVersion.findUnique({
    where: { id: input.proposedVersionId },
    include: { blueprint: true },
  });
  if (!proposed) throw new Error('Version not found');
  if (proposed.status !== 'PENDING') throw new Error(`Version is not pending (status: ${proposed.status})`);

  const current = await db.agentVersion.findFirst({
    where: { blueprintId: proposed.blueprintId, status: 'ACTIVE' },
    orderBy: { versionNumber: 'desc' },
  });
  if (!current) throw new Error('No active version found');

  if (input.force) {
    await promote(db, proposed.id);
    return { approved: true, reason: 'Forced approval by admin', proposedAvgScore: null, currentAvgScore: null };
  }

  const proposedRun = await runEvalRun(db, gateway, { agentVersionId: proposed.id });
  const currentRun = await getLastEvalRun(db, current.id);

  if (!currentRun) {
    await promote(db, proposed.id);
    return {
      approved: true,
      reason: `No baseline eval for current version; proposed version scored ${proposedRun.avgScore.toFixed(2)} and was approved`,
      proposedAvgScore: proposedRun.avgScore,
      currentAvgScore: null,
    };
  }

  const decision = regressionGate({
    currentAvgScore: currentRun.avgScore,
    proposedAvgScore: proposedRun.avgScore,
    currentPassRate: currentRun.passRate,
    proposedPassRate: proposedRun.passRate,
  });

  if (decision.pass) {
    await promote(db, proposed.id);
  } else {
    await db.agentVersion.update({ where: { id: proposed.id }, data: { status: 'REJECTED' } });
  }
  return {
    approved: decision.pass,
    reason: decision.reason,
    proposedAvgScore: proposedRun.avgScore,
    currentAvgScore: currentRun.avgScore,
  };
}

async function promote(db: Db, proposedId: string): Promise<void> {
  const proposed = await db.agentVersion.findUniqueOrThrow({ where: { id: proposedId } });
  await db.$transaction([
    db.agentVersion.updateMany({
      where: { blueprintId: proposed.blueprintId, status: 'ACTIVE' },
      data: { status: 'SUPERSEDED' },
    }),
    db.agentVersion.update({ where: { id: proposedId }, data: { status: 'ACTIVE' } }),
  ]);
}
