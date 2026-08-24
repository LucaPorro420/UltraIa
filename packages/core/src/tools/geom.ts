/**
 * geom — computational-geometry & math library for programming 2D/3D objects and
 * videos from math (capability `geom`).
 *
 * 100% code, deterministic, keyless, offline. No deps. Pattern: reutiliza el
 * estilo de `sdf`/`codevfx` del repo (dominio puro determinista + render a
 * HTML/SVG autocontenido, Dark Obsidian, a11y). Las superficies implícitas SDF
 * existen en `sdf.ts` y son complementarias (geom es geometría explícita de
 * malla/polígonos + álgebra lineal + animación por timeline).
 *
 * Todos los generadores son deterministas (semilla = parámetros). El render a
 * HTML/SVG no require red ni assets externos.
 */

// ───────────────────────── escalares ─────────────────────────
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
export const easeInQuad = (t: number) => t * t;
export const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInElastic = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
};
export const easeOutBounce = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    t -= 1.5 / d1;
    return n1 * t * t + 0.75;
  }
  if (t < 2.5 / d1) {
    t -= 2.25 / d1;
    return n1 * t * t + 0.9375;
  }
  t -= 2.625 / d1;
  return n1 * t * t + 0.984375;
};

// ───────────────────────── Vec2 ─────────────────────────
export type Vec2 = [number, number];
export const v2add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const v2sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const v2dot = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];
export const v2cross = (a: Vec2, b: Vec2): number => a[0] * b[1] - a[1] * b[0];
export const v2len = (a: Vec2): number => Math.hypot(a[0], a[1]);
export const v2norm = (a: Vec2): Vec2 => {
  const l = v2len(a) || 1;
  return [a[0] / l, a[1] / l];
};
export const v2rot = (a: Vec2, ang: number): Vec2 => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
};
export const v2lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const v2scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s];
export const v2fromAngle = (ang: number, r = 1): Vec2 => [r * Math.cos(ang), r * Math.sin(ang)];
export const v2angle = (a: Vec2): number => Math.atan2(a[1], a[0]);

// ───────────────────────── Vec3 ─────────────────────────
export type GeomVec3 = [number, number, number];
export const v3add = (a: GeomVec3, b: GeomVec3): GeomVec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const v3sub = (a: GeomVec3, b: GeomVec3): GeomVec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const v3dot = (a: GeomVec3, b: GeomVec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const v3cross = (a: GeomVec3, b: GeomVec3): GeomVec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const v3len = (a: GeomVec3): number => Math.hypot(a[0], a[1], a[2]);
export const v3norm = (a: GeomVec3): GeomVec3 => {
  const l = v3len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const v3dist = (a: GeomVec3, b: GeomVec3): number => v3len(v3sub(a, b));
export const v3lerp = (a: GeomVec3, b: GeomVec3, t: number): GeomVec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

// ───────────────────────── Mat3 (row-major, afín 2D) ─────────────────────────
export type Mat3 = number[];
export const mat3Identity = (): Mat3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const mat3Multiply = (a: Mat3, b: Mat3): Mat3 => {
  const o = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return o;
};
export const mat3Translation = (tx: number, ty: number): Mat3 => [1, 0, tx, 0, 1, ty, 0, 0, 1];
export const mat3Rotation = (ang: number): Mat3 => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
export const applyMat3 = (m: Mat3, p: Vec2): Vec2 => [m[0] * p[0] + m[1] * p[1] + m[2], m[3] * p[0] + m[4] * p[1] + m[5]];

// ───────────────────────── Mat4 (row-major) ─────────────────────────
export type Mat4 = number[];
export const mat4Identity = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export const mat4Multiply = (a: Mat4, b: Mat4): Mat4 => {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c];
  return o;
};
export const mat4RotationX = (a: number): Mat4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
};
export const mat4RotationY = (a: number): Mat4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
};
export const mat4RotationZ = (a: number): Mat4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};
export const mat4Translation = (x: number, y: number, z: number): Mat4 => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
export const mat4LookAt = (eye: GeomVec3, target: GeomVec3, up: GeomVec3): Mat4 => {
  const z = v3norm(v3sub(eye, target));
  const x = v3norm(v3cross(up, z));
  const y = v3cross(z, x);
  return [
    x[0], x[1], x[2], -v3dot(x, eye),
    y[0], y[1], y[2], -v3dot(y, eye),
    z[0], z[1], z[2], -v3dot(z, eye),
    0, 0, 0, 1,
  ];
};
export const transformPoint = (m: Mat4, p: GeomVec3): GeomVec3 => {
  const x = m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3];
  const y = m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7];
  const z = m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11];
  const w = m[12] * p[0] + m[13] * p[1] + m[14] * p[2] + m[15];
  return [x / w, y / w, z / w];
};

// ───────────────────────── Quaternion (x,y,z,w) ─────────────────────────
export type Quat = [number, number, number, number];
export const quatIdentity = (): Quat => [0, 0, 0, 1];
export const quatFromAxisAngle = (axis: GeomVec3, angle: number): Quat => {
  const n = v3norm(axis);
  const h = angle / 2;
  const s = Math.sin(h);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(h)];
};
export const quatMultiply = (a: Quat, b: Quat): Quat => {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
};
export const quatToMat4 = (q: Quat): Mat4 => {
  const [x, y, z, w] = q;
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;
  return [
    1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy), 0,
    2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx), 0,
    2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy), 0,
    0, 0, 0, 1,
  ];
};
export const quatRotateVec3 = (q: Quat, v: GeomVec3): GeomVec3 => {
  const m = quatToMat4(q);
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[4] * v[0] + m[5] * v[1] + m[6] * v[2], m[8] * v[0] + m[9] * v[1] + m[10] * v[2]];
};
export const quatNorm = (q: Quat): Quat => {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
};
export const quatSlerp = (a: Quat, b: Quat, t: number): Quat => {
  let [ax, ay, az, aw] = a;
  let [bx, by, bz, bw] = b;
  let dot = ax * bx + ay * by + az * bz + aw * bw;
  if (dot < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    dot = -dot;
  }
  if (dot > 0.9995) {
    return quatNorm([lerp(ax, bx, t), lerp(ay, by, t), lerp(az, bz, t), lerp(aw, bw, t)]);
  }
  const th = Math.acos(dot);
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s;
  const wb = Math.sin(t * th) / s;
  return [ax * wa + bx * wb, ay * wa + by * wb, az * wa + bz * wb, aw * wa + bw * wb];
};

// ───────────────────────── 2D ─────────────────────────
export interface Bounds2D {
  min: Vec2;
  max: Vec2;
  width: number;
  height: number;
}
function binomial(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}
export function polygon2D(n: number, radius = 1, phase = 0): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([radius * Math.cos(a), radius * Math.sin(a)]);
  }
  return pts;
}
export function star2D(points: number, rOuter = 1, rInner = 0.5, phase = 0): Vec2[] {
  const pts: Vec2[] = [];
  const n = points * 2;
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = phase + (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}
export function spiral2D(turns: number, r0 = 0.1, r1 = 1, samples = 200, phase = 0): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const a = phase + t * turns * Math.PI * 2;
    const r = lerp(r0, r1, t);
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}
export function lissajous2D(ax = 1, ay = 1, freqX = 3, freqY = 2, phase = Math.PI / 2, samples = 240): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / (samples - 1)) * Math.PI * 2;
    pts.push([ax * Math.sin(freqX * t + phase), ay * Math.sin(freqY * t)]);
  }
  return pts;
}
export function superellipse2D(n = 4, k = 4, samples = 240, rx = 1, ry = 1): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n) * rx;
    const y = Math.sign(st) * Math.pow(Math.abs(st), 2 / n) * ry;
    pts.push([x, y]);
  }
  return pts;
}
export function grid2D(cols: number, rows: number, spacing = 1): Vec2[] {
  const pts: Vec2[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([c * spacing, r * spacing]);
  return pts;
}
export function bezier2D(control: Vec2[], t: number): Vec2 {
  const n = control.length - 1;
  let x = 0;
  let y = 0;
  for (let i = 0; i <= n; i++) {
    const bin = binomial(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i);
    x += bin * control[i][0];
    y += bin * control[i][1];
  }
  return [x, y];
}
export function bezierPath2D(control: Vec2[], samples = 64): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < samples; i++) pts.push(bezier2D(control, i / (samples - 1)));
  return pts;
}
export function boundingBox2D(pts: Vec2[]): Bounds2D {
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  for (const p of pts) {
    minx = Math.min(minx, p[0]);
    miny = Math.min(miny, p[1]);
    maxx = Math.max(maxx, p[0]);
    maxy = Math.max(maxy, p[1]);
  }
  return { min: [minx, miny], max: [maxx, maxy], width: maxx - minx, height: maxy - miny };
}

// ───────────────────────── SVG 2D ─────────────────────────
export type SvgItem =
  | { kind: 'polygon'; points: Vec2[]; fill?: string; stroke?: string }
  | { kind: 'polyline'; points: Vec2[]; stroke?: string }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill?: string }
  | { kind: 'path'; d: string; fill?: string; stroke?: string };
export interface SvgOptions {
  width?: number;
  height?: number;
  background?: string;
}
export function pointsToSvgPath(points: Vec2[], opts?: { close?: boolean }): string {
  if (!points.length) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i][0]} ${points[i][1]}`;
  if (opts?.close) d += ' Z';
  return d;
}
export function render2DSvg(items: SvgItem[], opts?: SvgOptions): string {
  const W = opts?.width ?? 600;
  const H = opts?.height ?? 400;
  const bg = opts?.background ?? '#08080a';
  let body = '';
  for (const it of items) {
    if (it.kind === 'polygon' || it.kind === 'polyline') {
      const pts = (it.points ?? []).map((p) => `${p[0]},${p[1]}`).join(' ');
      const fill = it.kind === 'polygon' ? it.fill ?? 'none' : 'none';
      const stroke = it.stroke ?? '#8b5cf6';
      body += `<${it.kind} points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
    } else if (it.kind === 'circle') {
      body += `<circle cx="${it.cx}" cy="${it.cy}" r="${it.r}" fill="${it.fill ?? '#8b5cf6'}"/>`;
    } else if (it.kind === 'rect') {
      body += `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${it.fill ?? '#8b5cf6'}"/>`;
    } else if (it.kind === 'path') {
      body += `<path d="${it.d}" fill="${it.fill ?? 'none'}" stroke="${it.stroke ?? '#8b5cf6'}" stroke-width="2"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="UltraIa geom 2D render"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>`;
}

// ───────────────────────── 3D mallas ─────────────────────────
export type Triangle = [number, number, number];
export interface GeomMesh {
  positions: GeomVec3[];
  faces: Triangle[];
  normals?: GeomVec3[];
}
export function sphere3D(radius = 1, lat = 24, lon = 32): GeomMesh {
  const positions: GeomVec3[] = [];
  const faces: Triangle[] = [];
  for (let i = 0; i <= lat; i++) {
    const theta = (i / lat) * Math.PI;
    for (let j = 0; j < lon; j++) {
      const phi = (j / lon) * Math.PI * 2;
      positions.push([radius * Math.sin(theta) * Math.cos(phi), radius * Math.cos(theta), radius * Math.sin(theta) * Math.sin(phi)]);
    }
  }
  const idx = (i: number, j: number) => i * lon + (j % lon);
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
    const a = idx(i, j);
    const b = idx(i + 1, j);
    const c = idx(i + 1, j + 1);
    const d = idx(i, j + 1);
    faces.push([a, b, d]);
    faces.push([b, c, d]);
  }
  return { positions, faces };
}
export function torus3D(r1 = 1, r2 = 0.4, lat = 24, lon = 32): GeomMesh {
  const positions: GeomVec3[] = [];
  const faces: Triangle[] = [];
  for (let i = 0; i <= lat; i++) {
    const u = (i / lat) * Math.PI * 2;
    for (let j = 0; j < lon; j++) {
      const v = (j / lon) * Math.PI * 2;
      const x = (r1 + r2 * Math.cos(v)) * Math.cos(u);
      const y = r2 * Math.sin(v);
      const z = (r1 + r2 * Math.cos(v)) * Math.sin(u);
      positions.push([x, y, z]);
    }
  }
  const idx = (i: number, j: number) => i * lon + (j % lon);
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
    const a = idx(i, j);
    const b = idx(i + 1, j);
    const c = idx(i + 1, j + 1);
    const d = idx(i, j + 1);
    faces.push([a, b, d]);
    faces.push([b, c, d]);
  }
  return { positions, faces };
}
export function box3D(hx = 1, hy = 1, hz = 1): GeomMesh {
  const positions: GeomVec3[] = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
    [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
  ];
  const faces: Triangle[] = [
    [0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1],
    [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0],
  ];
  return { positions, faces };
}
export function cylinder3D(radius = 1, height = 2, segments = 24): GeomMesh {
  const positions: GeomVec3[] = [];
  const faces: Triangle[] = [];
  const top = positions.length;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    positions.push([radius * Math.cos(a), height / 2, radius * Math.sin(a)]);
  }
  const bot = positions.length;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    positions.push([radius * Math.cos(a), -height / 2, radius * Math.sin(a)]);
  }
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    faces.push([top + i, top + j, bot + j]);
    faces.push([top + i, bot + j, bot + i]);
  }
  const tc = positions.length;
  positions.push([0, height / 2, 0]);
  const bc = positions.length;
  positions.push([0, -height / 2, 0]);
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    faces.push([tc, top + j, top + i]);
    faces.push([bc, bot + i, bot + j]);
  }
  return { positions, faces };
}
export function helix3D(turns = 3, radius = 1, height = 4, samples = 200): GeomVec3[] {
  const pts: GeomVec3[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const a = t * turns * Math.PI * 2;
    pts.push([radius * Math.cos(a), lerp(-height / 2, height / 2, t), radius * Math.sin(a)]);
  }
  return pts;
}
export function parametricSurface3D(fn: (u: number, v: number) => GeomVec3, nu = 48, nv = 12): GeomMesh {
  const positions: GeomVec3[] = [];
  const faces: Triangle[] = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      positions.push(fn(u, v));
    }
  }
  const idx = (i: number, j: number) => i * (nv + 1) + j;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = idx(i, j);
    const b = idx(i + 1, j);
    const c = idx(i + 1, j + 1);
    const d = idx(i, j + 1);
    faces.push([a, b, d]);
    faces.push([b, c, d]);
  }
  return { positions, faces };
}
export function computeNormals(mesh: GeomMesh): GeomMesh {
  const normals: GeomVec3[] = mesh.positions.map(() => [0, 0, 0]);
  for (const f of mesh.faces) {
    const [a, b, c] = f;
    const ab = v3sub(mesh.positions[b], mesh.positions[a]);
    const ac = v3sub(mesh.positions[c], mesh.positions[a]);
    const n = v3norm(v3cross(ab, ac));
    normals[a] = v3add(normals[a], n);
    normals[b] = v3add(normals[b], n);
    normals[c] = v3add(normals[c], n);
  }
  return { ...mesh, normals: normals.map(v3norm) };
}
export function meshToOBJ(mesh: GeomMesh, name = 'ultraia_geom'): string {
  let s = `# UltraIa geom — procedural mesh (deterministic)\no ${name}\n`;
  for (const p of mesh.positions) s += `v ${p[0]} ${p[1]} ${p[2]}\n`;
  if (mesh.normals) for (const n of mesh.normals) s += `vn ${n[0]} ${n[1]} ${n[2]}\n`;
  for (const f of mesh.faces) s += `f ${f[0] + 1} ${f[1] + 1} ${f[2] + 1}\n`;
  return s;
}
export function meshToSTL(mesh: GeomMesh, name = 'ultraia_geom'): string {
  let s = `solid ${name}\n`;
  for (const f of mesh.faces) {
    const [a, b, c] = f;
    const ab = v3sub(mesh.positions[b], mesh.positions[a]);
    const ac = v3sub(mesh.positions[c], mesh.positions[a]);
    const n = v3norm(v3cross(ab, ac));
    s += `facet normal ${n[0]} ${n[1]} ${n[2]}\n outer loop\n`;
    for (const idx of f) {
      const p = mesh.positions[idx];
      s += `  vertex ${p[0]} ${p[1]} ${p[2]}\n`;
    }
    s += ` endloop\nendfacet\n`;
  }
  s += `endsolid ${name}\n`;
  return s;
}
export interface ProjectOptions {
  width?: number;
  height?: number;
  background?: string;
  stroke?: string;
}
export function projectMeshSvg(mesh: GeomMesh, mat: Mat4, opts?: ProjectOptions): string {
  const W = opts?.width ?? 600;
  const H = opts?.height ?? 400;
  const pts = mesh.positions.map((p) => transformPoint(mat, p));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minx = Math.min(...xs);
  const maxx = Math.max(...xs);
  const miny = Math.min(...ys);
  const maxy = Math.max(...ys);
  const s = Math.min(W / (maxx - minx || 1), H / (maxy - miny || 1)) * 0.9;
  const ox = W / 2 - ((minx + maxx) / 2) * s;
  const oy = H / 2 - ((miny + maxy) / 2) * s;
  const segs = new Set<string>();
  let edges = '';
  for (const f of mesh.faces) {
    const pairs: [number, number][] = [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]];
    for (const [a, b] of pairs) {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (segs.has(key)) continue;
      segs.add(key);
      const pa = pts[a];
      const pb = pts[b];
      const xa = pa[0] * s + ox;
      const ya = pa[1] * s + oy;
      const xb = pb[0] * s + ox;
      const yb = pb[1] * s + oy;
      edges += `<line x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}" stroke="${opts?.stroke ?? '#8b5cf6'}" stroke-width="1"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="UltraIa geom 3D wireframe"><rect width="${W}" height="${H}" fill="${opts?.background ?? '#08080a'}"/>${edges}</svg>`;
}

// ───────────────────────── Timeline (keyframes + easing) ─────────────────────────
export type EaseName =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'easeInElastic'
  | 'easeOutBounce';
export interface GeomKeyframe {
  t: number;
  value: number;
  ease?: EaseName;
}
export type Timeline = Record<string, GeomKeyframe[]>;
const EASING: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeOutCubic,
  easeInOutCubic,
  easeOutBack,
  easeInElastic,
  easeOutBounce,
};
export function applyEase(name: EaseName | undefined, t: number): number {
  const fn = (name && EASING[name]) || EASING.linear;
  return fn(Math.max(0, Math.min(1, t)));
}
export function sampleTimeline(tl: Timeline, t: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(tl)) {
    const ks = tl[key];
    if (!ks.length) continue;
    if (t <= ks[0].t) out[key] = ks[0].value;
    else if (t >= ks[ks.length - 1].t) out[key] = ks[ks.length - 1].value;
    else {
      for (let i = 0; i < ks.length - 1; i++) {
        const a = ks[i];
        const b = ks[i + 1];
        if (t >= a.t && t <= b.t) {
          const span = (b.t - a.t) || 1;
          const local = (t - a.t) / span;
          const e = applyEase(b.ease ?? a.ease ?? 'linear', local);
          out[key] = lerp(a.value, b.value, e);
          break;
        }
      }
    }
  }
  return out;
}

// ───────────────────────── Video / animación (HTML autocontenido) ─────────────────────────
export type GeomPreset = 'lissajous' | 'spiral' | 'orbit' | 'superformula' | 'spinning-cube' | 'torus-spin' | 'sphere-wire';
export interface GeomAnimationPlan {
  mode?: '2d' | '3d';
  preset?: GeomPreset;
  params?: Record<string, number>;
  width?: number;
  height?: number;
  duration?: number;
}
export function renderGeomHtml(plan: GeomAnimationPlan): string {
  const mode = plan.mode ?? '2d';
  const preset = plan.preset ?? 'lissajous';
  const params = plan.params ?? {};
  const W = Math.floor(plan.width ?? (mode === '3d' ? 640 : 600));
  const H = Math.floor(plan.height ?? (mode === '3d' ? 480 : 400));
  const duration = plan.duration ?? 8;
  const p = (k: string, d: number | string): number | string => (params[k] !== undefined ? params[k] : d);
  const rot3d = (x: number, y: number, z: number, ax: number, ay: number) => {
    let [X, Y, Z] = [x, y, z] as [number, number, number];
    let cy = Math.cos(ay);
    let sy = Math.sin(ay);
    let X1 = X * cy + Z * sy;
    let Z1 = -X * sy + Z * cy;
    let cx = Math.cos(ax);
    let sx = Math.sin(ax);
    let Y1 = Y * cx - Z1 * sx;
    let Z2 = Y * sx + Z1 * cx;
    return [X1, Y1, Z2];
  };
  const script = `
(function(){
  var cv=document.getElementById('cv'); var ctx=cv.getContext('2d');
  var W=cv.width, H=cv.height; var P=${JSON.stringify(params)};
  var p=function(k,d){ return (P[k]!==undefined)?P[k]:d; };
  var T=${duration}; var mode='${mode}', preset='${preset}';
  var lerp=function(a,b,t){return a+(b-a)*t;};
  var rot3d=function(x,y,z,ax,ay){var cy=Math.cos(ay),sy=Math.sin(ay);var X1=x*cy+z*sy;var Z1=-x*sy+z*cy;var cx=Math.cos(ax),sx=Math.sin(ax);var Y1=y*cx-Z1*sx;var Z2=y*sx+Z1*cx;return [X1,Y1,Z2];};
  function frame(now){
    var t=(now/1000)%T; var ph=t/T*Math.PI*2;
    ctx.fillStyle='#08080a'; ctx.fillRect(0,0,W,H);
    if(mode==='2d'){
      var ax=p('ax',1), ay=p('ay',1), fx=p('freqX',3), fy=p('freqY',2), ph0=p('phase',Math.PI/2);
      var n=p('points',220), R=Math.min(W,H)*0.36;
      ctx.strokeStyle='#8b5cf6'; ctx.lineWidth=2; ctx.beginPath();
      for(var i=0;i<=n;i++){ var u=i/n; var x,y; var tt=u*Math.PI*2;
        if(preset==='lissajous'){ x=ax*Math.sin(fx*tt+ph0); y=ay*Math.sin(fy*tt); }
        else if(preset==='spiral'){ var a=ph0+u*p('turns',3)*Math.PI*2; var r=lerp(p('r0',0.1),p('r1',1),u); x=Math.cos(a)*r; y=Math.sin(a)*r; }
        else if(preset==='orbit'){ var a2=ph0+u*Math.PI*2; var r2=p('r',0.7)*(0.6+0.4*Math.sin(u*Math.PI*2)); x=Math.cos(a2)*r2; y=Math.sin(a2)*r2; }
        else if(preset==='superformula'){ var m=p('m',6), n1=p('n1',1), n2=p('n2',1), n3=p('n3',1); var th=tt; var r3=Math.pow(Math.pow(Math.abs(Math.cos(m*th/4)/1),n2)+Math.pow(Math.abs(Math.sin(m*th/4)/1),n3), -1/n1); x=Math.cos(th)*r3; y=Math.sin(th)*r3; }
        var sx=W/2+x*R, sy=H/2+y*R;
        if(i===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
      }
      ctx.stroke();
    } else {
      var pts=[]; var edges=[];
      if(preset==='spinning-cube'){ var s=p('size',1); var v=[[-s,-s,-s],[s,-s,-s],[s,s,-s],[-s,s,-s],[-s,-s,s],[s,-s,s],[s,s,s],[-s,s,s]];
        edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        for(var k=0;k<v.length;k++){ pts.push(rot3d(v[k][0],v[k][1],v[k][2],ph*0.7,ph)); } }
      else if(preset==='torus-spin'){ var R1=p('r1',1), R2=p('r2',0.4), seg=p('segments',24);
        for(var i2=0;i2<seg;i2++){ var u=i2/seg*Math.PI*2; for(var j2=0;j2<seg;j2++){ var vv=j2/seg*Math.PI*2; var x=(R1+R2*Math.cos(vv))*Math.cos(u); var y=R2*Math.sin(vv); var z=(R1+R2*Math.cos(vv))*Math.sin(u); pts.push(rot3d(x,y,z,ph*0.5,ph)); } }
        for(var ii=0;ii<seg;ii++){ for(var jj=0;jj<seg;jj++){ var a=ii*seg+jj, b=ii*seg+((jj+1)%seg), c=((ii+1)%seg)*seg+((jj+1)%seg), d=((ii+1)%seg)*seg+jj; edges.push([a,b],[b,c],[c,d],[d,a]); } } }
      else if(preset==='sphere-wire'){ var rs=p('radius',1), la=p('lat',12), lo=p('lon',16);
        for(var li=0;li<=la;li++){ var theta=li/la*Math.PI; for(var lj=0;lj<lo;lj++){ var phi=lj/lo*Math.PI*2; var x=rs*Math.sin(theta)*Math.cos(phi); var y=rs*Math.cos(theta); var z=rs*Math.sin(theta)*Math.sin(phi); pts.push(rot3d(x,y,z,ph*0.4,ph)); } }
        for(var li2=0;li2<la;li2++){ for(var lj2=0;lj2<lo;lj2++){ var a2b=li2*lo+lj2, b2b=li2*lo+((lj2+1)%lo), c2b=((li2+1)%la)*lo+((lj2+1)%lo), d2b=((li2+1)%la)*lo+lj2; if(li2<la-0) edges.push([a2b,b2b],[c2b,d2b]); } }
        for(var ring=0;ring<=la;ring++){ var base=ring*lo; for(var rr=0;rr<lo;rr++) edges.push([base+rr, base+((rr+1)%lo)]); } }
      var fov=p('fov',Math.PI/3), d=4; var proj=[];
      for(var pi=0;pi<pts.length;pi++){ var Pp=pts[pi]; var zc=Pp[2]+d; var f=(1/Math.tan(fov/2)); var sx=W/2+Pp[0]*f/d*Math.min(W,H)*0.3; var sy=H/2-Pp[1]*f/d*Math.min(W,H)*0.3; proj.push([sx,sy]); }
      ctx.strokeStyle='#8b5cf6'; ctx.lineWidth=1;
      for(var ei=0;ei<edges.length;ei++){ var e=edges[ei]; var pa=proj[e[0]], pb=proj[e[1]]; if(!pa||!pb) continue; ctx.beginPath(); ctx.moveTo(pa[0],pa[1]); ctx.lineTo(pb[0],pb[1]); ctx.stroke(); }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
`;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>UltraIa geom — ${preset}</title>
<style>html,body{margin:0;background:#08080a;color:#e5e7eb;font-family:Inter,system-ui,sans-serif}canvas{display:block;width:100%;height:auto;background:#08080a}header{padding:8px 12px;font-size:13px;opacity:.7}</style>
</head><body>
<header>UltraIa geom — ${preset} (${mode})</header>
<canvas id="cv" width="${W}" height="${H}" role="img" aria-label="Animación matemática: ${preset}"></canvas>
<script>${script}</script>
</body></html>`;
}

// ───────────────────────── Puente SDF (superficies implícitas) ─────────────────────────
/* Puente SDF (superficies implícitas) — reutiliza sdf.ts en tiempo de uso.
 * Permite generar nubes de puntos de una superficie implícita definida por una
 * función campo (de `sdf.ts`) como geometría explícita en geom. No importa sdf
 * (evita acoplar). */
export function implicitPointCloud(field: (p: GeomVec3) => number, opts?: { bounds?: [GeomVec3, GeomVec3]; step?: number; eps?: number; max?: number }): GeomVec3[] {
  const bounds = opts?.bounds ?? [
    [-1, -1, -1],
    [1, 1, 1],
  ];
  const step = opts?.step ?? 0.1;
  const eps = opts?.eps ?? 0.08;
  const max = opts?.max ?? 20000;
  const out: GeomVec3[] = [];
  for (let x = bounds[0][0]; x <= bounds[1][0] && out.length < max; x += step) {
    for (let y = bounds[0][1]; y <= bounds[1][1] && out.length < max; y += step) {
      for (let z = bounds[0][2]; z <= bounds[1][2] && out.length < max; z += step) {
        const d = field([x, y, z]);
        if (Math.abs(d) <= eps) out.push([x, y, z]);
      }
    }
  }
  return out;
}

// ───────────────────────── namespace ─────────────────────────
export const geom = {
  clamp,
  lerp,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeOutCubic,
  easeInOutCubic,
  easeOutBack,
  easeInElastic,
  easeOutBounce,
  // vec2
  v2add,
  v2sub,
  v2dot,
  v2cross,
  v2len,
  v2norm,
  v2rot,
  v2lerp,
  v2scale,
  v2fromAngle,
  v2angle,
  // vec3
  v3add,
  v3sub,
  v3dot,
  v3cross,
  v3len,
  v3norm,
  v3dist,
  v3lerp,
  // mat3
  mat3Identity,
  mat3Multiply,
  mat3Translation,
  mat3Rotation,
  applyMat3,
  // mat4
  mat4Identity,
  mat4Multiply,
  mat4RotationX,
  mat4RotationY,
  mat4RotationZ,
  mat4Translation,
  mat4LookAt,
  transformPoint,
  // quat
  quatIdentity,
  quatFromAxisAngle,
  quatMultiply,
  quatToMat4,
  quatRotateVec3,
  quatNorm,
  quatSlerp,
  // 2d
  polygon2D,
  star2D,
  spiral2D,
  lissajous2D,
  superellipse2D,
  grid2D,
  bezier2D,
  bezierPath2D,
  boundingBox2D,
  // svg
  render2DSvg,
  pointsToSvgPath,
  // 3d
  sphere3D,
  torus3D,
  box3D,
  cylinder3D,
  helix3D,
  parametricSurface3D,
  computeNormals,
  meshToOBJ,
  meshToSTL,
  projectMeshSvg,
  // timeline
  sampleTimeline,
  applyEase,
  // video
  renderGeomHtml,
  // bridge
  implicitPointCloud,
};
