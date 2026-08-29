// reasoning.test.ts — Compact behavior contract for classifyIntent + buildReasoningContext
import { describe, it, expect } from 'vitest';
import { classifyIntent, buildReasoningContext } from './reasoning';

describe('classifyIntent', () => {
  // Core behavior: keyword scoring → intent type
  const cases: [string, string][] = [
    ['Fix this TypeScript bug', 'code'],
    ['Implement the user auth endpoint', 'code'],
    ['Generate an image of a sunset', 'creative'],
    ['Create a music composition', 'creative'],
    ['Research the latest AI developments', 'research'],
    ['Find recent papers on transformers', 'research'],
    ['Schedule the deployment for tomorrow', 'action'],
    ['Deploy the application', 'action'],
    ['Analyze the performance metrics and benchmark', 'analysis'],
    ['Audit the system for issues', 'analysis'],
    ['Hello, how are you?', 'chat'],
    ['Thanks for the help', 'chat'],
  ];

  it.each(cases)('"%s" → %s', (input, expected) => {
    expect(classifyIntent(input)).toBe(expected);
  });

  // Boundary: empty/ambiguous → chat (default)
  it('empty string → chat', () => {
    expect(classifyIntent('')).toBe('chat');
  });
});

describe('buildReasoningContext', () => {
  it('with memories adds system prompt block', () => {
    const ctx = buildReasoningContext('Fix this bug', ['Prefiere TypeScript', 'Usa VS Code']);
    expect(ctx.intent).toBe('code');
    expect(ctx.systemPromptAdditions[0]).toContain('TypeScript');
    expect(ctx.suggestedMode).toBe('p-b');
  });

  it('without memories → empty additions', () => {
    const ctx = buildReasoningContext('Hello');
    expect(ctx.systemPromptAdditions).toHaveLength(0);
    expect(ctx.suggestedMode).toBe('libre');
  });
});
