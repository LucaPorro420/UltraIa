/**
 * sdf — Signed Distance Fields + ray marching (capability `sdf`)
 *
 * Fuente: learning/sources/fundamentos-programacion.md §A12-A13 (núcleo procedural):
 *   "para cada píxel: distancia al centro → pertenece a superficie → iluminación → color".
 *   SDF: d(x,y,z) distancia aproximada a superficie; primitivas sphere()/box()/torus()/capsule();
 *   combinación: union=min(dA,dB), intersection=max(dA,dB). Ray marching: rayo → función de
 *   distancia → avanzar → intersección → normal → iluminación → píxel.
 *
 * Port ORIGINAL de los PRINCIPIOS (nada de código copiado; las fórmulas SDF son matemática
 * estándar de la comunidad — Inigo Quilez, dominio público). Determinista, keyless, sin deps
 * (patrón codevfx del repo): planSdfScene → SdfScenePlan, sdfSceneGlsl (GLSL codegen),
 * rayMarchPlan (planner), renderSdfHtml (HTML5 canvas 2D autocontenido, ray marching software).
 */

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export const SDF_PRIMITIVES = ['sphere', 'box', 'torus', 'capsule', 'plane'] as const;
export type SdfPrimitiveKind = (typeof SDF_PRIMITIVES)[number];

export const SDF_OPS = ['union', 'intersection', 'subtract', 'smooth'] as const;
export type SdfOpKind = (typeof SDF_OPS)[number];

export type SdfVec3 = [number, number, number];

export type SdfPrimitive = {
  kind: SdfPrimitiveKind;
  pos: SdfVec3;
  color: string; // hex #rrggbb
  /** Parámetros específicos por kind. */
  params: { radius?: number; half?: SdfVec3; r1?: number; r2?: number; a?: SdfVec3; b?: SdfVec3; height?: number };
};

export type SdfOp = {
  op: SdfOpKind;
  /** Índices de primitivas (o sub-árboles) que combina. */
  targets: [number, number];
  /** Suavizado para 'smooth' (radio de fusión). */
  k?: number;
};

export type SdfCamera = { fov: number; distance: number; tilt: number };

export type SdfSceneInput = {
  primitives: SdfPrimitive[];
  ops?: SdfOp[];
  /** Índice raíz del árbol (por defecto 0). */
  root?: number;
  camera?: Partial<SdfCamera>;
  steps?: number;
};

export type SdfScenePlan = {
  primitives: SdfPrimitive[];
  ops: SdfOp[];
  root: number;
  camera: SdfCamera;
  steps: number;
  epsilon: number;
  maxDist: number;
  /** Paleta derivada de los materiales de la escena. */
  palette: { base: string; accent: string; energy: string };
  aspect: string;
  /** Descripción humana del árbol (para el modelo). */
  formula: string;
  /** GLSL codegen (referencia). */
  glsl: string;
};

export type RayMarchPlan = {
  steps: number;
  epsilon: number;
  maxDist: number;
  marchMode: 'sphere-tracing';
  resolution: { w: number; h: number };
  /** Estimación determinista de coste por frame (píxeles × pasos × primitivas). */
  estOpsPerFrame: number;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return [139, 92, 246];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function vecLen(v: SdfVec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function vecSub(a: SdfVec3, b: SdfVec3): SdfVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vecAbs(v: SdfVec3): SdfVec3 {
  return [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
}

function vecMax(a: SdfVec3, b: SdfVec3): SdfVec3 {
  return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
}

function vecDot(a: SdfVec3, b: SdfVec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/* ------------------------------------------------------------------ */
/* Primitivas SDF (matemática estándar, dominio público)               */
/* ------------------------------------------------------------------ */

/** Esfera: length(p) - r */
export function sdSphere(p: SdfVec3, c: SdfVec3, r: number): number {
  return vecLen(vecSub(p, c)) - r;
}

/** Caja: length(max(|p|-b,0)) + min(max(q.x,q.y,q.z),0) */
export function sdBox(p: SdfVec3, c: SdfVec3, b: SdfVec3): number {
  const q = vecSub(vecAbs(vecSub(p, c)), b);
  return vecLen(vecMax(q, [0, 0, 0])) + Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0);
}

/** Torus: length(vec2(length(p.xz)-r1, p.y)) - r2 */
export function sdTorus(p: SdfVec3, c: SdfVec3, r1: number, r2: number): number {
  const q = vecSub(p, c);
  const xz = Math.sqrt(q[0] * q[0] + q[2] * q[2]);
  return Math.sqrt((xz - r1) * (xz - r1) + q[1] * q[1]) - r2;
}

/** Cápsula: length(p - clamp(dot(pa,ba)/dot(ba,ba),0,1)*ba) - r */
export function sdCapsule(p: SdfVec3, c: SdfVec3, a: SdfVec3, b: SdfVec3, r: number): number {
  const pa = vecSub(vecSub(p, c), a);
  const ba = vecSub(b, a);
  const h = clamp(vecDot(pa, ba) / vecDot(ba, ba), 0, 1);
  return vecLen(vecSub(pa, [ba[0] * h, ba[1] * h, ba[2] * h])) - r;
}

/** Plano (normal +Y): p.y - h */
export function sdPlane(p: SdfVec3, h: number): number {
  return p[1] - h;
}

/* ------------------------------------------------------------------ */
/* Operaciones (combinación de distancias)                             */
/* ------------------------------------------------------------------ */

export const opUnion = (a: number, b: number): number => Math.min(a, b);
export const opIntersection = (a: number, b: number): number => Math.max(a, b);
export const opSubtract = (a: number, b: number): number => Math.max(a, -b);

/** Smooth union (polynomial, IQ): min con radio de fusión k. */
export function opSmoothUnion(a: number, b: number, k: number): number {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}

/* ------------------------------------------------------------------ */
/* Eval: árbol de la escena en un punto p                              */
/* ------------------------------------------------------------------ */

export interface SdfHit {
  d: number;
  /** Índice de la primitiva más cercana en la hoja ganadora. */
  material: number;
}

/**
 * Evalúa el árbol de la escena en p. Convención de árbol (determinista):
 * la PRIMERA op en orden que contiene a un índice es su productor; al expandir
 * un target se excluye el productor del padre (evita retroceso/ciclos), de modo
 * que union[0,1] + smooth[1,2] con root 0 evalúa union(0, smooth(1,2)).
 */
export function evalSdf(primitives: SdfPrimitive[], ops: SdfOp[], root: number, p: SdfVec3): SdfHit {
  const leaf = (idx: number): SdfHit => {
    const prim = primitives[idx];
    if (!prim) return { d: Number.POSITIVE_INFINITY, material: 0 };
    let d: number;
    switch (prim.kind) {
      case 'sphere':
        d = sdSphere(p, prim.pos, prim.params.radius ?? 1);
        break;
      case 'box':
        d = sdBox(p, prim.pos, prim.params.half ?? [1, 1, 1]);
        break;
      case 'torus':
        d = sdTorus(p, prim.pos, prim.params.r1 ?? 0.5, prim.params.r2 ?? 0.25);
        break;
      case 'capsule':
        d = sdCapsule(p, prim.pos, prim.params.a ?? [-0.5, 0, 0], prim.params.b ?? [0.5, 0, 0], prim.params.radius ?? 0.25);
        break;
      case 'plane':
        d = sdPlane(p, prim.params.height ?? 0);
        break;
      default:
        d = Number.POSITIVE_INFINITY;
    }
    return { d, material: idx };
  };

  const combine = (op: SdfOp, a: SdfHit, b: SdfHit): SdfHit => {
    switch (op.op) {
      case 'union':
        return a.d <= b.d ? a : b;
      case 'intersection':
        return a.d >= b.d ? a : b;
      case 'subtract':
        return a.d >= -b.d ? a : { d: -b.d, material: b.material };
      case 'smooth': {
        const k = op.k ?? 0.2;
        const h = clamp(0.5 + (0.5 * (b.d - a.d)) / k, 0, 1);
        const d = b.d * (1 - h) + a.d * h - k * h * (1 - h);
        return { d, material: a.d <= b.d ? a.material : b.material };
      }
      default:
        return a;
    }
  };

  const evalNode = (idx: number, parentOp: SdfOp | null): SdfHit => {
    const prod = ops.find((o) => o !== parentOp && o.targets.includes(idx));
    if (!prod) return leaf(idx);
    const other = prod.targets[0] === idx ? prod.targets[1] : prod.targets[0];
    return combine(prod, leaf(idx), evalNode(other, prod));
  };

  return evalNode(root, null);
}

/* ------------------------------------------------------------------ */
/* planSdfScene                                                        */
/* ------------------------------------------------------------------ */

const PRIM_DEFAULTS: Record<SdfPrimitiveKind, Omit<SdfPrimitive, 'kind' | 'pos' | 'color'>> = {
  sphere: { params: { radius: 1 } },
  box: { params: { half: [1, 1, 1] } },
  torus: { params: { r1: 0.5, r2: 0.25 } },
  capsule: { params: { a: [-0.5, 0, 0], b: [0.5, 0, 0], radius: 0.25 } },
  plane: { params: { height: 0 } },
};

const OPS_SYMBOL: Record<SdfOpKind, string> = {
  union: 'U',
  intersection: '∩',
  subtract: '−',
  smooth: 'smooth',
};

export function planSdfScene(input: SdfSceneInput): SdfScenePlan {
  if (!input.primitives || input.primitives.length === 0) {
    throw new Error('planSdfScene requiere al menos 1 primitiva');
  }
  const primitives = input.primitives.map((p) => {
    if (!SDF_PRIMITIVES.includes(p.kind)) throw new Error(`primitiva desconocida: ${String(p.kind)}`);
    const d = PRIM_DEFAULTS[p.kind];
    const params = { ...d.params, ...p.params };
    // Validación de parámetros positivos
    if (p.kind === 'sphere' || p.kind === 'capsule') {
      const r = params.radius ?? 1;
      if (r <= 0) throw new Error(`radio de ${p.kind} debe ser > 0`);
    }
    if (p.kind === 'box') {
      const half = params.half ?? [1, 1, 1];
      if (half.some((v) => v <= 0)) throw new Error('half de box debe ser > 0');
    }
    if (p.kind === 'torus') {
      if ((params.r1 ?? 0.5) <= 0 || (params.r2 ?? 0.25) <= 0) throw new Error('r1/r2 de torus deben ser > 0');
    }
    return { kind: p.kind, pos: p.pos, color: p.color, params };
  });

  const ops: SdfOp[] = (input.ops ?? []).map((o) => {
    if (!SDF_OPS.includes(o.op)) throw new Error(`operación desconocida: ${String(o.op)}`);
    const maxIdx = primitives.length - 1;
    if (o.targets.some((t) => t < 0 || t > maxIdx)) {
      throw new Error(`targets fuera de rango (0..${maxIdx})`);
    }
    if (o.op === 'smooth' && ((o.k ?? 0.2) <= 0)) throw new Error('k de smooth debe ser > 0');
    return { op: o.op, targets: o.targets, k: o.k };
  });

  const root = input.root ?? 0;
  if (root < 0 || root > maxIdx(primitives, ops)) throw new Error('root fuera de rango');

  const fov = clamp(input.camera?.fov ?? 60, 30, 120);
  const distance = Math.max(2, input.camera?.distance ?? 8);
  const tilt = clamp(input.camera?.tilt ?? 15, -45, 45);
  const steps = clamp(Math.round(input.steps ?? 64), 16, 256);

  // Paleta: material 0 = base, último = energy, resto = accent (por luminancia).
  const colors = primitives.map((p) => p.color);
  const base = colors[0] ?? '#8b5cf6';
  const energy = colors[colors.length - 1] ?? base;
  const accent = colors[Math.min(1, colors.length - 1)] ?? base;

  // Fórmula humana: árbol de ops con índices de primitivas.
  const formula = describeTree(primitives, ops, root);

  return {
    primitives,
    ops,
    root,
    camera: { fov, distance, tilt },
    steps,
    epsilon: 0.001,
    maxDist: 40,
    palette: { base, accent, energy },
    aspect: '16:9',
    formula,
    glsl: sdfSceneGlsl({ primitives, ops, root, camera: { fov, distance, tilt }, steps, epsilon: 0.001, maxDist: 40, palette: { base, accent, energy }, aspect: '16:9', formula, glsl: '' }),
  };
}

function maxIdx(primitives: SdfPrimitive[], ops: SdfOp[]): number {
  const opIdx = ops.flatMap((o) => o.targets);
  return Math.max(primitives.length - 1, ...opIdx);
}

function describeTree(primitives: SdfPrimitive[], ops: SdfOp[], root: number): string {
  const name = (i: number) => `${primitives[i]?.kind}[${i}]`;
  const used = new Set<number>();
  for (const o of ops) o.targets.forEach((t) => used.add(t));
  if (!used.has(root)) return name(root);
  // Mismo modelo que evalSdf: la primera op que contiene el índice (excluyendo
  // el padre) lo produce; el otro target se expande recursivamente.
  const describeNode = (idx: number, parentOp: SdfOp | null): string => {
    const prod = ops.find((o) => o !== parentOp && o.targets.includes(idx));
    if (!prod) return name(idx);
    const other = prod.targets[0] === idx ? prod.targets[1] : prod.targets[0];
    const sym = prod.op === 'smooth' ? `smooth(${prod.k ?? 0.2})` : OPS_SYMBOL[prod.op];
    return `(${name(idx)} ${sym} ${describeNode(other, prod)})`;
  };
  return describeNode(root, null);
}

/* ------------------------------------------------------------------ */
/* sdfSceneGlsl — codegen de referencia                                */
/* ------------------------------------------------------------------ */

export function sdfSceneGlsl(plan: SdfScenePlan): string {
  const fns = new Set<string>(['sdSphere', 'sdBox', 'sdTorus', 'sdCapsule', 'sdPlane', 'opUnion', 'opIntersection', 'opSubtract', 'opSmoothUnion']);
  const used = new Set<string>();
  for (const p of plan.primitives) used.add(p.kind);
  for (const o of plan.ops) used.add(o.op);

  const body: string[] = [];
  plan.primitives.forEach((p, i) => {
    switch (p.kind) {
      case 'sphere':
        body.push(`  d = min(d, sdSphere(p, SdfVec3(${p.pos.join(',')}), ${p.params.radius})); // [${i}]`);
        break;
      case 'box':
        body.push(`  d = min(d, sdBox(p, SdfVec3(${p.pos.join(',')}), SdfVec3(${p.params.half!.join(',')}))); // [${i}]`);
        break;
      case 'torus':
        body.push(`  d = min(d, sdTorus(p, SdfVec3(${p.pos.join(',')}), ${p.params.r1}, ${p.params.r2})); // [${i}]`);
        break;
      case 'capsule':
        body.push(`  d = min(d, sdCapsule(p, SdfVec3(${p.pos.join(',')}), SdfVec3(${p.params.a!.join(',')}), SdfVec3(${p.params.b!.join(',')}), ${p.params.radius})); // [${i}]`);
        break;
      case 'plane':
        body.push(`  d = min(d, sdPlane(p, ${p.params.height})); // [${i}]`);
        break;
    }
  });
  // Nota: el árbol real con ops se documenta en la fórmula humana; el GLSL expone la
  // escena como mínimo (todas las primitivas) + las ops disponibles para composición.
  const opNotes = plan.ops.map((o) => `// op ${o.op}(${o.targets.join(',')})${o.op === 'smooth' ? `, k=${o.k}` : ''}`).join('\n');
  return `// SDF scene (referencia GLSL, patrón Inigo Quilez — dominio público)
float map(SdfVec3 p) {
  float d = 1e9;
${body.join('\n')}
  return d;
}
${opNotes}
${used.has('union') ? 'float opUnion(float a, float b) { return min(a, b); }' : ''}
${used.has('intersection') ? 'float opIntersection(float a, float b) { return max(a, b); }' : ''}
${used.has('subtract') ? 'float opSubtract(float a, float b) { return max(a, -b); }' : ''}
${used.has('smooth') ? 'float opSmoothUnion(float a, float b, float k) { float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0-h); }' : ''}
${used.has('sphere') ? 'float sdSphere(SdfVec3 p, SdfVec3 c, float r) { return length(p-c) - r; }' : ''}
${used.has('box') ? 'float sdBox(SdfVec3 p, SdfVec3 c, SdfVec3 b) { SdfVec3 q = abs(p-c) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }' : ''}
${used.has('torus') ? 'float sdTorus(SdfVec3 p, SdfVec3 c, float r1, float r2) { SdfVec3 q = p - c; float xz = length(q.xz); return length(vec2(xz - r1, q.y)) - r2; }' : ''}
${used.has('capsule') ? 'float sdCapsule(SdfVec3 p, SdfVec3 c, SdfVec3 a, SdfVec3 b, float r) { SdfVec3 pa = p - c - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h) - r; }' : ''}
${used.has('plane') ? 'float sdPlane(SdfVec3 p, float h) { return p.y - h; }' : ''}
// normal por diferencias centrales
SdfVec3 calcNormal(SdfVec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.001;
  return normalize(SdfVec3(e.x, e.y, e.y) * map(p + e.xyy) +
                   SdfVec3(e.y, e.x, e.y) * map(p + e.yxy) +
                   SdfVec3(e.y, e.y, e.x) * map(p + e.yyx) +
                   SdfVec3(e.x, e.x, e.x) * map(p + e.xxx));
}`;
}

/* ------------------------------------------------------------------ */
/* rayMarchPlan — planner de render                                    */
/* ------------------------------------------------------------------ */

export function rayMarchPlan(plan: SdfScenePlan): RayMarchPlan {
  const steps = clamp(plan.steps, 16, 256);
  const w = 480;
  const h = Math.round((w * 9) / 16); // 16:9
  const primCount = plan.primitives.length;
  const estOpsPerFrame = w * h * steps * primCount;
  return {
    steps,
    epsilon: plan.epsilon,
    maxDist: plan.maxDist,
    marchMode: 'sphere-tracing',
    resolution: { w, h },
    estOpsPerFrame,
  };
}

/* ------------------------------------------------------------------ */
/* renderSdfHtml — HTML5 canvas 2D autocontenido (ray marching soft)   */
/* ------------------------------------------------------------------ */

export function renderSdfHtml(plan: SdfScenePlan, opts: { width?: number; height?: number; title?: string } = {}): string {
  const w = opts.width ?? 640;
  const h = opts.height ?? 360;
  const title = opts.title ?? `sdf — ${plan.formula}`;
  const glsl = plan.glsl.replace(/"/g, "'");

  const sceneJson = JSON.stringify({
    primitives: plan.primitives.map((p) => ({ kind: p.kind, pos: p.pos, color: p.color, params: p.params })),
    ops: plan.ops,
    root: plan.root,
    fov: plan.camera.fov,
    distance: plan.camera.distance,
    tilt: plan.camera.tilt,
    steps: plan.steps,
    epsilon: plan.epsilon,
    maxDist: plan.maxDist,
  });

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  html,body{margin:0;height:100%;background:#08080a;overflow:hidden}
  canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:none}
  canvas:active{cursor:grabbing}
  .tag{position:fixed;left:10px;bottom:8px;font:11px ui-monospace,monospace;color:#8b8b98;opacity:.85;max-width:70%}
  .kbd{position:fixed;right:10px;bottom:8px;font:11px ui-monospace,monospace;color:#8b5cf6}
</style>
</head>
<body>
<canvas id="sdf" role="img" aria-label="Render SDF por ray marching: ${plan.formula}"></canvas>
<div class="tag">${plan.formula} — SDF + ray marching, 100% código</div>
<div class="kbd">drag rotar · wheel zoom · R reset</div>
<script>
// GLSL de referencia (comentado):
// ${glsl.replace(/\n/g, '\n// ')}
const SCENE = ${sceneJson};
const cv = document.getElementById('sdf');
const ctx = cv.getContext('2d');
function fit(){ const d = Math.min(window.devicePixelRatio||1, 2); cv.width = innerWidth*d; cv.height = innerHeight*d; }
fit(); addEventListener('resize', fit);
// Matémática SDF (misma que el GLSL de referencia, en JS puro)
const V = {
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  abs:v=>[Math.abs(v[0]),Math.abs(v[1]),Math.abs(v[2])],
  max:(a,b)=>[Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.max(a[2],b[2])],
  len:v=>Math.hypot(v[0],v[1],v[2]),
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
};
function map(p){
  const P = SCENE.primitives, OPS = SCENE.ops;
  const leaf = i => {
    const prim = P[i];
    let d;
    switch(prim.kind){
      case 'sphere': d = V.len(V.sub(p, prim.pos)) - (prim.params.radius||1); break;
      case 'box': { const b = prim.params.half||[1,1,1]; const z = V.sub(V.abs(V.sub(p, prim.pos)), b); d = V.len(V.max(z,[0,0,0])) + Math.min(Math.max(z[0],Math.max(z[1],z[2])),0); break; }
      case 'torus': { const q = V.sub(p, prim.pos); const xz = Math.hypot(q[0], q[2]); d = Math.hypot(xz-(prim.params.r1||.5), q[1]) - (prim.params.r2||.25); break; }
      case 'capsule': { const q = V.sub(p, prim.pos); const a = prim.params.a||[-.5,0,0], b = prim.params.b||[.5,0,0], r = prim.params.radius||.25; const pa=V.sub(q,a), ba=V.sub(b,a); const h=Math.min(Math.max(V.dot(pa,ba)/V.dot(ba,ba),0),1); d = V.len(V.sub(pa,[ba[0]*h,ba[1]*h,ba[2]*h]))-r; break; }
      case 'plane': d = V.sub(p, prim.pos)[1] - (prim.params.height||0); break;
      default: d = 1e9;
    }
    return { d, m: i };
  };
  const combine = (op, a, b) => {
    switch(op.op){
      case 'union': return a.d<=b.d ? a : b;
      case 'intersection': return a.d>=b.d ? a : b;
      case 'subtract': return a.d>=-b.d ? a : {d:-b.d, m:b.m};
      case 'smooth': { const k=op.k||.2; const h=Math.min(Math.max(.5+.5*(b.d-a.d)/k,0),1); const d=b.d*(1-h)+a.d*h-k*h*(1-h); return {d, m: a.d<=b.d?a.m:b.m}; }
    }
    return a;
  };
  // árbol: primera op que contiene el índice (excluyendo el padre) lo produce;
  // el otro target se expande recursivamente.
  const evalNode = (i, parent) => {
    const prod = OPS.find(o => o !== parent && o.targets.includes(i));
    if (!prod) return leaf(i);
    const other = prod.targets[0]===i ? prod.targets[1] : prod.targets[0];
    return combine(prod, leaf(i), evalNode(other, prod));
  };
  return evalNode(SCENE.root, null);
}
function normal(p){
  const e = 0.001;
  const dx = map([p[0]+e,p[1],p[2]]).d - map([p[0]-e,p[1],p[2]]).d;
  const dy = map([p[0],p[1]+e,p[2]]).d - map([p[0],p[1]-e,p[2]]).d;
  const dz = map([p[0],p[1],p[2]+e]).d - map([p[0],p[1],p[2]-e]).d;
  const l = Math.hypot(dx,dy,dz)||1;
  return [dx/l, dy/l, dz/l];
}
function hex(c){ const n=parseInt(c.slice(1),16); return [n>>16&255, n>>8&255, n&255]; }
let theta = .6, phi = .35, dist = SCENE.distance;
let dragging = false, px = 0, py = 0;
cv.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', e => {
  if (!dragging) return;
  theta += (e.clientX - px) * .008; phi = Math.min(Math.max(phi + (e.clientY - py) * .008, -1.2), 1.2);
  px = e.clientX; py = e.clientY;
});
addEventListener('wheel', e => { dist = Math.min(Math.max(dist + e.deltaY * .008, 2), 30); e.preventDefault(); }, {passive:false});
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'r') { theta = .6; phi = .35; dist = SCENE.distance; } });
const LIGHT = [.5, .8, .35];
function shade(p, n, m){
  const c = hex(SCENE.primitives[m].color);
  const l = LIGHT, nl = Math.hypot(l[0],l[1],l[2]);
  const ln = [l[0]/nl, l[1]/nl, l[2]/nl];
  const diff = Math.max(V.dot(n, ln), 0);
  const amb = .18;
  const refl = V.sub([2*diff*ln[0]-n[0], 2*diff*ln[1]-n[1], 2*diff*ln[2]-n[2]]);
  const vv = V.sub([0,0,dist], p); const vl = Math.hypot(vv[0],vv[1],vv[2])||1;
  const spec = Math.pow(Math.max(V.dot(refl, [vv[0]/vl, vv[1]/vl, vv[2]/vl]), 0), 24) * .35;
  const fog = Math.min(1, 28 / Math.max(p[2], 1));
  const k = (amb + diff * .8) * fog + spec;
  return [Math.min(255, c[0]*k), Math.min(255, c[1]*k), Math.min(255, c[2]*k)];
}
function frame(){
  const W = cv.width, H = cv.height, sw = 480, sh = Math.round(sw*H/W);
  const img = ctx.createImageData(sw, sh);
  const cy = Math.cos(phi), sy = Math.sin(phi), ct = Math.cos(theta), st = Math.sin(theta);
  // base de cámara (orbital) + tilt
  const fwd = [ -cy*st, sy, -cy*ct ];
  const right = [ ct, 0, -st ];
  const up = [ -sy*st, -cy, -sy*ct ];
  const origin = [ fwd[0]*dist, fwd[1]*dist, fwd[2]*dist ];
  const fov = SCENE.fov * Math.PI / 180;
  const tanHalf = Math.tan(fov/2);
  for (let y = 0; y < sh; y++){
    for (let x = 0; x < sw; x++){
      const u = (x/sw*2 - 1) * tanHalf * (sw/sh);
      const v = (1 - y/sh*2) * tanHalf;
      const dir = [ fwd[0] + right[0]*u + up[0]*v, fwd[1] + right[1]*u + up[1]*v, fwd[2] + right[2]*u + up[2]*v ];
      const dl = Math.hypot(dir[0],dir[1],dir[2]);
      const rd = [dir[0]/dl, dir[1]/dl, dir[2]/dl];
      let t = 0, hit = null;
      for (let s = 0; s < SCENE.steps; s++){
        const p = [ origin[0]+rd[0]*t, origin[1]+rd[1]*t, origin[2]+rd[2]*t ];
        const m = map(p);
        if (m.d < SCENE.epsilon){ hit = { p, m }; break; }
        t += m.d;
        if (t > SCENE.maxDist) break;
      }
      const i = (y*sw + x) * 4;
      if (hit){
        const n = normal(hit.p);
        const col = shade(hit.p, n, hit.m.m);
        img.data[i] = col[0]; img.data[i+1] = col[1]; img.data[i+2] = col[2]; img.data[i+3] = 255;
      } else {
        img.data[i] = 8; img.data[i+1] = 8; img.data[i+2] = 10; img.data[i+3] = 255;
      }
    }
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(makeCanvas(img, sw, sh), 0, 0, W, H);
  requestAnimationFrame(frame);
}
function makeCanvas(img, w, h){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}
frame();
</script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export const sdf = {
  SDF_PRIMITIVES,
  SDF_OPS,
  sdSphere,
  sdBox,
  sdTorus,
  sdCapsule,
  sdPlane,
  opUnion,
  opIntersection,
  opSubtract,
  opSmoothUnion,
  evalSdf,
  planSdfScene,
  sdfSceneGlsl,
  rayMarchPlan,
  renderSdfHtml,
};