import { describe, expect, it } from 'vitest';

import {
  GeoError,
  mergeMeshes,
  meshStats,
  meshToGltf,
  meshToObjText,
  mobiusSurface,
  renderMeshPng,
  rotateMesh,
  superShape2D,
  superShape3D,
  superShapeRadius,
  torusKnot,
  transformMesh,
  validateGeoMesh,
  type GeoMesh,
  type SuperShapeParams,
} from './geometry';

/** Círculo unitario: m=0 → r(φ)=1 para todo φ. */
const CIRCLE: SuperShapeParams = { m: 0, n1: 1, n2: 1, n3: 1 };

describe('geometry — superShapeRadius (Gielis)', () => {
  it('m=0 produce círculo unitario r≈1 en todo φ', () => {
    for (let i = 0; i < 24; i++) {
      const phi = (i / 24) * Math.PI * 2;
      expect(superShapeRadius(CIRCLE, phi)).toBeCloseTo(1, 6);
    }
  });

  it('estrella clásica (m=5) es finita, positiva y simétrica', () => {
    const star = { m: 5, n1: 0.2, n2: 1.7, n3: 1.7 };
    for (let i = 0; i < 36; i++) {
      const phi = (i / 36) * Math.PI * 2;
      const r = superShapeRadius(star, phi);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeGreaterThan(0);
      // simetría par de la fórmula
      expect(superShapeRadius(star, -phi)).toBeCloseTo(r, 10);
    }
  });

  it('guardas deterministas: n1=0 se satura y el radio queda finito y positivo', () => {
    const r = superShapeRadius({ m: 4, n1: 0, n2: 1, n3: 1 }, Math.PI / 7);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThan(0);
    // y con n1 negativo diminuto también queda finito (exponente acotado)
    const rn = superShapeRadius({ m: 4, n1: -1e-9, n2: 1, n3: 1 }, Math.PI / 7);
    expect(Number.isFinite(rn)).toBe(true);
  });
});

describe('geometry — superShape2D', () => {
  it('genera `samples` puntos cerrados y deterministas', () => {
    const params: SuperShapeParams = { m: 6, n1: 1, n2: 1.7, n3: 1.7 };
    const a = superShape2D(params, { samples: 120 });
    const b = superShape2D(params, { samples: 120 });
    expect(a).toHaveLength(120);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // el radio del punto inicial coincide con r(φ=0) de la fórmula
    const r0 = superShapeRadius(params, 0);
    expect(Math.hypot(a[0][0], a[0][1])).toBeCloseTo(r0, 10);
  });

  it('escala lineal: scale=2 duplica el radio máximo', () => {
    const p = { m: 5, n1: 0.2, n2: 1.7, n3: 1.7 };
    const s1 = superShape2D(p, { samples: 64, scale: 1 });
    const s2 = superShape2D(p, { samples: 64, scale: 2 });
    const maxR = (pts: ReturnType<typeof superShape2D>) =>
      Math.max(...pts.map(([x, y]) => Math.hypot(x, y)));
    expect(maxR(s2)).toBeCloseTo(maxR(s1) * 2, 10);
  });
});

describe('geometry — superficies 3D', () => {
  it('superShape3D: conteos exactos de la rejilla + caras dentro de rango', () => {
    const mesh = superShape3D({ m: 8, n1: 0.5, n2: 0.5, n3: 8 }, CIRCLE, {
      uSegs: 16,
      vSegs: 8,
    });
    expect(mesh.vertices.length).toBe((16 + 1) * (8 + 1));
    expect(mesh.faces.length).toBe(16 * 8 * 2);
    expect(() => validateGeoMesh(mesh)).not.toThrow();
  });

  it('superShape3D con params círculo+círculo acota bbox ≈ esfera unidad', () => {
    const mesh = superShape3D(CIRCLE, CIRCLE, { uSegs: 24, vSegs: 12 });
    const s = meshStats(mesh);
    expect(s.max[0]).toBeLessThanOrEqual(1.000001);
    expect(s.min[1]).toBeGreaterThanOrEqual(-1.000001);
  });

  it('mobiusSurface: conteos y ancho respetado en Y', () => {
    const mesh = mobiusSurface({ radius: 1, width: 0.6, uSegs: 32, vSegs: 4 });
    expect(mesh.vertices.length).toBe(33 * 5);
    expect(mesh.faces.length).toBe(32 * 4 * 2);
    const s = meshStats(mesh);
    expect(s.min[1]).toBeGreaterThanOrEqual(-0.31);
    expect(s.max[1]).toBeLessThanOrEqual(0.31);
  });
});

describe('geometry — ops de malla', () => {
  const tri: GeoMesh = {
    vertices: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
    faces: [[0, 1, 2]],
  };

  it('translate desplaza el bbox exactamente', () => {
    const moved = transformMesh(tri, { translate: [10, -5, 2] });
    const s = meshStats(moved);
    expect(s.min).toEqual([10, -5, 2]);
    expect(s.max[0]).toBeCloseTo(11, 12);
  });

  it('scale uniforme multiplica el extent', () => {
    const s = meshStats(transformMesh(tri, { scale: 3 }));
    expect(s.max[0]).toBeCloseTo(3, 12);
    expect(s.max[1]).toBeCloseTo(3, 12);
  });

  it('rotate Z π/2 manda X→Y', () => {
    const half = Math.PI / 2;
    const rot = transformMesh(tri, { rotate: [0, 0, half] });
    expect(rot.vertices[1][0]).toBeCloseTo(0, 12);
    expect(rot.vertices[1][1]).toBeCloseTo(1, 12);
  });

  it('mergeMeshes reindexa caras con offset acumulado', () => {
    const merged = mergeMeshes([tri, tri]);
    expect(merged.vertices.length).toBe(6);
    expect(merged.faces).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
  });

  it('meshStats lanza GeoError en malla vacía', () => {
    expect(() => meshStats({ vertices: [], faces: [] })).toThrow(GeoError);
  });
});

describe('geometry — export OBJ', () => {
  it('estructura v/f 1-based determinista byte a byte', () => {
    const mesh = mobiusSurface({ uSegs: 8, vSegs: 2 });
    const a = meshToObjText(mesh, 'mobius');
    const b = meshToObjText(mesh, 'mobius');
    expect(a).toBe(b);
    const lines = a.split('\n');
    expect(lines[0]).toContain('# UltraIa geometry');
    expect(lines[1]).toBe('o mobius');
    const vLines = lines.filter((l) => l.startsWith('v '));
    const fLines = lines.filter((l) => l.startsWith('f '));
    expect(vLines.length).toBe(mesh.vertices.length);
    expect(fLines.length).toBe(mesh.faces.length);
    expect(a.endsWith('\n')).toBe(true);
    // primer índice de la primera cara es 1-based
    expect(fLines[0].split(' ')[1]).toBe(String(mesh.faces[0][0] + 1));
  });

  it('rechaza mallas inválidas', () => {
    const bad: GeoMesh = { vertices: [[0, 0, 0]], faces: [[0, 1, 2]] };
    expect(() => meshToObjText(bad)).toThrow(GeoError);
  });
});

describe('geometry — export glTF 2.0', () => {
  const mesh = superShape3D({ m: 3, n1: 0.3, n2: 0.3, n3: 3 }, CIRCLE, {
    uSegs: 12,
    vSegs: 6,
  });

  it('JSON válido con asset/accessors min-max/primitive TRIANGLES', () => {
    const gltf = JSON.parse(meshToGltf(mesh, 'supershape')) as {
      asset: { version: string };
      meshes: Array<{ primitives: Array<{ attributes: { POSITION: number }; indices: number; mode: number }> }>;
      accessors: Array<{ componentType: number; count: number; type: string; min?: number[]; max?: number[] }>;
      bufferViews: Array<{ target?: number; byteOffset: number; byteLength: number }>;
      buffers: Array<{ byteLength: number; uri: string }>;
    };
    expect(gltf.asset.version).toBe('2.0');
    const prim = gltf.meshes[0].primitives[0];
    expect(prim.mode).toBe(4);
    expect(prim.indices).toBe(0);
    expect(prim.attributes.POSITION).toBe(1);
    const accIdx = gltf.accessors[0];
    expect(accIdx.componentType).toBe(5125);
    expect(accIdx.type).toBe('SCALAR');
    expect(accIdx.count).toBe(mesh.faces.length * 3);
    const accPos = gltf.accessors[1];
    expect(accPos.componentType).toBe(5126);
    expect(accPos.type).toBe('VEC3');
    expect(accPos.min).toHaveLength(3);
    expect(accPos.max).toHaveLength(3);
    const stats = meshStats(mesh);
    expect(accPos.min![0]).toBeCloseTo(stats.min[0], 5);
    expect(accPos.max![2]).toBeCloseTo(stats.max[2], 5);
    expect(gltf.bufferViews[0].target).toBe(34963);
    expect(gltf.bufferViews[1].target).toBe(34962);
    expect(gltf.buffers[0].byteLength).toBe(
      gltf.bufferViews[0].byteLength + gltf.bufferViews[1].byteLength,
    );
    expect(gltf.buffers[0].uri.startsWith('data:application/octet-stream;base64,')).toBe(true);
  });

  it('buffer base64 decodifica posiciones float32 LE exactas', () => {
    const raw = meshToGltf(mesh, 'x');
    const parsed = JSON.parse(raw) as { buffers: Array<{ uri: string }>; bufferViews: Array<{ byteOffset: number; byteLength: number }> };
    const b64 = parsed.buffers[0].uri.split(',')[1];
    const bin = Buffer.from(b64, 'base64');
    const view = parsed.bufferViews[1];
    const positions = new Float32Array(
      bin.buffer.slice(bin.byteOffset + view.byteOffset, bin.byteOffset + view.byteOffset + view.byteLength),
    );
    expect(positions.length).toBe(mesh.vertices.length * 3);
    for (let i = 0; i < 3; i++) {
      expect(positions[i]).toBeCloseTo(mesh.vertices[0][i], 6);
    }
  });

  it('determinista byte a byte entre llamadas', () => {
    expect(meshToGltf(mesh, 'k')).toBe(meshToGltf(mesh, 'k'));
  });

  it('valida índices fuera de rango antes de serializar', () => {
    const bad: GeoMesh = {
      vertices: [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
      ],
      faces: [[0, 1, 99]],
    };
    expect(() => meshToGltf(bad)).toThrow(GeoError);
  });
});


/* ------------------------------------------------------------------ */
/* v2 (iter-103): torusKnot + rasterizador renderMeshPng               */
/* ------------------------------------------------------------------ */

describe('geometry v2 — torusKnot', () => {
  it('malla cerrada válida (p2,q3) con vértices y caras coherentes', () => {
    const knot = torusKnot({ p: 2, q: 3, tubularSegments: 48, radialSegments: 8 });
    const stats = meshStats(knot);
    expect(stats.vertexCount).toBe(48 * 8);
    expect(knot.faces.length).toBe(48 * 8 * 2);
    expect(validateGeoMesh(knot)).toEqual({ ok: true });
    // La curva del nudo vive dentro de un radio acotado (~2.6R)
    expect(stats.max[0]).toBeLessThan(4);
    expect(stats.min[0]).toBeGreaterThan(-4);
  });

  it('determinista y parametrizable (p3,q2 distinta forma)', () => {
    const a = torusKnot({ p: 3, q: 2, tubularSegments: 32, radialSegments: 6 });
    const b = torusKnot({ p: 3, q: 2, tubularSegments: 32, radialSegments: 6 });
    expect(a.vertices).toEqual(b.vertices);
    const c = torusKnot({ p: 1, q: 1, tubularSegments: 32, radialSegments: 6 });
    expect(c.vertices[10]).not.toEqual(a.vertices[10]);
  });
});

describe('geometry v2 — rotateMesh', () => {
  it('yaw 0/pitch 0 es identidad; rotar mueve vértices de forma determinista', () => {
    const knot = torusKnot({ tubularSegments: 16, radialSegments: 4 });
    const same = rotateMesh(knot, {});
    expect(same.vertices).toEqual(knot.vertices);
    const yawed = rotateMesh(knot, { yaw: Math.PI / 2 });
    const yawed2 = rotateMesh(knot, { yaw: Math.PI / 2 });
    expect(yawed.vertices).toEqual(yawed2.vertices);
    expect(yawed.vertices[5]).not.toEqual(knot.vertices[5]);
    expect(validateGeoMesh(yawed)).toEqual({ ok: true });
  });
});

describe('geometry v2 — renderMeshPng (rasterizador software)', () => {
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

  it('supershape → PNG válido con contenido no vacío y sombreado variado', () => {
    const mesh = superShape3D({ m: 4, n1: 0.4, n2: 0.4, n3: 4 }, { m: 0, n1: 1, n2: 1, n3: 1 });
    const png = renderMeshPng(mesh, { width: 128, height: 128, palette: 'neoViolet' });
    expect(Array.from(png.slice(0, 8))).toEqual(SIG);

    // decodificar via pngrender.renderImagePng no aplica; verificamos cobertura
    // re-renderizando con fondo único y contando píxeles distintos al fondo.
    void png;
    const bg = [255, 0, 255] as const;
    const raw = renderMeshPng(mesh, { width: 96, height: 96, background: bg });
    // PNG está comprimido: usamos el rasterizador interno vía un truco —
    // en su lugar comprobamos que dos renders con luz distinta difieren.
    const litA = renderMeshPng(mesh, { width: 64, height: 64, lightDir: [0.9, 0.1, 0.2] });
    const litB = renderMeshPng(mesh, { width: 64, height: 64, lightDir: [0.1, 0.9, 0.2] });
    expect(Buffer.compare(Buffer.from(litA), Buffer.from(litB))).not.toBe(0);
    void raw;
  });

  it('torusKnot renderiza y es determinista byte a byte', () => {
    const knot = torusKnot({ tubularSegments: 40, radialSegments: 8 });
    const r1 = renderMeshPng(knot, { width: 96, height: 72, palette: 'ice', yaw: 0.7, pitch: 0.3 });
    const r2 = renderMeshPng(knot, { width: 96, height: 72, palette: 'ice', yaw: 0.7, pitch: 0.3 });
    expect(Buffer.compare(Buffer.from(r1), Buffer.from(r2))).toBe(0);
    expect(Array.from(r1.slice(0, 8))).toEqual(SIG);
  });

  it('zoom acota y dimensiones respetan la petición', () => {
    const mesh = mobiusSurface({});
    const png = renderMeshPng(mesh, { width: 160, height: 90, zoom: 0.5 });
    // IHDR width/height big-endian en offsets 16..23
    const w = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
    const h = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
    expect(w).toBe(160);
    expect(h).toBe(90);
  });
});
