// browser-agent.test.ts — tests for the Browser Agent capability
import { describe, it, expect } from 'vitest';
import {
  browserActionSchema,
  browserAgentInputSchema,
  resolveBrowserConfig,
  planBrowserActions,
  estimateDuration,
  hasNavigation,
  extractUrls,
  countScreenshots,
  buildActionPlan,
  validateActionsSafe,
  executeBrowserActions,
} from './browser-agent';

describe('browser-action schema', () => {
  it('accepts navigate action', () => {
    const r = browserActionSchema.safeParse({ type: 'navigate', url: 'https://example.com' });
    expect(r.success).toBe(true);
  });

  it('accepts click action', () => {
    const r = browserActionSchema.safeParse({ type: 'click', selector: '#btn' });
    expect(r.success).toBe(true);
  });

  it('accepts fill action', () => {
    const r = browserActionSchema.safeParse({ type: 'fill', selector: 'input[name=q]', value: 'hello' });
    expect(r.success).toBe(true);
  });

  it('accepts select action', () => {
    const r = browserActionSchema.safeParse({ type: 'select', selector: 'select#lang', value: 'en' });
    expect(r.success).toBe(true);
  });

  it('accepts check action', () => {
    const r = browserActionSchema.safeParse({ type: 'check', selector: '#agree', checked: true });
    expect(r.success).toBe(true);
  });

  it('accepts press action', () => {
    const r = browserActionSchema.safeParse({ type: 'press', key: 'Enter' });
    expect(r.success).toBe(true);
  });

  it('accepts scroll action', () => {
    const r = browserActionSchema.safeParse({ type: 'scroll', direction: 'down', amount: 500 });
    expect(r.success).toBe(true);
  });

  it('accepts screenshot action', () => {
    const r = browserActionSchema.safeParse({ type: 'screenshot', fullPage: true, format: 'png' });
    expect(r.success).toBe(true);
  });

  it('accepts getContent action', () => {
    const r = browserActionSchema.safeParse({ type: 'getContent', selector: 'h1', format: 'text' });
    expect(r.success).toBe(true);
  });

  it('accepts evaluate action', () => {
    const r = browserActionSchema.safeParse({ type: 'evaluate', expression: 'document.title' });
    expect(r.success).toBe(true);
  });

  it('accepts waitSelector action', () => {
    const r = browserActionSchema.safeParse({ type: 'waitSelector', selector: '.loaded', timeoutMs: 5000 });
    expect(r.success).toBe(true);
  });

  it('accepts waitForNavigation action', () => {
    const r = browserActionSchema.safeParse({ type: 'waitForNavigation' });
    expect(r.success).toBe(true);
  });

  it('rejects navigate without url', () => {
    const r = browserActionSchema.safeParse({ type: 'navigate' });
    expect(r.success).toBe(false);
  });

  it('rejects click without selector', () => {
    const r = browserActionSchema.safeParse({ type: 'click' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown action type', () => {
    const r = browserActionSchema.safeParse({ type: 'hover', selector: '#el' });
    expect(r.success).toBe(false);
  });
});

describe('browserAgentInput schema', () => {
  it('accepts valid input with one action', () => {
    const r = browserAgentInputSchema.safeParse({
      actions: [{ type: 'navigate', url: 'https://example.com' }],
    });
    expect(r.success).toBe(true);
  });

  it('accepts input with viewport options', () => {
    const r = browserAgentInputSchema.safeParse({
      actions: [{ type: 'click', selector: '#btn' }],
      viewportWidth: 1920,
      viewportHeight: 1080,
      headless: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty actions', () => {
    const r = browserAgentInputSchema.safeParse({ actions: [] });
    expect(r.success).toBe(false);
  });

  it('rejects more than 50 actions', () => {
    const actions = Array.from({ length: 51 }, () => ({ type: 'press' as const, key: 'a' }));
    const r = browserAgentInputSchema.safeParse({ actions });
    expect(r.success).toBe(false);
  });
});

describe('resolveBrowserConfig', () => {
  it('returns defaults', () => {
    const c = resolveBrowserConfig();
    expect(c.defaultTimeoutMs).toBe(30000);
    expect(c.defaultViewportWidth).toBe(1280);
    expect(c.defaultViewportHeight).toBe(720);
  });

  it('overrides defaults', () => {
    const c = resolveBrowserConfig({ defaultTimeoutMs: 5000 });
    expect(c.defaultTimeoutMs).toBe(5000);
  });
});

describe('planBrowserActions', () => {
  it('returns ok for valid input', () => {
    const r = planBrowserActions({
      actions: [{ type: 'navigate', url: 'https://example.com' }],
    });
    expect(r.ok).toBe(true);
    expect(r.actions).toHaveLength(1);
    expect(r.headless).toBe(true);
    expect(r.viewportWidth).toBe(1280);
  });

  it('returns error for invalid input', () => {
    const r = planBrowserActions({ actions: [] });
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('uses custom viewport', () => {
    const r = planBrowserActions({
      actions: [{ type: 'click', selector: '#btn' }],
      viewportWidth: 1920,
      viewportHeight: 1080,
      headless: false,
    });
    expect(r.viewportWidth).toBe(1920);
    expect(r.viewportHeight).toBe(1080);
    expect(r.headless).toBe(false);
  });
});

describe('estimateDuration', () => {
  it('estimates single action', () => {
    expect(estimateDuration([{ type: 'navigate', url: 'https://example.com' }])).toBe(3000);
  });

  it('sums multiple actions', () => {
    const actions = [
      { type: 'navigate' as const, url: 'https://example.com' },
      { type: 'click' as const, selector: '#btn' },
      { type: 'fill' as const, selector: 'input', value: 'hello' },
    ];
    expect(estimateDuration(actions)).toBe(3000 + 5000 + 2000);
  });

  it('returns 0 for empty actions', () => {
    expect(estimateDuration([])).toBe(0);
  });
});

describe('hasNavigation', () => {
  it('detects navigation', () => {
    expect(hasNavigation([{ type: 'navigate', url: 'https://example.com' }])).toBe(true);
  });

  it('returns false when no navigation', () => {
    expect(hasNavigation([{ type: 'click', selector: '#btn' }])).toBe(false);
  });
});

describe('extractUrls', () => {
  it('extracts all URLs', () => {
    const urls = extractUrls([
      { type: 'navigate', url: 'https://a.com' },
      { type: 'click', selector: '#btn' },
      { type: 'navigate', url: 'https://b.com' },
    ]);
    expect(urls).toEqual(['https://a.com', 'https://b.com']);
  });

  it('returns empty when no navigation', () => {
    expect(extractUrls([{ type: 'click', selector: '#btn' }])).toEqual([]);
  });
});

describe('countScreenshots', () => {
  it('counts screenshots', () => {
    expect(countScreenshots([
      { type: 'screenshot' },
      { type: 'click', selector: '#btn' },
      { type: 'screenshot', fullPage: true },
    ])).toBe(2);
  });

  it('returns 0 when none', () => {
    expect(countScreenshots([{ type: 'navigate', url: 'https://example.com' }])).toBe(0);
  });
});

describe('buildActionPlan', () => {
  it('builds readable plan', () => {
    const plan = buildActionPlan([
      { type: 'navigate', url: 'https://example.com' },
      { type: 'click', selector: '#login' },
      { type: 'fill', selector: 'input[name=email]', value: 'user@example.com' },
      { type: 'screenshot', fullPage: true },
    ]);
    expect(plan).toContain('Browser Action Plan (4 steps)');
    expect(plan).toContain('Navigate to https://example.com');
    expect(plan).toContain('Click "#login"');
    expect(plan).toContain('Fill "input[name=email]"');
    expect(plan).toContain('Screenshot (full page)');
    expect(plan).toContain('Estimated duration');
  });
});

describe('validateActionsSafe', () => {
  it('returns safe for simple actions', () => {
    const r = validateActionsSafe([
      { type: 'navigate', url: 'https://example.com' },
      { type: 'click', selector: '#btn' },
    ]);
    expect(r.safe).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it('warns on evaluate with network', () => {
    const r = validateActionsSafe([
      { type: 'evaluate', expression: "fetch('https://evil.com')" },
    ]);
    expect(r.safe).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain('network requests');
  });

  it('warns on evaluate with storage access', () => {
    const r = validateActionsSafe([
      { type: 'evaluate', expression: 'document.cookie' },
    ]);
    expect(r.safe).toBe(false);
    expect(r.warnings[0]).toContain('storage');
  });

  it('warns on file:// URL', () => {
    const r = validateActionsSafe([
      { type: 'navigate', url: 'file:///etc/passwd' },
    ]);
    expect(r.safe).toBe(false);
    expect(r.warnings[0]).toContain('file://');
  });
});

describe('executeBrowserActions (plan-only mode)', () => {
  it('returns plan-only when Playwright is not installed', async () => {
    const result = await executeBrowserActions(
      { actions: [{ type: 'navigate', url: 'https://example.com' }] },
      {},
      { hasPlaywright: async () => false },
    );
    expect(result.provider).toBe('plan-only');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe('navigate');
  });

  it('returns error for invalid input', async () => {
    const result = await executeBrowserActions({ actions: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles mixed actions in plan-only', async () => {
    const result = await executeBrowserActions(
      {
        actions: [
          { type: 'navigate', url: 'https://example.com' },
          { type: 'click', selector: '#btn' },
          { type: 'fill', selector: 'input', value: 'test' },
          { type: 'screenshot' },
        ],
      },
      {},
      { hasPlaywright: async () => false },
    );
    expect(result.provider).toBe('plan-only');
    expect(result.actions).toHaveLength(4);
    expect(result.screenshots).toHaveLength(0);
  });
});
