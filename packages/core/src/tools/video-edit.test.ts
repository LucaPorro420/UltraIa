import { describe, expect, it } from 'vitest';
import {
  videoEdit,
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
  FADE_MS,
  type Edl,
} from './video-edit';

const segments = [
  { start: 0, end: 2.5, speaker: 'S0', text: 'Hola, esto es una prueba.' },
  { start: 3.1, end: 4.0, speaker: 'S0', text: 'Segunda frase.' },
  { start: 4.2, end: 5.8, speaker: 'S1', text: 'Y ahora el invitado habla.' },
  { start: 6.4, end: 7.2, speaker: 'S1', text: '(risas) Fue muy divertido.' },
];

const validEdl: Edl = {
  title: 'demo',
  cuts: [
    { source: 'take1.mp4', in: 0, out: 2.5, reason: 'intro' },
    { source: 'take1.mp4', in: 3.1, out: 5.8, reason: 'dialogo' },
    { source: 'take2.mp4', in: 0.5, out: 2.0, reason: 'cierre' },
  ],
  grade: 'warm-cinematic',
};

describe('video-edit · packTranscript (Layer 1)', () => {
  it('empaca frases con timestamps y speaker (formato takes_packed)', () => {
    const packed = packTranscript(segments);
    expect(packed).toContain('[000.00-002.50] S0 Hola, esto es una prueba.');
    expect(packed).toContain('S1');
    expect(packed).toContain('(risas)');
  });

  it('rompe frases en cambio de speaker', () => {
    const packed = packTranscript(segments);
    // speaker change at 4.2 → new line for S1
    const s1Lines = packed.split('\n').filter((l) => l.includes('S1'));
    expect(s1Lines.length).toBe(2); // 2 frases de S1 (incl. evento)
  });

  it('rompe frases en silencio >= 0.5s', () => {
    const packed = packTranscript([
      { start: 0, end: 1, speaker: 'S0', text: 'a' },
      { start: 2.0, end: 3, speaker: 'S0', text: 'b' }, // gap 1.0s → break
    ]);
    const lines = packed.split('\n').filter((l) => l.startsWith('  ['));
    expect(lines.length).toBe(2);
  });

  it('no rompe en gaps < 0.5s del mismo speaker', () => {
    const packed = packTranscript([
      { start: 0, end: 1, speaker: 'S0', text: 'a' },
      { start: 1.2, end: 2, speaker: 'S0', text: 'b' }, // gap 0.2s → same phrase
    ]);
    const lines = packed.split('\n').filter((l) => l.startsWith('  ['));
    expect(lines.length).toBe(1);
  });

  it('incluye header con total de frases y duración', () => {
    const packed = packTranscript(segments);
    expect(packed).toMatch(/## 4 phrases · \d+\.\d+s total/);
  });

  it('maneja lista vacía (no lanza)', () => {
    expect(packTranscript([])).toContain('## 0 phrases');
  });
});

describe('video-edit · buildEdl + validación', () => {
  it('ordena cuts por in y devuelve EDL normalizado', () => {
    const shuffled: Edl = {
      title: 'x',
      cuts: [
        { source: 'b.mp4', in: 5, out: 8 },
        { source: 'a.mp4', in: 0, out: 2 },
      ],
    };
    const { edl, warnings } = buildEdl(shuffled);
    expect(warnings).toEqual([]);
    expect(edl.cuts[0].in).toBe(0);
    expect(edl.cuts[1].in).toBe(5);
  });

  it('lanza en in >= out', () => {
    expect(() =>
      buildEdl({ title: 'x', cuts: [{ source: 'a', in: 5, out: 2 }] }),
    ).toThrow(/in debe ser < out/);
  });

  it('lanza en cortes < 50ms', () => {
    expect(() =>
      buildEdl({ title: 'x', cuts: [{ source: 'a', in: 1, out: 1.02 }] }),
    ).toThrow(/< 50ms/);
  });

  it('lanza en overlaps entre cuts', () => {
    expect(() =>
      buildEdl({
        title: 'x',
        cuts: [
          { source: 'a', in: 0, out: 3 },
          { source: 'b', in: 2.5, out: 4 },
        ],
      }),
    ).toThrow(/overlap/);
  });

  it('modo warnOnly recoge warnings sin lanzar', () => {
    const { warnings } = buildEdl(
      {
        title: 'x',
        cuts: [
          { source: 'a', in: 0, out: 3 },
          { source: 'b', in: 2.5, out: 4 },
        ],
      },
      { warnOnly: true },
    );
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('video-edit · silencio y padding (Hard Rules 4-5)', () => {
  it('clasifica silencios clean/usable/unsafe', () => {
    expect(silenceSafety(500)).toBe('clean');
    expect(silenceSafety(400)).toBe('clean');
    expect(silenceSafety(200)).toBe('usable');
    expect(silenceSafety(100)).toBe('unsafe');
  });

  it('padding válido en ventana 30-200ms', () => {
    expect(paddingOk(50)).toBe(true);
    expect(paddingOk(200)).toBe(true);
    expect(paddingOk(10)).toBe(false);
    expect(paddingOk(250)).toBe(false);
  });
});

describe('video-edit · renderFfmpeg (Layer 2)', () => {
  it('genera argv con fades 30ms por segmento', () => {
    const { shell, steps } = renderFfmpeg(validEdl, { outDir: 'out' });
    expect(steps.length).toBe(4); // 3 extracts + concat
    expect(shell).toContain('afade=t=in:st=0:d=0.03');
    expect(shell).toContain('afade=t=out');
    expect(FADE_MS).toBe(0.03);
  });

  it('concat lossless con -c copy (Hard Rule 2)', () => {
    const { shell } = renderFfmpeg(validEdl, { outDir: 'out', outName: 'final.mp4' });
    expect(shell).toContain('-c copy');
    expect(shell).toContain('final.mp4');
    expect(shell).toContain("file 'out/clip_0.ts'");
  });

  it('aplica grade warm-cinematic al filtro de video', () => {
    const { shell } = renderFfmpeg(validEdl);
    expect(shell).toContain('eq=contrast=1.08:saturation=1.12');
  });

  it('grade none no añade filtro', () => {
    const { shell } = renderFfmpeg({ ...validEdl, grade: 'none' });
    expect(shell).not.toContain('-vf');
  });

  it('preview usa escala 720p', () => {
    const { shell } = renderFfmpeg(validEdl, { preview: true });
    expect(shell).toContain('scale=1280');
  });

  it('determinismo: mismo EDL + opts → mismo shell', () => {
    const a = renderFfmpeg(validEdl, { outDir: 'o' });
    const b = renderFfmpeg(validEdl, { outDir: 'o' });
    expect(a.shell).toBe(b.shell);
    expect(a.argv).toEqual(b.argv);
  });
});

describe('video-edit · selfEvalEdl', () => {
  it('ok sin issues cuando todo cumple', () => {
    const r = selfEvalEdl(validEdl, { expectedDurationSec: 7.2 });
    expect(r.ok).toBe(true);
    expect(r.score).toBe(100);
    expect(r.attemptsRemaining).toBe(2);
  });

  it('detecta DURATION_MISMATCH', () => {
    const r = selfEvalEdl(validEdl, { expectedDurationSec: 30 });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.code === 'DURATION_MISMATCH')).toBe(true);
  });

  it('detecta UNSAFE_CUT (< 150ms)', () => {
    const r = selfEvalEdl({
      title: 'x',
      cuts: [{ source: 'a', in: 0, out: 0.1 }],
    });
    expect(r.issues.some((i) => i.code === 'UNSAFE_CUT')).toBe(true);
  });

  it('advierte sobre silence gaps inseguros', () => {
    const r = selfEvalEdl(validEdl, { silenceGapsMs: [80] });
    expect(r.issues.some((i) => i.code === 'UNSAFE_GAP' && i.severity === 'warn')).toBe(true);
    expect(r.ok).toBe(true); // warn no rompe ok
  });

  it('intentos restantes respetan el cap de 3', () => {
    expect(MAX_SELF_EVAL_ATTEMPTS).toBe(3);
    expect(selfEvalEdl(validEdl, {}, 3).attemptsRemaining).toBe(0);
  });

  it('12 hard rules documentadas', () => {
    expect(HARD_RULES.length).toBe(12);
    expect(HARD_RULES[2].rule).toContain('30ms');
  });
});

describe('video-edit · timelineViewSvg', () => {
  it('genera SVG a11y sin <script>', () => {
    const svg = timelineViewSvg({
      title: 'Demo timeline',
      durationSec: 10,
      markers: [
        { start: 0, end: 2, label: 'Hola', speaker: 'S0' },
        { start: 4, end: 5, label: 'risas', speaker: 'S1', cut: true },
      ],
      silences: [{ start: 2.5, end: 3.5 }],
    });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-labelledby');
    expect(svg).toContain('<title');
    expect(svg).not.toContain('<script');
    expect(svg).toContain('silence 2.5-3.5s');
    expect(svg).toContain('risas');
  });

  it('marca cortes (cut) con accent', () => {
    const svg = timelineViewSvg({
      title: 'T',
      durationSec: 5,
      markers: [{ start: 1, end: 2, label: 'corte', cut: true }],
    });
    expect(svg).toContain('#8b5cf6');
  });

  it('determinista', () => {
    const spec = { title: 'T', durationSec: 5, markers: [{ start: 0, end: 1, label: 'a' }] };
    expect(timelineViewSvg(spec)).toBe(timelineViewSvg(spec));
  });
});

describe('video-edit · api pública', () => {
  it('exporta videoEdit con todas las funciones', () => {
    expect(typeof videoEdit.packTranscript).toBe('function');
    expect(typeof videoEdit.buildEdl).toBe('function');
    expect(typeof videoEdit.renderFfmpeg).toBe('function');
    expect(typeof videoEdit.selfEvalEdl).toBe('function');
    expect(typeof videoEdit.timelineViewSvg).toBe('function');
    expect(GRADE_FILTERS['neutral-punch']).toContain('contrast');
  });
});
