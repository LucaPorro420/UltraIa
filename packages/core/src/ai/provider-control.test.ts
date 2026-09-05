import { beforeEach, describe, expect, it } from 'vitest';
import { ModelOrchestrator } from './orchestrator';
import { providerStatus, routingSummary } from './provider-control';

describe('provider control contracts', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  it('reports safe provider metadata without environment keys', () => {
    const statuses = providerStatus(new ModelOrchestrator());
    const openrouter = statuses.find((status) => status.provider === 'openrouter');
    expect(openrouter).toBeDefined();
    expect(JSON.stringify(openrouter)).not.toContain('API_KEY');
    expect(JSON.stringify(openrouter)).not.toContain('sk-');
    expect(openrouter?.capabilities.length).toBeGreaterThan(0);
  });

  it('supports local-first and quality routing strategies', () => {
    expect(routingSummary({ strategy: 'local-first' }).strategy).toBe('local-first');
    expect(routingSummary({ strategy: 'quality' }).tier).toBe('reasoning');
  });
});

