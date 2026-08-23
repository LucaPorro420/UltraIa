//! Capability `deps` — dependency vulnerability audit (SCA, UltraIa port).
// Fail-soft wrapper around `npm audit --json`. The runner is injectable so the
// pure parser is fully testable offline (no network, no real spawn in tests).
// Complements `security` (secrets) and `codequality` (smells).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type DepSeverity = 'critical' | 'high' | 'moderate' | 'low';

export interface DepVuln {
  name: string;
  severity: DepSeverity;
  via: string;
  title: string;
  url: string;
  fixAvailable: boolean | string;
}

export interface DepAuditResult {
  ok: boolean;
  /** Count of advisories found. */
  count: number;
  vulns: DepVuln[];
  /** Total dependencies audited (npm audit metadata), when available. */
  dependencies?: number;
  /** Present when the audit could not run / parse (fail-soft). */
  note?: string;
}

export interface AuditDepsOptions {
  /** Working dir to run the audit in (default process.cwd()). */
  cwd?: string;
  /** Injectable runner returning the raw `npm audit --json` stdout. */
  runAudit?: () => Promise<string>;
}

/**
 * Parse the raw `npm audit --json` output (npm v7+ schema) into a flat vuln list.
 * Pure, never throws — malformed input yields { ok:false, note }.
 */
export function parseAuditJson(raw: string): DepAuditResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, count: 0, vulns: [], note: 'audit output is not valid JSON' };
  }
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== 'object') {
    return { ok: false, count: 0, vulns: [], note: 'unexpected audit payload' };
  }
  const vulns: DepVuln[] = [];
  const metadata = (obj.metadata as Record<string, unknown> | undefined) ?? {};
  const vulnMap = (obj.vulnerabilities as Record<string, unknown> | undefined) ?? {};
  for (const [name, v] of Object.entries(vulnMap)) {
    const vuln = v as Record<string, unknown>;
    const viaRaw = vuln.via;
    let via = 'unknown';
    if (Array.isArray(viaRaw) && viaRaw.length > 0) {
      const first = viaRaw[0] as Record<string, unknown>;
      via = typeof first === 'string' ? first : String(first.name ?? first.title ?? 'unknown');
    } else if (typeof viaRaw === 'string') {
      via = viaRaw;
    }
    const sev = (vuln.severity as DepSeverity) ?? 'low';
    const title = (vuln.title as string) ?? name;
    const url = (vuln.url as string) ?? '';
    const fix = vuln.fixAvailable;
    vulns.push({
      name,
      severity: sev,
      via,
      title,
      url,
      fixAvailable: typeof fix === 'boolean' ? fix : typeof fix === 'string' ? fix : Boolean(fix),
    });
  }
  const dependencies =
    metadata.dependencies !== undefined ? Number(metadata.dependencies) : undefined;
  return { ok: true, count: vulns.length, vulns, dependencies };
}

/** Run the audit. By default spawns `npm audit --json`; injectable for tests. */
export async function auditDeps(opts: AuditDepsOptions = {}): Promise<DepAuditResult> {
  const runAudit =
    opts.runAudit ??
    (async () => {
      const { stdout } = await execFileAsync('npm', ['audit', '--json'], {
        cwd: opts.cwd ?? process.cwd(),
        maxBuffer: 64 * 1024 * 1024,
      });
      return stdout;
    });
  try {
    const raw = await runAudit();
    return parseAuditJson(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, count: 0, vulns: [], note: `audit failed: ${msg}` };
  }
}
