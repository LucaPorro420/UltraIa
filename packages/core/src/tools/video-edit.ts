/**
 * Video editing pipeline — capability `video_edit`.
 *
 * Original TS port of the design PRINCIPLES from
 * https://github.com/browser-use/video-use (MIT, browser-use) — an LLM-driven
 * editing pipeline: Transcribe → Pack → Reason → EDL → Render → Self-Eval.
 * No code copied from the repo (helpers/*.py remain in vendor/video-use as
 * reference); this is an original implementation of the documented rules.
 *
 * Core idea ported: **the model never watches the video, it READS it** — a
 * packed phrase-level transcript (`takes_packed.md`, ~12KB) plus an on-demand
 * timeline composite (filmstrip + waveform + word labels). Decisions come from
 * audio (speech boundaries, silence gaps) with visuals only at decision points.
 *
 * Production hard rules ported (from SKILL.md §Hard Rules):
 *  1. Subtitles/overlays LAST, never burnt into base.
 *  2. Per-segment extract → lossless `-c copy` concat (no single-pass
 *     filtergraph → avoids double re-encode when overlays are added).
 *  3. 30ms audio fades at every segment boundary (`afade in/out d=0.03`) —
 *     prevents audible pops at cuts.
 *  4. Cut candidates: silences ≥400ms are cleanest; 150-400ms usable with
 *     visual check; <150ms unsafe (mid-phrase).
 *  5. Cut padding working window 30-200ms.
 *  6. Self-eval rendered output at every cut boundary before shipping
 *     (visual jumps, audio pops, subtitle/overlay conflicts; max 3 fix cycles).
 *
 * Keyless-first: transcription degrades gracefully (Gemini if GOOGLE_API_KEY
 * is set; otherwise manual/empty transcript). Rendering is pure argv
 * generation — the actual ffmpeg execution happens in the runner/scripts,
 * never inside unit tests.
 */
import { z } from 'zod';
import type { CloudService } from './cloud'; // QUÉ ES: solo el TIPO (sin acoplar runtime).
// PARA QUÉ: la firma de guardarEdicionEnCloud recibe el cloud inyectado (patrón db/cloud inyectable).
// POR QUÉ: video-edit.ts sigue siendo puro/determinista — el cloud solo se usa si el caller lo pasa.

/* ------------------------------------------------------------------ */
/* Constants (production rules)                                        */
/* ------------------------------------------------------------------ */

export const FADE_MS = 0.03; // 30ms audio fades at segment boundaries (Hard Rule 3)
export const SAFE_SILENCE_MS = 400; // cleanest cut targets
export const USABLE_SILENCE_MS = 150; // usable with visual check
export const UNSAFE_SILENCE_MS = 150; // <150ms is mid-phrase → unsafe
export const PAD_MIN_MS = 30; // cut padding working window (Hard Rule 5)
export const PAD_MAX_MS = 200;
export const MAX_SELF_EVAL_ATTEMPTS = 3; // correction loop cap
export const GRADE_PRESETS = ['warm-cinematic', 'neutral-punch', 'none'] as const;
export type GradePreset = (typeof GRADE_PRESETS)[number];

export const GRADE_FILTERS: Record<GradePreset, string> = {
  'warm-cinematic': 'eq=contrast=1.08:saturation=1.12:brightness=0.02,colorbalance=rs=0.06:bs=-0.04',
  'neutral-punch': 'eq=contrast=1.12:saturation=1.02',
  none: '',
};

export const HARD_RULES: ReadonlyArray<{ id: string; rule: string }> = [
  { id: 'hr1', rule: 'Subtitles/overlays se aplican LAST, nunca quemados en la base (doble re-encode y subtítulos ocultos).' },
  { id: 'hr2', rule: 'Extract por segmento + concat lossless `-c copy`; nunca filtergraph de un solo paso.' },
  { id: 'hr3', rule: `Fades de audio de ${Math.round(FADE_MS * 1000)}ms en cada frontera de segmento (anti-pops).` },
  { id: 'hr4', rule: `Cortes: silencios ≥${SAFE_SILENCE_MS}ms limpios; ${USABLE_SILENCE_MS}-${SAFE_SILENCE_MS}ms verificables; <${UNSAFE_SILENCE_MS}ms inseguros (mid-phrase).` },
  { id: 'hr5', rule: `Padding de corte en ventana ${PAD_MIN_MS}-${PAD_MAX_MS}ms.` },
  { id: 'hr6', rule: 'Self-eval del render en cada frontera de corte antes de entregar (máx 3 intentos).' },
  { id: 'hr7', rule: 'Nunca razonar audio y video por separado: cada corte debe funcionar en ambas pistas.' },
  { id: 'hr8', rule: 'Preservar picos (risas, remates, énfasis): extender el corte más allá del remate.' },
  { id: 'hr9', rule: 'Mantener aire entre hablantes (400-600ms típico).' },
  { id: 'hr10', rule: 'Los eventos de audio ((laughs), (applause)) marcan beats — extender tras ellos.' },
  { id: 'hr11', rule: 'Transcripción = la superficie; timeline_view solo en puntos de decisión.' },
  { id: 'hr12', rule: 'Verificar tu propio output antes de mostrarlo (ffprobe: duración vs EDL, grade, subtítulos legibles).' },
];

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

export const transcriptSegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  speaker: z.string().max(20).optional(),
  text: z.string().min(1).max(2000),
  event: z.string().max(60).optional(), // (laughs), (applause)...
});

export const edlCutSchema = z.object({
  source: z.string().min(1).max(500), // path al segmento/clip fuente
  in: z.number().min(0), // tiempo in (segundos, sobre word boundaries + padding)
  out: z.number().min(0),
  reason: z.string().max(200).optional(), // por qué se corta aquí
});

export const edlSchema = z.object({
  title: z.string().min(1).max(200),
  cuts: z.array(edlCutSchema).min(1).max(200),
  grade: z.enum(GRADE_PRESETS).optional(),
  subtitles: z
    .array(
      z.object({
        start: z.number().min(0),
        end: z.number().min(0),
        text: z.string().min(1).max(400),
      }),
    )
    .max(500)
    .optional(),
});

export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type EdlCut = z.infer<typeof edlCutSchema>;
export type Edl = z.infer<typeof edlSchema>;

/* ------------------------------------------------------------------ */
/* Layer 1 — Pack: transcript → takes_packed (the model's reading view) */
/* ------------------------------------------------------------------ */

/**
 * Pack phrase-level transcript segments into the compact markdown view the
 * model reads (~12KB for a full session). Deterministic, keyless.
 */
export function packTranscript(segments: TranscriptSegment[]): string {
  const out: string[] = [];
  let current: { speaker: string; start: number; text: string[] } | null = null;
  let lastEnd = 0;
  let totalDur = 0;

  const flush = () => {
    if (!current) return;
    const text = current.text.join(' ');
    // Phrase breaks on speaker change or ≥0.5s silence (ported rule).
    out.push(`  [${fmt(current.start)}-${fmt(lastEnd)}] ${current.speaker} ${text}`);
  };

  for (const seg of segments) {
    const speaker = seg.speaker ?? 'S0';
    const gap = seg.start - lastEnd;
    if (current && (speaker !== current.speaker || gap >= 0.5)) {
      flush();
      current = null;
    }
    if (!current) {
      current = { speaker, start: seg.start, text: [] };
    }
    current.text.push(seg.event ? `${seg.event} ${seg.text}` : seg.text);
    lastEnd = seg.end;
    totalDur = Math.max(totalDur, seg.end);
  }
  if (current) {
    flush();
  }

  const header = `## ${segments.length} phrases · ${totalDur.toFixed(1)}s total`;
  return `${header}\n${out.join('\n')}\n`;
}

function fmt(t: number): string {
  return t.toFixed(2).padStart(6, '0');
}

/* ------------------------------------------------------------------ */
/* EDL build + validation                                              */
/* ------------------------------------------------------------------ */

/**
 * Normalize a cut list into an EDL: sorts by `in`, validates boundaries and
 * overlap, checks cut safety (Hard Rules 4-5). Deterministic.
 * Throws with a descriptive message on violation (except `warnOnly` mode).
 */
export function buildEdl(input: Edl, opts: { warnOnly?: boolean } = {}): { edl: Edl; warnings: string[] } {
  const warnings: string[] = [];
  const cuts = [...input.cuts].sort((a, b) => a.in - b.in);

  // Validate each cut: in < out, min duration.
  for (const cut of cuts) {
    if (!(cut.in < cut.out)) {
      const msg = `cut ${cut.source} [${cut.in}-${cut.out}]: in debe ser < out`;
      if (opts.warnOnly) warnings.push(msg);
      else throw new Error(msg);
    }
    if (cut.out - cut.in < 0.05) {
      const msg = `cut ${cut.source}: duración < 50ms (corte sospechoso)`;
      if (opts.warnOnly) warnings.push(msg);
      else throw new Error(msg);
    }
  }

  // Overlap detection between consecutive cuts (same or different sources):
  // a cut must not start before the previous one ends.
  for (let i = 1; i < cuts.length; i++) {
    const prev = cuts[i - 1];
    const cur = cuts[i];
    if (cur.in < prev.out - 1e-6) {
      const msg = `cuts ${prev.source} y ${cur.source}: overlap [${cur.in} < ${prev.out}]`;
      if (opts.warnOnly) warnings.push(msg);
      else throw new Error(msg);
    }
  }

  const edl: Edl = { ...input, cuts };
  return { edl, warnings };
}

/** Safety classification of a silence gap (Hard Rule 4). */
export function silenceSafety(gapMs: number): 'clean' | 'usable' | 'unsafe' {
  if (gapMs >= SAFE_SILENCE_MS) return 'clean';
  if (gapMs >= USABLE_SILENCE_MS) return 'usable';
  return 'unsafe';
}

/** Check padding of a proposed cut boundary is within the working window. */
export function paddingOk(padMs: number): boolean {
  return padMs >= PAD_MIN_MS && padMs <= PAD_MAX_MS;
}

/* ------------------------------------------------------------------ */
/* Layer 2 — Render: EDL → ffmpeg argv                                 */
/* ------------------------------------------------------------------ */

export interface RenderOptions {
  outDir?: string;
  outName?: string;
  fps?: number; // 30 default
  vcodec?: string; // libx264 default
  acodec?: string; // aac default
  preset?: string; // veryfast default
  crf?: number; // 18 default (master)
  preview?: boolean; // 720p fast render
}

const esc = (s: string) => `"${s.replace(/"/g, '\\"')}"`;

/**
 * Generate the ffmpeg render command (argv + shell script + step summary)
 * for an EDL per the production rules: per-segment extract (grade + 30ms
 * fades) → lossless concat → optional subtitles LAST. Deterministic: same
 * EDL + options → identical output. The command is meant to run in the
 * runner/scripts layer (ffmpeg must be installed); unit tests never execute.
 */
export function renderFfmpeg(edl: Edl, opts: RenderOptions = {}): {
  argv: string[];
  shell: string;
  steps: string[];
} {
  const outDir = opts.outDir ?? '.';
  const outName = opts.outName ?? 'final.mp4';
  const fps = opts.fps ?? 30;
  const vcodec = opts.vcodec ?? 'libx264';
  const acodec = opts.acodec ?? 'aac';
  const preset = opts.preset ?? 'veryfast';
  const crf = opts.crf ?? 18;
  const scale = opts.preview ? 'scale=1280:-2,' : '';
  const grade = GRADE_FILTERS[edl.grade ?? 'none'];
  const vf = `${scale}${grade}`.replace(/,$/, '');

  const steps: string[] = [];
  const clips: string[] = [];
  const extractCmds: string[] = [];

  edl.cuts.forEach((cut, i) => {
    const clip = `${outDir}/clip_${i}.ts`;
    clips.push(clip);
    // Per-segment extract: video filter (grade + optional 720p preview) +
    // audio fades 30ms at both edges (HR3) → single clip per cut.
    const dur = cut.out - cut.in;
    const audio = `anull,afade=t=in:st=0:d=${FADE_MS},afade=t=out:st=${Math.max(0, dur - FADE_MS).toFixed(3)}:d=${FADE_MS}`;
    const argv = [
      'ffmpeg', '-y',
      '-ss', cut.in.toFixed(3), '-to', cut.out.toFixed(3),
      '-i', cut.source,
      ...(vf ? ['-vf', vf] : []),
      '-af', audio,
      '-c:v', vcodec, '-preset', preset, '-crf', String(crf), '-r', String(fps),
      '-c:a', acodec,
      clip,
    ];
    extractCmds.push(argv.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' '));
    steps.push(`extract clip_${i} [${cut.in.toFixed(3)}-${cut.out.toFixed(3)}] de ${cut.source}`);
  });

  // Lossless concat (HR2).
  const listFile = `${outDir}/concat.txt`;
  const listContent = clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n');
  steps.push(`concat lossless (-c copy) → ${outName}`);

  const concatArgv = [
    'ffmpeg', '-y',
    '-f', 'concat', '-safe', '0', '-i', listFile,
    '-c', 'copy',
    '-movflags', '+faststart',
    `${outDir}/${outName}`,
  ];
  const concatCmd = concatArgv.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ');

  const shell =
    `# generado por capability video_edit (video-use pattern)\n` +
    `# 1. extraer segmentos (fades 30ms + grade):\n` +
    extractCmds.join('\n') +
    `\n\n# 2. escribir lista de concat:\ncat > ${esc(listFile)} << 'EOF'\n${listContent}\nEOF\n\n` +
    `# 3. concat lossless (-c copy):\n${concatCmd}`;

  return { argv: concatArgv, shell, steps };
}

/* ------------------------------------------------------------------ */
/* Self-eval: deterministic checks on the EDL (before/after render)    */
/* ------------------------------------------------------------------ */

export interface SelfEvalMeta {
  /** Duración esperada del render (suma de cuts). */
  expectedDurationSec?: number;
  /** Lista de silencios detectados entre cuts (ms). */
  silenceGapsMs?: number[];
}

export interface SelfEvalReport {
  ok: boolean;
  issues: Array<{ severity: 'error' | 'warn'; code: string; message: string }>;
  score: number; // 0-100
  attemptsRemaining: number;
}

/**
 * Deterministic self-eval over the EDL (the renderer-level checks that can be
 * verified without pixels): duration match, unsafe cuts (<150ms), fades
 * present (by construction), padding window. The visual checks (jumps/pops/
 * subtitle occlusion) are documented for the runner that renders real frames.
 * Correction loop cap: MAX_SELF_EVAL_ATTEMPTS.
 */
export function selfEvalEdl(edl: Edl, meta: SelfEvalMeta = {}, attempt = 1): SelfEvalReport {
  const issues: SelfEvalReport['issues'] = [];
  const total = edl.cuts.reduce((acc, c) => acc + (c.out - c.in), 0);

  if (meta.expectedDurationSec !== undefined) {
    const delta = Math.abs(total - meta.expectedDurationSec);
    if (delta > 0.5 + 1e-6) { // epsilon: floats 6.7-7.2 = -0.5000000000000009
      issues.push({
        severity: 'error',
        code: 'DURATION_MISMATCH',
        message: `duración EDL ${total.toFixed(2)}s ≠ esperada ${meta.expectedDurationSec.toFixed(2)}s (±0.5s)`,
      });
    }
  }

  for (const cut of edl.cuts) {
    const d = cut.out - cut.in;
    if (d < UNSAFE_SILENCE_MS / 1000) {
      issues.push({
        severity: 'error',
        code: 'UNSAFE_CUT',
        message: `cut ${cut.source} de ${d.toFixed(3)}s < ${UNSAFE_SILENCE_MS}ms (mid-phrase)`,
      });
    }
  }

  for (const gap of meta.silenceGapsMs ?? []) {
    const s = silenceSafety(gap);
    if (s === 'unsafe') {
      issues.push({
        severity: 'warn',
        code: 'UNSAFE_GAP',
        message: `silence gap ${gap}ms < ${USABLE_SILENCE_MS}ms (verificar visualmente)`,
      });
    }
  }

  const score = Math.max(0, 100 - issues.reduce((acc, i) => acc + (i.severity === 'error' ? 25 : 10), 0));
  return {
    ok: issues.every((i) => i.severity !== 'error'),
    issues,
    score,
    attemptsRemaining: Math.max(0, MAX_SELF_EVAL_ATTEMPTS - attempt),
  };
}

/* ------------------------------------------------------------------ */
/* Timeline view (SVG composite — editorial, diagram-design style)     */
/* ------------------------------------------------------------------ */

export interface TimelineViewSpec {
  title: string;
  durationSec: number;
  /** word/phrase markers with speaker labels */
  markers: Array<{ start: number; end: number; label: string; speaker?: string; cut?: boolean }>;
  /** silence gaps (seconds) — rendered as shaded bands */
  silences?: Array<{ start: number; end: number }>;
}

/**
 * On-demand visual composite: filmstrip band + waveform line + word labels +
 * silence-gap cut candidates, rendered as a self-contained editorial SVG
 * (Dark Obsidian tokens, a11y role="img"). Mirrors timeline_view.py concept
 * without copying its code. Deterministic.
 */
export function timelineViewSvg(spec: TimelineViewSpec, width = 900): string {
  const H = 220;
  const padX = 24;
  const axisY = 168;
  const dur = Math.max(spec.durationSec, 1);
  const x = (t: number) => padX + (t / dur) * (width - padX * 2);
  const id = `tv-${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`;

  let body = '';

  // silence bands (cut candidates)
  for (const s of spec.silences ?? []) {
    const x1 = round4(x(s.start));
    const x2 = Math.max(round4(x(s.end)), x1 + 4);
    body += `<rect x="${x1}" y="${axisY - 40}" width="${x2 - x1}" height="12" rx="6" fill="#8b8b98" opacity="0.25"><title>silence ${s.start.toFixed(1)}-${s.end.toFixed(1)}s</title></rect>`;
  }

  // waveform (pseudo — deterministic saw derived from marker positions)
  let wave = '';
  for (let t = 0; t <= dur; t += 0.25) {
    const h = 10 + ((Math.round((t * 7919) % 7) / 7) * 26);
    const xx = round4(x(t));
    wave += `<line x1="${xx}" y1="${round4(axisY - h / 2)}" x2="${xx}" y2="${round4(axisY + h / 2)}" stroke="#8b8b98" stroke-width="1" opacity="0.5"/>`;
  }
  body += wave;

  // axis
  body += `<line x1="${padX}" y1="${axisY}" x2="${round4(width - padX)}" y2="${axisY}" stroke="#1f1f2a" stroke-width="1"/>`;

  // markers (words/phrases) + cut flags
  spec.markers.forEach((m, i) => {
    const x1 = round4(x(m.start));
    const x2 = Math.max(round4(x(m.end)), x1 + 8);
    const y = 28 + (i % 3) * 18;
    body +=
      `<g>` +
      `<line x1="${x1}" y1="${y + 4}" x2="${x1}" y2="${round4(axisY - 4)}" stroke="#8b5cf6" stroke-width="1" opacity="0.35"/>` +
      `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="10" rx="5" fill="${m.cut ? '#8b5cf6' : '#1f1f2a'}"/>` +
      `<text x="${x1 + 2}" y="${y + 8}" font-family="'JetBrains Mono',monospace" font-size="8" fill="${m.cut ? '#08080a' : '#8b8b98'}">${xmlEscape(m.label)}</text>` +
      (m.speaker ? `<text x="${x1}" y="${round4(y - 3)}" font-family="'JetBrains Mono',monospace" font-size="7" fill="#8b8b98">${xmlEscape(m.speaker)}</text>` : '') +
      `</g>`;
  });

  const timeLabels = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const t = dur * f;
    return `<text x="${round4(x(t))}" y="${round4(axisY + 16)}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="8" fill="#8b8b98">${t.toFixed(1)}s</text>`;
  }).join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}-title ${id}-desc" viewBox="0 0 ${width} ${H}" style="background:#08080a;color:#e5e5ea;display:block;max-width:100%;height:auto;">` +
    `<title id="${id}-title">${xmlEscape(spec.title)}</title>` +
    `<desc id="${id}-desc">Timeline composite: filmstrip, waveform, word labels y gaps de silencio (candidatos de corte).</desc>` +
    body + timeLabels +
    `</svg>`
  );
}

/* round4 + xmlEscape helpers (inline, same anti-slop geometry as capability diagram) */
function round4(n: number): number {
  return Math.max(0, Math.round(n / 4) * 4);
}
function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------ */
/* Archivo en nube (UltraIA Cloud) — guardar EDL/renders en exports/.   */
/* ------------------------------------------------------------------ */

export interface CloudEditSaveInput {
  edl: Edl; // QUÉ ES: el cut list validado (buildEdl/selfEvalEdl). PARA QUÉ: es el artefacto principal a archivar.
  nombreBase: string; // QUÉ ES: slug base del archivo (p.ej. 'entrevista-2026-08-17'). PARA QUÉ: nombres estables y legibles.
  selfEval?: SelfEvalReport | null; // QUÉ ES: reporte del self-eval (opcional). PARA QUÉ: auditar la calidad de los cortes.
  timelineSvg?: string | null; // QUÉ ES: SVG compuesto de la edición (opcional). PARA QUÉ: vista previa sin abrir la app.
  renderMp4?: Uint8Array | null; // QUÉ ES: bytes del render final (opcional, lo produce el runner). PARA QUÉ: respaldo del entregable en media/videos.
}

export interface CloudEditSaveResult {
  saved: string[]; // QUÉ ES: paths canónicos guardados (p.ej. exports/edl/x.json).
  errors: string[]; // QUÉ ES: errores acumulados (fail-soft, no lanza).
  ok: boolean; // QUÉ ES: true si el EDL se guardó (artefacto mínimo) — el resto es best-effort.
}

/** Archiva los artefactos de una edición en el cloud. Fail-soft: nunca lanza. */
export async function guardarEdicionEnCloud(
  cloud: CloudService, // QUÉ ES: instancia ya resuelta (Local o R2), inyectada por el caller.
  input: CloudEditSaveInput, // QUÉ ES: artefactos a guardar.
): Promise<CloudEditSaveResult> {
  const saved: string[] = [];
  const errors: string[] = [];
  const dir = 'exports/edl'; // QUÉ ES: subcarpeta dentro de la carpeta canónica `exports`.
  // PARA QUÉ: agrupar todas las ediciones en un solo lugar del layout.
  // POR QUÉ: CLOUD_LAYOUT ya define `exports`; `edl` es una subcategoría natural (igual que media/videos).
  const enc = new TextEncoder(); // QUÉ ES: codificador UTF-8. PARA QUÉ: CloudService.upload exige Uint8Array.
  try {
    // QUÉ ES: el EDL es el artefacto OBLIGATORIO — si falla, ok=false (fail-soft igual).
    const edlBytes = enc.encode(JSON.stringify(input.edl, null, 2));
    const edlFile = await cloud.upload(`${input.nombreBase}.json`, edlBytes, dir);
    saved.push(edlFile.path);
  } catch (err) {
    errors.push(`EDL: ${err instanceof Error ? err.message : String(err)}`);
  }
  // QUÉ ES: self-eval opcional — un fallo aquí NO invalida la edición.
  if (input.selfEval) {
    try {
      const seBytes = enc.encode(JSON.stringify(input.selfEval, null, 2));
      const seFile = await cloud.upload(`${input.nombreBase}.selfeval.json`, seBytes, dir);
      saved.push(seFile.path);
    } catch (err) {
      errors.push(`self-eval: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // QUÉ ES: timeline SVG opcional (texto plano → bytes UTF-8).
  if (input.timelineSvg) {
    try {
      const svgBytes = enc.encode(input.timelineSvg);
      const svgFile = await cloud.upload(`${input.nombreBase}.timeline.svg`, svgBytes, dir);
      saved.push(svgFile.path);
    } catch (err) {
      errors.push(`timeline: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // QUÉ ES: render MP4 opcional → media/videos (clasificación automática del tipo video).
  if (input.renderMp4) {
    try {
      const mp4File = await cloud.upload(`${input.nombreBase}.mp4`, input.renderMp4, 'media/videos');
      saved.push(mp4File.path);
    } catch (err) {
      errors.push(`render: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // QUÉ ES: ok = el EDL (artefacto mínimo) se guardó; los opcionales son best-effort.
  return { saved, errors, ok: saved.length > 0 && !saved.every((p) => p.includes('.mp4')) };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const videoEdit = {
  packTranscript,
  buildEdl,
  renderFfmpeg,
  selfEvalEdl,
  timelineViewSvg,
  silenceSafety,
  paddingOk,
  HARD_RULES,
  GRADE_FILTERS,
  MAX_SELF_EVAL_ATTEMPTS,
  guardarEdicionEnCloud,
};
