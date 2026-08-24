// -----------------------------------------------------------------------------
// Task/cerebro-cycle.ts — EJECUCIÓN REAL de un ciclo del Cerebro (iter-101)
// -----------------------------------------------------------------------------
// Un ciclo = LEARN → CREATE (objetos + videos REALES en disco) → PUBLISH
// (encola en la cola Publication vía Prisma, fail-soft a outbox JSON) → REPORT.
//
// Salidas por ciclo en .ultraia/cerebro/<cycleId>/:
//   objects/*.png|*.obj|*.gltf   — objetos matemáticos desde cero (Gielis)
//   video/<slug>.mp4             — video procedural real (frames PNG + ffmpeg)
//   manifest.json | report.md | state.json
// Outbox fail-safe si la BD no está disponible: .ultraia/cerebro/outbox/*.json
//
// Uso:
//   node_modules\.bin\vite-node.cmd Task/cerebro-cycle.ts --run     (ciclo real)
//   node_modules\.bin\vite-node.cmd Task/cerebro-cycle.ts --plan    (solo plan)
//   node_modules\.bin\vite-node.cmd Task/cerebro-cycle.ts --schedule (schtasks+cron)
// Programación: scripts/cerebro-schedule.ps1 (schtasks /Create).
// -----------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  advanceBrainState,
  buildBrainReport,
  cycleIdFor,
  emptyBrainState,
  parseBrainState,
  planBrainCycle,
  planProceduralBatch,
  resolveCerebroConfig,
  type CerebroConfig,
  type CycleResultSummary,
} from '../packages/core/src/tools/cerebro';
import {
  meshStats,
  meshToObjText,
  meshToGltf,
  superShape3D,
  superShapeRadius,
} from '../packages/core/src/tools/geometry';
import { PALETTES, renderImagePng, writePngAtomic } from '../packages/core/src/tools/pngrender';
import {
  buildRenderScript,
  planProcVid,
  renderFrames,
  resolveSpec,
} from '../packages/core/src/tools/procvid';

const ROOT = process.cwd();
const CEREBRO_DIR = path.join(ROOT, '.ultraia', 'cerebro');
const RUN = process.argv.includes('--run');
const PLAN_ONLY = process.argv.includes('--plan');
const SHOW_SCHEDULE = process.argv.includes('--schedule');

function has(cmd: string): boolean {
  try {
    // Windows usa `where`; Linux/macOS usa `which` (CI ubuntu-latest).
    const finder = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(finder, [cmd], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function readState(): ReturnType<typeof parseBrainState> {
  const file = path.join(CEREBRO_DIR, 'state.json');
  try {
    return parseBrainState(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    return emptyBrainState();
  }
}

function writeState(next: unknown): void {
  fs.mkdirSync(CEREBRO_DIR, { recursive: true });
  fs.writeFileSync(path.join(CEREBRO_DIR, 'state.json'), JSON.stringify(next, null, 2));
}

/** Fase CREATE: objetos matemáticos reales (PNG + OBJ + glTF). */
async function crearObjetos(
  dir: string,
  lote: Array<ReturnType<typeof planProceduralBatch>[number]>,
  errores: string[] = [],
): Promise<number> {
  const objectsDir = path.join(dir, 'objects');
  fs.mkdirSync(objectsDir, { recursive: true });
  let n = 0;
  for (const spec of lote) {
    if (spec.tipo !== 'object') continue;
    // Malla supershape 3D (superfórmula de Gielis) desde cero.
    const shape = superShape3D(spec.shape, { m: 0, n1: 1, n2: 1, n3: 1 });
    const stats = meshStats(shape);
    fs.writeFileSync(path.join(objectsDir, `${spec.nombre}.obj`), meshToObjText(shape));
    fs.writeFileSync(
      path.join(objectsDir, `${spec.nombre}.gltf`),
      meshToGltf(shape),
    );
    // Render PNG de la silueta con la paleta asignada.
    const stops = PALETTES[spec.paleta] ?? PALETTES.obsidian;
    const W = 256;
    const H = 256;
    const bytes = renderImagePng({ width: W, height: H }, (x, y) => {
      const nx = (x - W / 2) / (W * 0.42);
      const ny = -(y - H / 2) / (H * 0.42);
      const r = Math.hypot(nx, ny);
      const phi = Math.atan2(ny, nx);
      const limit = superShapeRadius(spec.shape, phi);
      if (r <= limit) {
        const t = Math.min(1, r / Math.max(1e-9, limit));
        const i = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
        const f = t * (stops.length - 1) - i;
        const a = stops[i];
        const b = stops[i + 1];
        return [
          Math.round(a[0] + (b[0] - a[0]) * f),
          Math.round(a[1] + (b[1] - a[1]) * f),
          Math.round(a[2] + (b[2] - a[2]) * f),
        ];
      }
      return [8, 8, 10];
    });
    await writePngAtomic(path.join(objectsDir, `${spec.nombre}.png`), bytes);
    console.log(`  objeto ${spec.nombre}: ${stats.vertexCount} vértices → obj/gltf/png`);
    n += 3; // png + obj + gltf
  }
  return n;
}

/** Fase CREATE: videos procedurales reales (frames PNG + ffmpeg MP4). */
async function crearVideos(
  dir: string,
  lote: Array<ReturnType<typeof planProceduralBatch>[number]>,
  errores: string[] = [],
): Promise<number> {
  const videoDir = path.join(dir, 'video');
  fs.mkdirSync(videoDir, { recursive: true });
  let count = 0;
  for (const spec of lote) {
    if (spec.tipo !== 'video') continue;
    const normalized = resolveSpec({
      animation: spec.animation,
      width: spec.width,
      height: spec.height,
      fps: spec.fps,
      durationSec: spec.durationSec,
      seed: spec.seed,
      palette: spec.palette,
      outName: spec.outName,
    });
    const plan = planProcVid(normalized);
    const result = await renderFrames(normalized, { framesDir: videoDir });
    const script = buildRenderScript(plan);
    const shPath = path.join(videoDir, `${plan.outName}.sh`);
    fs.writeFileSync(shPath, script.sh);
    const mp4 = path.join(videoDir, `${plan.outName}.mp4`);
    if (has('ffmpeg')) {
      try {
        execFileSync(
          'ffmpeg',
          [
            '-y', '-loglevel', 'error',
            '-framerate', String(plan.fps),
            '-i', path.join(videoDir, 'frame_%06d.png'),
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            mp4,
          ],
          { stdio: 'pipe' },
        );
        console.log(`  video ${plan.outName}.mp4 (${result.count} frames) OK`);
        count++;
        // limpiar frames para no acumular GB entre ciclos
        for (const f of fs.readdirSync(videoDir)) {
          if (/^frame_\d+\.png$/.test(f)) fs.unlinkSync(path.join(videoDir, f));
        }
      } catch (err) {
        errores.push(`ffmpeg falló para ${plan.outName} (frames en ${videoDir}): ${String(err).slice(0, 160)}`);
      }
    } else {
      errores.push('ffmpeg no encontrado: frames PNG generados, ensamble omitido (fail-soft)');
    }
  }
  return count;
}

/** Fase PUBLISH: encola una publicación por cada video creado (fail-soft). */
async function publicar(dir: string, videos: number, cfg: ReturnType<typeof resolveCerebroConfig>): Promise<{ ok: boolean; encoladas: number }> {
  if (videos === 0) return { ok: true, encoladas: 0 };
  try {
    // Import diferido: la BD no es requerida para learn/create.
    const { prisma } = await import('../packages/core/src/db/client');
    const { createPublication } = await import('../packages/core/src/domain/publications');
    const canal = cfg.canales[0] as never; // primer canal del config
    let id: string | null = null;
    try {
      const res = await createPublication(prisma as never, {
        paquete: {
          briefId: `cerebro-${cycleIdFor()}`,
          tema: `Generativo ${cycleIdFor()}`,
          contenido: `Video procedural creado 100% por código en el ciclo ${cycleIdFor()} (sin assets ni modelos externos): frames matemáticos ensamblados con ffmpeg.`,
          media: { tipo: 'video' },
          captionsByChannel: {},
          visualByChannel: {} as never,
          horarioSugerido: null,
          branding: { estilo: 'dark-obsidian' },
        } as never,
        canal,
      });
      id = res.id;
    } finally {
      await prisma.$disconnect().catch(() => undefined);
    }
    return { ok: true, encoladas: id ? 1 : 0 };
  } catch (err) {
    // Fail-soft: outbox JSON para no perder el trabajo del ciclo.
    const outbox = path.join(CEREBRO_DIR, 'outbox');
    fs.mkdirSync(outbox, { recursive: true });
    fs.writeFileSync(
      path.join(outbox, `${cycleIdFor()}.json`),
      JSON.stringify({ cycleId: cycleIdFor(), videos, error: String(err), pendiente: true }, null, 2),
    );
    return { ok: false, encoladas: 0 };
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(CEREBRO_DIR, { recursive: true });
  const configPath = path.join(CEREBRO_DIR, 'config.json');
  let cfgInput: CerebroConfig = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '');
    cfgInput = JSON.parse(raw) as CerebroConfig;
  } catch {
    /* defaults */
  }
  const config = resolveCerebroConfig(cfgInput);

  if (SHOW_SCHEDULE || PLAN_ONLY) {
    const plan = planBrainCycle(cfgInput, readState());
    console.log(JSON.stringify(plan, null, 2));
    if (!RUN) return;
  }

  const state = readState();
  const plan = planBrainCycle(cfgInput, state);
  if (!plan.presupuestado) {
    console.log(`[cerebro] ciclo OMITIDO: ${plan.motivoBloqueo}`);
    return;
  }

  const started = Date.now();
  const cycleId = cycleIdFor();
  const dir = path.join(CEREBRO_DIR, cycleId);
  fs.mkdirSync(dir, { recursive: true });
  const errores: string[] = [];
  console.log(`[cerebro] ciclo ${cycleId} → ${path.relative(ROOT, dir)}`);

  /* LEARN: gaps de autolearn (dominio puro sobre learning/truth) */
  let lecciones = 0;
  if (!plan.pasos.find((p) => p.kind === 'learn')?.saltado) {
    try {
      const learnPath = path.join(ROOT, 'learning', 'LEARNINGS.md');
      lecciones = fs.existsSync(learnPath)
        ? fs.readFileSync(learnPath, 'utf8').split('\n').filter((l) => /^#{2,3}\s/.test(l)).length
        : 0;
      console.log(`  LEARN: ${lecciones} secciones de aprendizaje detectadas en LEARNINGS.md`);
    } catch (e) {
      errores.push(`LEARN fail-soft: ${String(e)}`);
    }
  }

  /* CREATE */
  const semilla = Number(cycleId.replaceAll('-', '').slice(2, 10)) % 100000;
  const lote = planProceduralBatch(config, semilla);
  let artefactos = 0;
  let videos = 0;
  try {
    artefactos += await crearObjetos(dir, lote, errores);
    videos = await crearVideos(dir, lote, errores);
    artefactos += videos;
  } catch (e) {
    errores.push(`CREATE fail-soft: ${String(e)}`);
  }

  /* PUBLISH */
  let encoladas = 0;
  if (!plan.pasos.find((p) => p.kind === 'publish')?.saltado) {
    const res = await publicar(dir, videos, config);
    encoladas = res.encoladas;
    if (!res.ok) errores.push('PUBLISH fail-soft: BD no disponible → outbox JSON');
  }

  /* REPORT + STATE */
  const resumen: CycleResultSummary = {
    cycleId,
    artefactos,
    videos,
    objetos: lote.filter((s) => s.tipo === 'object').length,
    publicaciones: encoladas,
    lecciones,
    errores,
    duracionMs: Date.now() - started,
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ cycleId, ...resumen }, null, 2));
  fs.writeFileSync(path.join(dir, 'report.md'), buildBrainReport(plan, resumen));
  writeState(advanceBrainState(state, { artefactos, publicaciones: encoladas, lecciones }));
  console.log(`[cerebro] ciclo listo: ${artefactos} artefactos, ${encoladas} publicación(es), ${(resumen.duracionMs / 1000).toFixed(1)}s`);
}

void main().catch((err) => {
  console.error('[cerebro] ERROR fatal:', err);
  process.exit(1);
});
