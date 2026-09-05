// browser-agent.wiring.test.ts — verify browser capability is properly wired
import { describe, it, expect } from 'vitest';
import { TOOL_DESCRIPTIONS, tools, type Capability } from './index';

describe('browser wiring', () => {
  it('expone el descriptor de la capability en TOOL_DESCRIPTIONS', () => {
    const d = (TOOL_DESCRIPTIONS as Record<string, string>).browser;
    expect(d).toBeDefined();
    expect(d).toContain('Browser Agent');
    expect(d).toContain('Playwright');
  });

  it('tiene la capability en el union type', () => {
    const cap: Capability = 'browser';
    expect(cap).toBe('browser');
  });

  it('tools namespace tiene browser', () => {
    expect(tools.browser).toBeDefined();
  });
});
