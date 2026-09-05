// -----------------------------------------------------------------------------
// browser-agent.ts — capability `browser` (Headless Browser Agent, Playwright port)
// -----------------------------------------------------------------------------
// Port de principios de Browser Use / AgentQL / browserbase: agente de navegador
// headless con navegación, clicks, formularios, screenshots y extracción de
// contenido. Patrón sandbox: dominio puro determinista para planning + executor
// async que usa Playwright cuando está disponible. Keyless-first.
//
// Playwright NO es dep de @ultraia/core (peer/injected). El executor intenta
// importarlo dinámicamente; sin él → plan-only mode (retorna el plan sin ejecutar).
// Tests: dominio puro sin red ni Playwright.
// -----------------------------------------------------------------------------

import { z } from 'zod';

// ── Action schemas ──────────────────────────────────────────────────────────────

export const browserActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('navigate'),
    url: z.string().url(),
    waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  }),
  z.object({
    type: z.literal('click'),
    selector: z.string().min(1),
    timeoutMs: z.number().int().min(100).max(30000).optional(),
  }),
  z.object({
    type: z.literal('fill'),
    selector: z.string().min(1),
    value: z.string(),
    timeoutMs: z.number().int().min(100).max(30000).optional(),
  }),
  z.object({
    type: z.literal('select'),
    selector: z.string().min(1),
    value: z.string(),
    timeoutMs: z.number().int().min(100).max(30000).optional(),
  }),
  z.object({
    type: z.literal('check'),
    selector: z.string().min(1),
    checked: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('press'),
    key: z.string().min(1),
  }),
  z.object({
    type: z.literal('scroll'),
    direction: z.enum(['up', 'down', 'left', 'right']),
    amount: z.number().int().min(1).max(10000).optional(),
  }),
  z.object({
    type: z.literal('screenshot'),
    selector: z.string().optional(),
    fullPage: z.boolean().optional(),
    format: z.enum(['png', 'jpeg']).optional(),
    quality: z.number().int().min(1).max(100).optional(),
  }),
  z.object({
    type: z.literal('getContent'),
    selector: z.string().optional(),
    format: z.enum(['text', 'html', 'markdown']).optional(),
    maxLength: z.number().int().min(100).max(100000).optional(),
  }),
  z.object({
    type: z.literal('evaluate'),
    expression: z.string().min(1).max(5000),
  }),
  z.object({
    type: z.literal('waitSelector'),
    selector: z.string().min(1),
    timeoutMs: z.number().int().min(100).max(30000).optional(),
  }),
  z.object({
    type: z.literal('waitForNavigation'),
    timeoutMs: z.number().int().min(100).max(30000).optional(),
  }),
]);

export type BrowserAction = z.infer<typeof browserActionSchema>;

// ── Input / Config / Result ─────────────────────────────────────────────────────

export const browserAgentInputSchema = z.object({
  actions: z.array(browserActionSchema).min(1).max(50),
  viewportWidth: z.number().int().min(320).max(3840).optional(),
  viewportHeight: z.number().int().min(240).max(2160).optional(),
  userAgent: z.string().optional(),
  headless: z.boolean().optional(),
  timeoutMs: z.number().int().min(1000).max(120000).optional(),
});

export type BrowserAgentInput = z.infer<typeof browserAgentInputSchema>;

export const browserAgentConfigSchema = z.object({
  playwrightUrl: z.string().optional(),
  defaultTimeoutMs: z.number().int().min(1000).max(120000).optional(),
  defaultViewportWidth: z.number().int().min(320).max(3840).optional(),
  defaultViewportHeight: z.number().int().min(240).max(2160).optional(),
});

export type BrowserAgentConfig = z.infer<typeof browserAgentConfigSchema>;

export interface ActionResult {
  type: string;
  ok: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export interface BrowserAgentResult {
  ok: boolean;
  provider: 'playwright' | 'plan-only';
  actions: ActionResult[];
  screenshots: string[];
  content: string | null;
  error?: string;
  totalDurationMs: number;
}

// ── Pure domain functions ────────────────────────────────────────────────────────

/** Resolve config with defaults. Pure. */
export function resolveBrowserConfig(raw: BrowserAgentConfig = {}): Required<BrowserAgentConfig> {
  const parsed = browserAgentConfigSchema.parse(raw);
  return {
    playwrightUrl: parsed.playwrightUrl ?? 'playwright',
    defaultTimeoutMs: parsed.defaultTimeoutMs ?? 30000,
    defaultViewportWidth: parsed.defaultViewportWidth ?? 1280,
    defaultViewportHeight: parsed.defaultViewportHeight ?? 720,
  };
}

/** Validate input and return parsed actions. Pure, never throws on bad input. */
export function planBrowserActions(input: BrowserAgentInput): {
  ok: boolean;
  actions: BrowserAction[];
  viewportWidth: number;
  viewportHeight: number;
  headless: boolean;
  timeoutMs: number;
  error?: string;
} {
  const parsed = browserAgentInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      actions: [],
      viewportWidth: 1280,
      viewportHeight: 720,
      headless: true,
      timeoutMs: 30000,
      error: `Invalid input: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    };
  }
  const d = parsed.data;
  return {
    ok: true,
    actions: d.actions,
    viewportWidth: d.viewportWidth ?? 1280,
    viewportHeight: d.viewportHeight ?? 720,
    headless: d.headless ?? true,
    timeoutMs: d.timeoutMs ?? 30000,
  };
}

/** Estimate the total duration of an action sequence. Pure. */
export function estimateDuration(actions: BrowserAction[]): number {
  let total = 0;
  for (const a of actions) {
    switch (a.type) {
      case 'navigate': total += 3000; break;
      case 'click': total += (a as { timeoutMs?: number }).timeoutMs ?? 5000; break;
      case 'fill': total += (a as { timeoutMs?: number }).timeoutMs ?? 2000; break;
      case 'select': total += (a as { timeoutMs?: number }).timeoutMs ?? 2000; break;
      case 'check': total += 500; break;
      case 'press': total += 200; break;
      case 'scroll': total += 500; break;
      case 'screenshot': total += 1000; break;
      case 'getContent': total += 500; break;
      case 'evaluate': total += 1000; break;
      case 'waitSelector': total += (a as { timeoutMs?: number }).timeoutMs ?? 5000; break;
      case 'waitForNavigation': total += (a as { timeoutMs?: number }).timeoutMs ?? 5000; break;
      default: total += 500;
    }
  }
  return total;
}

/** Detect navigation actions in the sequence. Pure. */
export function hasNavigation(actions: BrowserAction[]): boolean {
  return actions.some(a => a.type === 'navigate');
}

/** Extract all URLs from navigation actions. Pure. */
export function extractUrls(actions: BrowserAction[]): string[] {
  return actions
    .filter((a): a is Extract<BrowserAction, { type: 'navigate' }> => a.type === 'navigate')
    .map(a => a.url);
}

/** Count screenshots in the action sequence. Pure. */
export function countScreenshots(actions: BrowserAction[]): number {
  return actions.filter(a => a.type === 'screenshot').length;
}

/** Build a human-readable plan summary. Pure. */
export function buildActionPlan(actions: BrowserAction[]): string {
  const lines: string[] = [`Browser Action Plan (${actions.length} steps):`];
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    switch (a.type) {
      case 'navigate': lines.push(`  ${i + 1}. Navigate to ${a.url}`); break;
      case 'click': lines.push(`  ${i + 1}. Click "${a.selector}"`); break;
      case 'fill': lines.push(`  ${i + 1}. Fill "${a.selector}" with "${a.value.slice(0, 50)}${a.value.length > 50 ? '...' : ''}"`); break;
      case 'select': lines.push(`  ${i + 1}. Select "${a.value}" in "${a.selector}"`); break;
      case 'check': lines.push(`  ${i + 1}. ${a.checked === false ? 'Uncheck' : 'Check'} "${a.selector}"`); break;
      case 'press': lines.push(`  ${i + 1}. Press key "${a.key}"`); break;
      case 'scroll': lines.push(`  ${i + 1}. Scroll ${a.direction}${a.amount ? ` ${a.amount}px` : ''}`); break;
      case 'screenshot': lines.push(`  ${i + 1}. Screenshot${a.fullPage ? ' (full page)' : ''}${a.selector ? ` of "${a.selector}"` : ''}`); break;
      case 'getContent': lines.push(`  ${i + 1}. Get content${a.selector ? ` from "${a.selector}"` : ''} (${a.format ?? 'text'})`); break;
      case 'evaluate': lines.push(`  ${i + 1}. Evaluate JS (${a.expression.length} chars)`); break;
      case 'waitSelector': lines.push(`  ${i + 1}. Wait for "${a.selector}"`); break;
      case 'waitForNavigation': lines.push(`  ${i + 1}. Wait for navigation`); break;
      default: lines.push(`  ${i + 1}. Unknown action`);
    }
  }
  lines.push(`Estimated duration: ${estimateDuration(actions)}ms`);
  return lines.join('\n');
}

/** Validate actions against safety rules. Pure. */
export function validateActionsSafe(actions: BrowserAction[]): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (a.type === 'evaluate') {
      const expr = a.expression.toLowerCase();
      if (expr.includes('fetch(') || expr.includes('xmlhttprequest') || expr.includes('navigator.sendbeacon')) {
        warnings.push(`Step ${i + 1}: evaluate() makes network requests — may fail in headless`);
      }
      if (expr.includes('document.cookie') || expr.includes('localStorage') || expr.includes('sessionStorage')) {
        warnings.push(`Step ${i + 1}: evaluate() accesses storage — state may not persist`);
      }
    }
    if (a.type === 'navigate') {
      const url = new URL(a.url);
      if (url.protocol === 'file:') {
        warnings.push(`Step ${i + 1}: file:// URL — local file access may be restricted`);
      }
    }
  }
  return { safe: warnings.length === 0, warnings };
}

// ── Async executor (Playwright) ─────────────────────────────────────────────────

/** Check if Playwright is available. Dynamic import, never throws. */
async function hasPlaywright(): Promise<boolean> {
  try {
    // Dynamic import to avoid hard dependency
    await import('playwright');
    return true;
  } catch {
    return false;
  }
}

/** Execute browser actions with Playwright (or plan-only if unavailable). */
export async function executeBrowserActions(
  input: BrowserAgentInput,
  config: BrowserAgentConfig = {},
  deps: { hasPlaywright?: () => Promise<boolean> } = {},
): Promise<BrowserAgentResult> {
  const plan = planBrowserActions(input);
  if (!plan.ok) {
    return {
      ok: false,
      provider: 'plan-only',
      actions: [],
      screenshots: [],
      content: null,
      error: plan.error,
      totalDurationMs: 0,
    };
  }

  const pwAvailable = deps.hasPlaywright ? await deps.hasPlaywright() : await hasPlaywright();
  if (!pwAvailable) {
    // Plan-only mode: return the plan without execution
    const actionResults: ActionResult[] = plan.actions.map(a => ({
      type: a.type,
      ok: true,
      data: `[plan-only] ${a.type}`,
      durationMs: 0,
    }));
    return {
      ok: true,
      provider: 'plan-only',
      actions: actionResults,
      screenshots: [],
      content: null,
      totalDurationMs: 0,
    };
  }

  // Playwright execution
  const resolved = resolveBrowserConfig(config);
  const startTime = Date.now();
  const actionResults: ActionResult[] = [];
  const screenshots: string[] = [];
  let lastContent: string | null = null;

  try {
    const pw = await import('playwright');
    const browser = await pw.chromium.launch({ headless: plan.headless });
    const context = await browser.newContext({
      viewport: { width: plan.viewportWidth, height: plan.viewportHeight },
      userAgent: resolved.defaultViewportWidth ? undefined : plan.viewportWidth > 0 ? undefined : undefined,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(plan.timeoutMs);

    for (const action of plan.actions) {
      const actionStart = Date.now();
      try {
        switch (action.type) {
          case 'navigate': {
            await page.goto(action.url, { waitUntil: action.waitFor ?? 'load' });
            actionResults.push({ type: 'navigate', ok: true, data: { url: action.url }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'click': {
            await page.click(action.selector, { timeout: action.timeoutMs ?? plan.timeoutMs });
            actionResults.push({ type: 'click', ok: true, data: { selector: action.selector }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'fill': {
            await page.fill(action.selector, action.value, { timeout: action.timeoutMs ?? plan.timeoutMs });
            actionResults.push({ type: 'fill', ok: true, data: { selector: action.selector, value: action.value }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'select': {
            await page.selectOption(action.selector, action.value, { timeout: action.timeoutMs ?? plan.timeoutMs });
            actionResults.push({ type: 'select', ok: true, data: { selector: action.selector, value: action.value }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'check': {
            const shouldCheck = action.checked ?? true;
            if (shouldCheck) {
              await page.check(action.selector);
            } else {
              await page.uncheck(action.selector);
            }
            actionResults.push({ type: 'check', ok: true, data: { selector: action.selector, checked: shouldCheck }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'press': {
            await page.keyboard.press(action.key);
            actionResults.push({ type: 'press', ok: true, data: { key: action.key }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'scroll': {
            const scrollAmount = action.amount ?? 500;
            const directionMap: Record<string, [number, number]> = {
              up: [0, -scrollAmount],
              down: [0, scrollAmount],
              left: [-scrollAmount, 0],
              right: [scrollAmount, 0],
            };
            const [x, y] = directionMap[action.direction] ?? [0, scrollAmount];
            await page.mouse.wheel(x, y);
            actionResults.push({ type: 'scroll', ok: true, data: { direction: action.direction, amount: scrollAmount }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'screenshot': {
            const opts: Record<string, unknown> = {
              type: action.format ?? 'png',
              fullPage: action.fullPage ?? false,
            };
            if (action.format === 'jpeg' && action.quality) {
              opts.quality = action.quality;
            }
            let buffer: Buffer;
            if (action.selector) {
              const el = await page.$(action.selector);
              if (el) {
                buffer = await el.screenshot(opts) as Buffer;
              } else {
                buffer = await page.screenshot(opts) as Buffer;
              }
            } else {
              buffer = await page.screenshot(opts) as Buffer;
            }
            const b64 = buffer.toString('base64');
            screenshots.push(`data:image/${action.format ?? 'png'};base64,${b64.slice(0, 50)}...`);
            actionResults.push({ type: 'screenshot', ok: true, data: { size: buffer.length, selector: action.selector }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'getContent': {
            const selector = action.selector ?? 'body';
            const el = await page.$(selector);
            let content: string;
            if (action.format === 'html') {
              content = el ? await el.innerHTML() : await page.content();
            } else {
              content = el ? (await el.innerText()) : (await page.innerText('body'));
            }
            const maxLength = action.maxLength ?? 12000;
            if (content.length > maxLength) {
              content = content.slice(0, maxLength) + '\n...[truncated]';
            }
            lastContent = content;
            actionResults.push({ type: 'getContent', ok: true, data: { selector, length: content.length }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'evaluate': {
            const result = await page.evaluate(action.expression);
            actionResults.push({ type: 'evaluate', ok: true, data: result, durationMs: Date.now() - actionStart });
            break;
          }
          case 'waitSelector': {
            await page.waitForSelector(action.selector, { timeout: action.timeoutMs ?? plan.timeoutMs });
            actionResults.push({ type: 'waitSelector', ok: true, data: { selector: action.selector }, durationMs: Date.now() - actionStart });
            break;
          }
          case 'waitForNavigation': {
            await page.waitForNavigation({ timeout: action.timeoutMs ?? plan.timeoutMs });
            actionResults.push({ type: 'waitForNavigation', ok: true, durationMs: Date.now() - actionStart });
            break;
          }
          default: {
            actionResults.push({ type: 'unknown', ok: false, error: 'Unknown action type', durationMs: Date.now() - actionStart });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        actionResults.push({ type: action.type, ok: false, error: msg, durationMs: Date.now() - actionStart });
        // Continue with remaining actions (fail-soft)
      }
    }

    await browser.close();

    return {
      ok: actionResults.every(r => r.ok),
      provider: 'playwright',
      actions: actionResults,
      screenshots,
      content: lastContent,
      totalDurationMs: Date.now() - startTime,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      provider: 'playwright',
      actions: actionResults,
      screenshots,
      content: lastContent,
      error: msg,
      totalDurationMs: Date.now() - startTime,
    };
  }
}

/** Grouped export for namespace import (pattern: `import * as browserNs from './browser-agent'`). */
export const browser = {
  browserAgentInputSchema,
  browserAgentConfigSchema,
  resolveBrowserConfig,
  planBrowserActions,
  estimateDuration,
  hasNavigation,
  extractUrls,
  countScreenshots,
  buildActionPlan,
  validateActionsSafe,
  executeBrowserActions,
};
