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
import { evaluationCache, evaluationCacheKey } from '../ai/evaluation-cache';

const JUDGE_SYSTEM = `You are a strict, unbiased evaluation judge. You score how well an AI agent's response satisfies evaluation criteria.
Score from 0.0 (completely fails) to 1.0 (fully satisfies all criteria). Be demanding: 1.0 only for excellent, complete responses.

For the "criterionScores" field, score the agent's response against EACH criterion by its exact name (0.0-1.0).
Return the overall "score" as a sensible fallback equal to the weighted average of your criterion scores.`;

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
  if (judgment.criterionScores && judgment.criterionScores.length > 0) {
    const byCriterion = new Map(judgment.criterionScores.map((c) => [c.criterion, c.score]));
    let totalWeight = 0;
    let weighted = 0;
    for (const r of rubric) {
      const s = byCriterion.get(r.criterion);
      if (typeof s === 'number') {
        const w = Math.max(0, r.weight);
        weighted += Math.min(1, Math.max(0, s)) * w;
        totalWeight += w;
      }
    }
    if (totalWeight > 0) return Math.min(1, Math.max(0, weighted / totalWeight));
  }
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
  if (input.proposedPassRate < input.currentPassRate - tolerance) {
    return {
      pass: false,
      reason: `Proposed version pass rate (${(input.proposedPassRate * 100).toFixed(0)}%) dropped below current (${(input.currentPassRate * 100).toFixed(0)}%) by more than tolerance ${tolerance}`,
    };
  }
  return { pass: true, reason: `Proposed version passes: ${input.proposedAvgScore.toFixed(2)} >= ${input.currentAvgScore.toFixed(2)} - ${tolerance}` };
}

export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  worker: (value: T, index: number) => Promise<R>,
  concurrency = 3,
): Promise<R[]> {
  const limit = Math.max(1, Math.min(Math.floor(concurrency) || 1, values.length || 1));
  const output = new Array<R>(values.length);
  let cursor = 0;
  async function consume(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      output[index] = await worker(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => consume()));
  return output;
}

export async function runEvalRun(
  db: Db,
  gateway: AiGateway,
  input: { agentVersionId: string; concurrency?: number; evaluatorMode?: string },
): Promise<{
  runId: string;
  learningRunId?: string;
  avgScore: number;
  passRate: number;
  caseCount: number;
  completedCases: number;
  cachedCases: number;
  durationMs: number;
  gateState: 'PASS' | 'FAIL';
}> {
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

  const startedAt = Date.now();
  const run = await db.evalRun.create({
    data: { agentVersionId: version.id, status: 'RUNNING', totalCases: inputs.length },
  });
  const learningRun = await db.learningRun.create({
    data: { agentVersionId: version.id, totalCases: inputs.length, status: 'RUNNING' },
  });

  let cachedCases = 0;
  const results = await mapWithConcurrency(
    inputs,
    async (caseInput) => {
      const key = evaluationCacheKey({
        agentVersionId: version.id,
        model: version.model,
        systemPrompt: version.systemPrompt,
        guardrails,
        rubric,
        input: caseInput,
        evaluatorMode: input.evaluatorMode ?? 'default',
      });
      const cached = evaluationCache.get(key);
      if (cached) {
        cachedCases++;
        return { input: caseInput, ...cached };
      }

      let output = '';
      let score = 0;
      let notes = 'Evaluation failed';
      try {
        output = await gateway.chatText({ model: version.model, system, input: caseInput });
        const judgment = await judgeResponse(gateway, { rubric, userInput: caseInput, agentOutput: output });
        score = weightedScore(rubric, judgment);
        notes = judgment.notes;
        const verdict = score >= EVAL_PASS_THRESHOLD ? 'PASS' : 'FAIL';
        const result = { actualOutput: output, score, notes, verdict };
        evaluationCache.set(key, result);
        return { input: caseInput, ...result };
      } catch (err) {
        notes = `Evaluation error: ${err instanceof Error ? err.message : 'provider_error'}`;
        return { input: caseInput, actualOutput: output, score, notes, verdict: 'FAIL' };
      }
    },
    input.concurrency ?? 3,
  );

  const avgScore = results.length ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
  const passRate = results.length ? results.filter((r) => r.verdict === 'PASS').length / results.length : 0;
  const durationMs = Date.now() - startedAt;
  const gateState = results.every((result) => result.verdict === 'PASS') ? 'PASS' : 'FAIL';

  await db.$transaction([
    db.evalRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        avgScore,
        passRate,
        completedCases: results.length,
        cachedCases,
        durationMs,
        gateState,
      },
    }),
    db.learningRun.update({
      where: { id: learningRun.id },
      data: {
        status: 'COMPLETED',
        completedCases: results.length,
        cachedCases,
        durationMs,
        regressionScore: avgScore,
        gateState,
        completedAt: new Date(),
      },
    }),
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

  return {
    runId: run.id,
    learningRunId: learningRun.id,
    avgScore,
    passRate,
    caseCount: results.length,
    completedCases: results.length,
    cachedCases,
    durationMs,
    gateState,
  };
}

export async function getLastEvalRun(db: Db, agentVersionId: string) {
  return db.evalRun.findFirst({
    where: { agentVersionId, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    include: { cases: true },
  });
}

/** Marks abandoned runs so a later retry can reuse valid cached cases. */
export async function markInterruptedLearningRuns(db: Db, maxAgeMs = 15 * 60 * 1000): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const result = await db.learningRun.updateMany({
    where: { status: 'RUNNING', startedAt: { lt: cutoff } },
    data: { status: 'INTERRUPTED', gateState: 'INTERRUPTED', completedAt: new Date() },
  });
  return result.count;
}
