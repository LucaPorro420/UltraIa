//! Capability `tech-debt` — technical debt tracker and quantifier.
// Pure, deterministic, keyless. Scans code for debt patterns, estimates
// fix effort, prioritizes by impact, generates repayment schedules.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type DebtCategory = 'complexity' | 'duplication' | 'deprecated' | 'todo' | 'test_gap' | 'doc_gap' | 'security' | 'performance';
export type DebtPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface DebtItem {
  id: string;
  category: DebtCategory;
  priority: DebtPriority;
  file: string;
  line?: number;
  description: string;
  effortMinutes: number; // estimated fix effort
  impactScore: number; // 0-10
  snippet?: string;
}

export interface DebtReport {
  items: DebtItem[];
  totalEffortMinutes: number;
  byCategory: Record<DebtCategory, number>;
  byPriority: Record<DebtPriority, number>;
  score: number; // 0-100 (100 = no debt)
  summary: string;
}

// ── Debt Patterns ────────────────────────────────────────────────────────────

interface DebtPattern {
  id: string;
  category: DebtCategory;
  re: RegExp;
  effortMinutes: number;
  impactBase: number;
  description: string;
}

const DEFAULT_IGNORE = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.ultraia', 'repomix-output', 'resultTask'];

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.cs', '.rb', '.php', '.swift', '.kt', '.vue', '.svelte']);

const PATTERNS: DebtPattern[] = [
  // TODOs and FIXMEs
  { id: 'todo', category: 'todo', re: /\/\/\s*TODO\b|\/\*\s*TODO\b|#\s*TODO\b/g, effortMinutes: 15, impactBase: 2, description: 'Open TODO comment' },
  { id: 'fixme', category: 'todo', re: /\/\/\s*FIXME\b|\/\*\s*FIXME\b|#\s*FIXME\b/g, effortMinutes: 30, impactBase: 4, description: 'FIXME marker — known bug or tech debt' },
  { id: 'hack', category: 'complexity', re: /\/\/\s*HACK\b|\/\*\s*HACK\b|\/\/\s*workaround\b/gi, effortMinutes: 45, impactBase: 5, description: 'HACK/workaround — temporary solution' },
  { id: 'xxx', category: 'todo', re: /\/\/\s*XXX\b|\/\*\s*XXX\b/g, effortMinutes: 10, impactBase: 3, description: 'XXX marker — needs attention' },

  // Deprecated
  { id: 'deprecated', category: 'deprecated', re: /@deprecated|@Deprecated|DEPRECATED/g, effortMinutes: 30, impactBase: 4, description: 'Deprecated API usage' },
  { id: 'legacy', category: 'deprecated', re: /\/\/\s*[Ll]egacy|\/\*\s*[Ll]egacy/g, effortMinutes: 60, impactBase: 5, description: 'Legacy code that needs replacement' },

  // Complexity
  { id: 'long_function', category: 'complexity', re: /.{200,}/g, effortMinutes: 20, impactBase: 3, description: 'Line exceeds 200 characters' },
  { id: 'deep_nesting', category: 'complexity', re: /(?:if|for|while|switch)\s*\([^)]*\)\s*\{[\s\S]{0,200}(?:if|for|while|switch)\s*\([^)]*\)\s*\{[\s\S]{0,200}(?:if|for|while|switch)\s*\(/g, effortMinutes: 45, impactBase: 5, description: 'Deeply nested control flow (>3 levels)' },
  { id: 'too_many_params', category: 'complexity', re: /(?:function|=>)\s*\([^)]{100,}\)/g, effortMinutes: 30, impactBase: 4, description: 'Function with many parameters (>100 chars in signature)' },

  // Duplication
  { id: 'copy_paste', category: 'duplication', re: /\/\/\s*(?:copied|copy-paste|duplicate)/gi, effortMinutes: 45, impactBase: 4, description: 'Marked as copy-paste' },

  // Test gaps
  { id: 'no_test', category: 'test_gap', re: /describe\(|test\(|it\(/g, effortMinutes: 0, impactBase: 0, description: 'Test marker (for counting)' }, // counted differently
  { id: 'skip_test', category: 'test_gap', re: /(?:test|it)\.skip\(|xtest\(|xit\(/g, effortMinutes: 15, impactBase: 3, description: 'Skipped test' },
  { id: 'only_test', category: 'test_gap', re: /(?:test|it)\.only\(|describe\.only\(/g, effortMinutes: 5, impactBase: 2, description: 'Test.only left in code' },

  // Doc gaps
  { id: 'no_doc', category: 'doc_gap', re: /export\s+(?:function|const|class|interface|type)\s+\w+(?![\s\S]{0,5}\/\*\*)/g, effortMinutes: 10, impactBase: 2, description: 'Exported symbol without JSDoc' },

  // Security
  { id: 'unsafe_eval', category: 'security', re: /\beval\s*\(|new\s+Function\s*\(/g, effortMinutes: 30, impactBase: 7, description: 'Unsafe eval/Function constructor' },
  { id: 'hardcoded_secret', category: 'security', re: /(?:password|secret|token|key)\s*[:=]\s*['"][^'"]{8,}['"]/gi, effortMinutes: 15, impactBase: 8, description: 'Potentially hardcoded secret' },
];

// ── Scanner ──────────────────────────────────────────────────────────────────

function scanFileForDebt(filePath: string): DebtItem[] {
  const items: DebtItem[] = [];
  try {
    const ext = extname(filePath).toLowerCase();
    if (!SOURCE_EXT.has(ext)) return items;
    const content = readFileSync(filePath, 'utf-8');
    if (content.length > 512_000) return items;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of PATTERNS) {
        if (pattern.id === 'no_test' || pattern.id === 'no_doc') continue; // handled separately
        if (pattern.re.test(lines[i])) {
          const priority = pattern.impactBase >= 7 ? 'p0' : pattern.impactBase >= 5 ? 'p1' : pattern.impactBase >= 3 ? 'p2' : 'p3';
          items.push({
            id: `${pattern.id}-${i}`,
            category: pattern.category,
            priority: priority as DebtPriority,
            file: filePath,
            line: i + 1,
            description: pattern.description,
            effortMinutes: pattern.effortMinutes,
            impactScore: pattern.impactBase,
            snippet: lines[i].slice(0, 120),
          });
        }
        pattern.re.lastIndex = 0;
      }
    }
  } catch { /* unreadable */ }
  return items;
}

function walkDirForDebt(dir: string, items: DebtItem[], ignore: string[], maxFiles: number): DebtItem[] {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return items; }
  for (const entry of entries) {
    if (ignore.includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkDirForDebt(full, items, ignore, maxFiles);
    else if (entry.isFile() && items.length < maxFiles * 100) items.push(...scanFileForDebt(full));
  }
  return items;
}

export function scanDebt(dir: string, ignore: string[] = DEFAULT_IGNORE, maxFiles = 100): DebtReport {
  const items = walkDirForDebt(dir, [], ignore, maxFiles);

  const totalEffortMinutes = items.reduce((s, i) => s + i.effortMinutes, 0);

  const byCategory = {} as Record<DebtCategory, number>;
  const byPriority = {} as Record<DebtPriority, number>;
  for (const cat of ['complexity', 'duplication', 'deprecated', 'todo', 'test_gap', 'doc_gap', 'security', 'performance'] as DebtCategory[]) byCategory[cat] = 0;
  for (const pri of ['p0', 'p1', 'p2', 'p3'] as DebtPriority[]) byPriority[pri] = 0;

  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
  }

  // Score: 100 minus deductions
  let score = 100;
  score -= byPriority.p0 * 10;
  score -= byPriority.p1 * 5;
  score -= byPriority.p2 * 2;
  score -= byPriority.p3 * 0.5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const summary = `${items.length} debt items found. Estimated repayment: ${Math.round(totalEffortMinutes / 60)}h. Score: ${score}/100. P0: ${byPriority.p0}, P1: ${byPriority.p1}, P2: ${byPriority.p2}.`;

  return { items, totalEffortMinutes, byCategory, byPriority, score, summary };
}

// ── Tool Schema ──────────────────────────────────────────────────────────────

export const techDebtSchema = z.object({
  action: z.enum(['scan', 'repayment', 'prioritize']),
  dir: z.string().optional().describe('Directory to scan'),
  ignore: z.array(z.string()).optional(),
  maxFiles: z.number().optional(),
  maxHoursPerWeek: z.number().optional(),
  weeks: z.number().optional(),
});

export type TechDebtInput = z.infer<typeof techDebtSchema>;

export function generateRepaymentPlan(report: DebtReport, hoursPerWeek: number, weeks: number): { week: number; items: DebtItem[]; effortHours: number }[] {
  const plan: { week: number; items: DebtItem[]; effortHours: number }[] = [];
  const remaining = [...report.items].sort((a, b) => {
    const priOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
    return (priOrder[a.priority] ?? 4) - (priOrder[b.priority] ?? 4) || b.impactScore - a.impactScore;
  });

  const msPerWeek = hoursPerWeek * 60;
  for (let w = 1; w <= weeks; w++) {
    const weekItems: DebtItem[] = [];
    let weekEffort = 0;
    while (remaining.length > 0 && weekEffort + remaining[0].effortMinutes <= msPerWeek) {
      const item = remaining.shift()!;
      weekItems.push(item);
      weekEffort += item.effortMinutes;
    }
    if (weekItems.length > 0) {
      plan.push({ week: w, items: weekItems, effortHours: Math.round(weekEffort / 60 * 10) / 10 });
    }
  }
  return plan;
}

export async function techDebtTool(input: TechDebtInput): Promise<unknown> {
  switch (input.action) {
    case 'scan': {
      if (!input.dir) return { error: 'dir required for scan action' };
      return scanDebt(input.dir, input.ignore, input.maxFiles ?? 100);
    }
    case 'repayment': {
      if (!input.dir) return { error: 'dir required for repayment action' };
      const report = scanDebt(input.dir, input.ignore, input.maxFiles ?? 100);
      const plan = generateRepaymentPlan(report, input.maxHoursPerWeek ?? 10, input.weeks ?? 4);
      return { report: { score: report.score, summary: report.summary }, plan };
    }
    case 'prioritize': {
      if (!input.dir) return { error: 'dir required for prioritize action' };
      const report = scanDebt(input.dir, input.ignore, input.maxFiles ?? 100);
      return {
        topPriority: report.items.filter(i => i.priority === 'p0' || i.priority === 'p1').slice(0, 20),
        byCategory: report.byCategory,
        score: report.score,
      };
    }
  }
}
