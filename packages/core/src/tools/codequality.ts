//! Capability `codequality` — deterministic static code-smell linter (UltraIa port).
// Pure, keyless, offline. Detects common code smells that hurt maintainability /
// production safety. Complements `security` (secrets-only). Never throws.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

export type SmellSeverity = 'high' | 'medium' | 'low';

export interface QualityFinding {
  rule: string;
  severity: SmellSeverity;
  /** 1-based line number when scanning text / a file. */
  line?: number;
  /** Truncated offending snippet. */
  snippet?: string;
  /** File path when scanning a file/dir. */
  file?: string;
}

export interface CqScanOptions {
  /** Substrings to skip during repo walk (e.g. 'node_modules'). */
  ignore?: string[];
  /** Max bytes per file to read. Defaults to 512 KiB. */
  maxBytes?: number;
}

interface Rule {
  id: string;
  severity: SmellSeverity;
  re: RegExp;
}

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.ultraia',
  'repomix-output',
  'resultTask',
];

// Extensions we treat as source worth linting.
const SOURCE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java',
  '.cs', '.rb', '.php', '.swift', '.kt', '.c', '.cpp', '.h', '.hpp', '.sh',
  '.ps1', '.r', '.scala', '.vue', '.svelte',
]);

// Anchored, low-false-positive smell patterns.
const RULES: Rule[] = [
  { id: 'debugger_stmt', severity: 'high', re: /\bdebugger\s*;?/ },
  { id: 'eval_usage', severity: 'high', re: /\beval\s*\(/ },
  { id: 'function_constructor', severity: 'high', re: /\bnew\s+Function\s*\(/ },
  { id: 'alert_prompt', severity: 'medium', re: /\b(?:alert|prompt|confirm)\s*\(/ },
  { id: 'ts_any', severity: 'low', re: /:\s*any\b|\bany\[\]|<any>|as\s+any\b/ },
  { id: 'ts_ignore_abuse', severity: 'medium', re: /\/\/\s*@ts-ignore(?!\s+\S)/ },
  { id: 'empty_catch', severity: 'medium', re: /catch\s*\([^)]*\)\s*\{\s*\}/ },
  { id: 'todo_no_ticket', severity: 'low', re: /\/\/\s*(TODO|FIXME|HACK|XXX)\b(?![\s:]*#?\d)/ },
  { id: 'hardcoded_localhost', severity: 'low', re: /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/ },
  { id: 'console_log', severity: 'low', re: /\bconsole\.(log|debug|warn|error|info)\s*\(/ },
  { id: 'password_in_plaintext', severity: 'medium', re: /\b(?:password|passwd|pwd)\s*=\s*['"][^'"]{3,}['"]/i },
];

function truncate(s: string, n = 80): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > n ? flat.slice(0, n) + '…' : flat;
}

/** Scan a raw string for code smells. Pure, never throws. */
export function cqScanText(content: string): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          line: i + 1,
          snippet: truncate(line),
        });
        break; // one rule per line keeps signal clean
      }
    }
  }
  return findings;
}

/** Scan a single file (fail-soft: returns [] on read error / oversize / non-source). */
export function cqScanFile(path: string, opts: CqScanOptions = {}): QualityFinding[] {
  try {
    const maxBytes = opts.maxBytes ?? 512 * 1024;
    const st = statSync(path);
    if (!st.isFile() || st.size > maxBytes) return [];
    if (!SOURCE_EXT.has(extname(path).toLowerCase())) return [];
    const content = readFileSync(path, 'utf8');
    return cqScanText(content).map((f) => ({ ...f, file: path }));
  } catch {
    return [];
  }
}

function isIgnored(rel: string, ignore: string[]): boolean {
  return ignore.some((ig) => rel.includes(ig));
}

/** Recursively scan a directory tree (fail-soft, deterministic order). */
export function cqScanRepo(root: string, opts: CqScanOptions = {}): QualityFinding[] {
  const ignore = [...DEFAULT_IGNORE, ...(opts.ignore ?? [])];
  const findings: QualityFinding[] = [];
  const walk = (dir: string) => {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries.sort()) {
      const full = join(dir, name);
      const rel = full.replace(root, '');
      if (isIgnored(rel, ignore)) continue;
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile()) {
        findings.push(...cqScanFile(full, opts));
      }
    }
  };
  walk(root);
  return findings;
}
