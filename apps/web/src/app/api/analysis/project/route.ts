/**
 * Project Analysis Endpoint — hardened + Learning metrics
 * GET /api/analysis/project
 */
import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { prisma } from '@ultraia/core';

export const dynamic = 'force-dynamic';

const ROOT = (() => {
  const cwd = process.cwd();
  // apps/web -> ../.. ; fallback cwd if already root
  const candidate = join(cwd, '..', '..');
  return existsSync(join(candidate, 'package.json')) ? candidate : cwd;
})();

// allowlist exact commands — no interpolation
const ALLOW = new Set([
  'git status --porcelain',
  'git log --oneline -10',
  'git branch --show-current',
  'npx prisma validate --schema packages/core/prisma/schema.prisma',
]);

function run(cmd: string): { stdout: string; stderr: string; code: number } {
  if (!ALLOW.has(cmd)) return { stdout: '', stderr: `blocked: ${cmd}`, code: 1 };
  try {
    const stdout = execSync(cmd, { cwd: ROOT, encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024, timeout: 30000 });
    return { stdout, stderr: '', code: 0 };
  } catch (e: any) {
    return { stdout: e.stdout || '', stderr: e.stderr || e.message, code: e.status || 1 };
  }
}

function walkCount(dir: string, depth = 0): number {
  if (depth > 6) return 0;
  let n = 0;
  try {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.') && ent.name !== '.env.example') {
        if (['.git', '.next', 'node_modules', '.turbo', '.ultraia'].includes(ent.name)) continue;
      }
      const p = join(dir, ent.name);
      if (ent.isDirectory()) n += walkCount(p, depth + 1);
      else if (/\.(ts|tsx|js|json)$/.test(ent.name)) n += 1;
    }
  } catch {}
  return n;
}

export async function GET(req: NextRequest) {
  const start = Date.now();

  const gitStatus = run('git status --porcelain');
  const gitLog = run('git log --oneline -10');
  const gitBranch = run('git branch --show-current');
  const prismaStatus = run('npx prisma validate --schema packages/core/prisma/schema.prisma');

  // pkg workspaces
  let workspaces: any[] = [];
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    const ws = pkg?.workspaces ?? [];
    for (const pat of ws) {
      const base = pat.replace('*', '');
      const wsPath = join(ROOT, base);
      if (existsSync(join(wsPath, 'package.json'))) {
        const wsPkg = JSON.parse(readFileSync(join(wsPath, 'package.json'), 'utf-8'));
        workspaces.push({ path: pat, name: wsPkg.name, version: wsPkg.version, deps: Object.keys(wsPkg.dependencies ?? {}).length, devDeps: Object.keys(wsPkg.devDependencies ?? {}).length });
      }
    }
  } catch {}

  // tsconfigs via walk
  const tsconfigs: string[] = [];
  try {
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (['node_modules', '.next', '.git', '.turbo'].includes(e.name)) continue;
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === 'tsconfig.json') tsconfigs.push(p.replace(ROOT, '.'));
      }
    };
    walk(ROOT);
  } catch {}

  const fileCount = walkCount(ROOT);

  // Learning metrics (real Prisma counts — no shell)
  let learningMetrics: any = { courses: 0, lessons: 0, decks: 0, cardsDue: 0, searchIndex: 0 };
  try {
    const [courses, lessons, decks, cardsDue, searchIndex] = await Promise.all([
      prisma.learningCourse.count({ where: { isPublished: true } }),
      prisma.learningLesson.count({ where: { isPublished: true } }),
      prisma.studyDeck.count(),
      prisma.studyCard.count({ where: { nextReview: { lte: new Date() } } }),
      prisma.searchIndex.count(),
    ]);
    learningMetrics = { courses, lessons, decks, cardsDue, searchIndex };
  } catch (e: any) {
    learningMetrics = { error: e.message, courses: 0, lessons: 0, decks: 0, cardsDue: 0, searchIndex: 0 };
  }

  const envExample = existsSync(join(ROOT, '.env.example'));
  const envLocal = existsSync(join(ROOT, '.env'));

  const analysis: any = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    git: {
      branch: gitBranch.stdout.trim(),
      clean: gitStatus.stdout.trim() === '',
      changedFiles: gitStatus.stdout.trim().split('\n').filter(Boolean).length,
      recentCommits: gitLog.stdout.trim().split('\n').filter(Boolean),
    },
    workspaces,
    tsconfigs,
    prisma: { valid: prismaStatus.code === 0, output: prismaStatus.stdout.slice(0, 2000) || prismaStatus.stderr.slice(0, 2000) },
    metrics: { fileCount },
    env: { hasExample: envExample, hasLocal: envLocal },
    learningMetrics,
    health: 'unknown' as string,
  };

  const checks = [analysis.git.clean, analysis.prisma.valid];
  analysis.health = checks.every(Boolean) ? 'healthy' : checks.some(Boolean) ? 'degraded' : 'unhealthy';

  return NextResponse.json(analysis, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
