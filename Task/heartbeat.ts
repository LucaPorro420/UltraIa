/**
 * Task/heartbeat.ts — EL LATIDO de UltraIa (iter-82).
 *
 * Mide el estado real del organismo (gates, tests, backlog, gaps, memoria,
 * actividad), lo compara con el latido anterior, decide por si mismo la
 * siguiente accion y escribe el parte medico. Sin LLM, sin red, determinista
 * salvo por la fecha y el `git log` (ambos inyectables).
 *
 * Uso:
 *   npx vite-node Task/heartbeat.ts
 *   npx vite-node Task/heartbeat.ts -- --gates typecheck=1,lint=1,test=1,build=1
 *   npx vite-node Task/heartbeat.ts -- --json            (salida JSON, sin escribir)
 *   npx vite-node Task/heartbeat.ts -- --strict          (exit 2 si el estado es ROJO)
 *   npx vite-node Task/heartbeat.ts -- --fecha 2026-08-21
 *
 * Salidas:
 *   resultTask/heartbeat/pulso-<fecha>.md   parte medico (lo que commitea el cron)
 *   resultTask/heartbeat/vitals.json        estado completo legible por maquina
 *   .ultraia/vitals/last.json               latido anterior (para detectar regresiones)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectGaps } from '../packages/core/src/tools/autolearn';
import { loadTruthCorpus, type TruthFileLike } from '../packages/core/src/tools/semantic-memory';
import {
  aLatido,
  codigoSalida,
  computeVitals,
  construirPulso,
  decidirAccion,
  detectRegresiones,
  type GateStatus,
  type Latido,
  type VitalsInput,
} from '../packages/core/src/tools/vitals';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const p = (...xs: string[]) => join(root, ...xs);
const leer = (rel: string) => {
  try {
    return readFileSync(p(rel), 'utf8');
  } catch {
    return '';
  }
};
const listar = (rel: string, filtro: (n: string) => boolean) => {
  try {
    return readdirSync(p(rel)).filter(filtro);
  } catch {
    return [];
  }
};

/** Corpus de verdad verificada (fuente = nombre de archivo, como loadTruthAuto). */
function corpus() {
  const files: TruthFileLike[] = [];
  for (const f of listar(join('learning', 'truth'), (n) => n.endsWith('.json'))) {
    try {
      const parsed = JSON.parse(leer(join('learning', 'truth', f))) as { cases?: Array<Record<string, unknown>> };
      files.push({ source: f.replace(/\.json$/, ''), cases: parsed.cases });
    } catch {
      /* fail-soft: archivo corrupto se omite */
    }
  }
  return loadTruthCorpus(files);
}

/**
 * Backlog de STATE.md: cuenta filas `| N | ... |` y las clasifica.
 * DONE = la fila declara DONE; bloqueada = human-blocked / concurrente / bloqueada;
 * el resto es deuda propia pendiente.
 */
function backlog(state: string) {
  const filas = state.split(/\r?\n/).filter((l) => /^\|\s*\d+\s*\|/.test(l));
  let done = 0;
  let bloqueadas = 0;
  for (const f of filas) {
    const esDone = /(✅\s*)?DONE\b/i.test(f) || /RESUELTO|CERRADO/i.test(f);
    const esBloqueada = /human-blocked|bloquead|concurrente|diferid/i.test(f) && !esDone;
    if (esDone) done++;
    else if (esBloqueada) bloqueadas++;
  }
  return { total: filas.length, done, bloqueadas, pendientes: filas.length - done - bloqueadas };
}

/** Commits de los ultimos `dias` (fail-soft: 0 si git no esta disponible). */
function commitsRecientes(dias = 7): number {
  try {
    const out = execFileSync('git', ['log', `--since=${dias}.days`, '--oneline'], { cwd: root, encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean).length;
  } catch {
    return 0;
  }
}

/** HEAD corto (fail-soft). */
function commitActual(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

/** Lecciones de LEARNINGS.md fechadas en los ultimos `dias` (formato dd/mm o ISO). */
function leccionesRecientes(learnings: string, hoy: Date, dias = 7): number {
  const limite = new Date(hoy.getTime() - dias * 86400000);
  let n = 0;
  for (const linea of learnings.split(/\r?\n/)) {
    const iso = linea.match(/\((\d{4})-(\d{2})-(\d{2})/);
    const ddmm = linea.match(/\((\d{2})\/(\d{2})/);
    let f: Date | null = null;
    if (iso) f = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    else if (ddmm) f = new Date(hoy.getFullYear(), Number(ddmm[2]) - 1, Number(ddmm[1]));
    if (f && f >= limite && f <= hoy) n++;
  }
  return n;
}

/** `--gates typecheck=1,lint=0` -> { typecheck: true, lint: false }. */
function parseGates(spec: string | undefined): GateStatus {
  if (!spec) return {};
  const out: GateStatus = {};
  for (const par of spec.split(',')) {
    const [k, v] = par.split('=').map((x) => x.trim());
    if (k === 'typecheck' || k === 'lint' || k === 'test' || k === 'build') out[k] = v === '1' || v === 'true' || v === 'ok';
  }
  return out;
}

/** Cuenta de tests declarada por el ultimo gate (o 0/0 si no se corrio). */
function testsDesdeArgs(spec: string | undefined): { total: number; pasados: number } {
  if (!spec) return { total: 0, pasados: 0 };
  const [pasados, total] = spec.split('/').map((x) => Number(x.trim()));
  return Number.isFinite(total) && Number.isFinite(pasados) ? { pasados, total } : { total: 0, pasados: 0 };
}

function arg(nombre: string): string | undefined {
  const args = process.argv.slice(2);
  const eq = args.find((a) => a.startsWith(`--${nombre}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const flag = (n: string) => process.argv.slice(2).includes(`--${n}`);

async function main() {
  const hoy = arg('fecha') ? new Date(`${arg('fecha')}T12:00:00`) : new Date();
  const fecha = hoy.toISOString().slice(0, 10);

  const state = leer('STATE.md');
  const learnings = leer(join('learning', 'LEARNINGS.md'));
  const docs = corpus();

  const gaps = detectGaps({
    learnings,
    truth: docs,
    backlog: state,
    sources: listar(join('learning', 'sources'), (n) => n.endsWith('.md')),
    razonamientos: listar('docs', (n) => /^RAZONAMIENTO-/i.test(n) && n.endsWith('.md')),
    implemented: listar(join('packages', 'core', 'src', 'tools'), (n) => n.endsWith('.ts') && !n.includes('.test.')).map((n) => n.replace(/\.ts$/, '')),
  });

  const input: VitalsInput = {
    tests: testsDesdeArgs(arg('tests')),
    gaps: gaps.map((g) => ({ kind: g.kind })),
    corpus: { docs: docs.length, fuentes: new Set(docs.map((d) => d.fuente)).size },
    backlog: backlog(state),
    actividad: { commits: commitsRecientes(), lecciones: leccionesRecientes(learnings, hoy) },
    gates: parseGates(arg('gates')),
  };

  const v = computeVitals(input);
  const prevPath = p('.ultraia', 'vitals', 'last.json');
  let prev: Latido | null = null;
  if (existsSync(prevPath)) {
    try {
      prev = JSON.parse(readFileSync(prevPath, 'utf8')) as Latido;
    } catch {
      prev = null;
    }
  }
  const latido = aLatido(fecha, input, v);
  const regresiones = detectRegresiones(prev, latido);
  const accion = decidirAccion(v, input, regresiones);
  const entorno = process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : process.env.VERCEL ? 'vercel' : 'local';
  const pulso = construirPulso(fecha, v, accion, regresiones, { commit: commitActual(), entorno });

  if (flag('json')) {
    console.log(JSON.stringify({ fecha, entorno, vitals: v, input, latido, regresiones, accion }, null, 2));
    process.exit(flag('strict') ? codigoSalida(v) : 0);
  }

  const outDir = p('resultTask', 'heartbeat');
  mkdirSync(outDir, { recursive: true });
  mkdirSync(p('.ultraia', 'vitals'), { recursive: true });
  writeFileSync(join(outDir, `pulso-${fecha}.md`), pulso, 'utf8');
  writeFileSync(join(outDir, 'vitals.json'), JSON.stringify({ fecha, entorno, vitals: v, input, regresiones, accion }, null, 2), 'utf8');
  writeFileSync(prevPath, JSON.stringify(latido, null, 2), 'utf8');

  console.log(pulso);
  console.log(`\nEscrito: resultTask/heartbeat/pulso-${fecha}.md + vitals.json (+ .ultraia/vitals/last.json)`);
  process.exit(flag('strict') ? codigoSalida(v) : 0);
}

main().catch((e) => {
  console.error('[heartbeat] fallo:', e);
  process.exit(1);
});
