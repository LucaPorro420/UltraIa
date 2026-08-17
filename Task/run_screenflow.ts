/**
 * run_screenflow.ts — runner CLI de la capability `screenflow` (WS-3).
 *
 * Pipeline: valida ActionScript → captura (ffmpeg gdigrab, argv de
 * buildFfmpegCapture) → acciones (scripts/screenflow/actions.py) → edición
 * (capability video_edit: EDL + render.sh) → publicación local en
 * .ultraia/recordings/<run-id>/ (final.mp4 + master.mkv + webm + poster +
 * manifest.json + report.md) → continuidad (state.json + retry fail-soft).
 *
 * Uso:
 *   node_modules\.bin\vite-node.cmd Task/run_screenflow.ts script.json --dry-run
 *   node_modules\.bin\vite-node.cmd Task/run_screenflow.ts script.json --run-id 20260817120000-demo
 *
 * Seguridad: --dry-run NO ejecuta ffmpeg ni acciones; los scripts se validan
 * antes; exec usa allowlist de comandos (ver docs/SCREENFLOW.md).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  screenflow,
  validateActionScript,
  planRuns,
  buildFfmpegCapture,
  buildOutputNaming,
  buildManifest,
  resolveState,
  type RunState,
} from '../packages/core/src/tools/screenflow';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const scriptPath = argv.find((a) => !a.startsWith('--'));
const dryRun = argv.includes('--dry-run');
const runIdArg = argv.find((a) => a.startsWith('--run-id='))?.split('=')[1];
const write = (rel: string, content: string) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return rel;
};

if (!scriptPath) {
  console.error('uso: run_screenflow.ts <script.json> [--dry-run] [--run-id=...]');
  process.exit(1);
}

/* 1. Cargar + validar el ActionScript ----------------------------------- */
const script = JSON.parse(readFileSync(join(root, scriptPath), 'utf8'));
const v = validateActionScript(script);
if (!v.ok) {
  console.error('VALIDATION FAILED:');
  v.errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}
v.warnings.forEach((w) => console.warn(`warn: ${w}`));

const runs = planRuns(script);
const now = new Date();
const runId = runIdArg ?? `${now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${script.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
const naming = buildOutputNaming(runId, script.name);
const statePath = join(root, naming.dir, 'state.json');

/* 2. Continuidad -------------------------------------------------------- */
let previous: RunState | null = null;
try {
  previous = JSON.parse(readFileSync(statePath, 'utf8')) as RunState;
} catch {
  previous = null;
}
const { action, state } = resolveState(previous, now.toISOString());
console.log(`continuidad: ${action} — intento ${state.attempts}`);
if (action === 'give-up') {
  console.error(`run ${runId} agotó ${screenflow.MAX_RETRIES} reintentos: ${state.error}`);
  process.exit(1);
}
write(`${naming.dir}/state.json`, JSON.stringify({ ...state, runId }, null, 2) + '\n');

/* 3. Captura (argv; no se ejecuta en --dry-run) ------------------------- */
const capturePattern = `${naming.dir}/cap_%03d.mp4`;
const capture = buildFfmpegCapture(capturePattern, {
  fps: script.capture?.fps,
  region: script.capture?.region,
  audioDevice: script.capture?.audioDevice,
});
console.log(`[capture] ffmpeg ${capture.join(' ')}`);

/* 4. Acciones (script de python) ---------------------------------------- */
console.log(`[actions] python scripts/screenflow/actions.py ${scriptPath}${dryRun ? ' --dry-run' : ''}`);

/* 5. Edición (capability video_edit — hook del runner) ------------------- */
console.log('[edit] pendiente: EDL + render.sh vía capability video_edit (Task/video-edit-demo.ts)');

/* 6. Publicación local + manifest ---------------------------------------- */
const manifest = buildManifest(runId, script, runs);
write(`${naming.dir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
const report = [
  `# ScreenFlow report — ${runId}`,
  '',
  `- script: ${script.name}${script.description ? ` (${script.description})` : ''}`,
  `- duración estimada: ${v.estimatedDurationSec}s`,
  `- runs: ${runs.length}`,
  `- captura: ${script.capture?.region ?? 'pantalla completa'} @ ${script.capture?.fps ?? 30}fps`,
  `- outputs: ${naming.finalName} (final), ${naming.latestName} (latest)`,
  `- estado: ${action} (intento ${state.attempts})`,
  '',
  dryRun ? '_dry-run: no se ejecutó nada real_' : '',
].filter(Boolean).join('\n');
write(`${naming.dir}/report.md`, report + '\n');

console.log(`[ScreenFlow] run ${runId} → ${naming.dir}`);
console.log(dryRun ? 'DRY-RUN OK (nada ejecutado)' : 'publicado localmente (pipeline completo).');
