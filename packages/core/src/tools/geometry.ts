// -----------------------------------------------------------------------------
// geometry.ts - capability `geometry`
// -----------------------------------------------------------------------------
// Librería procedural de geometría avanzada (pedido usuario 23/08/2026: "librerías
// para crear objetos, imágenes y videos a partir de programación basada en
// matemáticas, geometría, lógica"). Complementa el eje geométrico del repo:
//
//   - `sdf.ts`      → superficies IMPLÍCITAS (ray marching).
//   - `geom.ts`     → álgebra + formas básicas + OBJ/STL/SVG (WIP de otra sesión,
//                     NO se importa desde aquí para no acoplar APIs en evolución;
//                     símbolos de este módulo con nombre único Geo* para que la
//                     futura comisión de geom no colisione vía `export *`).
//   - `geometry.ts` → ESTE módulo: familia SUPERFORMULA de Gielis (superShape 2D y
//                     3D — generaliza círculos/elipses/estrellas/flores/conchas),
//                     banda de Möbius, OPS de malla (transform/merge/stats) y
//                     export glTF 2.0 estándar (buffer embebido base64) + OBJ.
//
// Diseño (dominio puro determinista keyless, CERO deps):
// - Todo se deriva de fórmulas cerradas; misma entrada → mismos bytes/texto.
// - `meshToGltf` emite glTF 2.0 válido: accessors POSITION con min/max
//   OBLIGATORIOS por spec, índices uint32 (componentType 5125), targets
//   34962/34963, buffer data-uri base64 little-endian.
// - Validación estructural antes de exportar (`validateGeoMesh`): índices en
//   rango, números finitos, al menos 1 cara.
// -----------------------------------------------------------------------------
// NOTA colisiones: NO exporta Vec2/Vec3/Mesh/Triangle/catmullRom (ya viven en
// mediafield/sdf/motion/generative y el WIP geom). Tipos propios prefijados Geo.

// v2 (iter-103): el rasterizador renderMeshPng usa el encoder PNG puro de
// pngrender (ambos módulos sin deps npm ni node:* en la ruta de cómputo).
import { PALETTES, encodePng } from './pngrender';

/** Punto 2D [x, y]. Nombre único (no `Vec2`) para evitar TS2308 con otros módulos. */
export type GeoPoint2 = readonly [number, number];

/** Malla explícita: vértices [x,y,z] + caras triangulares 0-based [a,b,c]. */
export interface GeoMesh {
  vertices: number[][];
  faces: Array<[number, number, number]>;
}

/** Parámetros de la superfórmula de Gielis. */
export interface SuperShapeParams {
  /** Simetría rotational (número de "puntas"/lóbulos base). */
  m: number;
  /** Exponentes de forma. n1 controla "pinch", n2/n3 asimetría cóncava/convexa. */
  n1: number;
  n2: number;
  n3: number;
}

/** Error de dominio geometry (validación / parámetros inválidos). */
export class GeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoError';
  }
}

/* ------------------------------------------------------------------ */
/* Superfórmula de Gielis                                              */
/* ------------------------------------------------------------------ */

/**
 * r(φ) de la superfórmula: r = ( |cos(mφ/4)|^n2 + |sin(mφ/4)|^n3 )^(-1/n1).
 * Con m=0 da círculo unitario; con m entero ≥3 produce estrellas/flores.
 * Guardas deterministas: suma 0 → r=0; |n1|<0.01 se satura a ±0.01 para que el
 * exponente quede acotado (±100) y el resultado siempre finito y representable.
 */
export function superShapeRadius(p: SuperShapeParams, phi: number): number {
  const t = (p.m * phi) / 4;
  const a = Math.pow(Math.abs(Math.cos(t)), Math.abs(p.n2));
  const b = Math.pow(Math.abs(Math.sin(t)), Math.abs(p.n3));
  const sum = a + b;
  if (sum === 0) return 0;
  const an = Math.abs(p.n1);
  const n1 = an < 0.01 ? (p.n1 < 0 ? -0.01 : 0.01) : p.n1;
  return Math.pow(sum, -1 / n1);
}

/**
 * Muestrea una superShape 2D cerrada: `samples` puntos [x,y] escalados.
 * Determinista; la curva se cierra implícitamente al dibujar/exportar.
 */
export function superShape2D(
  p: SuperShapeParams,
  opts: { samples?: number; scale?: number; rotation?: number } = {},
): GeoPoint2[] {
  const samples = Math.max(8, Math.min(4096, Math.floor(opts.samples ?? 240)));
  const scale = opts.scale ?? 1;
  const rot = opts.rotation ?? 0;
  const out: GeoPoint2[] = [];
  for (let i = 0; i < samples; i++) {
    const phi = rot + (i / samples) * Math.PI * 2;
    const r = superShapeRadius(p, phi);
    out.push([Math.cos(phi) * r * scale, Math.sin(phi) * r * scale]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Superficies paramétricas (Gielis 3D, Möbius)                        */
/* ------------------------------------------------------------------ */

/** Constructor interno de malla por rejilla uv con quads → 2 triángulos. */
function buildGrid(
  fn: (u: number, v: number) => [number, number, number],
  uSegs: number,
  vSegs: number,
): GeoMesh {
  const vertices: number[][] = [];
  for (let i = 0; i <= uSegs; i++) {
    const u = i / uSegs;
    for (let j = 0; j <= vSegs; j++) {
      const v = j / vSegs;
      vertices.push(fn(u, v));
    }
  }
  const faces: Array<[number, number, number]> = [];
  const stride = vSegs + 1;
  for (let i = 0; i < uSegs; i++) {
    for (let j = 0; j < vSegs; j++) {
      const a = i * stride + j;
      const b = a + stride;
      faces.push([a, b, a + 1]);
      faces.push([b, b + 1, a + 1]);
    }
  }
  return { vertices, faces };
}

/**
 * SuperShape 3D clásica (dos superfórmulas: longitudinal r1(φ) y latitudinal
 * r2(θ)) → malla triangulada. φ∈[-π,π], θ∈[-π/2,π/2].
 */
export function superShape3D(
  pLon: SuperShapeParams,
  pLat: SuperShapeParams,
  opts: { uSegs?: number; vSegs?: number; scale?: number } = {},
): GeoMesh {
  const uSegs = Math.max(4, Math.min(256, Math.floor(opts.uSegs ?? 48)));
  const vSegs = Math.max(4, Math.min(128, Math.floor(opts.vSegs ?? 24)));
  const s = opts.scale ?? 1;
  return buildGrid(
    (u, v) => {
      const phi = u * Math.PI * 2 - Math.PI;
      const theta = v * Math.PI - Math.PI / 2;
      const r1 = superShapeRadius(pLon, phi);
      const r2 = superShapeRadius(pLat, theta);
      const ct = Math.cos(theta);
      return [
        r1 * Math.cos(phi) * r2 * ct * s,
        r2 * Math.sin(theta) * s,
        r1 * Math.sin(phi) * r2 * ct * s,
      ];
    },
    uSegs,
    vSegs,
  );
}

/**
 * Banda de Möbius: superficie no orientable con media vuelta.
 * x=(R+v·cos(u/2))·cos(u), z=(R+v·cos(u/2))·sin(u), y=v·sin(u/2).
 */
export function mobiusSurface(
  opts: { radius?: number; width?: number; uSegs?: number; vSegs?: number } = {},
): GeoMesh {
  const R = opts.radius ?? 1;
  const w = opts.width ?? 0.6;
  const uSegs = Math.max(8, Math.min(512, Math.floor(opts.uSegs ?? 64)));
  const vSegs = Math.max(2, Math.min(64, Math.floor(opts.vSegs ?? 8)));
  return buildGrid(
    (u, v) => {
      const ang = u * Math.PI * 2;
      const half = (v - 0.5) * w;
      const c = R + half * Math.cos(ang / 2);
      return [c * Math.cos(ang), half * Math.sin(ang / 2), c * Math.sin(ang)];
    },
    uSegs,
    vSegs,
  );
}

/* ------------------------------------------------------------------ */
/* Ops de malla                                                        */
/* ------------------------------------------------------------------ */

function rotateXYZ(
  [x, y, z]: number[],
  rx: number,
  ry: number,
  rz: number,
): number[] {
  // X luego Y luego Z (orden fijo documentado).
  const y1 = y * Math.cos(rx) - z * Math.sin(rx);
  const z1 = y * Math.sin(rx) + z * Math.cos(rx);
  const x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
  const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
  const x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
  const y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);
  return [x3, y3, z2];
}

/** Transforma una malla (traslación + rotación XYZ en radianes + escala uniforme o por eje). */
export function transformMesh(
  mesh: GeoMesh,
  opts: {
    translate?: [number, number, number];
    rotate?: [number, number, number];
    scale?: number | [number, number, number];
  } = {},
): GeoMesh {
  const [tx, ty, tz] = opts.translate ?? [0, 0, 0];
  const [rx, ry, rz] = opts.rotate ?? [0, 0, 0];
  const sc =
    typeof opts.scale === 'number'
      ? ([opts.scale, opts.scale, opts.scale] as [number, number, number])
      : (opts.scale ?? [1, 1, 1]);
  const needRotate = rx !== 0 || ry !== 0 || rz !== 0;
  const vertices = mesh.vertices.map(([x, y, z]) => {
    let px = x * sc[0];
    let py = y * sc[1];
    let pz = z * sc[2];
    if (needRotate) [px, py, pz] = rotateXYZ([px, py, pz], rx, ry, rz);
    return [px + tx, py + ty, pz + tz];
  });
  return { vertices, faces: mesh.faces.map((f) => [...f] as [number, number, number]) };
}

/** Fusiona mallas reindexando caras (offset acumulado). */
export function mergeMeshes(meshes: GeoMesh[]): GeoMesh {
  const vertices: number[][] = [];
  const faces: Array<[number, number, number]> = [];
  for (const m of meshes) {
    const offset = vertices.length;
    vertices.push(...m.vertices);
    for (const [a, b, c] of m.faces) faces.push([a + offset, b + offset, c + offset]);
  }
  return { vertices, faces };
}

/** Estadísticas estructurales: conteos + bounding box exacto. */
export function meshStats(mesh: GeoMesh): {
  vertexCount: number;
  faceCount: number;
  min: [number, number, number];
  max: [number, number, number];
} {
  if (mesh.vertices.length === 0) throw new GeoError('meshStats: malla sin vértices');
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const [x, y, z] of mesh.vertices) {
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
  }
  return { vertexCount: mesh.vertices.length, faceCount: mesh.faces.length, min, max };
}

/** Validación estructural (índices en rango, números finitos, ≥1 cara). */
export function validateGeoMesh(mesh: GeoMesh): { ok: true } {
  if (!Array.isArray(mesh.vertices) || mesh.vertices.length === 0)
    throw new GeoError('GeoMesh sin vértices');
  if (!Array.isArray(mesh.faces) || mesh.faces.length === 0)
    throw new GeoError('GeoMesh sin caras');
  for (let i = 0; i < mesh.vertices.length; i++) {
    const v = mesh.vertices[i];
    if (
      !Array.isArray(v) ||
      v.length !== 3 ||
      !Number.isFinite(v[0]) ||
      !Number.isFinite(v[1]) ||
      !Number.isFinite(v[2])
    )
      throw new GeoError(`vértice ${i} no es [x,y,z] finito`);
  }
  const n = mesh.vertices.length;
  for (let i = 0; i < mesh.faces.length; i++) {
    const f = mesh.faces[i];
    if (f.length !== 3 || f.some((idx) => !Number.isInteger(idx) || idx < 0 || idx >= n))
      throw new GeoError(`cara ${i} tiene índices fuera de rango`);
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Export: OBJ                                                         */
/* ------------------------------------------------------------------ */

const f6 = (n: number): string => n.toFixed(6);

/** OBJ texto (v/f 1-based) determinista. Complementa meshToOBJ del WIP geom. */
export function meshToObjText(mesh: GeoMesh, name = 'ultraia_geometry'): string {
  validateGeoMesh(mesh);
  const lines: string[] = [
    '# UltraIa geometry — procedural mesh (deterministic)',
    `o ${name}`,
  ];
  for (const [x, y, z] of mesh.vertices) lines.push(`v ${f6(x)} ${f6(y)} ${f6(z)}`);
  for (const [a, b, c] of mesh.faces) lines.push(`f ${a + 1} ${b + 1} ${c + 1}`);
  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/* Export: glTF 2.0                                                    */
/* ------------------------------------------------------------------ */

/**
 * Serializa la malla como glTF 2.0 (JSON string) con un solo buffer embebido
 * data-uri base64: primero los índices uint32 LE (target 34963), luego las
 * posiciones float32 LE (target 34962). Accessor POSITION incluye min/max
 * (obligatorio por spec). Determinista byte a byte.
 */
export function meshToGltf(mesh: GeoMesh, name = 'ultraia_geometry'): string {
  validateGeoMesh(mesh);
  const stats = meshStats(mesh);

  const positions = new Float32Array(mesh.vertices.length * 3);
  mesh.vertices.forEach(([x, y, z], i) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  });
  const indices = new Uint32Array(mesh.faces.length * 3);
  mesh.faces.forEach(([a, b, c], i) => {
    indices[i * 3] = a;
    indices[i * 3 + 1] = b;
    indices[i * 3 + 2] = c;
  });

  const idxBytes = new Uint8Array(indices.buffer);
  const posBytes = new Uint8Array(positions.buffer);
  const total = idxBytes.byteLength + posBytes.byteLength;

  // Concatenación determinista sin Buffer.concat (mismo resultado, sin deps extra).
  const blob = new Uint8Array(total);
  blob.set(idxBytes, 0);
  blob.set(posBytes, idxBytes.byteLength);

  // base64 (Buffer es global node en core; alternativa pura si algún día se porta a browser).
  const toB64 =
    typeof Buffer !== 'undefined'
      ? (): string => Buffer.from(blob).toString('base64')
      : (): string => {
          let binary = '';
          const CHUNK = 0x8000;
          for (let i = 0; i < blob.length; i += CHUNK) {
            binary += String.fromCharCode(...blob.subarray(i, i + CHUNK));
          }
          return btoa(binary);
        };
  const b64 = toB64();

  const gltf = {
    asset: { version: '2.0', generator: 'UltraIa geometry (procedural)' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [
      {
        name,
        primitives: [{ attributes: { POSITION: 1 }, indices: 0, mode: 4 }],
      },
    ],
    buffers: [
      {
        byteLength: total,
        uri: `data:application/octet-stream;base64,${b64}`,
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: idxBytes.byteLength, target: 34963 },
      { buffer: 0, byteOffset: idxBytes.byteLength, byteLength: posBytes.byteLength, target: 34962 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5125, count: indices.length, type: 'SCALAR' },
      {
        bufferView: 1,
        componentType: 5126,
        count: mesh.vertices.length,
        type: 'VEC3',
        min: [stats.min[0], stats.min[1], stats.min[2]],
        max: [stats.max[0], stats.max[1], stats.max[2]],
      },
    ],
  };
  return JSON.stringify(gltf);
}

/* ------------------------------------------------------------------ */
/* Namespace                                                           */
/* ------------------------------------------------------------------ */

export const geometry = {
  superShapeRadius,
  superShape2D,
  superShape3D,
  mobiusSurface,
  torusKnot,
  transformMesh,
  mergeMeshes,
  meshStats,
  validateGeoMesh,
  meshToObjText,
  meshToGltf,
  rotateMesh,
  renderMeshPng,
};

/* ------------------------------------------------------------------ */
/* v2 (iter-103): nudo tórico + render 3D → PNG (rasterizador software) */
/* ------------------------------------------------------------------ */

export interface TorusKnotOptions {
  /** Número de vueltas alrededor del eje del toro (p) y dentro (q). */
  p?: number;
  q?: number;
  /** Segmentos a lo largo de la curva y alrededor del tubo (resolución). */
  tubularSegments?: number;
  radialSegments?: number;
  /** Radio base del toro y grosor del tubo. */
  radius?: number;
  tube?: number;
}

/**
 * Malla de un nudo tórico (p,q) — la clásica curva envuelta por un tubo.
 * Determinista; frames calculados con marco paralelo transportado
 * (tangente T, normal aproximada B×T) para orientar el círculo del tubo.
 */
export function torusKnot(opts: TorusKnotOptions = {}): GeoMesh {
  const p = Math.max(1, Math.round(opts.p ?? 2));
  const q = Math.max(1, Math.round(opts.q ?? 3));
  const segU = Math.max(16, Math.min(720, Math.round(opts.tubularSegments ?? 96)));
  const segV = Math.max(4, Math.min(64, Math.round(opts.radialSegments ?? 12)));
  const R = opts.radius ?? 1;
  const r = opts.tube ?? 0.32;

  // Curva del nudo sobre la superficie de un toro de radios (R, 0.5R).
  const curve = (u: number): [number, number, number] => {
    const cu = Math.cos(q * u);
    const factor = 0.5 * cu + 2;
    return [
      R * factor * Math.cos(p * u),
      R * factor * Math.sin(p * u),
      R * 0.5 * Math.sin(q * u),
    ];
  };

  const vertices: number[][] = [];
  for (let i = 0; i < segU; i++) {
    const u = (i / segU) * Math.PI * 2 * p; // p vueltas completas
    const P = curve(u);
    const P2 = curve(u + 0.01);
    // Tangente y normalitas del transporte paralelo aproximado.
    let tx = P2[0] - P[0];
    let ty = P2[1] - P[1];
    let tz = P2[2] - P[2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl; ty /= tl; tz /= tl;
    // N = T × up (up=z global), B = T × N → base estable suficiente aquí.
    let nx = ty * 1 - tz * 0;
    let ny = tz * 0 - tx * 1;
    let nz = tx * 0 - ty * 0;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    const bx = ty * nz - tz * ny;
    const by = tz * nx - tx * nz;
    const bz = tx * ny - ty * nx;

    for (let j = 0; j < segV; j++) {
      const v = (j / segV) * Math.PI * 2;
      const cv = Math.cos(v) * r;
      const sv = Math.sin(v) * r;
      vertices.push([
        P[0] + cv * nx + sv * bx,
        P[1] + cv * ny + sv * by,
        P[2] + cv * nz + sv * bz,
      ]);
    }
  }
  const faces: Array<[number, number, number]> = [];
  const at = (i: number, j: number): number => ((i % segU) * segV + (j % segV));
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      faces.push([at(i, j), at(i + 1, j), at(i + 1, j + 1)]);
      faces.push([at(i, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  }
  return { vertices, faces };
}

/** Rotación yaw (eje Y) + pitch (eje X) aplicada a los vértices. Nueva malla. */
export function rotateMesh(mesh: GeoMesh, opts: { yaw?: number; pitch?: number } = {}): GeoMesh {
  const cy = Math.cos(opts.yaw ?? 0);
  const sy = Math.sin(opts.yaw ?? 0);
  const cp = Math.cos(opts.pitch ?? 0);
  const sp = Math.sin(opts.pitch ?? 0);
  return {
    vertices: mesh.vertices.map(([x, y, z]) => {
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y1 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      return [x1, y1, z2];
    }),
    faces: mesh.faces,
  };
}

export interface MeshRenderOptions {
  width?: number;
  height?: number;
  yaw?: number;
  pitch?: number;
  /** Distancia de cámara (mayor = más ortográfico). */
  distance?: number;
  /** Dirección de luz normalizada auto si se omite. */
  lightDir?: readonly [number, number, number];
  /** Fondo RGB 0-255 (Dark Obsidian por defecto). */
  background?: readonly [number, number, number];
  /** Paleta pngrender para rampar la intensidad Lambert (si se omite, gris violeta). */
  palette?: string;
  /** Zoom: escala de proyección relativa al encuadre (default auto-fit). */
  zoom?: number;
}

/**
 * Renderiza una malla 3D a PNG con rasterizador software propio:
 * proyección perspectiva + backface culling + orden pintor (z medio) +
 * sombreado Lambert direccional con rampa de paleta. Cero deps, determinista.
 *
 * POR QUÉ así: permite renders 3D reales (nudos/supershapes/Möbius) sin
 * GPU ni three.js — el Cerebro puede crear "objetos 3D renderizados" offline.
 */
export function renderMeshPng(mesh: GeoMesh, opts: MeshRenderOptions = {}): Uint8Array {
  const W = Math.max(8, Math.min(2048, Math.round(opts.width ?? 384)));
  const H = Math.max(8, Math.min(2048, Math.round(opts.height ?? 384)));
  const rotated = rotateMesh(mesh, opts);
  const dist = Math.max(0.5, opts.distance ?? 6);
  const bg = opts.background ?? ([10, 10, 14] as const);
  const ldRaw = opts.lightDir ?? ([0.45, 0.75, 0.5] as const);

  // Normalizar luz.
  const ll = Math.hypot(ldRaw[0], ldRaw[1], ldRaw[2]) || 1;
  const L = [ldRaw[0] / ll, ldRaw[1] / ll, ldRaw[2] / ll];

  // Proyección perspectiva: cámara en +Z mirando a origen.
  const proj: Array<[number, number, number]> = rotated.vertices.map(([x, y, z]) => {
    const zc = z + dist;
    const s = (W / 2) / zc;
    return [W / 2 + x * s, H / 2 - y * s, zc];
  });

  // Auto-fit: bounding box en pantalla tras proyección.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [px, py] of proj) {
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (py < minY) minY = py; if (py > maxY) maxY = py;
  }
  const spanX = Math.max(1e-9, maxX - minX);
  const spanY = Math.max(1e-9, maxY - minY);
  const fit = (Math.min(W, H) * 0.82) / Math.max(spanX, spanY);
  const scale = (opts.zoom ?? 1) * fit;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Paleta como rampa de intensidad.
  const stops = opts.palette ? (PALETTES[opts.palette] ?? null) : null;

  const rgba = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = bg[0]; rgba[i * 4 + 1] = bg[1]; rgba[i * 4 + 2] = bg[2]; rgba[i * 4 + 3] = 255;
  }

  // Cara visible si su normal apunta hacia la cámara (+Z).
  const shadeFace = (
    ia: number, ib: number, ic: number,
  ): { ok: boolean; intensity: number; depth: number; ax: number; ay: number; bx: number; by: number; cxp: number; cyp: number } => {
    const A = proj[ia], B = proj[ib], C = proj[ic];
    const va = rotated.vertices[ia], vb = rotated.vertices[ib], vc = rotated.vertices[ic];
    const e1x = vb[0] - va[0], e1y = vb[1] - va[1], e1z = vb[2] - va[2];
    const e2x = vc[0] - va[0], e2y = vc[1] - va[1], e2z = vc[2] - va[2];
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    if (nz <= 0.02) return { ok: false, intensity: 0, depth: 0, ax: 0, ay: 0, bx: 0, by: 0, cxp: 0, cyp: 0 };
    const lambert = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const depth = (A[2] + B[2] + C[2]) / 3;
    return {
      ok: true, intensity: lambert, depth,
      ax: (A[0] - cx) * scale + W / 2, ay: (A[1] - cy) * scale + H / 2,
      bx: (B[0] - cx) * scale + W / 2, by: (B[1] - cy) * scale + H / 2,
      cxp: (C[0] - cx) * scale + W / 2, cyp: (C[1] - cy) * scale + H / 2,
    };
  };

  const visible = [];
  for (const [ia, ib, ic] of mesh.faces) {
    const f = shadeFace(ia, ib, ic);
    if (f.ok) visible.push(f);
  }
  // Orden pintor: lejanas primero.
  visible.sort((a, b) => b.depth - a.depth);

  const putPixel = (xi: number, yi: number, intensity: number): void => {
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
    const o = (yi * W + xi) * 4;
    if (stops) {
      // Rampa por la paleta: recorre los stops según intensidad.
      const tpos = Math.min(0.999, Math.max(0, intensity));
      const fi = tpos * (stops.length - 1);
      const i0 = Math.floor(fi);
      const fr = fi - i0;
      const a = stops[i0];
      const b = stops[i0 + 1] ?? stops[i0];
      rgba[o] = Math.round(a[0] + (b[0] - a[0]) * fr);
      rgba[o + 1] = Math.round(a[1] + (b[1] - a[1]) * fr);
      rgba[o + 2] = Math.round(a[2] + (b[2] - a[2]) * fr);
    } else {
      // Violeta base sombreado por Lambert (fallback sin paleta).
      rgba[o] = Math.round(40 + 99 * intensity);
      rgba[o + 1] = Math.round(20 + 72 * intensity);
      rgba[o + 2] = Math.round(60 + 186 * intensity);
    }
  };

  for (const f of visible) {
    // Rasterización baricéntrica sobre el bbox del triángulo.
    const minXi = Math.max(0, Math.floor(Math.min(f.ax, f.bx, f.cxp)));
    const maxXi = Math.min(W - 1, Math.ceil(Math.max(f.ax, f.bx, f.cxp)));
    const minYi = Math.max(0, Math.floor(Math.min(f.ay, f.by, f.cyp)));
    const maxYi = Math.min(H - 1, Math.ceil(Math.max(f.ay, f.by, f.cyp)));
    const area = (f.bx - f.ax) * (f.cyp - f.ay) - (f.cxp - f.ax) * (f.by - f.ay);
    if (Math.abs(area) < 1e-9) continue;
    for (let yi = minYi; yi <= maxYi; yi++) {
      for (let xi = minXi; xi <= maxXi; xi++) {
        const px = xi + 0.5;
        const py = yi + 0.5;
        const w0 = ((f.bx - f.ax) * (py - f.ay) - (f.cxp - f.ax) * (px - f.ax)) / area;
        const w1 = ((f.cxp - f.ax) * (py - f.ay) - (px - f.ax) * (f.by - f.ay)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) putPixel(xi, yi, f.intensity);
      }
    }
  }

  return encodePng({ width: W, height: H, rgba });
}
