import { z } from 'zod';
import type { AiGateway } from '../ai/gateway';
import {
  EVAL_PASS_THRESHOLD,
  REGRESSION_TOLERANCE,
  judgeResultSchema,
  type JudgeResult,
} from '../ai/schemas';
import { guardrailsBlock } from '../ai/llm';
import type { Db } from '../db/client';
import { parseBlueprintJson } from './blueprint';

const JUDGE_SYSTEM = `You are a strict, unbiased evaluation judge. You score how well an AI agent's response satisfies evaluation criteria.
Score from 0.0 (completely fails) to 1.0 (fully satisfies all criteria). Be demanding: 1.0 only for excellent, complete responses.`;

export async function judgeResponse(
  gateway: AiGateway,
  input: { rubric: Array<{ criterion: string; weight: number; description: string }>; userInput: string; agentOutput: string },
): Promise<JudgeResult> {
  const rubricText = input.rubric.map((r) => `- [weight ${r.weight}] ${r.criterion}: ${r.description}`).join('\n');
  const result = await gateway.generateStructured<JudgeResult>({
    system: JUDGE_SYSTEM,
    prompt: `Evaluation criteria:\n${rubricText}\n\nUser input:\n${input.userInput}\n\nAgent response:\n${input.agentOutput}`,
    schema: judgeResultSchema,
  });
  return judgeResultSchema.parse(result);
}

export function weightedScore(rubric: Array<{ criterion: string; weight: number; description: string }>, judgment: JudgeResult): number {
  const totalWeight = rubric.reduce((sum, r) => sum + Math.max(r.weight, 0), 0) || 1;
  return Math.min(1, Math.max(0, judgment.score));
}

export function regressionGate(input: {
  currentAvgScore: number;
  proposedAvgScore: number;
  currentPassRate: number;
  proposedPassRate: number;
  tolerance?: number;
  minScore?: number;
}): { pass: boolean; reason: string } {
  const tolerance = input.tolerance ?? REGRESSION_TOLERANCE;
  const minScore = input.minScore ?? EVAL_PASS_THRESHOLD;
  if (input.proposedAvgScore < minScore) {
    return { pass: false, reason: `Proposed version scored ${input.proposedAvgScore.toFixed(2)} — below the minimum of ${minScore}` };
  }
  if (input.proposedAvgScore < input.currentAvgScore - tolerance) {
    return {
      pass: false,
      reason: `Proposed version (${input.proposedAvgScore.toFixed(2)}) regressed vs current (${input.currentAvgScore.toFixed(2)}) by more than tolerance ${tolerance}`,
    };
  }
  return { pass: true, reason: `Proposed version passes: ${input.proposedAvgScore.toFixed(2)} >= ${input.currentAvgScore.toFixed(2)} - ${tolerance}` };
}

export async function runEvalRun(
  db: Db,
  gateway: AiGateway,
  input: { agentVersionId: string },
): Promise<{ runId: string; avgScore: number; passRate: number; caseCount: number }> {
  const version = await db.agentVersion.findUnique({
    where: { id: input.agentVersionId },
    include: { blueprint: true },
  });
  if (!version) throw new Error('Agent version not found');

  const inputs: string[] = JSON.parse(version.blueprint.evalInputs || '[]');
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('No eval inputs configured for this agent');
  }

  const rubric = parseBlueprintJson(z.array(z.object({ criterion: z.string(), weight: z.number(), description: z.string() })), version.rubric);
  const guardrails = parseBlueprintJson(z.array(z.string()), version.guardrails);
  const system = version.systemPrompt + guardrailsBlock(guardrails);
  const expectedBehavior = `Satisfies the agent's rubric and guardrails.`;

  const run = await db.evalRun.create({ data: { agentVersionId: version.id, status: 'RUNNING' } });

  const results: Array<{ input: string; actualOutput: string; score: number; notes: string; verdict: string }> = [];
  for (const input of inputs) {
    let output = '';
    let score = 0;
    let notes = 'Evaluation failed';
    try {
      output = await gateway.chatText({ model: version.model, system, input });
      const judgment = await judgeResponse(gateway, { rubric, userInput: input, agentOutput: output });
      score = weightedScore(rubric, judgment);
      notes = judgment.notes;
    } catch (err) {
      notes = `Evaluation error: ${err instanceof Error ? err.message : String(err)}`;
    }
    results.push({ input, actualOutput: output, score, notes, verdict: score >= EVAL_PASS_THRESHOLD ? 'PASS' : 'FAIL' });
  }

  const avgScore = results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
  const passRate = results.length ? results.filter((r) => r.verdict === 'PASS').length / results.length : 0;

  await db.$transaction([
    db.evalRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', avgScore, passRate } }),
    ...results.map((r) =>
      db.evalCase.create({
        data: {
          evalRunId: run.id,
          input: r.input,
          expectedBehavior,
          actualOutput: r.actualOutput,
          score: r.score,
          notes: r.notes,
          verdict: r.verdict,
        },
      }),
    ),
  ]);

  return { runId: run.id, avgScore, passRate, caseCount: results.length };
}

export async function getLastEvalRun(db: Db, agentVersionId: string) {
  return db.evalRun.findFirst({
    where: { agentVersionId, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    include: { cases: true },
  });
}
