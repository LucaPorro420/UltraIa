//! Capability `security` — deterministic secret/leak scanner (UltraIa port).
// Pure, keyless, offline. Detects common leaked-secret patterns and risky config
// in text/files/dirs. Never throws. This is the automatable, testable counterpart
// to the advisory `cso` skill (OWASP/STRIDE review).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityFinding {
  rule: string;
  severity: Severity;
  /** 1-based line number when scanning text / a file. */
  line?: number;
  /** Truncated offending snippet (no full secret value preserved beyond the pattern match). */
  snippet?: string;
  /** File path when scanning a file/dir. */
  file?: string;
}

export interface ScanOptions {
  /** Substrings to skip during repo walk (e.g. 'node_modules'). */
  ignore?: string[];
  /** Max bytes per file to read. Defaults to 512 KiB. */
  maxBytes?: number;
}

interface Rule {
  id: string;
  severity: Severity;
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

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.svg',
  '.mp4', '.mov', '.webm', '.mp3', '.wav', '.ogg', '.mkv', '.avi',
  '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf', '.exe', '.dll', '.so',
  '.woff', '.woff2', '.ttf', '.eot', '.otf', '.bin', '.sqlite', '.db',
]);

// Anchored, low-false-positive patterns. Order matters only for readability.
const RULES: Rule[] = [
  { id: 'aws_access_key', severity: 'critical', re: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    id: 'aws_secret_access_key',
    severity: 'critical',
    re: /(?:aws_secret_access_key|awsSecretAccessKey)\s*[:=]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/,
  },
  { id: 'private_key', severity: 'critical', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP |)PRIVATE KEY-----/ },
  { id: 'google_api_key', severity: 'high', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'slack_token', severity: 'high', re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { id: 'github_token', severity: 'critical', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{36}\b/ },
  { id: 'github_pat', severity: 'critical', re: /\bgithub_pat_[0-9A-Za-z_]{22,}\b/ },
  { id: 'gitlab_token', severity: 'high', re: /\bglpat-[0-9A-Za-z_-]{20,}\b/ },
  { id: 'stripe_key', severity: 'critical', re: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\b/ },
  { id: 'openai_key', severity: 'critical', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  {
    id: 'jwt',
    severity: 'medium',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    id: 'discord_bot_token',
    severity: 'high',
    re: /\b[MNO][0-9A-Za-z]{23,25}\.[0-9A-Za-z_-]{6,}\.[0-9A-Za-z_-]{27,}\b/,
  },
  { id: 'telegram_bot_token', severity: 'high', re: /\b\d{9,10}:[0-9A-Za-z_-]{35}\b/ },
  {
    id: 'generic_secret_assignment',
    severity: 'medium',
    re: /(?:api[_-]?key|apikey|access[_-]?token|secret|passwd|password|client[_-]?secret)\s*[:=]\s*['"][0-9A-Za-z_\-+/=]{8,}['"]/i,
  },
  { id: 'bearer_token', severity: 'medium', re: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/ },
];

function truncate(s: string, n = 80): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > n ? flat.slice(0, n) + '…' : flat;
}

/** Scan a raw string for secret patterns. Pure, never throws. */
export function scanText(content: string): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      const m = rule.re.exec(line);
      if (m) {
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

/** Scan a single file (fail-soft: returns [] on read error / oversize). */
export function scanFile(path: string, opts: ScanOptions = {}): SecurityFinding[] {
  try {
    const maxBytes = opts.maxBytes ?? 512 * 1024;
    const st = statSync(path);
    if (!st.isFile() || st.size > maxBytes) return [];
    const content = readFileSync(path, 'utf8');
    const base = basename(path);
    const findings = scanText(content).map((f) => ({ ...f, file: path }));
    // Committed real .env (not .env.example) is itself a leak risk.
    if (/^\.env($|\.)/.test(base) && base !== '.env.example') {
      findings.push({
        rule: 'committed_env_file',
        severity: 'high',
        file: path,
        snippet: base,
      });
    }
    return findings;
  } catch {
    return [];
  }
}

function isIgnored(rel: string, ignore: string[]): boolean {
  return ignore.some((ig) => rel.includes(ig));
}

/** Recursively scan a directory tree (fail-soft, deterministic order). */
export function scanRepo(root: string, opts: ScanOptions = {}): SecurityFinding[] {
  const ignore = [...DEFAULT_IGNORE, ...(opts.ignore ?? [])];
  const findings: SecurityFinding[] = [];
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
      } else if (st.isFile() && !BINARY_EXT.has(extname(name).toLowerCase())) {
        findings.push(...scanFile(full, opts));
      }
    }
  };
  walk(root);
  return findings;
}
