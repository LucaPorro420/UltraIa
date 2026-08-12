import { z } from 'zod';

export const rubricItemSchema = z.object({
  criterion: z.string().min(2).max(200),
  weight: z.number().min(0).max(1),
  description: z.string().min(2).max(500),
});

export const blueprintSchema = z.object({
  name: z.string().min(2).max(100),
  systemPrompt: z.string().min(10).max(8000),
  recommendedModel: z.string().min(1).max(100),
  tools: z.array(z.enum(['calculator'])).max(5),
  rubric: z.array(rubricItemSchema).min(1).max(8),
  guardrails: z.array(z.string().max(500)).max(10),
  suggestedEvalInputs: z.array(z.string().min(1).max(2000)).min(3).max(8),
});

export type BlueprintDraft = z.infer<typeof blueprintSchema>;

export const judgeResultSchema = z.object({
  score: z.number().min(0).max(1),
  notes: z.string().max(1000),
});

export type JudgeResult = z.infer<typeof judgeResultSchema>;

export const improvementProposalSchema = z.object({
  suggestedSystemPrompt: z.string().min(10).max(8000),
  changeSummary: z.string().min(5).max(1000),
});

export type ImprovementProposal = z.infer<typeof improvementProposalSchema>;

export const EVAL_PASS_THRESHOLD = 0.6;
export const REGRESSION_TOLERANCE = 0.05;
