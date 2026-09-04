//! Capability `perf-optimizer` — performance analysis and optimization suggestions.
// Pure, deterministic, keyless. Analyzes code for performance anti-patterns,
// suggests optimizations, tracks Core Web Vitals budgets. Based on research
// from Vercel Engineering and web performance best practices.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// ── Types ────────────────────────────────────────────────────────────────────

export type PerfSeverity = 'critical' | 'high' | 'medium' | 'low';
export type PerfCategory = 'rendering' | 'bundling' | 'memory' | 'network' | 'cpu' | 'database';

export interface PerfFinding {
  rule: string;
  severity: PerfSeverity;
  category: PerfCategory;
  line?: number;
  snippet?: string;
  file?: string;
  impact: string;
  fix: string;
}

export interface PerfBudget {
  metric: string;
  target: number;
  unit: string;
  category: string;
}

export interface PerfReport {
  findings: PerfFinding[];
  budget: PerfBudget[];
  score: number; // 0-100
  summary: string;
}

// ── Anti-Pattern Rules ───────────────────────────────────────────────────────

interface PerfRule {
  id: string;
  severity: PerfSeverity;
  category: PerfCategory;
  re: RegExp;
  impact: string;
  fix: string;
}

const DEFAULT_IGNORE = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.ultraia'];

const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mp3', '.zip', '.woff2']);

const RULES: PerfRule[] = [
  // Rendering
  { id: 'inline_styles', severity: 'medium', category: 'rendering', re: /style\s*=\s*\{\{[^}]+\}\}/g, impact: 'Forces re-render on every frame', fix: 'Use CSS classes or CSS-in-JS with memoization' },
  { id: 'large_svg_inline', severity: 'low', category: 'rendering', re: /<svg[^>]*>[\s\S]{5000,}<\/svg>/g, impact: 'Large inline SVGs bloat DOM', fix: 'Extract to component or use <img> with SVG URL' },
  { id: 'ref_without_callback', severity: 'medium', category: 'rendering', re: /useRef\([^)]*\)(?![\s\S]*,\s*\[[\s\S]*\])/g, impact: 'Missing dependency array may cause stale closures', fix: 'Add dependency array to useCallback/useMemo' },

  // Bundling
  { id: 'barrel_import', severity: 'medium', category: 'bundling', re: /import\s*\{[^}]+\}\s*from\s*['"][^'"]*index['"]/g, impact: 'Barrel imports prevent tree-shaking', fix: 'Import directly from the source file' },
  { id: 'heavy_lib', severity: 'high', category: 'bundling', re: /import\s+.*from\s*['"](?:moment|lodash|rxjs)['"]/g, impact: 'Heavy library increases bundle size', fix: 'Use lightweight alternatives (dayjs/lodash-es/rx)' },
  { id: 'dynamic_import_no_preload', severity: 'low', category: 'bundling', re: /import\s*\(\s*['"][^'"]+['"]\s*\)/g, impact: 'Dynamic imports without preload add latency', fix: 'Add <link rel="preload"> for critical dynamic imports' },

  // Memory
  { id: 'unclosed_stream', severity: 'high', category: 'memory', re: /createReadStream\([^)]+\)(?![\s\S]*\.close)/g, impact: 'Unclosed streams cause memory leaks', fix: 'Use .pipe() or pipe to a writable with proper cleanup' },
  { id: 'global_state_grow', severity: 'medium', category: 'memory', re: /(?:globalThis|global)\[\w+\]\s*=\s*(?:\[\]|\{\})/g, impact: 'Global state grows unbounded', fix: 'Use WeakMap/WeakSet or bounded caches with eviction' },
  { id: 'large_array_spread', severity: 'medium', category: 'memory', re: /\.\.\.(?:arr|items|data|results)(?=[\s\S]{0,100}(?:\.map|\.filter|\.forEach))/g, impact: 'Spreading large arrays creates copies', fix: 'Use direct iteration or in-place mutations' },

  // Network
  { id: 'serial_await', severity: 'high', category: 'network', re: /for\s*\([^)]*\)\s*\{[\s\S]*?await\s+/g, impact: 'Sequential awaits block on each other', fix: 'Use Promise.all() or Promise.allSettled() for parallel execution' },
  { id: 'no_timeout', severity: 'medium', category: 'network', re: /fetch\([^)]+\)(?![\s\S]*AbortSignal)/g, impact: 'Fetch without timeout can hang indefinitely', fix: 'Add AbortController with timeout for fetch calls' },
  { id: 'no_retry', severity: 'low', category: 'network', re: /fetch\([^)]+\)(?![\s\S]*retry)/g, impact: 'No retry logic for transient failures', fix: 'Implement exponential backoff retry for network calls' },

  // CPU
  { id: 'sync_fs_in_handler', severity: 'high', category: 'cpu', re: /(?:readFileSync|writeFileSync|statSync|readdirSync)\(/g, impact: 'Sync filesystem ops block the event loop', fix: 'Use async variants (readFile, writeFile, stat, readdir)' },
  { id: 'json_parse_no_try', severity: 'medium', category: 'cpu', re: /JSON\.parse\([^)]+\)(?![\s\S]*(?:try|safeJsonParse))/g, impact: 'JSON.parse can throw on invalid input', fix: 'Wrap in try/catch or use safeJsonParse helper' },
  { id: 'regex_no_bound', severity: 'low', category: 'cpu', re: /new RegExp\([^)]+\)/g, impact: 'Dynamic regex may cause ReDoS', fix: 'Sanitize input or use bounded quantifiers' },

  // Database
  { id: 'n_plus_1', severity: 'critical', category: 'database', re: /for\s*\([^)]*\)\s*\{[\s\S]*?\.find(?:Many|Unique|First)\(/g, impact: 'N+1 query pattern: one query per loop iteration', fix: 'Use findMany with IDs array or include/join' },
  { id: 'no_pagination', severity: 'medium', category: 'database', re: /\.findMany\(\s*\)(?![\s\S]*take)/g, impact: 'Unbounded query returns all rows', fix: 'Add take/skip pagination for large datasets' },
  { id: 'missing_index_hint', severity: 'low', category: 'database', re: /\.findMany\(\s*\{[\s\S]*?where\s*:\s*\{[\s\S]*?\}\s*\}/g, impact: 'Query without index hint may be slow', fix: 'Ensure indexed fields are used in where clauses' },
];

// ── Web Vitals Budgets ───────────────────────────────────────────────────────

export const WEB_VITALS_BUDGET: PerfBudget[] = [
  { metric: 'LCP', target: 2500, unit: 'ms', category: 'loading' },
  { metric: 'FID', target: 100, unit: 'ms', category: 'interactivity' },
  { metric: 'CLS', target: 0.1, unit: 'score', category: 'stability' },
  { metric: 'INP', target: 200, unit: 'ms', category: 'interactivity' },
  { metric: 'TTFB', target: 800, unit: 'ms', category: 'server' },
  { metric: 'FCP', target: 1800, unit: 'ms', category: 'rendering' },
  { metric: 'TTI', target: 3800, unit: 'ms', category: 'interactivity' },
  { metric: 'bundle_size', target: 250, unit: 'KB', category: 'bundling' },
];

// ── Scanner ──────────────────────────────────────────────────────────────────

function scanFile(filePath: string): PerfFinding[] {
  const findings: PerfFinding[] = [];
  try {
    const ext = extname(filePath).toLowerCase();
    if (BINARY_EXT.has(ext)) return findings;
    const content = readFileSync(filePath, 'utf-8');
    if (content.length > 512_000) return findings; // skip large files
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const rule of RULES) {
        if (rule.re.test(lines[i])) {
          findings.push({
            rule: rule.id,
            severity: rule.severity,
            category: rule.category,
            line: i + 1,
            snippet: lines[i].slice(0, 120),
            file: filePath,
            impact: rule.impact,
            fix: rule.fix,
          });
        }
        rule.re.lastIndex = 0; // reset regex state
      }
    }
  } catch { /* unreadable file */ }
  return findings;
}

function walkDir(dir: string, findings: PerfFinding[], ignore: string[], maxFiles: number): PerfFinding[] {
  if (findings.length >= maxFiles * 200) return findings; // safety limit
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return findings; }
  for (const entry of entries) {
    if (ignore.includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, findings, ignore, maxFiles);
    } else if (entry.isFile()) {
      findings.push(...scanFile(full));
    }
  }
  return findings;
}

export function scanPerformance(dir: string, ignore: string[] = DEFAULT_IGNORE, maxFiles = 100): PerfReport {
  const findings = walkDir(dir, [], ignore, maxFiles);

  // Score: 100 minus weighted deductions
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'critical') score -= 15;
    else if (f.severity === 'high') score -= 8;
    else if (f.severity === 'medium') score -= 3;
    else score -= 1;
  }
  score = Math.max(0, Math.min(100, score));

  const critCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const medCount = findings.filter(f => f.severity === 'medium').length;

  const summary = `Found ${findings.length} performance issues: ${critCount} critical, ${highCount} high, ${medCount} medium. Score: ${score}/100.`;

  return { findings, budget: WEB_VITALS_BUDGET, score, summary };
}

// ── Tool Schema ──────────────────────────────────────────────────────────────

import { z } from 'zod';

export const perfOptimizerSchema = z.object({
  action: z.enum(['scan', 'budget', 'suggest']),
  dir: z.string().optional().describe('Directory to scan (scan action)'),
  ignore: z.array(z.string()).optional(),
  maxFiles: z.number().optional(),
  fileContent: z.string().optional().describe('Inline code to analyze (suggest action)'),
  ruleId: z.string().optional().describe('Specific rule to get suggestions for (suggest action)'),
});

export type PerfOptimizerInput = z.infer<typeof perfOptimizerSchema>;

export async function perfOptimizerTool(input: PerfOptimizerInput): Promise<unknown> {
  switch (input.action) {
    case 'scan': {
      if (!input.dir) return { error: 'dir required for scan action' };
      return scanPerformance(input.dir, input.ignore, input.maxFiles ?? 100);
    }
    case 'budget': {
      return { budgets: WEB_VITALS_BUDGET, description: 'Core Web Vitals and bundle size budgets for UltraIa.' };
    }
    case 'suggest': {
      if (input.ruleId) {
        const rule = RULES.find(r => r.id === input.ruleId);
        if (!rule) return { error: `Rule ${input.ruleId} not found` };
        return { rule: rule.id, severity: rule.severity, category: rule.category, impact: rule.impact, fix: rule.fix };
      }
      if (input.fileContent) {
        const findings: PerfFinding[] = [];
        const lines = input.fileContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
          for (const rule of RULES) {
            if (rule.re.test(lines[i])) {
              findings.push({ rule: rule.id, severity: rule.severity, category: rule.category, line: i + 1, snippet: lines[i].slice(0, 120), impact: rule.impact, fix: rule.fix });
            }
            rule.re.lastIndex = 0;
          }
        }
        return { findings, count: findings.length };
      }
      return { rules: RULES.map(r => ({ id: r.id, severity: r.severity, category: r.category, impact: r.impact, fix: r.fix })) };
    }
  }
}
