#!/usr/bin/env node
/**
 * Task1 runner — procesa Task/Task1.md con el orquestador OMAG de UltraIa.
 *
 * Pipeline:
 *   1. Analiza los videos de Task/Content (ffprobe metadata + scene detection
 *      con ffmpeg + frames representativos) → motion-spec JSON por video.
 *   2. Por cada uno de los 10 prompts de Task1.md ejecuta
 *      OmagOrchestrator.run({ idea, quality:'fast', modalities:['image'],
 *      maxIterations:2, gateway }) — plan del Director (LLM local ollama o
 *      fallback determinista) + generacion keyless de imagenes (pollinations).
 *   3. Escribe los resultados en resultTask/ (raiz de UltraIa):
 *        resultTask/README.md
 *        resultTask/video-analysis/<video>.motion-spec.json  (+ frames/)
 *        resultTask/<NN>-<slug>/{plan.json,field.json,results.json,
 *                                  critiques.json,report.md,assets/}
 *
 * Correr (raiz del repo):
 *   node_modules\.bin\vite-node.cmd Task/run_task1.ts
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { generateImage, OpenAICompatibleGateway, OmagOrchestrator, serializeMediaField } from '@ultraia/core';
import { TASK1_PROMPTS, VIDEO_1, VIDEO_2 } from './task1-prompts';

const ROOT = path.resolve(import.meta.dirname, '..');
const TASK_DIR = path.join(ROOT, 'Task');
const CONTENT_DIR = path.join(TASK_DIR, 'Content');
const RESULT_DIR = path.join(ROOT, 'resultTask');

const VIDEOS = [VIDEO_1, VIDEO_2];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function log(msg: string): void {
  console.log(`[task1] ${msg}`);
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** Carga .env de la raiz si existe (sin sobreescribir vars ya definidas). */
function loadRootEnv(): void {
  const envFile = path.join(ROOT, '.env');
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || m[1] === 'DATABASE_URL') continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env) && value) process.env[m[1]] = value;
  }
}

/**
 * Ajusta el LLM local: si el provider es ollama y el modelo por defecto
 * (llama3.1:8b) no cabe en RAM, usa un modelo pequeño que si carga.
 * Override con TASK1_MODEL.
 */
function tuneLocalLlm(): void {
  const provider = (process.env.ULTRAIA_PROVIDER || 'ollama').toLowerCase();
  if (provider !== 'ollama') return;
  const forced = process.env.TASK1_MODEL;
  if (forced) {
    process.env.ULTRAIA_MODEL = forced;
    log(`LLM local: ${forced} (override TASK1_MODEL)`);
    return;
  }
  const current = process.env.ULTRAIA_MODEL || '';
  if (current.includes('llama3.1') || current.includes('llama3:')) {
    process.env.ULTRAIA_MODEL = 'qwen2.5-coder:1.5b-base';
    log('LLM local: llama3.1 no cabe en RAM → qwen2.5-coder:1.5b-base (override TASK1_MODEL)');
  }
}

function run(cmd: string, args: string[]): { stdout: string; stderr: string; status: number } {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status ?? -1 };
}

/** Descarga una URL a un archivo local (fetch nativo, timeout 90s). */
async function download(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return false;
    writeFileSync(dest, buf);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recorta la idea para el orquestador: el generador de imágenes keyless limita
 * el prompt a 2000 chars y el fallback determinista usa la idea como escena.
 * Conserva el encabezado (stack + estética) y las secciones principales.
 */
function truncateIdea(prompt: string, maxChars = 1600): string {
  if (prompt.length <= maxChars) return prompt;
  const head = prompt.slice(0, maxChars);
  const cut = head.lastIndexOf('\n');
  return (cut > maxChars * 0.6 ? head.slice(0, cut) : head) + '\n…(truncado)';
}

// ---------------------------------------------------------------------------
// 1. Analisis de video → motion spec
// ---------------------------------------------------------------------------

interface VideoMeta {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitRate: number;
  sizeBytes: number;
}

function probeVideo(file: string): VideoMeta {
  const { stdout } = run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,size,bit_rate',
    '-show_entries', 'stream=codec_name,width,height,r_frame_rate',
    '-of', 'json', file,
  ]);
  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string; size?: string; bit_rate?: string };
    streams?: Array<{ codec_name?: string; width?: number; height?: number; r_frame_rate?: string }>;
  };
  // El stream de video es el que tiene width/height (el primero puede ser audio).
  const stream =
    parsed.streams?.find((s) => (s.width ?? 0) > 0 && (s.height ?? 0) > 0) ?? parsed.streams?.[0] ?? {};
  const [num, den] = (stream.r_frame_rate ?? '30/1').split('/').map(Number);
  return {
    duration: Number(parsed.format?.duration ?? 0),
    width: stream.width ?? 0,
    height: stream.height ?? 0,
    fps: num && den ? num / den : 30,
    codec: stream.codec_name ?? 'unknown',
    bitRate: Number(parsed.format?.bit_rate ?? 0),
    sizeBytes: Number(parsed.format?.size ?? 0),
  };
}

/** Detecta cambios de escena con ffmpeg select+showinfo → timestamps (s). */
function detectScenes(file: string): number[] {
  const { stderr } = run('ffmpeg', ['-i', file, '-vf', "select='gt(scene,0.4)',showinfo", '-f', 'null', '-']);
  const times: number[] = [];
  for (const m of stderr.matchAll(/pts_time:([0-9.]+)/g)) {
    times.push(Number(m[1]));
  }
  return [...new Set(times)].sort((a, b) => a - b);
}

/** Extrae un frame JPG en el timestamp dado. */
function extractFrame(file: string, atSec: number, outJpg: string): void {
  ensureDir(path.dirname(outJpg));
  run('ffmpeg', [
    '-ss', String(atSec), '-i', file,
    '-frames:v', '1', '-vf', 'scale=480:-1', '-q:v', '5', '-y', outJpg,
  ]);
}

function videoBase(fileName: string): string {
  return fileName.replace(/\.mp4$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

/** Crea el motion-spec JSON de un video y extrae sus frames. */
function analyzeVideo(fileName: string): Record<string, unknown> {
  const file = path.join(CONTENT_DIR, fileName);
  const base = videoBase(fileName);
  const outDir = path.join(RESULT_DIR, 'video-analysis');
  const framesDir = path.join(outDir, 'frames', base);
  ensureDir(framesDir);

  const meta = probeVideo(file);
  const cuts = detectScenes(file);
  const boundaries = [0, ...cuts, meta.duration];
  const scenes: Array<Record<string, unknown>> = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const frameFile = `frames/${base}/scene_${String(i + 1).padStart(2, '0')}.jpg`;
    extractFrame(file, Math.min(start + 0.1, Math.max(0, end - 0.1)), path.join(outDir, frameFile));
    scenes.push({
      index: i + 1,
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      duration: Number((end - start).toFixed(2)),
      frame: frameFile,
    });
  }
  const avgScene = scenes.length ? scenes.reduce((s, sc) => s + (sc.duration as number), 0) / scenes.length : 0;

  // Patrones cualitativos documentados en Task1.md (seccion "Qué tomaría de los videos").
  const qualitative =
    fileName === VIDEO_2
      ? [
          'Diseño editorial/cinematográfico para gastronomía',
          'Fotografías enormes de producto',
          'Tipografía grande',
          'Secciones que cambian como escenas',
          'Transiciones entre productos',
          'Cards y elementos que se desplazan',
          'Contraste negro + imágenes luminosas',
          'Animaciones ligadas al scroll',
          'Composición tipo landing page + storytelling visual',
        ]
      : [
          'Presentación oscura/premium',
          'Imagen principal ocupando gran parte del viewport',
          'Sensación cinematográfica',
          'Capas superpuestas',
          'Transiciones suaves entre estados',
          'Elementos centrales que aparecen/desaparecen con movimiento',
          'Navegación minimalista',
          'Mucho protagonismo de la fotografía',
          'Sensación de sitio de alta gama',
        ];

  const spec = {
    video: fileName,
    metadata: {
      durationSec: Number(meta.duration.toFixed(2)),
      resolution: `${meta.width}x${meta.height}`,
      fps: meta.fps,
      codec: meta.codec,
      bitRate: meta.bitRate,
      sizeBytes: meta.sizeBytes,
    },
    scenes,
    rhythm: {
      sceneCount: scenes.length,
      avgSceneDurationSec: Number(avgScene.toFixed(2)),
      cutsAtSec: cuts.map((c) => Number(c.toFixed(2))),
    },
    // Vocabulario del Director (prompt/director.ts) sugerido por ritmo de escena.
    suggestedMotions: scenes.map((s) => {
      const d = s.duration as number;
      return d < 1.5 ? 'zoom-in' : d < 3 ? 'slow-push-in' : 'pan-left';
    }),
    patterns: qualitative,
    source: 'Task/Task1.md (referencia visual) + ffmpeg scene detection',
  };
  const outFile = path.join(outDir, `${base}.motion-spec.json`);
  writeFileSync(outFile, JSON.stringify(spec, null, 2));
  log(`motion-spec ${fileName}: ${scenes.length} escenas, duracion media ${avgScene.toFixed(2)}s`);
  return spec;
}

// ---------------------------------------------------------------------------
// 2. Orquestador por prompt → resultTask/<NN>-<slug>/
// ---------------------------------------------------------------------------

async function runApp(
  app: (typeof TASK1_PROMPTS)[number],
  gateway: OpenAICompatibleGateway,
  videoSpecs: Map<string, Record<string, unknown>>,
): Promise<{ ok: boolean; error?: string }> {
  const slug = String(app.number).padStart(2, '0') + '-' + app.slug;
  const outDir = path.join(RESULT_DIR, slug);
  const assetsDir = path.join(outDir, 'assets');
  ensureDir(assetsDir);
  // Limpia restos de runs anteriores (smoke tests fallidos, etc.).
  const staleError = path.join(outDir, 'error.json');
  if (existsSync(staleError)) unlinkSync(staleError);
  log(`[${slug}] ${app.title} — orquestador...`);

  const orchestrator = new OmagOrchestrator();
  const idea = truncateIdea(app.prompt);
  const useLlm = process.env.TASK1_LLM === '1' || process.env.TASK1_LLM === 'true';
  let result;
  let llmUsed = false;

  if (useLlm) {
    // LLM opcional (TASK1_LLM=1): con timeout de 90s para no bloquear el run.
    const withTimeout = Promise.race([
      orchestrator.run({ idea, quality: 'fast', modalities: ['image'], maxIterations: 2, gateway }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('LLM timeout 90s')), 90_000)),
    ]);
    try {
      result = await withTimeout;
      llmUsed = true;
      log(`[${slug}] plan del Director LLM OK`);
    } catch (e) {
      const error = (e as Error).message || String(e);
      log(`[${slug}] LLM no disponible (${error}) → plan determinista local`);
      result = await orchestrator.run({ idea, quality: 'fast', modalities: ['image'], maxIterations: 2 });
    }
  } else {
    // Default: plan determinista local (sin LLM) — rapido y reproducible.
    result = await orchestrator.run({ idea, quality: 'fast', modalities: ['image'], maxIterations: 2 });
  }

  const plan = (result.field.metadata.plan ?? {}) as Record<string, unknown>;
  writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify(plan, null, 2));
  writeFileSync(path.join(outDir, 'field.json'), serializeMediaField(result.field));
  writeFileSync(
    path.join(outDir, 'critiques.json'),
    JSON.stringify(
      {
        accepted: result.accepted,
        overall: result.overall,
        iterations: result.iterations,
        critiques: result.critiques,
        recommendations: result.recommendations,
      },
      null,
      2,
    ),
  );

  // Inspeccion de resultados (imagenes generadas) + descarga local.
  const items: Array<Record<string, unknown>> = [];
  let downloaded = 0;
  for (const r of result.results) {
    const gen = orchestrator.generators.find((g) => g.modality === r.metadata.modality);
    const inspect = (gen?.inspect(r) ?? r.metadata) as { url?: string; provider?: string; model?: string };
    let localFile: string | null = null;
    if (inspect.url) {
      const ext = inspect.url.includes('.png') ? 'png' : 'jpg';
      localFile = `assets/hero_${items.length + 1}.${ext}`;
      if (await download(inspect.url, path.join(outDir, localFile))) {
        downloaded++;
        log(`[${slug}] imagen ${items.length + 1} descargada (${inspect.provider})`);
      } else {
        log(`[${slug}] imagen ${items.length + 1}: no se pudo descargar (URL remota conservada)`);
        localFile = null;
      }
    }
    items.push({ ...inspect, localFile, confidence: r.confidence, provenance: r.provenance });
  }

  // Imagenes de seccion complementarias (deterministas, keyless, mismo lenguaje
  // visual del motion-spec: oscuro/premium/cinematografico).
  const videoSpec = videoSpecs.get(app.video);
  const styleBase = app.video === VIDEO_2
    ? 'editorial gastronomy photography, huge product shots, dark background, luminous images, bold typography, scene-like sections'
    : 'dark premium cinematic photography, deep black and charcoal, huge hero imagery, layered composition, subtle metallic accents, soft glow';
  const sectionTitles = ['Hero showcase', 'Interactive explorer', 'Editorial gallery'];
  for (let i = 0; i < sectionTitles.length; i++) {
    try {
      const img = await generateImage({
        prompt: `${app.title} premium web and mobile app — ${sectionTitles[i]}, ${styleBase}`,
        seed: 1000 + app.number * 100 + i,
        width: 768,
        height: 1024,
      });
      const ext = img.url.includes('.png') ? 'png' : 'jpg';
      const localFile = `assets/section_${i + 1}.${ext}`;
      if (await download(img.url, path.join(outDir, localFile))) {
        downloaded++;
        items.push({
          url: img.url,
          provider: img.provider,
          model: img.model,
          seed: img.seed,
          localFile,
          confidence: 0.8,
          provenance: `section:${img.provider}:${img.model}`,
        });
        log(`[${slug}] sección ${i + 1} (${sectionTitles[i]}) descargada`);
      } else {
        log(`[${slug}] sección ${i + 1}: no se pudo descargar`);
      }
    } catch (e) {
      log(`[${slug}] sección ${i + 1}: error ${(e as Error).message}`);
    }
  }
  writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(items, null, 2));

  // Reporte legible.
  // El field del orquestador guarda guion (environment.scene), estilo
  // (style.visual) y musica (style.audio) que metadata.plan no incluye.
  const fieldAny = result.field as unknown as Record<string, unknown>;
  const scene = String((fieldAny.environment as Record<string, unknown>)?.scene ?? plan.script ?? '');
  const styleVis = JSON.stringify((fieldAny.style as Record<string, unknown>)?.visual ?? {});
  const audioMusic = String((fieldAny.style as Record<string, unknown>)?.audio?.music ?? plan.bgm ?? '');
  const report = [
    `# ${app.number}. ${app.title}`,
    '',
    `- **Slug**: ${slug}`,
    `- **Video de referencia**: \`${app.video}\` → \`video-analysis/${videoBase(app.video)}.motion-spec.json\``,
    `- **Orquestador**: OmagOrchestrator (calidad \`fast\`, modalidad \`image\`, máx ${result.iterations} iteración/es)`,
    `- **Plan**: ${llmUsed ? 'Director LLM (ollama/OpenAI-compatible)' : 'Director determinista local (fallback)'}`,
    '',
    '## Resultado',
    '',
    `- **Aceptado**: ${result.accepted}`,
    `- **Score global**: ${result.overall?.toFixed(2)}`,
    `- **Iteraciones**: ${result.iterations}`,
    '',
    '## Plan del Director',
    '',
    `- **Idioma**: ${String(plan.languageName ?? plan.language ?? '')}`,
    `- **Shots**: ${String(plan.shots ?? '')}`,
    `- **Motions**: ${JSON.stringify(plan.motions ?? [])}`,
    `- **Estilo**: ${styleVis}`,
    `- **BGM**: ${audioMusic}`,
    '',
    '## Guion (escena del MediaField)',
    '',
    '```',
    scene,
    '```',
    '',
    '## Imágenes generadas',
    '',
    ...(items.length
      ? items.map(
          (it, i) =>
            `${i + 1}. **${String(it.provider ?? '')} / ${String(it.model ?? '')}** — ${it.localFile ?? 'solo URL'}\n   URL: ${String(it.url ?? '')}`,
        )
      : ['_(sin imágenes — generación keyless no disponible en este run)_']),
    '',
    '## Recomendaciones del crítico',
    '',
    ...(result.recommendations.length
      ? result.recommendations.map((r: string) => `- ${r}`)
      : ['_(sin recomendaciones pendientes)_']),
    '',
    '## Motion spec del video de referencia (resumen)',
    '',
    `- **Duración**: ${String((videoSpec?.metadata as Record<string, unknown>)?.durationSec ?? '')}s · **Resolución**: ${String((videoSpec?.metadata as Record<string, unknown>)?.resolution ?? '')} · **Escenas**: ${String((videoSpec as { scenes?: unknown[] })?.scenes?.length ?? '')}`,
    `- **Ritmo**: escena media ${String((videoSpec?.rhythm as Record<string, unknown>)?.avgSceneDurationSec ?? '')}s`,
    `- **Motions sugeridos**: ${JSON.stringify(videoSpec?.suggestedMotions ?? [])}`,
    '',
  ].join('\n');
  writeFileSync(path.join(outDir, 'report.md'), report);

  log(`[${slug}] OK: accepted=${result.accepted} overall=${result.overall?.toFixed(2)} iter=${result.iterations} imgs=${downloaded}/${items.length}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 3. Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  loadRootEnv();
  tuneLocalLlm();
  ensureDir(RESULT_DIR);

  log(`resultTask → ${RESULT_DIR}`);
  log('Paso 1/2: análisis de video (ffmpeg)...');
  const videoSpecs = new Map<string, Record<string, unknown>>();
  for (const v of VIDEOS) videoSpecs.set(v, analyzeVideo(v));

  log('Paso 2/2: orquestador OMAG sobre los 10 prompts...');
  const gateway = new OpenAICompatibleGateway();
  const maxApps = Number(process.env.TASK1_MAX ?? TASK1_PROMPTS.length);
  const apps = TASK1_PROMPTS.slice(0, maxApps);
  if (maxApps < TASK1_PROMPTS.length) log(`(modo limitado: TASK1_MAX=${maxApps})`);
  const summary: Array<Record<string, unknown>> = [];
  for (const app of apps) {
    const start = Date.now();
    const res = await runApp(app, gateway, videoSpecs);
    summary.push({
      number: app.number,
      slug: String(app.number).padStart(2, '0') + '-' + app.slug,
      title: app.title,
      video: app.video,
      ok: res.ok,
      error: res.error ?? null,
      ms: Date.now() - start,
    });
  }

  // README índice.
  const rows = summary
    .map((s) => {
      const slug = String(s.slug);
      const state = s.ok
        ? (() => {
            try {
              const c = JSON.parse(readFileSync(path.join(RESULT_DIR, slug, 'critiques.json'), 'utf8'));
              return `${c.accepted ? '✅' : '⚠️'} accepted=${c.accepted} overall=${c.overall?.toFixed(2)}`;
            } catch {
              return '✅ ok';
            }
          })()
        : `❌ ${String(s.error)}`;
      return `| ${String(s.number)} | [${String(s.title)}](${slug}/report.md) | \`${String(s.video)}\` | ${state} |`;
    })
    .join('\n');

  const readme = [
    '# resultTask — Task1 (orquestador OMAG)',
    '',
    `Generado el ${new Date().toISOString()} por \`Task/run_task1.ts\` (OmagOrchestrator + ffmpeg).`,
    '',
    '## Apps (10 prompts de Task1.md)',
    '',
    '| # | App | Video ref. | Estado |',
    '|---|-----|------------|--------|',
    rows,
    '',
    '## Análisis de video (Motion Spec)',
    '',
    '| Video | Motion spec |',
    '|-------|-------------|',
    `| ${VIDEO_1} | [motion-spec](${videoBase(VIDEO_1)}.motion-spec.json) |`,
    `| ${VIDEO_2} | [motion-spec](${videoBase(VIDEO_2)}.motion-spec.json) |`,
    '',
    'Cada app contiene: `plan.json` (DirectorPlan), `field.json` (MediaField),',
    '`results.json` (imágenes generadas), `critiques.json` (score/críticas) y',
    '`report.md` (resumen legible). Los motion-specs alimentan la implementación',
    'React/Framer Motion (protocolo de replicación visual de Task1.md).',
    '',
  ].join('\n');
  writeFileSync(path.join(RESULT_DIR, 'README.md'), readme);

  const ok = summary.filter((s) => s.ok).length;
  log(`Completado: ${ok}/${summary.length} apps OK → ${RESULT_DIR}`);
}

main().catch((e) => {
  console.error('[task1] FALLO FATAL:', e);
  process.exit(1);
});