#!/usr/bin/env -S npx vite-node
// Genesis Runner CLI — drives the autonomous engineering loop against the live repo.
//
// Usage (from repo root):
//   node_modules/.bin/vite-node.cmd scripts/genesis-run.ts [--manifest path]
//                                                    [--max-iter N] [--dry-run]
//
// What it does each cycle:
//   1. Loads the Genesis Manifest (default .ultraia/genesis/manifest.json).
//   2. Discovers gaps via autolearn.detectGaps (real file scan).
//   3. runGenesisCycle -> next validated action + plan.
//   4. Executes the Manifest's required quality gates via real `npm run ...`.
//   5. Persists .ultraia/genesis/state.json and re-assesses.
//
// Fail-soft: gate execution errors are recorded as failures; the engine stops on the
// Manifest's stop conditions (max_iterations, repair budget, approval, etc.).

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { genesisManifestSchema, evaluateGates, buildGenesisProposal } from '../packages/core/src/tools/genesis';
import { runGenesisCycle, type GapLike } from '../packages/core/src/tools/genesis-runner';
import { detectGaps, type Gap } from '../packages/core/src/tools/autolearn';

const { values } = parseArgs({
  options: {
    manifest: { type: 'string' },
    'max-iter': { type: 'string', default: '20' },
    'dry-run': { type: 'boolean', default: false },
    propose: { type: 'boolean', default: false },
  },
});

const ROOT = process.cwd();
const STATE_DIR = resolve(ROOT, '.ultraia', 'genesis');
const STATE_FILE = resolve(STATE_DIR, 'state.json');
const MANIFEST_FILE = values.manifest
  ? resolve(ROOT, values.manifest)
  : resolve(STATE_DIR, 'manifest.json');
const MAX_ITER = Number(values['max-iter'] ?? '20');

const DEFAULT_MANIFEST = {
  project: { id: 'ultraia', name: 'UltraIa' },
  objective: { primary: 'Evolucionar UltraIa como plataforma de generación y mejora autónoma' },
  pipeline: { steps: ['analyze', 'discover', 'prioritize', 'plan', 'implement', 'test', 'repair', 'refactor', 'document', 'validate', 'commit', 'reassess'] },
  quality_gates: {
    typecheck: { required: true, command: 'npm run typecheck' },
    lint: { required: true, command: 'npm run lint' },
    test: { required: true, command: 'npm run test' },
    build: { required: true, command: 'npm run build' },
  },
  autonomy: { level: 1, repair_attempts: 5, max_iterations: MAX_ITER },
};

function loadManifest() {
  if (!existsSync(MANIFEST_FILE)) {
    console.log(`[genesis] no manifest at ${MANIFEST_FILE} — using built-in default.`);
    return genesisManifestSchema.parse(DEFAULT_MANIFEST);
  }
  return genesisManifestSchema.parse(JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')));
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { iterations: 0, repairAttempts: 0 };
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state: unknown) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
}

/** Build autolearn GapInputs from the live repo (no mutation, read-only). */
function buildGapInputs() {
  const learningsPath = resolve(ROOT, 'learning', 'LEARNINGS.md');
  const backlogPath = resolve(ROOT, 'STATE.md');
  const learnings = existsSync(learningsPath) ? readFileSync(learningsPath, 'utf8') : '';
  const backlog = existsSync(backlogPath) ? readFileSync(backlogPath, 'utf8') : '';
  const sourcesDir = resolve(ROOT, 'learning', 'sources');
  const sources = existsSync(sourcesDir)
    ? readdirSync(sourcesDir).filter((f) => f.endsWith('.md'))
    : [];
  const docsDir = resolve(ROOT, 'docs');
  const razonamientos = existsSync(docsDir)
    ? readdirSync(docsDir).filter((f) => /^RAZONAMIENTO/i.test(f))
    : [];
  return { learnings, backlog, sources, razonamientos, truth: [], implemented: [] };
}

/** Map an autolearn Gap to the runner's structural GapLike. */
function toGapLike(g: Gap): GapLike {
  return {
    id: `${g.kind}:${g.descripcion.slice(0, 48)}`,
    kind: g.kind,
    detail: g.descripcion,
    source: g.evidencia,
  };
}

const GATE_COMMANDS: Record<string, string | undefined> = {
  typecheck: 'npm run typecheck',
  lint: 'npm run lint',
  test: 'npm run test',
  build: 'npm run build',
};

function runGate(name: string): boolean {
  const cmd = GATE_COMMANDS[name];
  if (!cmd) {
    console.log(`[genesis] gate '${name}' has no CLI command — skipping (unknown).`);
    return true; // non-runnable gates do not block in CLI mode
  }
  try {
    console.log(`[genesis] running gate '${name}': ${cmd}`);
    execSync(cmd, { stdio: 'ignore', cwd: ROOT, timeout: 540_000 });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const manifest = loadManifest();
  let state = loadState();
  mkdirSync(STATE_DIR, { recursive: true });

  console.log(`[genesis] autonomous loop — max_iter=${MAX_ITER} dry-run=${values['dry-run']}`);

  if (values.propose) {
    let gaps: GapLike[] = [];
    try {
      gaps = detectGaps(buildGapInputs()).map(toGapLike);
    } catch (e) {
      console.log(
        `[genesis] gap discovery failed: ${e instanceof Error ? e.message : String(e)} — proposing with no gaps.`,
      );
    }
    const cycle = runGenesisCycle(manifest, state, { gaps });
    const proposal = buildGenesisProposal({ manifest, state: cycle.state, tasks: cycle.tasks, gaps });
    const propFile = resolve(STATE_DIR, 'proposal.md');
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(propFile, proposal.markdown, 'utf8');
    console.log(`[genesis] proposal written to ${propFile}`);
    console.log(`next action: ${proposal.nextAction}${proposal.topTaskId ? ` (top task: ${proposal.topTaskId})` : ''}`);
    return;
  }

  for (let i = 0; i < MAX_ITER; i++) {
    let gaps: GapLike[] = [];
    try {
      gaps = detectGaps(buildGapInputs()).map(toGapLike);
    } catch (e) {
      console.log(
        `[genesis] gap discovery failed: ${e instanceof Error ? e.message : String(e)} — continuing with no gaps.`,
      );
    }
    const cycle = runGenesisCycle(manifest, state, { gaps });

    console.log(`\n=== cycle ${cycle.state.iterations} ===`);
    console.log(`action: ${cycle.action} — ${cycle.reason}`);
    console.log(`next:   ${cycle.next?.action} — ${cycle.next?.rationale}`);
    if (cycle.tasks && cycle.tasks.length) {
      console.log(`tasks:  ${cycle.tasks.length} (top: ${cycle.tasks[0].id})`);
    }

    if (cycle.action === 'STOP') {
      console.log(`[genesis] STOP: ${cycle.reason}`);
      saveState(cycle.state);
      return;
    }

    if (!values['dry-run']) {
      const results: Record<string, boolean> = {};
      for (const g of evaluateGates(manifest, {}).gates) {
        if (g.required) results[g.name] = runGate(g.name);
      }
      const verdict = evaluateGates(manifest, results);
      console.log(`[genesis] gate verdict: ${verdict.passed ? 'PASS' : 'FAIL'}`);
      if (!verdict.passed) {
        state = { ...cycle.state, repairAttempts: (cycle.state.repairAttempts ?? 0) + 1 };
        const maxRepair = manifest.autonomy?.repair_attempts ?? Infinity;
        if (state.repairAttempts >= maxRepair) {
          console.log(`[genesis] STOP: repair attempts exhausted (${state.repairAttempts}).`);
          saveState({ ...state, repairAttemptsExhausted: true });
          return;
        }
        saveState(state);
        continue;
      }
    }

    state = cycle.state;
    saveState(state);
  }

  console.log('[genesis] reached max_iter — loop halted.');
}

main();
