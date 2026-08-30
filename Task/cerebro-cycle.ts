// -----------------------------------------------------------------------------
// Task/cerebro-cycle.ts â€” EJECUCIÃ“N REAL de un ciclo del Cerebro (iter-101)
// -----------------------------------------------------------------------------
// Un ciclo = LEARN â†’ CREATE (objetos + videos REALES en disco) â†’ PUBLISH
// (encola en la cola Publication vÃ­a Prisma, fail-soft a outbox JSON) â†’ REPORT.
//
// Salidas por ciclo en .ultraia/cerebro/<cycleId>/:
//   objects/*.png|*.obj|*.gltf   â€” objetos matemÃ¡ticos desde cero (Gielis)
//   video/<slug>.mp4             â€” video procedural real (frames PNG + ffmpeg)
//   manifest.json | report.md | state.json
// Outbox fail-safe si la BD no estÃ¡ disponible: .ultraia/cerebro/outbox/*.json
//
// Uso:
//   node_modules\.bin\vite-node.cmd Task/cerebro-cycle.ts --run     (ciclo real)
//   node_modules\.bin\vite-node.cmd Task/cerebro-cycle.ts --plan    (solo plan)
//   node_modules\.bin\vite-node.cmd Task/cerebro-cycle.ts --schedule (schtasks+cron)
// ProgramaciÃ³n: scripts/cerebro-schedule.ps1 (schtasks /Create).
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
import { composeDesign2D, composeDesign3D } from '../packages/core/src/tools/designcompose';
import {
  buildRenderScript,
  planAudioMux,
  planProcVid,
  renderFrames,
  resolveSpec,
} from '../packages/core/src/tools/procvid';
import { encodeWav } from '../packages/core/src/omag/sound';
import { mixSynths, sequenceNotes, synthPinkNoise, type NoteStep } from '../packages/core/src/tools/generative';
import { runAgentLoop, type AgentGoalRun, type AgentLoopStepContext } from '../packages/core/src/tools/agent-loop';
import { SemanticMemoryIndex, loadTruthAuto, type TruthDoc } from '../packages/core/src/tools/semantic-memory';
import { generateDerivedContent, ALL_CONTENT_SOURCES } from '../packages/core/src/tools/content-engine';

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

/** Fase CREATE: objetos matemÃ¡ticos reales (PNG + OBJ + glTF). */
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
    // Malla supershape 3D (superfÃ³rmula de Gielis) desde cero.
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
    console.log(`  objeto ${spec.nombre}: ${stats.vertexCount} vÃ©rtices â†’ obj/gltf/png`);
    n += 3; // png + obj + gltf
  }
  return n;
}

/**
 * Banda sonora procedural determinista para un video (semilla â†’ notas).
 * PentatÃ³nica menor + bajo + ruido rosa suave: cero deps, cero red.
 */
function crearSoundtrack(seed: number, durationSec: number): Buffer {
  const bpm = 96;
  const bars = Math.max(1, Math.min(8, Math.ceil((durationSec * bpm) / 240)));
  // Escala pentatÃ³nica menor en La (A C D E G) por octavas.
  const escala = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
  const pattern: NoteStep[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const base = bar * 16;
    pattern.push({ step: base, freq: escala[0] / 2, type: 'triangle', gain: 0.42 }); // bajo
    for (const s of [0, 3, 6, 10, 12]) {
      const idx = (bar * 5 + s) % escala.length;
      const salt = ((seed % 13) + s * 7 + bar * 3) % 2 === 0 ? 1 : 0;
      pattern.push({
        step: base + s + (s > 6 ? 2 : 0),
        freq: escala[(idx + salt) % escala.length] * (salt ? 2 : 1),
        type: 'sine',
        gain: 0.22,
      });
    }
  }
  const seq = sequenceNotes({ bpm, bars, seed, pattern });
  const air = synthPinkNoise({ durationSec: seq.durationSec });
  return encodeWav(mixSynths([seq, air]));
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
    // outDir explÃ­cito: el plan genera argv con rutas del MISMO directorio
    // donde renderFrames escribe los frames (si no, ffmpeg leerÃ­a otra ruta).
    const plan = planProcVid(normalized, { outDir: videoDir });
    const result = await renderFrames(normalized, { framesDir: plan.framesDir });
    const script = buildRenderScript(plan);
    const shPath = path.join(videoDir, `${plan.outName}.sh`);
    fs.writeFileSync(shPath, script.sh);
    const mp4 = path.join(videoDir, `${plan.outName}.mp4`);
    if (has('ffmpeg')) {
      try {
        // Banda sonora procedural (semilla â†’ WAV) + mux aditivo.
        const wavPath = path.join(videoDir, `${plan.outName}.wav`);
        fs.writeFileSync(wavPath, crearSoundtrack(spec.seed, plan.durationSec));
        const argv = planAudioMux(plan.ffmpegArgv, wavPath, { codec: 'aac', volume: 0.6 });
        execFileSync('ffmpeg', argv.slice(1), { stdio: 'pipe' });
        console.log(`  video ${plan.outName}.mp4 (${result.count} frames + soundtrack) OK`);
        count++;
        // limpiar frames para no acumular GB entre ciclos
        for (const f of fs.readdirSync(plan.framesDir)) {
          if (/^frame_\d+\.png$/.test(f)) fs.unlinkSync(path.join(plan.framesDir, f));
        }
      } catch (err) {
        errores.push(`ffmpeg fallÃ³ para ${plan.outName} (frames en ${videoDir}): ${String(err).slice(0, 160)}`);
      }
    } else {
      errores.push('ffmpeg no encontrado: frames PNG generados, ensamble omitido (fail-soft)');
    }
  }
  return count;
}

/** Fase PUBLISH: encola una publicaciÃ³n por cada video creado (fail-soft). */
/** Fase CREATE: diseño 2D/3D desde el modelo de diseño (PNG determinista). */
async function crearDisenos(dir: string, semilla: number, errores: string[] = []): Promise<number> {
  const designDir = path.join(dir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  try {
    const d2 = composeDesign2D({ width: 512, height: 512, seed: semilla, palette: 'neoViolet', style: 'fractal' });
    await writePngAtomic(path.join(designDir, 'design-2d.png'), d2);
    const d3 = composeDesign3D({ seed: semilla + 1, palette: 'ice', kind: 'supershape' });
    await writePngAtomic(path.join(designDir, 'design-3d.png'), d3);
    console.log('  diseño: design-2d.png + design-3d.png (modelo de diseño 2D/3D)');
    return 2;
  } catch (err) {
    errores.push(`DESIGN fail-soft: ${String(err)}`);
    return 0;
  }
}

/** Fase CREATE: contenido derivado desde ebooks y cursos (blog/caption/thread). */
function crearContenido(dir: string, semilla: number, errores: string[] = []): number {
  const contentDir = path.join(dir, 'content');
  fs.mkdirSync(contentDir, { recursive: true });
  let count = 0;

  // Seleccionar 3 fuentes al azar con la semilla para variedad
  const sources = [...ALL_CONTENT_SOURCES];
  const shuffled = sources.sort((a, b) => {
    const ha = (semilla + a.id.charCodeAt(0)) % 100;
    const hb = (semilla + b.id.charCodeAt(0)) % 100;
    return ha - hb;
  });
  const picked = shuffled.slice(0, Math.min(3, shuffled.length));

  const types: Array<'blog-post' | 'social-caption' | 'thread'> = ['blog-post', 'social-caption', 'thread'];
  const idiomas: Array<'es' | 'ar'> = ['es'];

  for (const source of picked) {
    for (const type of types) {
      for (const idioma of idiomas) {
        try {
          const result = generateDerivedContent(source, {
            type,
            idioma,
            dir: contentDir,
            dryRun: false,
          });
          count += result.files.length;
          console.log(`  contenido: ${result.files.length} archivo(s) ${type} ${idioma} desde ${source.id}`);
        } catch (err) {
          errores.push(`CONTENIDO fail-soft (${source.id}/${type}/${idioma}): ${String(err).slice(0, 120)}`);
        }
      }
    }
  }
  return count;
}

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
          contenido: `Video procedural creado 100% por cÃ³digo en el ciclo ${cycleIdFor()} (sin assets ni modelos externos): frames matemÃ¡ticos ensamblados con ffmpeg.`,
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

/**
 * Fases del ciclo (LEARN -> CREATE -> PUBLISH) sin orquestación de loop.
 * Extraídas para poder ser invocadas tanto en modo lineal como dentro de
 * runAgentLoop (orquestador del bucle).
 */
async function ejecutarFasesCiclo(opts: {
  dir: string;
  config: ReturnType<typeof resolveCerebroConfig>;
  state: ReturnType<typeof parseBrainState>;
  errores: string[];
  plan: ReturnType<typeof planBrainCycle>;
  semilla: number;
  lote: ReturnType<typeof planProceduralBatch>;
  cycleId: string;
}): Promise<{ artefactos: number; videos: number; encoladas: number; lecciones: number }> {
  const { dir, config, errores, plan, semilla, lote } = opts;
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
  let artefactos = 0;
  let videos = 0;
  let contenido = 0;
  try {
    artefactos += await crearObjetos(dir, lote, errores);
    artefactos += await crearDisenos(dir, semilla, errores);
    contenido = crearContenido(dir, semilla, errores);
    artefactos += contenido;
    videos = await crearVideos(dir, lote, errores);
    artefactos += videos;
  } catch (e) {
    errores.push(`CREATE fail-soft: ${String(e)}`);
  }
  let encoladas = 0;
  if (!plan.pasos.find((p) => p.kind === 'publish')?.saltado) {
    const res = await publicar(dir, videos, config);
    encoladas = res.encoladas;
    if (!res.ok) errores.push('PUBLISH fail-soft: BD no disponible → outbox JSON');
  }
  return { artefactos, videos, encoladas, lecciones };
}

/**
 * Fases del ciclo envueltas en runAgentLoop: conecta memory (recall/learn),
 * planner (planBrainCycle ya produjo tasks), orchestrator/agents (execute =
 * ejecuta las fases reales), verifier (verify) y tester (test) en un bucle con
 * presupuesto de iteraciones. Fail-soft: cualquier fallo queda en errores.
 */
async function ejecutarAgentLoop(opts: {
  dir: string;
  config: ReturnType<typeof resolveCerebroConfig>;
  state: ReturnType<typeof parseBrainState>;
  errores: string[];
  plan: ReturnType<typeof planBrainCycle>;
  semilla: number;
  lote: ReturnType<typeof planProceduralBatch>;
  cycleId: string;
}): Promise<{ artefactos: number; videos: number; encoladas: number; lecciones: number }> {
  const { dir, config, errores, plan, semilla, lote, cycleId } = opts;
  const objective = typeof (plan as Record<string, unknown>).objetivo === 'string'
    ? String((plan as Record<string, unknown>).objetivo)
    : `Ciclo de cerebro ${cycleId}: crear y publicar contenido generativo`;
  const tasks = (plan.pasos ?? []).map((p) => p.kind);
  const memoryPath = path.join(CEREBRO_DIR, 'memory.json');
  const maxIter = Math.max(1, Number(process.env.CEREBRO_AGENT_LOOP_MAX ?? '1'));

  const MEM_FILE = path.join(CEREBRO_DIR, 'semantic-memory.json');
  const cargarIndice = async (): Promise<SemanticMemoryIndex> => {
    const idx = new SemanticMemoryIndex();
    try {
      const { docs } = await loadTruthAuto();
      for (const d of docs) idx.add(d);
    } catch {
      /* sin corpus de verdad */
    }
    try {
      const raw = JSON.parse(fs.readFileSync(MEM_FILE, 'utf8'));
      for (const d of (raw.docs ?? []) as TruthDoc[]) idx.add(d);
    } catch {
      /* sin memoria aprendida previa */
    }
    return idx;
  };

  // memory (recall): recupera verdades/learnings verificados relevantes al objetivo.
  const recall: AgentLoopStep = async (ctx) => {
    try {
      const idx = await cargarIndice();
      const hits = idx.query(ctx.objective, 5);
      ctx.memory.semanticHits = hits.map((h) => ({ id: h.id, score: h.score }));
      ctx.memory.semanticCount = idx.size;
      ctx.memory.prev = fs.existsSync(memoryPath) ? JSON.parse(fs.readFileSync(memoryPath, 'utf8')) : {};
    } catch {
      /* fail-soft */
    }
  };

  // memory (learn): persiste un aprendizaje del ciclo en el indice semantic-memory.
  const learn: AgentLoopStep = async (ctx) => {
    try {
      const idx = await cargarIndice();
      const nuevo: TruthDoc = {
        id: `cerebro-${cycleId}-${ctx.iteration}`,
        texto: ctx.objective,
        respuesta: `ciclo ${cycleId}: artefactos=${Number(ctx.memory.artefactos ?? 0)} videos=${Number(ctx.memory.videos ?? 0)} lecciones=${Number(ctx.memory.lecciones ?? 0)}`,
        tipo: 'cerebro',
        fuente: 'cerebro-cycle',
      };
      idx.add(nuevo);
      const prev: { docs: TruthDoc[] } = { docs: [] };
      try {
        prev.docs = (JSON.parse(fs.readFileSync(MEM_FILE, 'utf8')).docs ?? []) as TruthDoc[];
      } catch {
        /* sin memoria previa */
      }
      prev.docs.push(nuevo);
      fs.writeFileSync(MEM_FILE, JSON.stringify({ docs: prev.docs }, null, 2));
      fs.writeFileSync(
        memoryPath,
        JSON.stringify(
          { lastCycle: cycleId, objective: ctx.objective, lecciones: ctx.memory.lecciones ?? 0, semanticCount: idx.size },
          null,
          2,
        ),
      );
    } catch {
      /* fail-soft */
    }
  };

  // verifier: corta si la ejecucion no cumplio (done:false) o no produjo artefactos.
  const verify: AgentLoopStep = async (ctx) => {
    if (!ctx.lastResult) return;
    if (!ctx.lastResult.done) return { shouldStop: true };
    if (Number(ctx.memory.artefactos ?? 0) === 0) {
      errores.push('verifier: ciclo terminó sin artefactos');
      return { shouldStop: true };
    }
  };

  // tester: valida artefactos reales (MP4 via ffprobe, PNG via magic bytes).
  const testStep: AgentLoopStep = async (ctx) => {
    try {
      let fallos = 0;
      const videoDir = path.join(dir, 'video');
      const objDir = path.join(dir, 'objects');
      if (fs.existsSync(videoDir)) {
        for (const f of fs.readdirSync(videoDir)) {
          if (!/\.mp4$/.test(f)) continue;
          const p = path.join(videoDir, f);
          if (has('ffprobe')) {
            try {
              execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', p], { stdio: 'pipe' });
            } catch {
              fallos++;
              errores.push(`tester: ffprobe falló para ${f}`);
            }
          } else if (fs.statSync(p).size < 1024) {
            fallos++;
          }
        }
      }
      if (fs.existsSync(objDir)) {
        for (const f of fs.readdirSync(objDir)) {
          if (!/\.png$/.test(f)) continue;
          const buf = fs.readFileSync(path.join(objDir, f));
          if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) {
            fallos++;
            errores.push(`tester: PNG inválido ${f}`);
          }
        }
      }
      if (fallos > 0 && ctx.iteration > 0) {
        return { shouldStop: true, notes: [...ctx.notes, `tester: ${fallos} artefacto(s) inválido(s)`] };
      }
    } catch {
      /* fail-soft */
    }
  };
  const execute = async (ctx: AgentLoopStepContext): Promise<AgentGoalRun> => {
    const antes = errores.length;
    const f = await ejecutarFasesCiclo({ dir, config, state: opts.state, errores, plan, semilla, lote, cycleId });
    const nuevos = errores.slice(antes);
    const ok = nuevos.length === 0;
    // Memoria compartida para el resumen y el paso learn.
    ctx.memory.artefactos = f.artefactos;
    ctx.memory.videos = f.videos;
    ctx.memory.encoladas = f.encoladas;
    ctx.memory.lecciones = f.lecciones;
    return {
      goal: ctx.objective,
      results: [
        {
          taskId: 'ciclo',
          task: 'ciclo',
          status: ok ? 'done' : 'error',
          output: `artefactos=${f.artefactos} videos=${f.videos} encoladas=${f.encoladas} lecciones=${f.lecciones}`,
          error: ok ? undefined : nuevos.join(' | '),
        },
      ],
      done: ok,
    };
  };

  const loop = await runAgentLoop({
    objective,
    tasks,
    maxIterations: maxIter,
    recall,
    execute,
    verify,
    test: testStep,
    learn,
    shouldStop: (c) => c.iteration >= maxIter - 1,
  });
  return {
    artefactos: Number(loop.memory.artefactos ?? 0),
    videos: Number(loop.memory.videos ?? 0),
    encoladas: Number(loop.memory.encoladas ?? 0),
    lecciones: Number(loop.memory.lecciones ?? 0),
  };
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
  console.log(`[cerebro] ciclo ${cycleId} â†’ ${path.relative(ROOT, dir)}`);

  /* CREATE input */
  const semilla = Number(cycleId.replaceAll('-', '').slice(2, 10)) % 100000;
  const lote = planProceduralBatch(config, semilla);

  /* Orquestación: por defecto fases lineales; si agenteLoop está activo,
     envuelve el ciclo en runAgentLoop (memory/plan/orchestrator/verify/test/learn). */
  const usarAgentLoop =
    Boolean((config as Record<string, unknown>).agenteLoop) || process.env.CEREBRO_AGENT_LOOP === '1';
  let fases: { artefactos: number; videos: number; encoladas: number; lecciones: number };
  if (usarAgentLoop) {
    console.log('[cerebro] orquestación vía runAgentLoop (memory/plan/orchestrator/verify/test/learn)');
    fases = await ejecutarAgentLoop({ dir, config, state, errores, plan, semilla, lote, cycleId });
  } else {
    fases = await ejecutarFasesCiclo({ dir, config, state, errores, plan, semilla, lote, cycleId });
  }
  const { artefactos, videos, encoladas, lecciones } = fases;

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
  console.log(`[cerebro] ciclo listo: ${artefactos} artefactos (incl. ${contenido} contenido), ${encoladas} publicaciÃ³n(es), ${(resumen.duracionMs / 1000).toFixed(1)}s`);
}

void main().catch((err) => {
  console.error('[cerebro] ERROR fatal:', err);
  process.exit(1);
});
