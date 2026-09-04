//! Capability `release-manager` — version management, changelog, deployment readiness.
// Pure, deterministic, keyless. Analyzes git history, generates changelogs,
// checks release readiness, manages version bumps, tracks release artifacts.
import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type ReleaseType = 'major' | 'minor' | 'patch' | 'prerelease';
export type ReleaseStatus = 'planned' | 'in-progress' | 'testing' | 'ready' | 'deployed' | 'verified' | 'rolled-back';

export interface ReleaseNote {
  type: 'feat' | 'fix' | 'chore' | 'refactor' | 'perf' | 'test' | 'docs' | 'security' | 'breaking';
  scope?: string;
  description: string;
  commitHash?: string;
}

export interface ReleasePlan {
  version: string;
  type: ReleaseType;
  status: ReleaseStatus;
  notes: ReleaseNote[];
  changelog: string;
  readinessChecks: ReadinessCheck[];
  isReady: boolean;
  estimatedDate?: string;
}

export interface ReadinessCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'pending';
  detail: string;
}

// ── Conventional Commits ─────────────────────────────────────────────────────

const COMMIT_RE = /^(feat|fix|chore|refactor|perf|test|docs|security|breaking)(?:\(([^)]+)\))?!?:\s*(.+)$/;

export function parseCommitMessage(msg: string): ReleaseNote | null {
  const match = msg.match(COMMIT_RE);
  if (!match) return null;
  const type = match[1] as ReleaseNote['type'];
  const scope = match[2] || undefined;
  const description = match[3];
  const breaking = msg.includes('!:');
  return {
    type: breaking ? 'breaking' : type,
    scope,
    description,
  };
}

// ── Versioning ───────────────────────────────────────────────────────────────

export function bumpVersion(current: string, type: ReleaseType): string {
  const parts = current.replace(/^v/, '').split('.').map(Number);
  while (parts.length < 3) parts.push(0);
  switch (type) {
    case 'major': return `v${parts[0] + 1}.0.0`;
    case 'minor': return `v${parts[0]}.${parts[1] + 1}.0`;
    case 'patch': return `v${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    case 'prerelease': return `v${parts[0]}.${parts[1]}.${parts[2] + 1}-next.0`;
  }
}

export function detectBumpType(notes: ReleaseNote[]): ReleaseType {
  if (notes.some(n => n.type === 'breaking')) return 'major';
  if (notes.some(n => n.type === 'feat')) return 'minor';
  return 'patch';
}

// ── Changelog Generation ─────────────────────────────────────────────────────

export function generateChangelog(version: string, notes: ReleaseNote[]): string {
  const lines: string[] = [`## ${version} (${new Date().toISOString().slice(0, 10)})`, ''];
  const groups: Record<string, ReleaseNote[]> = {
    Breaking: [], Features: [], Fixes: [], Security: [], Performance: [], Refactor: [], Docs: [], Chores: [], Tests: [],
  };
  for (const note of notes) {
    switch (note.type) {
      case 'breaking': groups['Breaking'].push(note); break;
      case 'feat': groups['Features'].push(note); break;
      case 'fix': groups['Fixes'].push(note); break;
      case 'security': groups['Security'].push(note); break;
      case 'perf': groups['Performance'].push(note); break;
      case 'refactor': groups['Refactor'].push(note); break;
      case 'docs': groups['Docs'].push(note); break;
      case 'chore': groups['Chores'].push(note); break;
      case 'test': groups['Tests'].push(note); break;
    }
  }
  for (const [heading, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    lines.push(`### ${heading}`, '');
    for (const item of items) {
      const scope = item.scope ? `**${item.scope}:** ` : '';
      lines.push(`- ${scope}${item.description}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ── Readiness Checks ─────────────────────────────────────────────────────────

export function checkReadiness(context: {
  hasTests?: boolean;
  testsPassing?: boolean;
  hasLint?: boolean;
  lintPassing?: boolean;
  hasBuild?: boolean;
  buildPassing?: boolean;
  hasSecurityScan?: boolean;
  securityClean?: boolean;
  hasChangelog?: boolean;
  hasVersion?: boolean;
  lastDeployDays?: number;
  openBugs?: number;
}): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];
  checks.push({ name: 'Tests', status: context.hasTests ? (context.testsPassing ? 'pass' : 'fail') : 'warn', detail: context.testsPassing ? 'All tests passing' : context.hasTests ? 'Tests failing' : 'No tests found' });
  checks.push({ name: 'Lint', status: context.hasLint ? (context.lintPassing ? 'pass' : 'fail') : 'warn', detail: context.lintPassing ? 'Lint clean' : context.hasLint ? 'Lint errors' : 'No lint configured' });
  checks.push({ name: 'Build', status: context.hasBuild ? (context.buildPassing ? 'pass' : 'fail') : 'warn', detail: context.buildPassing ? 'Build successful' : context.hasBuild ? 'Build failing' : 'No build configured' });
  checks.push({ name: 'Security', status: context.hasSecurityScan ? (context.securityClean ? 'pass' : 'fail') : 'warn', detail: context.securityClean ? 'No known vulnerabilities' : context.hasSecurityScan ? 'Vulnerabilities found' : 'No security scan' });
  checks.push({ name: 'Changelog', status: context.hasChangelog ? 'pass' : 'warn', detail: context.hasChangelog ? 'Changelog present' : 'Missing changelog' });
  checks.push({ name: 'Version', status: context.hasVersion ? 'pass' : 'warn', detail: context.hasVersion ? 'Version bumped' : 'Version not bumped' });
  checks.push({ name: 'Open Bugs', status: (context.openBugs ?? 0) === 0 ? 'pass' : (context.openBugs ?? 0) <= 3 ? 'warn' : 'fail', detail: `${context.openBugs ?? 0} open bugs` });
  if (context.lastDeployDays != null) {
    checks.push({ name: 'Cooldown', status: context.lastDeployDays >= 1 ? 'pass' : 'warn', detail: `Last deploy ${context.lastDeployDays}d ago` });
  }
  return checks;
}

// ── Tool Schema ──────────────────────────────────────────────────────────────

export const releaseManagerSchema = z.object({
  action: z.enum(['plan', 'changelog', 'readiness', 'bump']),
  version: z.string().optional().describe('Current version (e.g., v1.5.0)'),
  bumpType: z.enum(['major', 'minor', 'patch', 'prerelease']).optional(),
  commits: z.array(z.string()).optional().describe('Conventional commit messages'),
  readiness: z.object({
    hasTests: z.boolean().optional(),
    testsPassing: z.boolean().optional(),
    hasLint: z.boolean().optional(),
    lintPassing: z.boolean().optional(),
    hasBuild: z.boolean().optional(),
    buildPassing: z.boolean().optional(),
    hasSecurityScan: z.boolean().optional(),
    securityClean: z.boolean().optional(),
    hasChangelog: z.boolean().optional(),
    hasVersion: z.boolean().optional(),
    lastDeployDays: z.number().optional(),
    openBugs: z.number().optional(),
  }).optional(),
});

export type ReleaseManagerInput = z.infer<typeof releaseManagerSchema>;

export async function releaseManagerTool(input: ReleaseManagerInput): Promise<unknown> {
  switch (input.action) {
    case 'plan': {
      const notes = (input.commits || []).map(c => parseCommitMessage(c)).filter(Boolean) as ReleaseNote[];
      const type = input.bumpType || detectBumpType(notes);
      const version = input.version ? bumpVersion(input.version, type) : 'v0.0.1';
      const changelog = generateChangelog(version, notes);
      return { version, type, notes, changelog, noteCount: notes.length };
    }
    case 'changelog': {
      const notes = (input.commits || []).map(c => parseCommitMessage(c)).filter(Boolean) as ReleaseNote[];
      const version = input.version || 'v0.0.0';
      return generateChangelog(version, notes);
    }
    case 'readiness': {
      if (!input.readiness) return { error: 'readiness context required' };
      const checks = checkReadiness(input.readiness);
      const isReady = checks.every(c => c.status === 'pass' || c.status === 'warn');
      return { checks, isReady, summary: checks.map(c => `${c.name}: ${c.status}`).join(', ') };
    }
    case 'bump': {
      if (!input.version) return { error: 'current version required' };
      const type = input.bumpType || 'patch';
      return { current: input.version, bumped: bumpVersion(input.version, type), type };
    }
  }
}
