import { describe, expect, it } from 'vitest';
import type { AiGateway } from '../ai/gateway';
import { generateBlueprintDraft } from '../domain/blueprint';
import type { BlueprintDraft } from '../ai/schemas';

const draft: BlueprintDraft = {
  name: 'Sales Email Writer',
  systemPrompt: 'You are an expert sales copywriter for a B2B SaaS company.',
  recommendedModel: 'gpt-4o-mini',
  tools: ['calculator'],
  rubric: [{ criterion: 'Persuasiveness', weight: 0.6, description: 'Compelling and clear' }],
  guardrails: ['Do not invent facts or prices'],
  suggestedEvalInputs: [
    'Pitch our CRM to a skeptical CFO',
    'Follow up with a cold lead',
    'Re-engage a churned customer',
  ],
};

const gateway: AiGateway = {
  async generateStructured<T>() {
    return draft as unknown as T;
  },
  async chatText() {
    return '';
  },
};

describe('generateBlueprintDraft', () => {
  it('returns a schema-valid blueprint draft from the gateway', async () => {
    const result = await generateBlueprintDraft(gateway, {
      taskDescription: 'Write sales emails for our SaaS product.',
    });
    expect(result.name).toBe('Sales Email Writer');
    expect(result.rubric.length).toBeGreaterThanOrEqual(1);
    expect(result.suggestedEvalInputs.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects an empty task description before calling the model', async () => {
    await expect(generateBlueprintDraft(gateway, { taskDescription: '   ' })).rejects.toThrow();
  });

  it('rejects an overly long task description before calling the model', async () => {
    await expect(
      generateBlueprintDraft(gateway, { taskDescription: 'x'.repeat(4001) }),
    ).rejects.toThrow();
  });
});
