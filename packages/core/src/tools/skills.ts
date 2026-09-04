//! Skill pipeline — plan → build → test → review → ship → simplify.
// Each skill is a deterministic prompt template that calls the configured LLM.
// The pipeline is used by the agent system and the skill-pipeline UI component.
import { generateText } from 'ai';
import { resolveModel } from '../ai/llm';

export type SkillKind = 'plan' | 'build' | 'test' | 'review' | 'ship' | 'simplify';

export const SKILL_ORDER: SkillKind[] = ['plan', 'build', 'test', 'review', 'ship', 'simplify'];

export interface SkillRunInput {
  task: string;
  context?: string;
}

const SKILL_SYSTEM: Record<SkillKind, string> = {
  plan: `You are the Planning skill of an agent pipeline. Given a task, produce a concise, actionable implementation plan:
- Goal (one line), Phases (numbered, each with deliverable + acceptance criteria), Risks, Open questions.
Use Markdown with headings. Be specific, engineering-grade, no filler.`,
  build: `You are the Build skill of an agent pipeline. Given a task and optional context, produce the actual implementation artifact:
- Code (complete, runnable), files to touch (path per file), and a one-line note per file.
Use Markdown with fenced code blocks. Follow existing conventions when context is provided.`,
  test: `You are the Test/QA skill of an agent pipeline. Given an implementation or task, produce a test plan:
- Test cases (each with input, expected output, pass criteria), edge cases, and risk areas.
Use Markdown tables or lists. Be thorough but terse.`,
  review: `You are the Review skill of an agent pipeline. Given an implementation or task, review it critically:
- Summary verdict, Issues (severity, location, fix), Suggestions, Blockers.
Use Markdown with severity tags (CRITICAL/HIGH/MEDIUM/LOW). Be direct and constructive.`,
  ship: `You are the Ship/Release skill of an agent pipeline. Given the changes, produce release artifacts:
- Changelog entry (user-visible, plain language), commit message (conventional), deployment notes, rollback notes.
Use Markdown. No filler.`,
  simplify: `You are the Simplify/Refactor skill of an agent pipeline. Given an implementation, propose simplifications:
- Duplication to remove, over-engineering to cut, naming improvements, complexity reductions (with before/after snippets when useful).
Use Markdown. Prioritize the highest-impact 3-5 changes.`,
};

/**
 * Runs one of the six pipeline skills (plan → build → test → review → ship →
 * simplify) using the configured LLM. Registers as a tool so agents can invoke
 * the full agent-development pipeline inside a conversation.
 */
export async function runSkill(kind: SkillKind, input: SkillRunInput): Promise<string> {
  const task = input.task.trim();
  if (!task) throw new Error('Task is required');
  const system = SKILL_SYSTEM[kind];
  const prompt = [
    `Task:\n${task}`,
    input.context?.trim() ? `\nContext:\n${input.context.trim()}` : '',
    `\nProduce the ${kind} artifact now.`,
  ].join('\n');
  const { text } = await generateText({
    model: resolveModel(),
    system,
    prompt,
  });
  return text;
}
