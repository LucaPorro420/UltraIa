/**
 * Verification Gates Endpoint — hardened with allowlist + .ultraia cache + learningHealth
 * POST /api/verify/gates  { "scope": "full" | "scoped" }
 * GET  /api/verify/gates  — last run cached
 */
import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { prisma } from '@ultraia/core';

export const dynamic = 'force-dynamic';

const ROOT = (() => {
  const cwd = process.cwd();
  const cand = join(cwd, '..', '..');
  return existsSync(join(cand, 'package.json')) ? cand : cwd;
})();
const CACHE_DIR = join(ROOT, '.ultraia');
const CACHE_FILE = join(CACHE_DIR, 'verification-cache.json');

interface GateResult {
  name: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  passed: boolean;
}

interface VerificationRun {
  timestamp: string;
  scope: 'full' | 'scoped';
  gates: GateResult[];
  overallPassed: boolean;
  totalDurationMs: number;
  learningHealth?: any;
}

// allowlist exact gates — no shell interpolation
const ALLOWED_GATES: Record<string, string> = {
  typecheck: 'npm run typecheck --if-present',
  lint: 'npm run lint --if-present',
  test: 'npm run test:ci --if-present',
  build: 'npm run build --if-present',
};

const GATES_FULL = [ALLOWED_GATES.typecheck, ALLOWED_GATES.lint, ALLOWED_GATES.test, ALLOWED_GATES.build];
const GATES_SCOPED = [ALLOWED_GATES.typecheck, ALLOWED_GATES.lint];

function run(cmd: string, timeout = 300000): GateResult {
  const start = Date.now();
  // guard: only allow exact allowlisted commands
  if (!Object.values(ALLOWED_GATES).includes(cmd)) {
    return { name: cmd, command: cmd, exitCode: 1, stdout: '', stderr: 'blocked', durationMs: Date.now() - start, passed: false };
  }
  try {
    const stdout = execSync(cmd, { cwd: ROOT, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout, env: { ...process.env, CI: 'true' } });
    return { name: cmd.split(' ')[2] || cmd, command: cmd, exitCode: 0, stdout: stdout.slice(-10000), stderr: '', durationMs: Date.now() - start, passed: true };
  } catch (e: any) {
    return { name: cmd.split(' ')[2] || cmd, command: cmd, exitCode: e.status || 1, stdout: (e.stdout || '').slice(-10000), stderr: (e.stderr || e.message || '').slice(-5000), durationMs: Date.now() - start, passed: false };
  }
}

async function learningHealth() {
  try {
    const [courses, lessons, decks, cardsDue] = await Promise.all([
      prisma.learningCourse.count(),
      prisma.learningLesson.count(),
      prisma.studyDeck.count(),
      prisma.studyCard.count({ where: { nextReview: { lte: new Date() } } }),
    ]);
    return { courses, lessons, decks, cardsDue };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const scope: 'full' | 'scoped' = body.scope === 'scoped' ? 'scoped' : 'full';
  const gates = scope === 'full' ? GATES_FULL : GATES_SCOPED;

  const results: GateResult[] = [];
  let overallPassed = true;
  for (const cmd of gates) {
    const r = run(cmd);
    results.push(r);
    if (!r.passed) overallPassed = false;
  }

  const lh = await learningHealth();

  const runData: VerificationRun = {
    timestamp: new Date().toISOString(),
    scope,
    gates: results,
    overallPassed,
    totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
    learningHealth: lh,
  };

  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(runData, null, 2));
  } catch {}

  return NextResponse.json(runData, { status: overallPassed ? 200 : 500, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  if (!existsSync(CACHE_FILE)) {
    return NextResponse.json({ error: 'No verification run found. POST to run gates.', timestamp: new Date().toISOString() }, { status: 404 });
  }
  const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as VerificationRun;
  const ageMs = Date.now() - new Date(cached.timestamp).getTime();
  return NextResponse.json({ ...cached, ageMs, stale: ageMs > 30 * 60 * 1000 });
}
