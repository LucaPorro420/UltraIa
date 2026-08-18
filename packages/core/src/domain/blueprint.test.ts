import { describe, expect, it } from 'vitest';
import type { AiGateway } from '../ai/gateway';
import type { Capability } from '../shared/domain';
import { generateBlueprintDraft } from './blueprint';

const validDraft = {
  name: 'Sales Email Writer',
  systemPrompt: 'You write concise, persuasive sales emails based on a product description and prospect profile.',
  recommendedModel: 'gpt-4o-mini',
  tools: ['calculator'],
  rubric: [
    { criterion: 'Persuasion', weight: 0.5, description: 'Email compels the reader to respond' },
    { criterion: 'Clarity', weight: 0.3, description: 'Message is easy to understand' },
    { criterion: 'Tone', weight: 0.2, description: 'Professional and friendly' },
  ],
  guardrails: ['Never invent facts about the product', 'No spammy claims'],
  suggestedEvalInputs: ['Write an email for a CRM product', 'Write an email for a fitness app', 'Write an email for a SaaS pricing page'],
};

const fakeGateway: AiGateway = {
  async generateStructured<T>(): Promise<T> {
    return validDraft as unknown as T;
  },
  async chatText() {
    return 'ok';
  },
};

describe('generateBlueprintDraft', () => {
  it('generates and validates a blueprint from a task description', async () => {
    const draft = await generateBlueprintDraft(fakeGateway, { taskDescription: 'Write sales emails for products' });
    expect(draft.name).toBe('Sales Email Writer');
    expect(draft.rubric).toHaveLength(3);
    expect(draft.guardrails.length).toBeGreaterThan(0);
    expect(draft.suggestedEvalInputs.length).toBeGreaterThanOrEqual(3);
  });

  it('includes user-suggested capabilities in the prompt sent to the LLM', async () => {
    let capturedPrompt = '';
    const capturingGateway: AiGateway = {
      ...fakeGateway,
      async generateStructured<T>({ prompt }): Promise<T> {
        capturedPrompt = prompt;
        return validDraft as unknown as T;
      },
    };
    const caps: Capability[] = ['web', 'image'];
    await generateBlueprintDraft(capturingGateway, { taskDescription: 'Write sales emails', capabilities: caps });
    expect(capturedPrompt).toContain('User-suggested capabilities (hint, not binding): web, image');
  });

  it('works without capabilities (backward compatible)', async () => {
    const draft = await generateBlueprintDraft(fakeGateway, { taskDescription: 'Write sales emails' });
    expect(draft.name).toBe('Sales Email Writer');
  });

  it('rejects empty task descriptions', async () => {
    await expect(generateBlueprintDraft(fakeGateway, { taskDescription: '   ' })).rejects.toThrow();
  });

  it('rejects invalid drafts produced by the model', async () => {
    const badGateway: AiGateway = {
      ...fakeGateway,
      async generateStructured<T>(): Promise<T> {
        return { ...validDraft, rubric: [] } as unknown as T;
      },
    };
    await expect(generateBlueprintDraft(badGateway, { taskDescription: 'Write emails' })).rejects.toThrow();
  });
});
