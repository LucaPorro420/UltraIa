/**
 * ScreenFlow — capability `screenflow`.
 *
 * Pipeline de producción de video de pantalla automatizado:
 *   Captura (ffmpeg gdigrab) → Acciones (ActionScript declarativo) →
 *   Edición (capability video_edit + omag/sound) → Publicación local
 *   (.ultraia/recordings/<run-id>/) → Continuidad (state.json, retry,
 *   fail-soft, scheduling).
 *
 * Determinista y keyless: los tests validan el dominio puro (zod, argv
 * generation) sin ejecutar ffmpeg/pyautogui — el runner real vive en
 * `scripts/screenflow/actions.py` y `Task/run_screenflow.ts`.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const CAPTURE_FPS = 30;
export const CAPTURE_CRF = 18;
export const MAX_RETRIES = 3;
export const RETRY_BACKOFF_MS = 1000;
export const MAX_RUN_DURATION_MIN = 90; // protección anti-runaway
export const RECORDINGS_ROOT = '.ultraia/recordings';

export const ACTION_TYPES = [
  'sleep',
  'click',
  'type',
  'key',
  'scroll',
  'move',
  'open_url',
  'exec',
  'screenshot',
  'wait_selector',
  'end',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('sleep'), ms: z.number().min(50).max(600_000) }),
  z.object({ type: z.literal('click'), x: z.number().int().min(0), y: z.number().int().min(0) }),
  z.object({
    type: z.literal('type'),
    text: z.string().min(1).max(2000),
    intervalMs: z.number().min(0).max(1000).optional(),
  }),
  z.object({ type: z.literal('key'), combo: z.string().min(1).max(50) }),
  z.object({
    type: z.literal('scroll'),
    direction: z.enum(['up', 'down', 'left', 'right']),
    amount: z.number().int().min(1).max(1000).optional(),
  }),
  z.object({ type: z.literal('move'), x: z.number().int().min(0), y: z.number().int().min(0) }),
  z.object({ type: z.literal('open_url'), url: z.string().url().max(500) }),
  z.object({ type: z.literal('exec'), cmd: z.string().min(1).max(500) }),
  z.object({ type: z.literal('screenshot'), name: z.string().min(1).max(100).optional() }),
  z.object({
    type: z.literal('wait_selector'),
    selector: z.string().min(1).max(300),
    timeoutMs: z.number().min(100).max(120_000).optional(),
  }),
  z.object({ type: z.literal('end') }),
]);

export const actionScriptSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  capture: z
    .object({
      fps: z.number().int().min(15).max(60).optional(),
      region: z.string().regex(/^\d+x\d+(\+\d+\+\d+)?$/).optional(), // WxH+X+Y
      audioDevice: z.string().max(100).optional(), // dshow/virtual-audio-cable device
    })
    .optional(),
  actions: z.array(actionSchema).min(1).max(200),
});

export type ScreenAction = z.infer<typeof actionSchema>;
export type ActionScript = z.infer<typeof actionScriptSchema>;

export const runStateSchema = z.object({
  script: z.string().min(1).max(100),
  runId: z.string().regex(/^\d{14}-[a-z0-9-]{1,50}$/),
  step: z.number().int().min(0), // índice del paso (acciones ejecutadas)
  attempts: z.number().int().min(0).max(MAX_RETRIES + 1),
  status: z.enum(['pending', 'running', 'capturing', 'editing', 'published', 'failed']),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  error: z.string().max(500).optional(),
});

export type RunState = z.infer<typeof runStateSchema>;

/* ------------------------------------------------------------------ */
/* Validador de ActionScript (determinista)                            */
/* ------------------------------------------------------------------ */

export interface ValidateResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  estimatedDurationSec: number;
  actions: ScreenAction[];
}

const ACTION_ESTIMATE_MS: Record<ActionType, number> = {
  sleep: 0, // estimado por el propio ms
  click: 400,
  type: 200,
  key: 250,
  scroll: 500,
  move: 500,
  open_url: 2500,
  exec: 2000,
  screenshot: 600,
  wait_selector: 1500,
  end: 0,
};

/**
 * Valida un ActionScript JSON declarativo: tipos conocidos, bounds de
 * coordenadas, mínimo 1 acción, cierre con 'end' (o warning), duración
 * estimada y protección anti-runaway (MAX_RUN_DURATION_MIN). Determinista,
 * sin I/O.
 */
export function validateActionScript(input: unknown): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = actionScriptSchema.safeParse(input);

  if (!parsed.success) {
    // formato estable de zod v3: lista de issues legibles
    const err = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { ok: false, errors: [err || 'script inválido'], warnings, estimatedDurationSec: 0, actions: [] };
  }

  const script = parsed.data;
  const actions = script.actions;

  if (actions[actions.length - 1]?.type !== 'end') {
    warnings.push('el script no termina con una acción "end" — se añadirá una al final');
  }
  if (!script.capture?.region && script.actions.some((a) => a.type === 'click' || a.type === 'move')) {
    warnings.push('hay acciones click/move sin region de captura — el runner capturará pantalla completa');
  }
  const openUrls = actions.filter((a) => a.type === 'open_url').length;
  if (openUrls > 10) warnings.push(`demasiadas open_url (${openUrls}) — revisar si son necesarias`);

  const estimate = actions.reduce((acc, a) => {
    if (a.type === 'sleep') return acc + a.ms;
    return acc + ACTION_ESTIMATE_MS[a.type];
  }, 0);
  const estimatedDurationSec = Math.round(estimate / 1000);

  if (estimatedDurationSec > MAX_RUN_DURATION_MIN * 60) {
    errors.push(
      `duración estimada ${estimatedDurationSec}s excede el máximo de ${MAX_RUN_DURATION_MIN}min — dividir el script`,
    );
  }
  if (openUrls === 0) warnings.push('sin open_url — el runner graba el estado actual de la pantalla');

  return { ok: errors.length === 0, errors, warnings, estimatedDurationSec, actions };
}

/* ------------------------------------------------------------------ */
/* Plan de runs (segmentación por pasos)                               */
/* ------------------------------------------------------------------ */

export interface PlannedRun {
  index: number;
  actionSlice: number[]; // índices de acciones en este run
  estimatedSec: number;
  captureFps: number;
}

/**
 * Segmenta el script en runs (1 por defecto; opcional por N acciones) para
 * edición por pasos. Cada run tiene su slice de acciones y duración estimada.
 */
export function planRuns(script: ActionScript, opts: { actionsPerRun?: number } = {}): PlannedRun[] {
  const actions = script.actions;
  const per = opts.actionsPerRun ?? Math.max(actions.length, 1);
  const runs: PlannedRun[] = [];

  for (let i = 0; i < actions.length; i += per) {
    const slice = actions.slice(i, i + per);
    const estimate = slice.reduce((acc, a) => {
      if (a.type === 'sleep') return acc + a.ms;
      return acc + ACTION_ESTIMATE_MS[a.type];
    }, 0);
    runs.push({
      index: runs.length,
      actionSlice: Array.from({ length: slice.length }, (_, k) => i + k),
      estimatedSec: Math.round(estimate / 1000),
      captureFps: script.capture?.fps ?? CAPTURE_FPS,
    });
  }
  return runs;
}

/* ------------------------------------------------------------------ */
/* Captura (argv ffmpeg gdigrab — Windows)                             */
/* ------------------------------------------------------------------ */

export interface CaptureOptions {
  fps?: number;
  crf?: number;
  region?: string; // WxH+X+Y
  audioDevice?: string;
  segmentSec?: number; // -f segment por paso (default 60)
}

/**
 * Genera el argv ffmpeg para captura de pantalla (gdigrab) segmentada,
 * listo para `spawn`. Determinista. El runner decide ejecutar o no
 * (--dry-run imprime el argv).
 */
export function buildFfmpegCapture(outFile: string, opts: CaptureOptions = {}): string[] {
  const fps = opts.fps ?? CAPTURE_FPS;
  const crf = opts.crf ?? CAPTURE_CRF;
  const input = opts.region ? `desktop=${opts.region}` : 'desktop';
  const audio = opts.audioDevice
    ? ['-f', 'dshow', '-i', `audio=${opts.audioDevice}`]
    : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100'];
  return [
    'ffmpeg', '-y',
    '-f', 'gdigrab', '-framerate', String(fps), '-i', input,
    ...audio,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-r', String(fps),
    '-c:a', 'aac', '-b:a', '128k',
    '-f', 'segment', '-segment_time', String(opts.segmentSec ?? 60),
    outFile.replace(/%/g, '%%') // segment pattern: out_%03d.mp4
  ];
}

/* ------------------------------------------------------------------ */
/* Naming + manifest + scheduling (deterministas)                      */
/* ------------------------------------------------------------------ */

/** Nomenclatura de outputs: YYYYMMDD-HHMMSS-<slug>-v<N>.mp4 + latest.mp4 */
export function buildOutputNaming(
  runId: string,
  slug: string,
  version = 1,
): { finalName: string; latestName: string; dir: string } {
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return {
    finalName: `${runId}-${cleanSlug}-v${version}.mp4`,
    latestName: `${cleanSlug}-latest.mp4`,
    dir: `${RECORDINGS_ROOT}/${runId}`,
  };
}

export interface ManifestEntry {
  cmd: string;
  estimatedSec: number;
  captureFps: number;
  index: number;
}

/** manifest.json del run: toolchain, comandos, duración, hashes (llenados por el runner). */
export function buildManifest(
  runId: string,
  script: ActionScript,
  runs: PlannedRun[],
): {
  runId: string;
  createdAt: string;
  script: string;
  runs: ManifestEntry[];
  toolchain: { ffmpeg: string; python: string; versions: Record<string, string> };
  files: string[];
} {
  return {
    runId,
    createdAt: new Date().toISOString(),
    script: script.name,
    runs: runs.map((r) => ({
      cmd: `run ${r.index + 1}/${runs.length}`,
      estimatedSec: r.estimatedSec,
      captureFps: r.captureFps,
      index: r.index,
    })),
    toolchain: { ffmpeg: '>=5', python: '>=3.10', versions: {} },
    files: ['final.mp4', 'master.mkv', 'final.webm', 'poster.png', 'manifest.json', 'report.md'],
  };
}

/** Comando de scheduling determinista (schtasks Windows / cron Linux). */
export function scheduleCmd(opts: {
  scriptPath: string;
  runId: string;
  when: string; // 'HH:mm' o '*/30 * * * *' (cron)
}): { argv: string[]; note: string } {
  const { scriptPath, runId, when } = opts;
  if (/^(\d{1,2}):(\d{2})$/.test(when)) {
    return {
      argv: [
        'schtasks', '/Create', '/TN', `UltraIa\\ScreenFlow-${runId}`,
        '/TR', `python "${scriptPath}" --run-id ${runId}`,
        '/SC', 'DAILY', '/ST', when, '/F',
      ],
      note: `tarea diaria DAILY de Windows (schtasks) a las ${when}`,
    };
  }
  if (/^[0-9*,\/]+ [0-9*,\/]+ \* \* \*$/.test(when)) {
    return {
      argv: ['crontab', '-l'], // + línea cron append — el runner lo documenta
      note: `cron expression (añadir a crontab): ${when} python ${scriptPath} --run-id ${runId}`,
    };
  }
  return { argv: [], note: `formato de when no soportado: ${when}` };
}

/* ------------------------------------------------------------------ */
/* Continuidad (state.json + retry fail-soft)                          */
/* ------------------------------------------------------------------ */

/**
 * Resuelve el estado de continuidad: si existe state con status 'running' o
 * 'capturing' y attempts < MAX_RETRIES → resume en `step` (fail-soft);
 * si attempts >= MAX_RETRIES → falla con el error registrado.
 * Determinista; el runner persiste el JSON.
 */
export function resolveState(previous: RunState | null, nowIso: string): {
  action: 'resume' | 'start' | 'give-up';
  state: RunState;
} {
  if (previous && (previous.status === 'running' || previous.status === 'capturing')) {
    if (previous.attempts >= MAX_RETRIES) {
      return {
        action: 'give-up',
        state: { ...previous, status: 'failed', updatedAt: nowIso },
      };
    }
    return {
      action: 'resume',
      state: {
        ...previous,
        status: 'running',
        attempts: previous.attempts + 1,
        updatedAt: nowIso,
      },
    };
  }
  return {
    action: 'start',
    state: {
      script: previous?.script ?? '',
      runId: previous?.runId ?? '',
      step: 0,
      attempts: 0,
      status: 'pending',
      startedAt: nowIso,
      updatedAt: nowIso,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const screenflow = {
  validateActionScript,
  planRuns,
  buildFfmpegCapture,
  buildOutputNaming,
  buildManifest,
  scheduleCmd,
  resolveState,
  ACTION_TYPES,
  MAX_RETRIES,
  RETRY_BACKOFF_MS,
  MAX_RUN_DURATION_MIN,
  RECORDINGS_ROOT,
};
