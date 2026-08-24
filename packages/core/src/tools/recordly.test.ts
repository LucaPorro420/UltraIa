import { describe, expect, it } from 'vitest';
import {
  MIN_DWELL_DURATION_MS,
  MAX_DWELL_DURATION_MS,
  CURSOR_MOTION_PRESETS,
  normalizeCursorTelemetry,
  detectZoomDwellCandidates,
  buildInteractionZoomSuggestions,
  resolveCursorMotionPresetId,
  getWebcamPositionForPreset,
  getWebcamOverlayScale,
  getWebcamOverlaySizePx,
  getWebcamOverlayPosition,
  normalizeWebcamCropRegion,
  getWebcamCropSourceRect,
  calculateMp4ExportDimensions,
  buildRegionTimeline,
  buildRecordlyManifest,
  recordlyPlan,
  type CursorSample,
} from './recordly';

/**
 * Tests de la capability `recordly` — ScreenFlow Studio planner (port de PRINCIPIOS de
 * Recordly, AGPL-3.0; implementacion ORIGINAL determinista, cero red, cero deps).
 */

const stillRun = (startMs: number, count: number, cx = 0.5, cy = 0.5): CursorSample[] =>
  Array.from({ length: count }, (_, i) => ({
    timeMs: startMs + i * 50,
    cx: cx + (i % 2 === 0 ? 0 : 0.001),
    cy,
    interactionType: 'move',
  }));

describe('normalizeCursorTelemetry', () => {
  it('clamp coords a [0,1], timeMs a [0,totalMs] y ordena por tiempo', () => {
    const out = normalizeCursorTelemetry(
      [
        { timeMs: 900, cx: 1.4, cy: -0.2 },
        { timeMs: -50, cx: 0.3, cy: 0.8 },
        { timeMs: 400, cx: 0.6, cy: 0.1 },
      ],
      800,
    );
    expect(out.map((s) => s.timeMs)).toEqual([0, 400, 800]);
    expect(out[0]).toMatchObject({ cx: 0.3, cy: 0.8 });
    expect(out[2]).toMatchObject({ cx: 1, cy: 0 });
  });

  it('filtra muestras no finitas y tolera totalMs invalido', () => {
    const out = normalizeCursorTelemetry(
      [
        { timeMs: Number.NaN, cx: 0.5, cy: 0.5 },
        { timeMs: 10, cx: Number.POSITIVE_INFINITY, cy: 0.5 },
        { timeMs: 20, cx: 0.5, cy: Number.NaN },
        { timeMs: 30, cx: 0.7, cy: 0.7 },
      ],
      Number.NaN,
    );
    expect(out).toHaveLength(1);
    expect(out[0].timeMs).toBe(0); // clamp contra safeTotal=0
    expect(out[0].cx).toBe(0.7);
  });

  it('no muta el arreglo de entrada', () => {
    const input = [{ timeMs: 200, cx: 0.9, cy: 0.9 }, { timeMs: 100, cx: 0.1, cy: 0.1 }];
    const copy = [...input];
    normalizeCursorTelemetry(input, 1000);
    expect(input).toEqual(copy);
  });
});

describe('detectZoomDwellCandidates', () => {
  it('detecta una pausa dentro de [MIN,MAX] dwell con focus promediado', () => {
    // 10 samples x 50ms = 450ms de pausa (== MIN_DWELL, no es < MIN) en cx~0.25
    const samples = stillRun(1000, 10, 0.25, 0.75);
    const candidates = detectZoomDwellCandidates(samples);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].focus).toEqual({ cx: 0.2505, cy: 0.75 }); // promedio del patron alterno
    expect(candidates[0].strength).toBe(450); // duracion de la corrida = ultima - primera
    expect(candidates[0].centerTimeMs).toBe(1225); // (1000+1450)/2
    expect(MIN_DWELL_DURATION_MS).toBeLessThan(MAX_DWELL_DURATION_MS);
  });

  it('ignora pausas demasiado cortas o largas y corridas de <2 muestras', () => {
    expect(detectZoomDwellCandidates([])).toEqual([]);
    expect(detectZoomDwellCandidates([{ timeMs: 0, cx: 0.5, cy: 0.5 }])).toEqual([]);
    // pausa de 100ms < MIN_DWELL (450)
    expect(detectZoomDwellCandidates(stillRun(0, 3))).toHaveLength(0);
    // pausa de 2650ms > MAX_DWELL (2600) — 54 muestras x 50ms
    expect(detectZoomDwellCandidates(stillRun(0, 54))).toHaveLength(0);
  });

  it('corta la corrida cuando el cursor se mueve mas que DWELL_MOVE_THRESHOLD', () => {
    // dos corridas de 550ms cada una (12 x 50ms), separadas por un salto grande
    const samples: CursorSample[] = [
      ...stillRun(0, 12),
      ...stillRun(700, 12, 0.9, 0.9), // salto grande -> nueva corrida
    ];
    const candidates = detectZoomDwellCandidates(samples);
    expect(candidates).toHaveLength(2);
    expect(candidates[1].focus.cy).toBeCloseTo(0.9, 5);
    expect(candidates[1].focus.cx).toBeGreaterThan(0.89);
  });
});

describe('buildInteractionZoomSuggestions', () => {
  it('status no-slots si totalMs invalido; no-telemetry sin muestras; no-interactions sin clicks', () => {
    expect(buildInteractionZoomSuggestions({ cursorTelemetry: [], totalMs: 0 }).status).toBe('no-slots');
    expect(buildInteractionZoomSuggestions({ cursorTelemetry: [], totalMs: 60_000 }).status).toBe('no-telemetry');
    expect(
      buildInteractionZoomSuggestions({
        cursorTelemetry: [{ timeMs: 500, cx: 0.5, cy: 0.5, interactionType: 'move' }],
        totalMs: 60_000,
      }).status,
    ).toBe('no-interactions');
  });

  it('agrupa clicks cercanos en UNA sugerencia con padding y ordena por inicio', () => {
    const telemetry: CursorSample[] = [
      { timeMs: 1000, cx: 0.2, cy: 0.3, interactionType: 'click' },
      { timeMs: 1400, cx: 0.22, cy: 0.32, interactionType: 'click' }, // gap 400 <= mergeGap -> mismo cluster
      { timeMs: 20_000, cx: 0.8, cy: 0.8, interactionType: 'click' }, // cluster aparte
    ];
    const res = buildInteractionZoomSuggestions({ cursorTelemetry: telemetry, totalMs: 60_000 });
    expect(res.status).toBe('ok');
    expect(res.suggestions).toHaveLength(2);
    expect(res.suggestions[0].start).toBe(500); // 1000 - pad 500
    expect(res.suggestions[0].end).toBe(1900); // 1400 + pad 500
    // fuerza identica (900): bestFocus conserva el PRIMER click del cluster (no hay > estricto)
    expect(res.suggestions[0].focus.cx).toBeCloseTo(0.2, 5);
    expect(res.suggestions[1]).toMatchObject({ start: 19_500, end: 20_500 });
  });

  it('respeta reservedSpans (solape -> cluster omitido) y reporta no-slots si todo se omite', () => {
    const telemetry: CursorSample[] = [
      { timeMs: 1000, cx: 0.5, cy: 0.5, interactionType: 'click' },
    ];
    const skipped = buildInteractionZoomSuggestions({
      cursorTelemetry: telemetry,
      totalMs: 60_000,
      reservedSpans: [{ start: 0, end: 5000 }],
    });
    expect(skipped.status).toBe('no-slots');
    expect(skipped.suggestions).toEqual([]);

    const partial = buildInteractionZoomSuggestions({
      cursorTelemetry: [
        { timeMs: 1000, cx: 0.5, cy: 0.5, interactionType: 'click' },
        { timeMs: 40_000, cx: 0.1, cy: 0.1, interactionType: 'right-click' },
      ],
      totalMs: 60_000,
      reservedSpans: [{ start: 0, end: 5000 }],
    });
    expect(partial.status).toBe('ok');
    expect(partial.suggestions).toHaveLength(1);
    expect(partial.suggestions[0].start).toBe(39_500);
  });

  it('clamp del padding a los bordes del video (no sale de [0,totalMs])', () => {
    const res = buildInteractionZoomSuggestions({
      cursorTelemetry: [{ timeMs: 100, cx: 0.5, cy: 0.5, interactionType: 'double-click' }],
      totalMs: 60_000,
    });
    expect(res.suggestions[0].start).toBe(0);
  });
});

describe('cursor motion presets', () => {
  it('los dos presets comparten valores base y difieren en stiffness/damping', () => {
    expect(CURSOR_MOTION_PRESETS.focused.cursorSize).toBe(CURSOR_MOTION_PRESETS.smooth.cursorSize);
    expect(CURSOR_MOTION_PRESETS.focused.zoomInDurationMs).toBe(200);
    expect(CURSOR_MOTION_PRESETS.smooth.zoomInDurationMs).toBe(250);
    expect(CURSOR_MOTION_PRESETS.focused.cursorSpringStiffnessMultiplier).toBeGreaterThan(
      CURSOR_MOTION_PRESETS.smooth.cursorSpringStiffnessMultiplier,
    );
  });

  it('resolveCursorMotionPresetId reconoce presets exactos y cae al fallback', () => {
    const focused = CURSOR_MOTION_PRESETS.focused;
    expect(resolveCursorMotionPresetId(focused)).toBe('focused');
    expect(resolveCursorMotionPresetId(CURSOR_MOTION_PRESETS.smooth)).toBe('smooth');
    const mutada = { ...focused, zoomInDurationMs: 999 };
    expect(resolveCursorMotionPresetId(mutada, 'smooth')).toBe('smooth');
  });
});

describe('webcam bubble overlay', () => {
  it('getWebcamPositionForPreset mapea presets ancla', () => {
    expect(getWebcamPositionForPreset('top-left')).toEqual({ x: 0, y: 0 });
    expect(getWebcamPositionForPreset('top-center')).toEqual({ x: 0.5, y: 0 });
    expect(getWebcamPositionForPreset('bottom-center')).toEqual({ x: 0.5, y: 1 });
    expect(getWebcamPositionForPreset('center')).toEqual({ x: 0.5, y: 0.5 });
    expect(getWebcamPositionForPreset('custom')).toEqual({ x: 1, y: 1 });
  });

  it('getWebcamOverlayScale invierte el zoom solo si reactToZoom', () => {
    expect(getWebcamOverlayScale(2, true)).toBe(0.5);
    expect(getWebcamOverlayScale(2, false)).toBe(1);
    expect(getWebcamOverlayScale(Number.NaN, true)).toBe(1); // zoom invalido -> 1
  });

  it('getWebcamOverlaySizePx respeta piso 56px y techo contenedor-margenes', () => {
    const base = {
      containerWidth: 1280,
      containerHeight: 720,
      sizePercent: 25,
      margin: 24,
      zoomScale: 1,
      reactToZoom: false,
    };
    expect(getWebcamOverlaySizePx(base)).toBe(180); // min(720,1280)=720 * 0.25 = 180
    // contenedor 120x120: scaledSize=30 -> piso 56 aplica ANTES del techo (min(72, 56))
    expect(getWebcamOverlaySizePx({ ...base, containerWidth: 120, containerHeight: 120 })).toBe(56);
    // techo real: contenedor chico con sizePercent grande
    expect(getWebcamOverlaySizePx({ ...base, containerWidth: 200, containerHeight: 200, sizePercent: 100 })).toBe(
      152, // maxSize = max(56, 200-48) = 152; scaled=200 -> min(152, 200)
    );
  });

  it('getWebcamOverlayPosition posiciona con margen y clamp de custom', () => {
    const params = {
      containerWidth: 1000,
      containerHeight: 500,
      width: 100,
      height: 100,
      margin: 20,
      positionX: 0.5,
      positionY: 0.5,
    };
    expect(getWebcamOverlayPosition({ ...params, positionPreset: 'bottom-right' })).toEqual({
      x: 20 + 860,
      y: 20 + 360,
    });
    expect(getWebcamOverlayPosition({ ...params, positionPreset: 'custom', positionX: 2, positionY: -1 })).toEqual({
      x: 20 + 860, // clamp custom a 1
      y: 20, // clamp custom a 0
    });
  });

  it('normalizeWebcamCropRegion defaulta a full-frame y clamp x+width<=1', () => {
    expect(normalizeWebcamCropRegion(null)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    const clamped = normalizeWebcamCropRegion({ x: 0.9, y: 0.5, width: 0.5, height: 2 });
    expect(clamped.x).toBe(0.9);
    expect(clamped.width).toBeLessThanOrEqual(0.1);
    expect(clamped.height).toBeLessThanOrEqual(0.5);
  });

  it('getWebcamCropSourceRect convierte crop normalizado a pixeles fuente', () => {
    const rect = getWebcamCropSourceRect({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 }, 640, 480);
    expect(rect).toEqual({ sx: 320, sy: 240, sw: 320, sh: 240 });
  });
});

describe('calculateMp4ExportDimensions', () => {
  it('quality source + native mantiene dimensiones pares de la fuente', () => {
    expect(calculateMp4ExportDimensions({ sourceWidth: 1918, sourceHeight: 1078 })).toEqual({
      width: 1918,
      height: 1078,
    });
  });

  it('aspect 9:16 desde fuente landscape ajusta por altura (dimensiones pares)', () => {
    const dims = calculateMp4ExportDimensions({
      sourceWidth: 1920,
      sourceHeight: 1080,
      aspectRatio: '9:16',
    });
    expect(dims.width % 2).toBe(0);
    expect(dims.height % 2).toBe(0);
    expect(dims.height).toBeLessThanOrEqual(1080);
    expect(dims.width / dims.height).toBeCloseTo(9 / 16, 2);
  });

  it('quality medium escala ~0.6 y 1:1 produce cuadrado par', () => {
    const med = calculateMp4ExportDimensions({
      sourceWidth: 1000,
      sourceHeight: 1000,
      quality: 'medium',
    });
    expect(med.width).toBe(600);
    expect(med.height).toBe(600);

    const square = calculateMp4ExportDimensions({
      sourceWidth: 1920,
      sourceHeight: 1080,
      quality: 'low',
      aspectRatio: '1:1',
    });
    expect(square.width).toBe(square.height);
    expect(square.width % 2).toBe(0);
  });
});

describe('buildRegionTimeline', () => {
  it('compone items por variante con rowId por pista y ordena por start luego rowId', () => {
    const items = buildRegionTimeline({
      zoomRegions: [{ id: 'z1', startMs: 3000, endMs: 4500, depth: 2 }],
      clipRegions: [{ id: 'c1', startMs: 0, endMs: 10_000 }],
      annotationRegions: [
        { id: 'a1', startMs: 1000, endMs: 2000, type: 'text', content: 'hola', trackIndex: 1 },
      ],
      audioRegions: [{ id: 'au1', startMs: 1000, endMs: 8000, audioPath: 'narracion.mp3', trackIndex: 0 }],
    });
    expect(items.map((i) => i.id)).toEqual(['c1', 'a1', 'au1', 'z1']);
    const rows = new Map(items.map((i) => [i.id, i.rowId]));
    expect(rows.get('z1')).toBe('zoom');
    expect(rows.get('c1')).toBe('clips');
    expect(rows.get('a1')).toBe('annotations-1');
    expect(rows.get('au1')).toBe('audio-0');
    // orden estable: empate en startMs (1000) resuelto por rowId asc ('annotations-1' < 'audio-0')
  });
});

describe('buildRecordlyManifest (determinista)', () => {
  it('serializa con claves ordenadas independiente del orden de insercion', () => {
    const editorA = { export: { aspectRatio: '9:16' as const }, cursorMotionPresetId: 'focused' as const };
    const editorB = { cursorMotionPresetId: 'focused' as const, export: { aspectRatio: '9:16' as const } };
    const a = buildRecordlyManifest({ sourcePath: 'demo.mp4', editorState: editorA, durationMs: 61_250 });
    const b = buildRecordlyManifest({ sourcePath: 'demo.mp4', editorState: editorB, durationMs: 61_250 });
    expect(a).toBe(b);
    expect(a).toContain('"kind":"recordly-screenflow-studio"');
    expect(a).toContain('"version":1');
    expect(a).toContain('"durationMs":61250'); // redondeo aplicado
  });

  it('tolera entradas degeneradas sin lanzar (durationMs NaN -> null)', () => {
    const m = buildRecordlyManifest({ sourcePath: '', editorState: {}, durationMs: Number.NaN });
    expect(JSON.parse(m)).toMatchObject({ version: 1, durationMs: null, sourcePath: '' });
  });
});

describe('recordlyPlan (agregador)', () => {
  it('combina zoom suggestions + manifest en un plan determinista', () => {
    const input = {
      sourcePath: '.ultraia/recordings/demo.mp4',
      durationMs: 30_000,
      cursorTelemetry: [
        { timeMs: 5000, cx: 0.3, cy: 0.4, interactionType: 'click' },
        { timeMs: 15_000, cx: 0.7, cy: 0.2, interactionType: 'click' },
      ],
      editorState: { cursorMotionPresetId: 'smooth' as const },
    };
    const plan = recordlyPlan(input);
    expect(plan.zoom.status).toBe('ok');
    expect(plan.zoom.suggestions).toHaveLength(2);
    expect(plan.manifest).toContain('.ultraia/recordings/demo.mp4');
    // determinismo total
    expect(recordlyPlan(input)).toEqual(plan);
  });

  it('degrada fail-soft sin telemetria (zoom vacio, manifest igual valido)', () => {
    // sin durationMs -> totalMs=0 -> 'no-slots' (guard previo a telemetria)
    const plan = recordlyPlan({ sourcePath: 'x.mp4' });
    expect(plan.zoom.status).toBe('no-slots');
    expect(JSON.parse(plan.manifest).sourcePath).toBe('x.mp4');
    // con duracion pero sin muestras -> 'no-telemetry'
    expect(recordlyPlan({ sourcePath: 'x.mp4', durationMs: 5000 }).zoom.status).toBe('no-telemetry');
  });
});
