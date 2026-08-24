// -----------------------------------------------------------------------------
// cadgeo.test.ts - Motor Evolutivo M2 (plan loop-94)
// Criterios SPEC: triangulacion valida (propiedad empty-circle), BVH devuelve
// el MISMO conjunto que fuerza bruta, celdas voronoi particionan el bbox,
// b-spline pasa por extremos, extrude/revolve -> GeoMesh exportable.
// -----------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';

import { meshToGltf, meshToObjText, validateGeoMesh, type GeoMesh } from './geometry';
import {
  CadError,
  bsplineEval,
  bvhAabbQuery,
  bvhBuild,
  bvhRayQuery,
  delaunayTriangulate,
  extrudeMesh,
  quadtreeCreate,
  revolveMesh,
  voronoiCells,
  type BvhBox,
} from './cadgeo';

/** PRNG xorshift32 local para fixtures deterministas. */
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

describe('cadgeo — Delaunay Bowyer-Watson', () => {
  it('cuadrado convexo -> exactamente 2 triángulos con los 4 índices', () => {
    const tris = delaunayTriangulate([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    expect(tris.length).toBe(2);
    const seen = new Set(tris.flat());
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('triangulación cubre todos los puntos (ningún índice huérfano)', () => {
    const rnd = prng(42);
    const pts = Array.from({ length: 30 }, () => [rnd() * 100, rnd() * 100] as [number, number]);
    const tris = delaunayTriangulate(pts);
    const used = new Set(tris.flat());
    for (let i = 0; i < pts.length; i++) expect(used.has(i)).toBe(true);
  });

  it('propiedad Delaunay: ningún punto dentro del circumcircle ajeno (seed fija)', () => {
    const rnd = prng(7);
    const pts = Array.from({ length: 20 }, () => [rnd() * 10 - 5, rnd() * 10 - 5] as [number, number]);
    const tris = delaunayTriangulate(pts);
    expect(tris.length).toBeGreaterThan(10);
    for (const [a, b, c] of tris) {
      const ax = pts[a][0], ay = pts[a][1];
      const bx = pts[b][0], by = pts[b][1];
      const cx = pts[c][0], cy = pts[c][1];
      const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
      const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
      const r2 = (ax - ux) ** 2 + (ay - uy) ** 2;
      for (let p = 0; p < pts.length; p++) {
        if (p === a || p === b || p === c) continue;
        const dp = (pts[p][0] - ux) ** 2 + (pts[p][1] - uy) ** 2;
        expect(dp).toBeGreaterThanOrEqual(r2 - 1e-6);
      }
    }
  });

  it('puntos duplicados se deduplican sin cambiar el resultado', () => {
    const base: Array<[number, number]> = [
      [0, 0],
      [2, 0],
      [1, 2],
    ];
    const withDupes = [...base, base[1]];
    expect(delaunayTriangulate(withDupes)).toEqual(delaunayTriangulate(base));
  });

  it('configuración colineal rechazada con CadError claro', () => {
    expect(() =>
      delaunayTriangulate([
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
      ]),
    ).toThrow(CadError);
  });

  it('n<3 y no finito rechazados', () => {
    expect(() => delaunayTriangulate([[0, 0]])).toThrow(CadError);
    expect(() => delaunayTriangulate([[0, 0], [NaN, 1], [2, 2]])).toThrow(CadError);
  });
});

describe('cadgeo — Voronoi por semiplanos', () => {
  it('cada celda contiene su sitio', () => {
    const pts: Array<[number, number]> = [
      [0, 0],
      [4, 0],
      [2, 3],
      [-3, 2],
    ];
    for (const cell of voronoiCells(pts)) {
      const s = pts[cell.site];
      expect(cell.polygon.length).toBeGreaterThanOrEqual(3);
      // punto en polígono convexo CCW: cross >= 0 contra cada arista
      for (let i = 0; i < cell.polygon.length; i++) {
        const a = cell.polygon[i];
        const b = cell.polygon[(i + 1) % cell.polygon.length];
        expect((b[0] - a[0]) * (s[1] - a[1]) - (b[1] - a[1]) * (s[0] - a[0])).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it('las celdas particionan el bbox (suma de áreas == área bbox)', () => {
    const pts: Array<[number, number]> = [
      [1, 1],
      [5, 2],
      [2, 5],
      [7, 7],
      [8, 1],
    ];
    const bounds = { minX: 0, minY: 0, maxX: 9, maxY: 8 };
    const cells = voronoiCells(pts, bounds);
    let area = 0;
    for (const cell of cells) {
      let a = 0;
      for (let i = 0; i < cell.polygon.length; i++) {
        const p = cell.polygon[i];
        const q = cell.polygon[(i + 1) % cell.polygon.length];
        a += p[0] * q[1] - q[0] * p[1];
      }
      area += Math.abs(a) / 2;
    }
    expect(area).toBeCloseTo(9 * 8, 6);
  });

  it('entrada vacía -> sin celdas', () => {
    expect(voronoiCells([])).toEqual([]);
  });
});

describe('cadgeo — BVH median-split', () => {
  const mkBoxes = (): BvhBox[] => {
    const rnd = prng(99);
    return Array.from({ length: 500 }, (_, i) => {
      const x = rnd() * 100;
      const y = rnd() * 100;
      const w = 1 + rnd() * 4;
      const h = 1 + rnd() * 4;
      void i;
      return { minX: x, minY: y, maxX: x + w, maxY: y + h };
    });
  };

  it('aabbQuery == fuerza bruta (500 boxes seed fija)', () => {
    const boxes = mkBoxes();
    const root = bvhBuild(boxes);
    for (const q of [
      { minX: 10, minY: 10, maxX: 20, maxY: 20 },
      { minX: 50, minY: 50, maxX: 60, maxY: 60 },
      { minX: 90, minY: 0, maxX: 105, maxY: 15 },
    ]) {
      const brute = boxes.flatMap((b, i) => (b.minX <= q.maxX && b.maxX >= q.minX && b.minY <= q.maxY && b.maxY >= q.minY ? [i] : [])).sort((a, b) => a - b);
      expect(bvhAabbQuery(root, boxes, q)).toEqual(brute);
    }
  });

  it('rayQuery == fuerza bruta (incluye dirección negativa)', () => {
    const boxes = mkBoxes();
    const root = bvhBuild(boxes);
    for (const [ox, oy, dx, dy] of [
      [-5, 50, 1, 0],
      [105, 105, -0.7, -0.7],
      [50, -5, 0, 1],
    ] as Array<[number, number, number, number]>) {
      const hitBrute = new Set(
        boxes.flatMap((b, i) => {
          // slab test de fuerza bruta
          let tmin = -Infinity;
          let tmax = Infinity;
          let ok = true;
          for (const [o, d, lo, hi] of [[ox, dx, b.minX, b.maxX], [oy, dy, b.minY, b.maxY]] as Array<[number, number, number, number]>) {
            if (Math.abs(d) < 1e-12) {
              if (o < lo || o > hi) ok = false;
            } else {
              let t1 = (lo - o) / d;
              let t2 = (hi - o) / d;
              if (t1 > t2) [t1, t2] = [t2, t1];
              tmin = Math.max(tmin, t1);
              tmax = Math.min(tmax, t2);
              if (tmin > tmax) ok = false;
            }
          }
          return ok && tmax >= Math.max(tmin, 0) ? [i] : [];
        }),
      );
      const got = bvhRayQuery(root, boxes, ox, oy, dx, dy);
      expect(got.every((i) => hitBrute.has(i))).toBe(true);
      expect(got.length).toBe(hitBrute.size);
    }
  });
});

describe('cadgeo — Quadtree', () => {
  it('query circular == fuerza bruta', () => {
    const rnd = prng(1234);
    const qt = quadtreeCreate(0, 0, 128, 4, 12);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 200; i++) {
      const x = rnd() * 127.9;
      const y = rnd() * 127.9;
      pts.push([x, y]);
      qt.insert(x, y, i);
    }
    expect(qt.count()).toBe(200);
    for (const [cx, cy] of [[64, 64], [20, 100], [110, 10]] as Array<[number, number]>) {
      const r = 25;
      const got = qt.query(cx, cy, r);
      const brute = pts.flatMap((p, i) => ((p[0] - cx) ** 2 + (p[1] - cy) ** 2 <= r * r ? [i] : [])).sort((a, b) => a - b);
      expect(got).toEqual(brute);
    }
  });

  it('respeta maxDepth y rechaza puntos fuera de bounds', () => {
    const qt = quadtreeCreate(0, 0, 100, 1, 6);
    for (let i = 0; i < 40; i++) qt.insert(i * 2.5 % 100, i * 3.1 % 100, i);
    expect(qt.maxDepthUsed()).toBeLessThanOrEqual(6);
    expect(() => qt.insert(-1, 50, 99)).toThrow(CadError);
  });
});

describe('cadgeo — B-spline de Boor', () => {
  const ctrl: Array<[number, number]> = [
    [0, 0],
    [1, 2],
    [3, 2],
    [4, 0],
  ];

  it('pasa exactamente por los extremos (nudos clampeados)', () => {
    const p0 = bsplineEval(ctrl, 3, 0);
    const p1 = bsplineEval(ctrl, 3, 1);
    expect(p0[0]).toBeCloseTo(0, 12);
    expect(p0[1]).toBeCloseTo(0, 12);
    expect(p1[0]).toBeCloseTo(4, 9);
    expect(p1[1]).toBeCloseTo(0, 9);
  });

  it('grado 1 = interpolación lineal por segmentos', () => {
    const mid = bsplineEval(ctrl, 1, 0.5 / 3 + 0 / 3); // t=1/6 cae en medio del primer segmento
    expect(mid[0]).toBeCloseTo(0.5, 9);
    expect(mid[1]).toBeCloseTo(1, 9);
  });

  it('determinista byte-exact y weights cambian la curva', () => {
    const a = bsplineEval(ctrl, 2, 0.37);
    const b = bsplineEval(ctrl, 2, 0.37);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const weighted = bsplineEval(ctrl, 2, 0.37, [1, 4, 1, 1]);
    expect(weighted).not.toEqual(a);
    expect(Number.isFinite(weighted[0]) && Number.isFinite(weighted[1])).toBe(true);
  });

  it('guardas: grado>5, pocos puntos, t fuera de rango', () => {
    expect(() => bsplineEval(ctrl, 6, 0.5)).toThrow(CadError);
    expect(() => bsplineEval([[0, 0]], 3, 0.5)).toThrow(CadError);
    expect(() => bsplineEval(ctrl, 2, 1.2)).toThrow(CadError);
  });
});

describe('cadgeo — CAD-lite extrude/revolve sobre GeoMesh', () => {
  const square: Array<[number, number]> = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
  ];

  it('extrude: conteo estructural correcto (paredes + tapas)', () => {
    const mesh = extrudeMesh(square, 5);
    expect(mesh.vertices.length).toBe(4 * 2 + 2);
    expect(mesh.faces.length).toBe(4 * 2 + 4 * 2);
    const validation = validateGeoMesh(mesh as GeoMesh);
    expect(validation.ok).toBe(true);
  });

  it('extrude: volumen firmado ≈ area*height (discretización del sólido)', () => {
    const mesh = extrudeMesh(square, 5);
    let vol = 0;
    for (const [a, b, c] of mesh.faces) {
      const va = mesh.vertices[a];
      const vb = mesh.vertices[b];
      const vc = mesh.vertices[c];
      vol += (va[0] * (vb[1] * vc[2] - vb[2] * vc[1]) - vb[0] * (va[1] * vc[2] - va[2] * vc[1]) + vc[0] * (va[1] * vb[2] - va[2] * vb[1])) / 6;
    }
    expect(Math.abs(vol)).toBeCloseTo(2 * 2 * 5, 9);
  });

  it('revolve: caras esperadas para perfil simple y valida estructuralmente', () => {
    const half: Array<[number, number]> = [
      [1, 0],
      [2, 1],
      [1, 2],
    ];
    const mesh = revolveMesh(half, 12);
    expect(mesh.faces.length).toBe((half.length - 1) * 12 * 2);
    expect(validateGeoMesh(mesh as GeoMesh).ok).toBe(true);
  });

  it('revolve con polo (radio 0) genera abanico sin caras degeneradas', () => {
    const coneProfile: Array<[number, number]> = [
      [0, 0],
      [2, 2],
      [0, 4],
    ];
    const mesh = revolveMesh(coneProfile, 16);
    // primer anillo radio 0 -> solo triángulos; segundo anillo a polo -> triángulos
    expect(mesh.faces.length).toBe(16 + 16);
    for (const f of mesh.faces) expect(new Set(f).size).toBe(3);
  });

  it('interop estándar: OBJ y glTF 2.0 generables desde las mallas de cadgeo', () => {
    const mesh = extrudeMesh(square, 3) as GeoMesh;
    const obj = meshToObjText(mesh, 'cad_box');
    expect(obj).toContain('v ');
    expect(obj).toContain('f ');
    const gltf = JSON.parse(meshToGltf(mesh, 'cad_box')) as { asset: { version: string }; meshes: unknown[] };
    expect(gltf.asset.version).toBe('2.0');
    expect(gltf.meshes.length).toBe(1);
  });

  it('guardas de dominio', () => {
    expect(() => extrudeMesh([[0, 0]], 1)).toThrow(CadError);
    expect(() => extrudeMesh(square, -1)).toThrow(CadError);
    expect(() => revolveMesh([[1, 0]], 8)).toThrow(CadError);
    expect(() => revolveMesh(square.map((p) => [p[0], p[1]] as [number, number]), 2)).toThrow(CadError);
  });
});
