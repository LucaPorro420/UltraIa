/**
 * Tests de motion.ts (capability `motion`) — dominio puro determinista.
 * CERO ejecución real: campos sintéticos + argv generation only.
 */
import { describe, it, expect } from 'vitest';
import {
  flowStats,
  decomposeMotion,
  trajectoryFit,
  catmullRom,
  planFlowAnalysis,
  flowFieldSchema,
  flowAnalysisSchema,
  type FlowField,
  type MotionVector,
} from './motion';

/** Campo sintético uniforme (translación pura). */
function uniformField(w: number, h: number, u: number, v: number): FlowField {
  const vectors: MotionVector[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      vectors.push([x, y, u, v]);
    }
  }
  return { width: w, height: h, vectors };
}

function radialField(w: number, h: number, k: number): FlowField {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const vectors: MotionVector[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      vectors.push([x, y, (x - cx) * k, (y - cy) * k]);
    }
  }
  return { width: w, height: h, vectors };
}

describe('flowStats (campo F(x,y,t))', () => {
  it('campo vacío: estadística neutral', () => {
    const s = flowStats({ width: 2, height: 2, vectors: [] });
    expect(s.meanMagnitude).toBe(0);
    expect(s.coherence).toBe(1);
    expect(s.meanVector).toEqual({ x: 0, y: 0 });
  });

  it('magnitud media de un campo uniforme = magnitud del vector', () => {
    const s = flowStats(uniformField(4, 4, 3, 4));
    expect(s.meanMagnitude).toBeCloseTo(5, 9);
    expect(s.meanVector).toEqual({ x: 3, y: 4 });
  });

  it('dirección dominante: +x = 0°, +y = 90°', () => {
    expect(flowStats(uniformField(3, 3, 1, 0)).dominantAngle).toBeCloseTo(0, 9);
    expect(flowStats(uniformField(3, 3, 0, 1)).dominantAngle).toBeCloseTo(90, 9);
    expect(flowStats(uniformField(3, 3, 1, 1)).dominantAngle).toBeCloseTo(45, 9);
  });

  it('coherencia 1 para flujo uniforme, baja para flujo opuesto', () => {
    expect(flowStats(uniformField(3, 3, 2, 0)).coherence).toBeCloseTo(1, 9);
    // Dos vectores opuestos se cancelan: vector medio 0 → coherencia 0.
    const opposed: FlowField = {
      width: 2,
      height: 1,
      vectors: [
        [0, 0, 2, 0],
        [1, 0, -2, 0],
      ],
    };
    expect(flowStats(opposed).coherence).toBeCloseTo(0, 9);
  });
});

describe('decomposeMotion (cámara vs escena)', () => {
  it('campo estático → dominant static, residual 0', () => {
    const d = decomposeMotion(uniformField(4, 4, 0, 0));
    expect(d.dominant).toBe('static');
    expect(d.cameraTranslation).toEqual({ x: 0, y: 0 });
    expect(d.cameraZoom).toBeCloseTo(1, 9);
  });

  it('translación pura → camera, tx/ty exactos, residual 0', () => {
    const d = decomposeMotion(uniformField(5, 5, 2.5, -1.5));
    expect(d.dominant).toBe('camera');
    expect(d.cameraTranslation.x).toBeCloseTo(2.5, 6);
    expect(d.cameraTranslation.y).toBeCloseTo(-1.5, 6);
    expect(d.cameraZoom).toBeCloseTo(1, 6);
    expect(d.explainedRatio).toBeCloseTo(1, 6);
    const res = flowStats(d.sceneResidual);
    expect(res.meanMagnitude).toBeLessThan(1e-6);
  });

  it('zoom radial → cameraZoom > 1 y dominant camera', () => {
    const d = decomposeMotion(radialField(5, 5, 0.2));
    expect(d.dominant).toBe('camera');
    expect(d.cameraZoom).toBeCloseTo(1.2, 6);
  });

  it('objeto en movimiento sobre cámara → mixed y residual > 0', () => {
    // Cámara tx=1 + un objeto (columna central) moviéndose +4 extra.
    const field: FlowField = { width: 5, height: 3, vectors: [] };
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 5; x++) {
        const extra = x === 2 ? 4 : 0;
        field.vectors.push([x, y, 1 + extra, 0]);
      }
    }
    const d = decomposeMotion(field);
    expect(d.dominant).toBe('mixed');
    // LSQ exacto: tx = Σu/n = 27/15 = 1.8 (el objeto desplaza la media).
    expect(d.cameraTranslation.x).toBeCloseTo(1.8, 6);
    const res = flowStats(d.sceneResidual);
    expect(res.meanMagnitude).toBeGreaterThan(0.3);
  });

  it('movimiento alternado sin cámara → scene (energía modelo 0)', () => {
    // Vectores opuestos por fila: Σu = 0 → sin translación ni zoom global → scene.
    const field: FlowField = { width: 4, height: 2, vectors: [] };
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 4; x++) {
        field.vectors.push([x, y, y === 0 ? 2 : -2, 0]);
      }
    }
    const d = decomposeMotion(field);
    expect(d.dominant).toBe('scene');
    expect(d.explainedRatio).toBeCloseTo(0, 6);
  });
});

describe('catmullRom (spline base)', () => {
  it('t=0 → p1, t=1 → p2 (interpola los puntos de control)', () => {
    const p0: [number, number] = [0, 0];
    const p1: [number, number] = [1, 1];
    const p2: [number, number] = [2, 0];
    const p3: [number, number] = [3, 1];
    expect(catmullRom(p0, p1, p2, p3, 0)).toEqual(p1);
    expect(catmullRom(p0, p1, p2, p3, 1)).toEqual(p2);
  });

  it('simetría: swap p0<->p3 y p1<->p2 invierte el camino', () => {
    const f = (t: number) => catmullRom([0, 0], [1, 1], [2, 0], [3, 1], t);
    const r = (t: number) => catmullRom([3, 1], [2, 0], [1, 1], [0, 0], t);
    const a = f(0.3);
    const b = r(0.7);
    expect(a[0]).toBeCloseTo(b[0], 9);
    expect(a[1]).toBeCloseTo(b[1], 9);
  });
});

describe('trajectoryFit (trayectorias interpoladas)', () => {
  const pts: [number, number][] = [
    [0, 0],
    [1, 2],
    [3, 2],
    [4, 0],
  ];

  it('interpola exactamente los puntos de control en t entero', () => {
    const tr = trajectoryFit(pts);
    for (let i = 0; i < pts.length; i++) {
      const p = tr.evaluate(i);
      expect(p[0]).toBeCloseTo(pts[i][0], 9);
      expect(p[1]).toBeCloseTo(pts[i][1], 9);
    }
  });

  it('clampa fuera de rango', () => {
    const tr = trajectoryFit(pts);
    expect(tr.evaluate(-5)).toEqual(pts[0]);
    expect(tr.evaluate(99)).toEqual(pts[pts.length - 1]);
  });

  it('longitud determinista y >= distancia euclídea entre extremos', () => {
    const tr = trajectoryFit(pts);
    const d = Math.sqrt(4 ** 2 + 0 ** 2);
    expect(tr.length).toBeGreaterThanOrEqual(d - 1e-9);
    const tr2 = trajectoryFit(pts);
    expect(tr.length).toBeCloseTo(tr2.length, 12);
  });

  it('rechaza < 2 puntos', () => {
    expect(() => trajectoryFit([[0, 0]])).toThrow(/motion/);
  });
});

describe('planFlowAnalysis (runner OpenCV — solo argv)', () => {
  it('argv determinista con método por defecto', () => {
    const p1 = planFlowAnalysis({});
    const p2 = planFlowAnalysis({});
    expect(p1.argv).toEqual(p2.argv);
    expect(p1.argv[0]).toBe('python');
    expect(p1.argv[1]).toContain('flow_analysis.py');
    expect(p1.argv).toContain('--method');
    expect(p1.argv[p1.argv.indexOf('--method') + 1]).toBe('farneback');
  });

  it('lucasKanade + grid custom + roi serializada', () => {
    const p = planFlowAnalysis({ method: 'lucasKanade', grid: 8, roi: [0, 0, 0.5, 0.5] });
    expect(p.argv[p.argv.indexOf('--method') + 1]).toBe('lucasKanade');
    expect(p.argv[p.argv.indexOf('--grid') + 1]).toBe('8');
    expect(p.argv[p.argv.indexOf('--roi') + 1]).toBe('0,0,0.5,0.5');
  });

  it('summary descriptivo sin ejecutar', () => {
    const p = planFlowAnalysis({ method: 'farneback', scale: 0.5 });
    expect(p.summary).toContain('farneback');
    expect(p.summary).toContain('no ejecutado');
  });
});

describe('schemas zod', () => {
  it('flowFieldSchema valida y rechaza', () => {
    expect(flowFieldSchema.parse({ width: 2, height: 2, vectors: [[0, 0, 1, 1]] }).width).toBe(2);
    expect(() => flowFieldSchema.parse({ width: 0, height: 2, vectors: [] })).toThrow();
    expect(() => flowFieldSchema.parse({ width: 2, height: 2, vectors: [[0, 0, 1]] })).toThrow();
  });

  it('flowAnalysisSchema: default y rechazo de método inválido', () => {
    const cfg = flowAnalysisSchema.parse({});
    expect(cfg.method).toBe('farneback');
    expect(cfg.grid).toBe(16);
    expect(() => flowAnalysisSchema.parse({ method: 'hornSchunck' })).toThrow();
    expect(() => flowAnalysisSchema.parse({ grid: 1 })).toThrow();
  });
});