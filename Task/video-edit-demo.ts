/**
 * video-edit-demo.ts — aplica la capability `video_edit` (WS-2) a los
 * motion-specs de Task1: transcript sintético → takes_packed → EDL validado →
 * self-eval → comando ffmpeg → timeline SVG editorial (Dark Obsidian).
 *
 * Genera (determinista, sin red, sin ffmpeg — el render real se corre aparte):
 *  resultTask/edl/download-2.takes_packed.md     (vista de lectura del modelo)
 *  resultTask/edl/download-2.edl.json            (EDL validado)
 *  resultTask/edl/download-2.render.sh           (comando ffmpeg, fades 30ms)
 *  resultTask/edl/download-2.timeline.svg        (composite filmstrip+waveform)
 *  resultTask/edl/download-2.selfeval.json       (reporte de autoevaluación)
 *  resultTask/edl/download-5.*                   (idem)
 *  resultTask/README.md                          (índice actualizado)
 *
 * Uso: node_modules\.bin\vite-node.cmd Task/video-edit-demo.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  packTranscript,
  buildEdl,
  renderFfmpeg,
  selfEvalEdl,
  timelineViewSvg,
  HARD_RULES,
} from '../packages/core/src/tools/video-edit';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const write = (rel: string, content: string) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return rel;
};

interface MotionSpec {
  video: string;
  metadata?: { durationSec?: number; resolution?: string };
  scenes: Array<{ index: number; start: number; end: number; duration?: number; frame?: string }>;
  suggestedMotions?: string[];
  patterns?: string[];
}

const specFor = (rel: string): MotionSpec =>
  JSON.parse(readFileSync(join(root, rel), 'utf8')) as MotionSpec;

/* Transcript sintético: frases derivadas de los patterns del spec ---------- */
function syntheticTranscript(spec: MotionSpec, voice = 'S0') {
  const dur = spec.metadata?.durationSec ?? 20;
  const patterns = spec.patterns?.slice(0, 6) ?? ['Intro'];
  const segs: Array<{ start: number; end: number; speaker: string; text: string }> = [];
  let t = 0.4;
  for (const [i, p] of patterns.entries()) {
    const len = Math.min(2.6, dur / patterns.length);
    segs.push({ start: t, end: Math.min(t + len, dur - 0.3), speaker: voice, text: p });
    t += len + 0.55; // gap >= 0.5s → frase separada
  }
  return segs;
}

/* EDL de demostración: cortes sobre el spec (duración completa, no silencio) */
function demoEdl(spec: MotionSpec, source: string) {
  const dur = spec.metadata?.durationSec ?? 20;
  return {
    title: `${spec.video} — demo edit`,
    cuts: [
      { source, in: 0, out: Math.min(3.2, dur), reason: 'hook' },
      { source, in: Math.min(3.8, dur), out: Math.min(7.6, dur), reason: 'desarrollo' },
      { source, in: Math.min(8.2, dur), out: Math.min(12.4, dur), reason: 'giro' },
      { source, in: Math.min(13.0, dur), out: dur, reason: 'cierre' },
    ],
    grade: 'warm-cinematic' as const,
  };
}

/* 1. Procesar cada motion-spec -------------------------------------------- */
const written: string[] = [];
for (const spec of [specFor('resultTask/video-analysis/download-2.motion-spec.json'), specFor('resultTask/video-analysis/download-5.motion-spec.json')]) {
  const slug = spec.video.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
  const outDir = `resultTask/edl/${slug}`;
  const dur = spec.metadata?.durationSec ?? 20;
  const markers = spec.scenes.map((s) => ({
    start: s.start,
    end: s.end,
    label: `escena ${s.index}`,
    cut: s.index > 1,
  }));
  const silences = [{ start: 3.2, end: 3.8 }, { start: 7.6, end: 8.2 }, { start: 12.4, end: 13.0 }];

  // 1) takes_packed (vista de lectura del modelo)
  const packed = packTranscript(syntheticTranscript(spec));
  written.push(write(`${outDir}/takes_packed.md`, packed));

  // 2) EDL validado
  const { edl, warnings } = buildEdl(demoEdl(spec, spec.video));
  written.push(write(`${outDir}/edl.json`, JSON.stringify({ edl, warnings }, null, 2) + '\n'));

  // 3) comando ffmpeg (fades 30ms + grade + concat lossless)
  const { shell, steps } = renderFfmpeg(edl, { outDir, outName: 'final.mp4' });
  written.push(write(`${outDir}/render.sh`, shell + '\n'));
  written.push(write(`${outDir}/render.steps.txt`, steps.map((s) => `- ${s}`).join('\n') + '\n'));

  // 4) self-eval
  const report = selfEvalEdl(edl, { expectedDurationSec: dur });
  written.push(write(`${outDir}/selfeval.json`, JSON.stringify({ report, hardRules: HARD_RULES }, null, 2) + '\n'));

  // 5) timeline SVG editorial (decision point visual)
  const svg = timelineViewSvg(
    { title: `${spec.video} — EDL`, durationSec: dur, markers, silences },
    900,
  );
  written.push(write(`${outDir}/timeline.svg`, svg));
}

/* 2. Índice en resultTask/README.md --------------------------------------- */
const readmePath = join(root, 'resultTask/README.md');
const readme = readFileSync(readmePath, 'utf8');
const section = `## Edits de video (capability video_edit)

Pipeline portado del patrón video-use (browser-use): transcript → takes_packed →
EDL validado → ffmpeg (fades 30ms + grade) → self-eval → timeline SVG.

| Demo | takes_packed | EDL | render | self-eval | timeline |
|---|---|---|---|---|---|
| Download (2) | [takes_packed](edl/download-2/takes_packed.md) | [edl.json](edl/download-2/edl.json) | [render.sh](edl/download-2/render.sh) | [selfeval.json](edl/download-2/selfeval.json) | [timeline.svg](edl/download-2/timeline.svg) |
| Download (5) | [takes_packed](edl/download-5/takes_packed.md) | [edl.json](edl/download-5/edl.json) | [render.sh](edl/download-5/render.sh) | [selfeval.json](edl/download-5/selfeval.json) | [timeline.svg](edl/download-5/timeline.svg) |

Regeneración (idempotente): \`node_modules\\.bin\\vite-node.cmd Task/video-edit-demo.ts\`
`;
if (!readme.includes('## Edits de video')) {
  written.push(write('resultTask/README.md', readme.replace(/## Diagramas editoriales/, section + '\n## Diagramas editoriales')));
}

console.log(`video-edit demo OK — ${written.length} archivos:\n${written.join('\n')}`);
