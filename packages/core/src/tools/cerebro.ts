// -----------------------------------------------------------------------------
// cerebro.ts — capability `cerebro`: cerebro de autoaprendizaje + creación
// procedural + autopublicación programada (UltraIa).
// -----------------------------------------------------------------------------
// QUÉ ES: dominio PURO y determinista que planifica el ciclo autónomo completo:
//   1) LEARN   — autoaprendizaje (gaps de autolearn + truth + métricas)
//   2) CREATE  — objetos (PNG/OBJ/glTF desde matemática) y videos procedurales
//                (frames PNG + ensamble ffmpeg, 100% código, cero assets)
//   3) PUBLISH — cola Publication vía autopub (briefs→contenido→paquete→cola)
//   4) REPORT  — manifiesto + reporte markdown por ciclo
// PARA QUÉ: un único "cerebro" programable (schtasks/cron) que ejecuta el bucle
//   Sensado→Razonamiento→Acción→Ajuste sin intervención humana.
// POR QUÉ así: el dominio no toca fs/red (testeable 100%); la EJECUCIÓN real
//   vive en Task/cerebro-cycle.ts (runner vite-node) y el AGENDADO en
//   scripts/cerebro-schedule.ps1. Patrón screenflow/procvid/autopub.
// -----------------------------------------------------------------------------

import { z } from 'zod';

import { PROCVID_ANIMATIONS } from './procvid';
import { getOrchestrator } from './orchestrator-unified';

/* Configuración ----------------------------------------------------------- */

export const CEREBRO_CHANNELS = [
  'youtube',
  'tiktok',
  'telegram',
  'discord',
  'slack',
  'instagram',
  'threads',
  'x',
] as const;

export const cerebroConfigSchema = z.object({
  /** Idioma del contenido generado (patrón bilingüe RF-12). */
  idioma: z.enum(['es', 'ar']).default('es'),
  /** Canales destino de la autopublicación (orden = prioridad). */
  canales: z.array(z.enum(CEREBRO_CHANNELS)).min(1).default(['youtube', 'tiktok', 'telegram']),
  /** Objetos matemáticos nuevos por ciclo (PNG+OBJ+glTF). */
  objetosPorCiclo: z.number().int().min(0).max(8).default(2),
  /** Videos procedurales por ciclo (MP4 real vía ffmpeg). */
  videosPorCiclo: z.number().int().min(0).max(4).default(1),
  /** Segundos por video procedural (≤60, guarda procvid). */
  segundosPorVideo: z.number().int().min(1).max(60).default(6),
  /** FPS de render procedural (≤60). */
  fps: z.number().int().min(1).max(30).default(12),
  /** Ancho/alto del video (guardas procvid ≤1280, PAR). */
  ancho: z.number().int().refine((v) => v > 0 && v <= 1280 && v % 2 === 0).default(320),
  alto: z.number().int().refine((v) => v > 0 && v <= 1280 && v % 2 === 0).default(180),
  /** Briefs máximos a procesar por ciclo (lo consume autopub). */
  maxBriefs: z.number().int().min(1).max(10).default(2),
  /** Publicar los APPROVED vencidos al final del ciclo. */
  publicarVencidos: z.boolean().default(true),
  /** Fase LEARN activa (autolearn gaps → prioridades). */
  aprender: z.boolean().default(true),
  /** Programación del bucle. */
  schedule: z
    .object({
      mode: z.enum(['disabled', 'interval', 'daily']).default('disabled'),
      /** Para interval: minutos entre ciclos. */
      cadaNMinutos: z.number().int().min(5).max(1440).default(120),
      /** Para daily: hora HH:mm local. */
    aLas: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('09:00'),
      /** Nombre de la tarea programada (schtasks). */
      taskName: z.string().min(1).max(80).default('UltraIa-Cerebro'),
    })
    .default({}),
  /** Tope duro de ciclos por día (protección de presupuesto). */
  maxCiclosPorDia: z.number().int().min(1).max(96).default(12),
});
export type CerebroConfig = z.input<typeof cerebroConfigSchema>;
export type ResolvedCerebroConfig = z.output<typeof cerebroConfigSchema>;

export function resolveCerebroConfig(input: CerebroConfig = {}): ResolvedCerebroConfig {
  return cerebroConfigSchema.parse(input);
}

/* Estado persistente entre ciclos ----------------------------------------- */

export interface CerebroState {
  version: 1;
  ciclosTotales: number;
  ciclosHoy: number;
  diaActual: string; // YYYY-MM-DD (para resetear ciclosHoy)
  ultimoCicloEn: string | null; // ISO
  artefactos: number;
  publicacionesEncoladas: number;
  leccionesRecientes: number;
}

export function emptyBrainState(clock: () => Date = () => new Date()): CerebroState {
  return {
    version: 1,
    ciclosTotales: 0,
    ciclosHoy: 0,
    diaActual: clock().toISOString().slice(0, 10),
    ultimoCicloEn: null,
    artefactos: 0,
    publicacionesEncoladas: 0,
    leccionesRecientes: 0,
  };
}

export function parseBrainState(raw: unknown, clock: () => Date = () => new Date()): CerebroState {
  if (!raw || typeof raw !== 'object') return emptyBrainState(clock);
  const base = emptyBrainState(clock);
  const r = raw as Record<string, unknown>;
  return {
    ...base,
    ciclosTotales: typeof r.ciclosTotales === 'number' ? r.ciclosTotales : 0,
    diaActual: typeof r.diaActual === 'string' ? r.diaActual : base.diaActual,
    ciclosHoy: r.diaActual === base.diaActual && typeof r.ciclosHoy === 'number' ? r.ciclosHoy : 0,
    ultimoCicloEn: typeof r.ultimoCicloEn === 'string' ? r.ultimoCicloEn : null,
    artefactos: typeof r.artefactos === 'number' ? r.artefactos : 0,
    publicacionesEncoladas:
      typeof r.publicacionesEncoladas === 'number' ? r.publicacionesEncoladas : 0,
    leccionesRecientes:
      typeof r.leccionesRecientes === 'number' ? r.leccionesRecientes : 0,
  };
}

/** Avanza el estado con los resultados del ciclo (día nuevo → contador en 0). */
export function advanceBrainState(
  state: CerebroState,
  resultado: { artefactos?: number; publicaciones?: number; lecciones?: number },
  clock: () => Date = () => new Date(),
): CerebroState {
  const hoy = clock().toISOString().slice(0, 10);
  return {
    ...state,
    ciclosTotales: state.ciclosTotales + 1,
    ciclosHoy: state.diaActual === hoy ? state.ciclosHoy + 1 : 1,
    diaActual: hoy,
    ultimoCicloEn: clock().toISOString(),
    artefactos: state.artefactos + (resultado.artefactos ?? 0),
    publicacionesEncoladas: state.publicacionesEncoladas + (resultado.publicaciones ?? 0),
    leccionesRecientes: resultado.lecciones ?? state.leccionesRecientes,
  };
}

/* Planificación del ciclo -------------------------------------------------- */

export type CerebroStepKind = 'learn' | 'create_objects' | 'create_video' | 'create_design' | 'publish' | 'report';

export interface CerebroStep {
  kind: CerebroStepKind;
  titulo: string;
  detalle: string;
  saltado: boolean;
  motivoSalto?: string;
}

export interface CerebroPlan {
  cycleId: string; // YYYYMMDD-HHMMSS determinista por reloj
  config: ResolvedCerebroConfig;
  pasos: CerebroStep[];
  presupuestado: boolean; // false si supera maxCiclosPorDia
  motivoBloqueo?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function cycleIdFor(clock: () => Date = () => new Date()): string {
  const d = clock();
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** Planifica UN ciclo completo: learn → create → publish → report. */
export function planBrainCycle(
  input: CerebroConfig = {},
  state: CerebroState = emptyBrainState(),
  clock: () => Date = () => new Date(),
): CerebroPlan {
  const config = resolveCerebroConfig(input);
  const hoy = clock().toISOString().slice(0, 10);
  const ciclosHoy = state.diaActual === hoy ? state.ciclosHoy : 0;
  const presupuestado = ciclosHoy < config.maxCiclosPorDia;

  const pasos: CerebroStep[] = [];
  pasos.push({
    kind: 'learn',
    titulo: 'Autoaprendizaje (LEARN)',
    detalle: 'detectGaps de autolearn sobre learning/truth + LEARNINGS → prioridades RICE/META-IA para el próximo ciclo.',
    saltado: !config.aprender,
    motivoSalto: config.aprender ? undefined : 'aprender=false',
  });
  pasos.push({
    kind: 'create_objects',
    titulo: 'Objetos desde cero (matemática)',
    detalle: `${config.objetosPorCiclo} objeto(s): supershape/Möbius → malla → PNG + OBJ + glTF 2.0.`,
    saltado: config.objetosPorCiclo === 0,
    motivoSalto: config.objetosPorCiclo === 0 ? 'objetosPorCiclo=0' : undefined,
  });
  pasos.push({
    kind: 'create_design',
    titulo: 'Modelo de diseño 2D/3D',
    detalle: 'composeDesign2D (fractal/flow/rings) + composeDesign3D (superShape/Möbius) → PNG determinista keyless.',
    saltado: false,
  });
  pasos.push({
    kind: 'create_video',
    titulo: 'Videos procedurales desde cero',
    detalle: `${config.videosPorCiclo} video(s) ${config.segundosPorVideo}s@${config.fps}fps ${config.ancho}x${config.alto}: frames PNG + ensamble ffmpeg.`,
    saltado: config.videosPorCiclo === 0,
    motivoSalto: config.videosPorCiclo === 0 ? 'videosPorCiclo=0' : undefined,
  });
  pasos.push({
    kind: 'publish',
    titulo: 'Autopublicación (F1-F5)',
    detalle: `autopub: hasta ${config.maxBriefs} brief(s) → contenido/paquete → cola Publication (${config.canales.join(', ')})${config.publicarVencidos ? ' + publishDue de APPROVED vencidos' : ''}.`,
    saltado: false,
  });
  pasos.push({
    kind: 'report',
    titulo: 'Reporte y estado',
    detalle: 'manifest.json + report.md + state.json idempotente en .ultraia/cerebro/<cycleId>.',
    saltado: false,
  });

  return {
    cycleId: cycleIdFor(clock),
    config,
    pasos,
    presupuestado,
    motivoBloqueo: presupuestado ? undefined : `maxCiclosPorDia=${config.maxCiclosPorDia} alcanzado hoy (${ciclosHoy}).`,
  };
}

/* Lote procedural determinista (semilla → specs) --------------------------- */

const PALETAS_CICLO = ['obsidian', 'neoViolet', 'fire', 'ice', 'mono'] as const;

export interface ProceduralVideoSpec {
  tipo: 'video';
  animation: string;
  seed: number;
  palette: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  outName: string;
}
export interface ProceduralObjectSpec {
  tipo: 'object';
  nombre: string;
  /** Parámetros de superfórmula de Gielis (m cambia por índice → variedad). */
  shape: { m: number; n1: number; n2: number; n3: number };
  paleta: (typeof PALETAS_CICLO)[number];
}

/** Lote determinista: misma semilla ⇒ mismo lote (idempotente). */
export function planProceduralBatch(
  config: ResolvedCerebroConfig,
  semilla: number,
): Array<ProceduralVideoSpec | ProceduralObjectSpec> {
  const lote: Array<ProceduralVideoSpec | ProceduralObjectSpec> = [];
  for (let i = 0; i < config.videosPorCiclo; i++) {
    const idx = (semilla + i) % PROCVID_ANIMATIONS.length;
    const palIdx = (semilla + i) % PALETAS_CICLO.length;
    lote.push({
      tipo: 'video',
      animation: PROCVID_ANIMATIONS[idx],
      seed: semilla * 1000 + i,
      palette: PALETAS_CICLO[palIdx],
      width: Math.min(config.ancho, 1280),
      height: Math.min(config.alto, 1280),
      fps: Math.min(config.fps, 60),
      durationSec: Math.min(config.segundosPorVideo, 60),
      outName: `cerebro-${PROCVID_ANIMATIONS[idx]}-s${semilla}-${i}`,
    });
  }
  for (let i = 0; i < config.objetosPorCiclo; i++) {
    const m = 3 + ((semilla + i * 2) % 9); // 3..11 impar-ish para simetrías variadas
    const palIdx = (semilla + i + 2) % PALETAS_CICLO.length;
    lote.push({
      tipo: 'object',
      nombre: `objeto-m${m}-s${semilla}-${i}`,
      shape: { m, n1: 0.4 + ((i % 3) * 0.15), n2: 0.4, n3: 4 + (i % 5) },
      paleta: PALETAS_CICLO[palIdx],
    });
  }
  return lote;
}

/* Programación (schtasks / cron / próxima ejecución) ---------------------- */

export interface ScheduleArgvOptions {
  taskName: string;
  mode: 'interval' | 'daily';
  cadaNMinutos?: number;
  aLas?: string;
  workdir: string;
}

/** argv de schtasks para Windows (patrón screenflow.scheduleCmd). */
export function buildSchtasksArgv(opts: ScheduleArgvOptions): { cmd: string; args: string[] } {
  const triga =
    opts.mode === 'daily'
      ? `/SC DAILY /ST ${(opts.aLas ?? '09:00').replace(':', '')}`
      : `/SC MINUTE /MO ${Math.max(5, opts.cadaNMinutos ?? 120)}`;
  return {
    cmd: 'schtasks',
    args: [
      '/Create',
      '/F',
      '/TN', opts.taskName,
      ...triga.split(' ').filter(Boolean),
      '/TR', `"cd /d ${opts.workdir} && node_modules\\.bin\\vite-node.cmd Task\\cerebro-cycle.ts --run"`,
    ],
  };
}

// Línea cron para Linux/macOS: "min hour * * *" (daily) o "*&#47;N * * * *" (interval).
export function buildCronLine(opts: ScheduleArgvOptions): string {
  const expr =
    opts.mode === 'daily'
      ? `${parseInt((opts.aLas ?? '09:00').slice(3), 10)} ${parseInt((opts.aLas ?? '09:00').slice(0, 2), 10)} * * *`
      : `*/${Math.max(5, opts.cadaNMinutos ?? 120)} * * * *`;
  return `${expr} cd ${opts.workdir} && node_modules/.bin/vite-node Task/cerebro-cycle.ts --run`;
}

/** Próxima ejecución según el schedule (determinista dado el reloj). */
export function nextRunAt(
  cfg: ResolvedCerebroConfig['schedule'],
  clock: () => Date = () => new Date(),
): Date | null {
  if (cfg.mode === 'disabled') return null;
  const now = clock();
  if (cfg.mode === 'interval') {
    return new Date(now.getTime() + cfg.cadaNMinutos * 60_000);
  }
  const [h, min] = cfg.aLas.split(':').map((v) => parseInt(v, 10));
  const next = new Date(now);
  next.setHours(h, min, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

/* Reporte ------------------------------------------------------------------ */

export interface CycleResultSummary {
  cycleId: string;
  artefactos: number;
  videos: number;
  objetos: number;
  publicaciones: number;
  lecciones: number;
  errores: string[];
  duracionMs: number;
}

/** Track cerebro cycle result into the unified orchestrator. */
export function trackCycleToOrchestrator(plan: CerebroPlan, res: CycleResultSummary): void {
  const orch = getOrchestrator();
  const ts = Date.now();

  // Register cerebro as runtime app
  orch.registerApp({
    type: 'runtime',
    id: `cerebro-${res.cycleId}`,
    status: 'connected',
    lastSeen: ts,
    version: '1.0.0',
    capabilities: ['learning', 'metrics', 'commands'],
  });

  // Track cycle as learning event
  orch.trackLearning({
    id: `cerebro-cycle-${res.cycleId}`,
    app: 'runtime',
    timestamp: ts,
    category: res.errores.length > 0 ? 'error' : 'improvement',
    description: `Cerebro cycle ${res.cycleId}: ${res.artefactos} artefactos, ${res.publicaciones} publicaciones, ${res.lecciones} lecciones (${(res.duracionMs / 1000).toFixed(1)}s)`,
    impact: res.artefactos > 3 ? 'high' : res.artefactos > 0 ? 'medium' : 'low',
    verified: false,
  });

  // Track metrics
  orch.recordMetric({ name: 'cerebro.artefactos', value: res.artefactos, unit: 'count', app: 'runtime', timestamp: ts });
  orch.recordMetric({ name: 'cerebro.videos', value: res.videos, unit: 'count', app: 'runtime', timestamp: ts });
  orch.recordMetric({ name: 'cerebro.objetos', value: res.objetos, unit: 'count', app: 'runtime', timestamp: ts });
  orch.recordMetric({ name: 'cerebro.publicaciones', value: res.publicaciones, unit: 'count', app: 'runtime', timestamp: ts });
  orch.recordMetric({ name: 'cerebro.duracion', value: res.duracionMs, unit: 'ms', app: 'runtime', timestamp: ts });

  // Send command to all apps to sync state
  orch.sendCommand({
    id: `cerebro-sync-${res.cycleId}`,
    from: 'runtime',
    to: 'all',
    action: 'cerebro_cycle_complete',
    payload: { cycleId: res.cycleId, artefactos: res.artefactos, publicaciones: res.publicaciones },
    timestamp: ts,
  });
}

/** Reporte markdown del ciclo (para .ultraia/cerebro/<cycleId>/report.md). */
export function buildBrainReport(plan: CerebroPlan, res: CycleResultSummary): string {
  const lineas: string[] = [];
  lineas.push(`# Cerebro — ciclo ${res.cycleId}`);
  lineas.push('');
  lineas.push(`- Duración: ${(res.duracionMs / 1000).toFixed(1)}s`);
  lineas.push(`- Presupuesto: ${plan.presupuestado ? 'OK' : `BLOQUEADO (${plan.motivoBloqueo ?? ''})`}`);
  lineas.push(
    `- Artefactos: **${res.artefactos}** (${res.videos} video(s) MP4 + ${res.objetos} objeto(s) PNG/OBJ/glTF)`,
  );
  lineas.push(`- Publicaciones encoladas: **${res.publicaciones}**`);
  lineas.push(`- Lecciones registradas: ${res.lecciones}`);
  lineas.push('');
  lineas.push('## Pasos');
  for (const p of plan.pasos) {
    lineas.push(`- [${p.saltado ? 'SKIP' : 'DO'}] ${p.titulo} — ${p.detalle}`);
  }
  if (res.errores.length) {
    lineas.push('');
    lineas.push('## Errores (fail-soft)');
    for (const e of res.errores) lineas.push(`- ${e}`);
  }
  lineas.push('');
  lineas.push('> Determinista, keyless. Ejecutado por Task/cerebro-cycle.ts.');
  return `${lineas.join('\n')}\n`;
}

export const cerebro = {
  cerebroConfigSchema,
  resolveCerebroConfig,
  planBrainCycle,
  planProceduralBatch,
  advanceBrainState,
  parseBrainState,
  emptyBrainState,
  cycleIdFor,
  nextRunAt,
  buildSchtasksArgv,
  buildCronLine,
  buildBrainReport,
  trackCycleToOrchestrator,
};
