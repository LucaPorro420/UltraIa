// -----------------------------------------------------------------------------
// cadgeo.ts - capability `cadgeo` (Motor Evolutivo M2, plan loop-94 tarea #94)
// -----------------------------------------------------------------------------
// Geometría computacional determinista en dominio puro (0 deps, keyless), port
// de los PRINCIPIOS del manual "Motor Evolutivo" (cap. Geometría Computacional):
//
//   - Delaunay 2D Bowyer-Watson (super-triángulo 10× bounds, test circumcircle,
//     dedupe de puntos <1e-9, rechazo explícito de configuraciones colineales).
//   - Voronoi dual por recorte de semiplanos (Sutherland-Hodgman contra el bbox):
//     cada celda es el lugar geométrico dist(site_i) <= dist(site_j); robusto sin
//     caminar circuncentros.
//   - BVH median-split por eje mayor (leaf <= 2) con queries AABB y rayo (slab).
//   - Quadtree punto-capacidad con query circular.
//   - B-spline de Boor grado p<=5, nudos uniformes clampeados (NURBS-lite con
//     weights opcionales).
//   - extrudeMesh / revolveMesh -> GeoMesh compatible con los exports estándar
//     de geometry.ts (meshToObjText / meshToGltf).
//
// Reglas del repo: SIN Math.random / Date.now(), objetos JSON-serializables,
// misma entrada -> misma salida byte-exact. Símbolos prefijados Cad*/Bvh*/
// Quadtree*/Bspline* para no colisionar vía `export *`.
// -----------------------------------------------------------------------------

import type { GeoPoint2 } from './geometry';
import { GeoError } from './geometry';

/** Error de dominio cadgeo (validación / geometría degenerada). */
export class CadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CadError';
  }
}

/* ------------------------------------------------------------------ */
/* Delaunay 2D — Bowyer-Watson                                         */
/* ------------------------------------------------------------------ */

interface Tri {
  a: number;
  b: number;
  c: number;
  cx: number; // circumcentro
  cy: number;
  r2: number; // radio^2 circumcircle
}

function circumcircle(px: number[], py: number[], a: number, b: number, c: number): Tri {
  const ax = px[a];
  const ay = py[a];
  const bx = px[b];
  const by = py[b];
  const cx = px[c];
  const cy = py[c];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) throw new CadError('triangulo degenerado (puntos colineales)');
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const r2 = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
  return { a, b, c, cx: ux, cy: uy, r2 };
}

/**
 * Triangulación de Delaunay (Bowyer-Watson). Devuelve triángulos como ternas de
 * índices que referencian los puntos de ENTRADA originales. Guardas: n>=3,
 * duplicados eliminados (<1e-9), conjunto totalmente colineal rechazado con
 * CadError. Límite n<=2000 (O(n²) suficiente y honesto).
 */
export function delaunayTriangulate(points: ReadonlyArray<GeoPoint2>): Array<[number, number, number]> {
  if (points.length < 3) throw new CadError(`se necesitan >=3 puntos (recibidos ${points.length})`);
  if (points.length > 2000) throw new CadError('n > 2000 fuera del limite Bowyer-Watson O(n^2)');
  for (const p of points) {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) throw new CadError('punto no finito');
  }
  // dedupe preservando el primer índice original
  const uniqX: number[] = [];
  const uniqY: number[] = [];
  const mapToOriginal: number[] = [];
  const indexOfUniq = new Map<string, number>();
  for (let i = 0; i < points.length; i++) {
    const key = `${Math.round(points[i][0] * 1e9)}:${Math.round(points[i][1] * 1e9)}`;
    const existing = indexOfUniq.get(key);
    if (existing !== undefined) continue;
    indexOfUniq.set(key, uniqX.length);
    uniqX.push(points[i][0]);
    uniqY.push(points[i][1]);
    mapToOriginal.push(i);
  }
  if (uniqX.length < 3) throw new CadError('tras dedupe quedan <3 puntos distintos');
  // rechazo de conjunto colineal (área del polígono convexo ~ 0 vía cross acumulada)
  let area2 = 0;
  for (let i = 1; i + 1 < uniqX.length; i++) {
    area2 += (uniqX[i] - uniqX[0]) * (uniqY[i + 1] - uniqY[0]) - (uniqX[i + 1] - uniqX[0]) * (uniqY[i] - uniqY[0]);
  }
  if (Math.abs(area2) < 1e-12) throw new CadError('todos los puntos son colineales');

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < uniqX.length; i++) {
    if (uniqX[i] < minX) minX = uniqX[i];
    if (uniqX[i] > maxX) maxX = uniqX[i];
    if (uniqY[i] < minY) minY = uniqY[i];
    if (uniqY[i] > maxY) maxY = uniqY[i];
  }
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const S = 10 * Math.max(dx, dy);
  // super-triángulo (índices negativos simulados con arrays extendidos)
  const px = [...uniqX, midX, midX - S, midX + S];
  const py = [...uniqY, midY + S, midY - S, midY - S];
  const SUPER0 = uniqX.length;
  let tris: Tri[] = [circumcircle(px, py, SUPER0, SUPER0 + 1, SUPER0 + 2)];

  for (let i = 0; i < uniqX.length; i++) {
    const bad: Tri[] = [];
    const boundary: Array<[number, number]> = [];
    for (const t of tris) {
      const d2 = (px[i] - t.cx) * (px[i] - t.cx) + (py[i] - t.cy) * (py[i] - t.cy);
      if (d2 <= t.r2) bad.push(t);
    }
    // aristas del polígono frontera (las que aparecen una sola vez)
    const edgeCount = new Map<string, number>();
    const edgeDir = new Map<string, [number, number]>();
    for (const t of bad) {
      for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]] as Array<[number, number]>) {
        const key = `${Math.min(u, v)}-${Math.max(u, v)}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
        edgeDir.set(key, [u, v]);
      }
    }
    for (const [key, count] of edgeCount) {
      if (count === 1) boundary.push(edgeDir.get(key)!);
    }
    tris = tris.filter((t) => !bad.includes(t));
    for (const [u, v] of boundary) {
      tris.push(circumcircle(px, py, u, v, i));
    }
  }

  const out: Array<[number, number, number]> = [];
  for (const t of tris) {
    if (t.a >= SUPER0 || t.b >= SUPER0 || t.c >= SUPER0) continue;
    out.push([mapToOriginal[t.a], mapToOriginal[t.b], mapToOriginal[t.c]]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Voronoi — celdas por recorte de semiplanos                          */
/* ------------------------------------------------------------------ */

export interface VoronoiCell {
  /** índice del sitio en la entrada */
  site: number;
  /** polígono convexo CCW dentro del bbox (primer vértice repetido al final NO) */
  polygon: Array<GeoPoint2>;
}

/** Recorta un polígono convexo contra {p : n·p <= c} (Sutherland-Hodgman). */
function clipHalfPlane(poly: Array<GeoPoint2>, nx: number, ny: number, c: number): Array<GeoPoint2> {
  const out: Array<GeoPoint2> = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const da = nx * a[0] + ny * a[1] - c;
    const db = nx * b[0] + ny * b[1] - c;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * Diagrama de Voronoi: celda_i = bbox ∩ {p : dist(p,i) <= dist(p,j) ∀j≠i}.
 * Robusto por construcción (sin circuncentros); O(n²) — usar n moderado.
 */
export function voronoiCells(
  points: ReadonlyArray<GeoPoint2>,
  bounds?: { minX: number; minY: number; maxX: number; maxY: number },
): VoronoiCell[] {
  if (points.length === 0) return [];
  for (const p of points) {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) throw new CadError('punto no finito');
  }
  let minX = bounds?.minX;
  let minY = bounds?.minY;
  let maxX = bounds?.maxX;
  let maxY = bounds?.maxY;
  if (minX === undefined || minY === undefined || maxX === undefined || maxY === undefined) {
    minX = minY = Infinity;
    maxX = maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX!, p[0]);
      maxX = Math.max(maxX!, p[0]);
      minY = Math.min(minY!, p[1]);
      maxY = Math.max(maxY!, p[1]);
    }
    const padX = (maxX! - minX!) * 0.5 + 1;
    const padY = (maxY! - minY!) * 0.5 + 1;
    minX -= padX;
    maxX += padX;
    minY -= padY;
    maxY += padY;
  }
  const cells: VoronoiCell[] = [];
  for (let i = 0; i < points.length; i++) {
    let poly: Array<GeoPoint2> = [
      [minX!, minY!],
      [maxX!, minY!],
      [maxX!, maxY!],
      [minX!, maxY!],
    ];
    const xi = points[i][0];
    const yi = points[i][1];
    for (let j = 0; j < points.length && poly.length > 0; j++) {
      if (j === i) continue;
      const xj = points[j][0];
      const yj = points[j][1];
      // dist(p,i)^2 <= dist(p,j)^2  <=>  2(xj-xi)p.x + 2(yj-yi)p.y <= xj^2-xi^2+yj^2-yi^2
      poly = clipHalfPlane(poly, 2 * (xj - xi), 2 * (yj - yi), xj * xj - xi * xi + yj * yj - yi * yi);
    }
    cells.push({ site: i, polygon: poly });
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/* BVH — median split eje mayor                                        */
/* ------------------------------------------------------------------ */

export interface BvhBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface BvhNode {
  box: BvhBox;
  left: BvhNode | null;
  right: BvhNode | null;
  /** índices solo en hojas */
  items: number[];
}

function unionBoxes(boxes: ReadonlyArray<BvhBox>, items: number[]): BvhBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const i of items) {
    const b = boxes[i];
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }
  return { minX, minY, maxX, maxY };
}

/** Construye un BVH median-split sobre el eje mayor (hojas con <=2 boxes). */
export function bvhBuild(boxes: ReadonlyArray<BvhBox>): BvhNode {
  for (const b of boxes) {
    if (![b.minX, b.minY, b.maxX, b.maxY].every(Number.isFinite)) throw new CadError('box no finita');
  }
  const buildRange = (items: number[]): BvhNode => {
    const box = unionBoxes(boxes, items);
    if (items.length <= 2) return { box, left: null, right: null, items: [...items] };
    const ex = box.maxX - box.minX;
    const ey = box.maxY - box.minY;
    const axis: 'x' | 'y' = ex >= ey ? 'x' : 'y';
    const sorted = [...items].sort((i, j) =>
      axis === 'x'
        ? boxes[i].minX + boxes[i].maxX - (boxes[j].minX + boxes[j].maxX)
        : boxes[i].minY + boxes[i].maxY - (boxes[j].minY + boxes[j].maxY),
    );
    const mid = sorted.length >> 1;
    const leftItems = sorted.slice(0, mid);
    const rightItems = sorted.slice(mid);
    return { box, left: buildRange(leftItems), right: buildRange(rightItems), items: [] };
  };
  const all = boxes.map((_, i) => i);
  if (all.length === 0) return { box: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, left: null, right: null, items: [] };
  return buildRange(all);
}

function boxIntersects(a: BvhBox, b: BvhBox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function raySlab(b: BvhBox, ox: number, oy: number, dx: number, dy: number): boolean {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (const [o, d, lo, hi] of [
    [ox, dx, b.minX, b.maxX],
    [oy, dy, b.minY, b.maxY],
  ] as Array<[number, number, number, number]>) {
    if (Math.abs(d) < 1e-12) {
      if (o < lo || o > hi) return false;
    } else {
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return tmax >= Math.max(tmin, 0);
}

/** Query AABB stateless: índices cuyo box intersecta el query (== fuerza bruta), asc. */
export function bvhAabbQuery(root: BvhNode, boxes: ReadonlyArray<BvhBox>, query: BvhBox): number[] {
  const out: number[] = [];
  const visit = (node: BvhNode | null): void => {
    if (!node || !boxIntersects(node.box, query)) return;
    if (node.items.length > 0) {
      for (const i of node.items) if (boxIntersects(boxes[i], query)) out.push(i);
      return;
    }
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return out.sort((a, b) => a - b);
}

/** Query de rayo (slab method) stateless: índices cuyo box cruza el rayo, asc. */
export function bvhRayQuery(root: BvhNode, boxes: ReadonlyArray<BvhBox>, ox: number, oy: number, dx: number, dy: number): number[] {
  const out: number[] = [];
  const visit = (node: BvhNode | null): void => {
    if (!node || !raySlab(node.box, ox, oy, dx, dy)) return;
    if (node.items.length > 0) {
      for (const i of node.items) if (raySlab(boxes[i], ox, oy, dx, dy)) out.push(i);
      return;
    }
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return out.sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ */
/* Quadtree                                                            */
/* ------------------------------------------------------------------ */

interface QtNode {
  x: number;
  y: number;
  size: number;
  depth: number;
  points: Array<{ x: number; y: number; payload: number }>;
  children: QtNode[] | null;
}

/** Crea un quadtree con bounds cuadrados [x, x+size]. capacity default 4, depth 12. */
export function quadtreeCreate(x: number, y: number, size: number, capacity = 4, maxDepth = 12): { insert(px: number, py: number, payload: number): void; query(cx: number, cy: number, r: number): number[]; count(): number; maxDepthUsed(): number } {
  if (!(size > 0) || !Number.isFinite(size)) throw new CadError('size debe ser positivo finito');
  const root: QtNode = { x, y, size, depth: 0, points: [], children: null };
  let deepest = 0;
  const subdivide = (node: QtNode): void => {
    const half = node.size / 2;
    node.children = [
      { x: node.x, y: node.y, size: half, depth: node.depth + 1, points: [], children: null },
      { x: node.x + half, y: node.y, size: half, depth: node.depth + 1, points: [], children: null },
      { x: node.x, y: node.y + half, size: half, depth: node.depth + 1, points: [], children: null },
      { x: node.x + half, y: node.y + half, size: half, depth: node.depth + 1, points: [], children: null },
    ];
    const old = node.points;
    node.points = [];
    for (const p of old) insertInto(node, p);
    deepest = Math.max(deepest, node.depth + 1);
  };
  const insertInto = (node: QtNode, p: { x: number; y: number; payload: number }): void => {
    if (!node.children) {
      node.points.push(p);
      if (node.points.length > capacity && node.depth < maxDepth) subdivide(node);
      return;
    }
    const half = node.size / 2;
    const ix = p.x >= node.x + half ? 1 : 0;
    const iy = p.y >= node.y + half ? 1 : 0;
    insertInto(node.children[iy * 2 + ix], p);
  };
  return {
    insert(px: number, py: number, payload: number): void {
      if (px < root.x || py < root.y || px >= root.x + root.size || py >= root.y + root.size) {
        throw new CadError('punto fuera de los bounds del quadtree');
      }
      insertInto(root, { x: px, y: py, payload });
    },
    query(cx: number, cy: number, r: number): number[] {
      const out: number[] = [];
      const r2 = r * r;
      const visit = (node: QtNode): void => {
        // bounds del nodo vs círculo (AABB test rápido)
        const nearestX = Math.max(node.x, Math.min(cx, node.x + node.size));
        const nearestY = Math.max(node.y, Math.min(cy, node.y + node.size));
        if ((nearestX - cx) * (nearestX - cx) + (nearestY - cy) * (nearestY - cy) > r2) return;
        for (const p of node.points) {
          if ((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy) <= r2) out.push(p.payload);
        }
        if (node.children) for (const ch of node.children) visit(ch);
      };
      visit(root);
      return out.sort((a, b) => a - b);
    },
    count(): number {
      let c = 0;
      const visit = (node: QtNode): void => {
        c += node.points.length;
        if (node.children) node.children.forEach(visit);
      };
      visit(root);
      return c;
    },
    maxDepthUsed(): number {
      return deepest;
    },
  };
}

/* ------------------------------------------------------------------ */
/* B-spline de Boor (uniforme clampeada, NURBS-lite con weights)       */
/* ------------------------------------------------------------------ */

/** Evalúa una B-spline clampeada de grado p en el parámetro t∈[0,1] (de Boor). */
export function bsplineEval(control: ReadonlyArray<GeoPoint2>, degree: number, t: number, weights?: ReadonlyArray<number>): GeoPoint2 {
  const n = control.length;
  if (degree < 1) throw new CadError('grado debe ser >= 1');
  if (degree > 5) throw new CadError('grado debe ser <= 5');
  if (n < degree + 1) throw new CadError(`se necesitan >= ${degree + 1} puntos de control para grado ${degree}`);
  if (!Number.isFinite(t) || t < 0 || t > 1) throw new CadError('t fuera de [0,1]');
  const m = n + degree + 1; // número de nudos
  const knots: number[] = new Array(m);
  for (let i = 0; i <= degree; i++) knots[i] = 0;
  for (let i = degree + 1; i < n; i++) knots[i] = (i - degree) / (n - degree);
  for (let i = n; i < m; i++) knots[i] = 1;
  const tt = t === 1 ? 1 - 1e-12 : t; // evita k+deg fuera de rango en t=1
  // encontrar span k tal que knots[k] <= tt < knots[k+1]
  let k = degree;
  while (k < n - 1 && knots[k + 1] <= tt) k++;
  // de Boor sobre puntos (ponderados si weights)
  const useW = weights !== undefined;
  if (useW && (weights!.length !== n || weights!.some((w) => !Number.isFinite(w) || w <= 0))) {
    throw new CadError('weights inválidos (misma longitud, > 0, finitos)');
  }
  const dx: number[] = new Array(degree + 1);
  const dy: number[] = new Array(degree + 1);
  const dw: number[] = new Array(degree + 1);
  for (let j = 0; j <= degree; j++) {
    const w = useW ? weights![k - degree + j] : 1;
    dw[j] = w;
    dx[j] = control[k - degree + j][0] * w;
    dy[j] = control[k - degree + j][1] * w;
  }
  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const i = k - degree + j;
      const denom = knots[i + degree - r + 1] - knots[i];
      const alpha = denom === 0 ? 0 : (tt - knots[i]) / denom;
      dx[j] = (1 - alpha) * dx[j - 1] + alpha * dx[j];
      dy[j] = (1 - alpha) * dy[j - 1] + alpha * dy[j];
      dw[j] = (1 - alpha) * dw[j - 1] + alpha * dw[j];
    }
  }
  const wFinal = useW ? dw[degree] : 1;
  return [dx[degree] / wFinal, dy[degree] / wFinal];
}

/* ------------------------------------------------------------------ */
/* CAD-lite: extrude / revolve -> GeoMesh                              */
/* ------------------------------------------------------------------ */

/** Extruye un perfil 2D (plano XY) a lo largo de Z. Tapa por abanico desde el centroide. */
export function extrudeMesh(profile: ReadonlyArray<GeoPoint2>, height: number, caps = true): import('./geometry').GeoMesh {
  if (profile.length < 3) throw new CadError('perfil necesita >=3 puntos');
  if (!(height > 0) || !Number.isFinite(height)) throw new CadError('height debe ser positivo finito');
  const n = profile.length;
  const vertices: number[][] = [];
  const faces: Array<[number, number, number]> = [];
  for (const p of profile) vertices.push([p[0], p[1], 0]);
  for (const p of profile) vertices.push([p[0], p[1], height]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([i, j, n + j]);
    faces.push([i, n + j, n + i]);
  }
  if (caps) {
    let cx = 0;
    let cy = 0;
    for (const p of profile) {
      cx += p[0];
      cy += p[1];
    }
    cx /= n;
    cy /= n;
    const bottomCap = vertices.length;
    vertices.push([cx, cy, 0]);
    const topCap = vertices.length;
    vertices.push([cx, cy, height]);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([bottomCap, j, i]); // tapa inferior (mirando -Z)
      faces.push([topCap, n + i, n + j]); // tapa superior (mirando +Z)
    }
  }
  return { vertices, faces };
}

/** Revoluciona un perfil [radio, altura] alrededor del eje Y (lathe). */
export function revolveMesh(profile: ReadonlyArray<GeoPoint2>, segments = 24): import('./geometry').GeoMesh {
  if (profile.length < 2) throw new CadError('perfil necesita >=2 puntos');
  const seg = Math.floor(segments);
  if (seg < 3 || seg > 256) throw new CadError('segments fuera de [3,256]');
  const vertices: number[][] = [];
  const faces: Array<[number, number, number]> = [];
  for (const p of profile) {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) throw new CadError('punto no finito');
    for (let s = 0; s < seg; s++) {
      const ang = (s / seg) * Math.PI * 2;
      vertices.push([p[0] * Math.cos(ang), p[1], p[0] * Math.sin(ang)]);
    }
  }
  for (let ring = 0; ring + 1 < profile.length; ring++) {
    for (let s = 0; s < seg; s++) {
      const s2 = (s + 1) % seg;
      const a = ring * seg + s;
      const b = ring * seg + s2;
      const c = (ring + 1) * seg + s2;
      const d = (ring + 1) * seg + s;
      if (profile[ring][0] === 0 && profile[ring + 1][0] === 0) continue; // segmento degenerado en eje
      if (profile[ring][0] === 0) {
        faces.push([a, b, c]); // triángulo hacia polo inferior
      } else if (profile[ring + 1][0] === 0) {
        faces.push([a, b, d]); // triángulo hacia polo superior
      } else {
        faces.push([a, b, c]);
        faces.push([a, c, d]);
      }
    }
  }
  return { vertices, faces };
}
