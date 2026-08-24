/**
 * physics2d â€” Física 2D determinista en TypeScript puro (Motor Evolutivo, tarea #94).
 *
 * Port ORIGINAL de los PRINCIPIOS del manual "Motor Evolutivo" capítulo Física
 * (learning/sources/motor-evolutivo.md) â€” nada de código de terceros copiado.
 * Patrones elegidos (docs/RAZONAMIENTO-MOTOR-EVOLUTIVO.md §3):
 *   - Capa partículas: Verlet POSICIONAL estilo Pezza (velocidad implícita = pos - prevPos,
 *     substeps fijos, corrección posicional â€” estabilidad incondicional, bit-exact).
 *   - Capa rígidos: impulsos lineage box2d-lite (círculo/AABB, restitución 0..1 +
 *     fricción tangencial clampeada por mu*j, corrección posicional Baumgarte).
 *
 * Garantías:
 *   - DETERMINISTA: sin Math.random, sin Date.now(), sin estado global. Misma entrada ->
 *     mismo estado final byte-exact (testeado con JSON.stringify).
 *   - PURO: todas las funciones son (estado, config) -> nuevo estado (inmutables).
 *   - SERIALIZABLE: estados son JSON plano (persistibles en brainpage/vault).
 *   - KEYLESS: sin red, sin ffmpeg, sin deps.
 */

import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Esquemas zod (validación fail-soft de entradas externas)            */
/* ------------------------------------------------------------------ */

export const vec2Schema = z.tuple([z.number(), z.number()]);

export const verletParticleSchema = z.object({
  x: z.number(),
  y: z.number(),
  /** Posición previa (velocidad implícita = pos - prevPos). Default: arranca en reposo en (x,y). */
  px: z.number().default(0),
  py: z.number().default(0),
  ax: z.number().default(0),
  ay: z.number().default(0),
  radius: z.number().positive().max(10_000),
});

export const verletContainerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circle'), cx: z.number(), cy: z.number(), radius: z.number().positive() }),
  z.object({ kind: z.literal('rect'), x: z.number(), y: z.number(), width: z.number().positive(), height: z.number().positive() }),
]);

export const verletLinkSchema = z.object({
  a: z.number().int().nonnegative(),
  b: z.number().int().nonnegative(),
  length: z.number().nonnegative(),
});

export const verletStateSchema = z.object({
  particles: z.array(verletParticleSchema),
  links: z.array(verletLinkSchema).default([]),
});

export const verletConfigSchema = z.object({
  gravity: vec2Schema.default([0, 980]),
  dt: z.number().positive().max(1).default(1 / 60),
  substeps: z.number().int().min(1).max(64).default(8),
  /** Amortiguación por substep aplicada a la velocidad implícita (1 = sin fricción de aire). */
  damping: z.number().min(0).max(1).default(1),
  /** Coeficiente de respuesta en colisión partícula-partícula (Pezza usa 0.75). */
  responseCoef: z.number().min(0).max(1).default(0.75),
});

export const rigidShapeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('circle'), r: z.number().positive() }),
  z.object({ kind: z.literal('box'), hw: z.number().positive(), hh: z.number().positive() }),
]);

export const rigidBodySchema = z.object({
  id: z.string().min(1).max(64),
  shape: rigidShapeSchema,
  x: z.number(),
  y: z.number(),
  vx: z.number().default(0),
  vy: z.number().default(0),
  density: z.number().positive().max(1e6).default(1),
  restitution: z.number().min(0).max(1).default(0.4),
  friction: z.number().min(0).max(1).default(0.35),
  isStatic: z.boolean().default(false),
});

export const rigidStateSchema = z.object({
  bodies: z.array(rigidBodySchema),
});

/** Timestep fijo de la capa rígida (60 Hz). Declarado ANTES de rigidConfigSchema:
 *  el esquema evalúa `.default(RIGID_DT)` en carga de módulo y una `const` posterior
 *  estaría en zona muerta temporal (ReferenceError al importar). */
export const RIGID_DT = 1 / 60;

export const rigidConfigSchema = z.object({
  gravity: vec2Schema.default([0, 980]),
  dt: z.number().positive().max(1).default(RIGID_DT),
  /** Corrección posicional Baumgarte: fracción de penetración corregida por paso. */
  percent: z.number().min(0).max(1).default(0.8),
  /** Tolerancia de penetración permitida antes de corregir (evita jitter en reposo). */
  slop: z.number().min(0).default(0.01),
  /** Iteraciones de resolución par-a-par por frame (impulsos secuenciales box2d-lite).
   *  Una sola pasada deja pilas inestables: la energía crece frame a frame. */
  iterations: z.number().int().min(1).max(32).default(4),
});

const EPS = 1e-12;

export type Vec2 = [number, number];
export type VerletParticle = z.infer<typeof verletParticleSchema>;
export type VerletContainer = z.infer<typeof verletContainerSchema>;
export type VerletLink = z.infer<typeof verletLinkSchema>;
export type VerletState = z.infer<typeof verletStateSchema>;
export type VerletConfig = z.input<typeof verletConfigSchema>;
export type VerletConfigResolved = z.output<typeof verletConfigSchema>;
export type RigidShape = z.infer<typeof rigidShapeSchema>;
export type RigidBody = z.infer<typeof rigidBodySchema>;
export type RigidState = z.infer<typeof rigidStateSchema>;
export type RigidConfig = z.input<typeof rigidConfigSchema>;
export type RigidConfigResolved = z.output<typeof rigidConfigSchema>;

/* ------------------------------------------------------------------ */
/* Capa VERLET (partículas posicionales)                               */
/* ------------------------------------------------------------------ */

/**
 * Un paso COMPLETO de simulación Verlet (frame): divide dt en `substeps` fijos y en cada
 * substep ejecuta gravedad -> integrar -> constraint de contenedor -> links -> colisiones.
 * Devuelve un NUEVO estado (el de entrada no se muta).
 */
export function stepVerlet(
  state: VerletState,
  container: VerletContainer,
  config?: VerletConfig,
): VerletState {
  const cfg: VerletConfigResolved = verletConfigSchema.parse(config ?? {});
  let particles = state.particles.map(cloneVerletParticle);
  const links = state.links.map((l) => ({ ...l }));
  const dts = cfg.dt / cfg.substeps;
  const dts2 = dts * dts;

  for (let s = 0; s < cfg.substeps; s++) {
    // 1) Gravedad -> aceleración acumulada
    for (const p of particles) {
      p.ax += cfg.gravity[0];
      p.ay += cfg.gravity[1];
    }
    // 2) Integración Verlet: v implícita = pos - prevPos; pos' = pos + v + a*dt^2
    for (const p of particles) {
      const vx = (p.x - p.px) * cfg.damping;
      const vy = (p.y - p.py) * cfg.damping;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + p.ax * dts2;
      p.y += vy + p.ay * dts2;
      p.ax = 0;
      p.ay = 0;
    }
    // 3) Constraint de contenedor (proyección al interior)
    particles = particles.map((p) => constrainToContainer(p, container));
    // 4) Links tipo stick (corrección simétrica ponderada por radio^2 como masa)
    solveLinks(particles, links);
    // 5) Colisiones partícula-partícula (separación posicional)
    solveParticleCollisions(particles, cfg.responseCoef);
  }

  return { particles, links };
}

function cloneVerletParticle(p: VerletParticle): VerletParticle {
  // Normaliza px/py ausentes (arranque en reposo) aunque el llamante omita parse()
  return { ...p, px: p.px ?? p.x, py: p.py ?? p.y };
}

function constrainToContainer(p: VerletParticle, c: VerletContainer): VerletParticle {
  if (c.kind === 'circle') {
    const dx = p.x - c.cx;
    const dy = p.y - c.cy;
    const dist = Math.hypot(dx, dy);
    const maxDist = c.radius - p.radius;
    if (dist > maxDist && dist > EPS) {
      const k = maxDist / dist;
      return { ...p, x: c.cx + dx * k, y: c.cy + dy * k, px: p.px, py: p.py };
    }
    return p;
  }
  const minX = c.x + p.radius;
  const maxX = c.x + c.width - p.radius;
  const minY = c.y + p.radius;
  const maxY = c.y + c.height - p.radius;
  const out: VerletParticle = { ...p };
  if (out.x < minX) out.x = minX;
  else if (out.x > maxX) out.x = maxX;
  if (out.y < minY) out.y = minY;
  else if (out.y > maxY) out.y = maxY;
  return out;
}

function solveLinks(particles: VerletParticle[], links: VerletLink[]): void {
  for (const link of links) {
    const a = particles[link.a];
    const b = particles[link.b];
    if (!a || !b || a === b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= EPS) continue;
    const diff = (dist - link.length) / dist;
    const wa = 1 / Math.max(a.radius * a.radius, EPS);
    const wb = 1 / Math.max(b.radius * b.radius, EPS);
    const totalW = wa + wb;
    a.x += dx * diff * (wa / totalW);
    a.y += dy * diff * (wa / totalW);
    b.x -= dx * diff * (wb / totalW);
    b.y -= dy * diff * (wb / totalW);
  }
}

function solveParticleCollisions(particles: VerletParticle[], responseCoef: number): void {
  const n = particles.length;
  for (let i = 0; i < n; i++) {
    const a = particles[i];
    for (let j = i + 1; j < n; j++) {
      const b = particles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.radius + b.radius;
      if (dist >= minDist || dist <= EPS) continue;
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      const wa = 1 / Math.max(a.radius * a.radius, EPS);
      const wb = 1 / Math.max(b.radius * b.radius, EPS);
      const totalW = wa + wb;
      const push = overlap * responseCoef;
      a.x -= nx * push * (wa / totalW);
      a.y -= ny * push * (wa / totalW);
      b.x += nx * push * (wb / totalW);
      b.y += ny * push * (wb / totalW);
    }
  }
}

/**
 * Velocidad implícita por partícula en px/s: tras un frame completo la velocidad implícita
 * (pos-prev) corresponde al ÃšLTIMO substep (dt/substeps), no al dt del frame.
 */
export function verletImplicitVelocity(p: VerletParticle, config?: VerletConfig): Vec2 {
  const cfg: VerletConfigResolved = verletConfigSchema.parse(config ?? {});
  const vScale = cfg.substeps / cfg.dt;
  const px = p.px ?? p.x;
  const py = p.py ?? p.y;
  return [(p.x - px) * vScale, (p.y - py) * vScale];
}

/** Energía cinética aproximada del mundo Verlet (masa ~ radius^2). Ãštil para tests de settle. */
export function verletKineticEnergy(state: VerletState, config?: VerletConfig): number {
  let ke = 0;
  for (const p of state.particles) {
    const [vx, vy] = verletImplicitVelocity(p, config);
    ke += 0.5 * p.radius * p.radius * (vx * vx + vy * vy);
  }
  return ke;
}

/** Crea una pila vertical estable de `count` partículas dentro del contenedor dado. */
export function createVerletStack(count: number, container: VerletContainer, radius = 20): VerletState {
  const cx = container.kind === 'circle' ? container.cx : container.x + container.width / 2;
  const bottomY =
    container.kind === 'circle'
      ? container.cy + container.radius - radius
      : container.y + container.height - radius;
  const particles: VerletParticle[] = [];
  for (let i = 0; i < count; i++) {
    const y = bottomY - i * (radius * 2.05);
    particles.push({ x: cx, y, px: cx, py: y, ax: 0, ay: 0, radius });
  }
  return { particles, links: [] };
}

/* ------------------------------------------------------------------ */
/* Capa RÍGIDA (círculo/AABB, impulso + fricción)                      */
/* ------------------------------------------------------------------ */

export function rigidMass(body: Pick<RigidBody, 'shape' | 'density'>): number {
  if (body.shape.kind === 'circle') {
    return Math.PI * body.shape.r * body.shape.r * body.density;
  }
  return 4 * body.shape.hw * body.shape.hh * body.density;
}

/**
 * Un paso fijo dt de la capa rígida: integración semi-implícita Euler ->
 * detección círculo-círculo / círculo-caja / caja-caja -> resolución por impulso
 * (restitución + fricción tangencial) -> corrección posicional.
 */
export function stepRigid(state: RigidState, config?: RigidConfig): RigidState {
  const cfg: RigidConfigResolved = rigidConfigSchema.parse(config ?? {});
  const bodies = state.bodies.map((b) => ({ ...b, shape: { ...b.shape } }));

  // 1) Integración semi-implícita: primero velocidad, luego posición
  for (const b of bodies) {
    if (b.isStatic) continue;
    b.vx += cfg.gravity[0] * cfg.dt;
    b.vy += cfg.gravity[1] * cfg.dt;
    b.x += b.vx * cfg.dt;
    b.y += b.vy * cfg.dt;
  }

  // 2) Resolución par-a-par SECUENCIAL (varias iteraciones: estabiliza pilas)
  for (let it = 0; it < cfg.iterations; it++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        resolvePair(bodies[i], bodies[j], cfg);
      }
    }
  }

  return { bodies };
}

interface Manifold {
  normal: Vec2; // de A hacia B
  penetration: number;
}

function detectCollision(a: RigidBody, b: RigidBody): Manifold | null {
  const ka = a.shape.kind;
  const kb = b.shape.kind;
  if (ka === 'circle' && kb === 'circle') {
    return circleCircle(a.x, a.y, a.shape.r, b.x, b.y, b.shape.r);
  }
  if (ka === 'circle' && kb === 'box') {
    return circleBox(a.x, a.y, a.shape.r, b.x, b.y, b.shape.hw, b.shape.hh);
  }
  if (ka === 'box' && kb === 'circle') {
    const m = circleBox(b.x, b.y, b.shape.r, a.x, a.y, a.shape.hw, a.shape.hh);
    return m ? { normal: [-m.normal[0], -m.normal[1]], penetration: m.penetration } : null;
  }
  if (ka === 'box' && kb === 'box') {
    return boxBox(a.x, a.y, a.shape.hw, a.shape.hh, b.x, b.y, b.shape.hw, b.shape.hh);
  }
  return null;
}

function circleCircle(ax: number, ay: number, ar: number, bx: number, by: number, br: number): Manifold | null {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const rSum = ar + br;
  if (dist >= rSum || dist <= EPS) return null;
  return { normal: [dx / dist, dy / dist], penetration: rSum - dist };
}

function circleBox(cx: number, cy: number, cr: number, bx: number, by: number, hw: number, hh: number): Manifold | null {
  // Punto más cercano del AABB al centro del círculo
  const closestX = clampN(cx, bx - hw, bx + hw);
  const closestY = clampN(cy, by - hh, by + hh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  const dist = Math.hypot(dx, dy);

  if (dist > EPS) {
    if (dist >= cr) return null;
    // Centro fuera de la caja
    return { normal: [-dx / dist, -dy / dist], penetration: cr - dist };
  }
  // Centro DENTRO de la caja: expulsar por el eje de menor penetración
  const ox = hw - Math.abs(cx - bx);
  const oy = hh - Math.abs(cy - by);
  if (ox < oy) {
    const sign = cx < bx ? -1 : 1;
    return { normal: [sign, 0], penetration: ox + cr };
  }
  const sign = cy < by ? -1 : 1;
  return { normal: [0, sign], penetration: oy + cr };
}

function boxBox(ax: number, ay: number, ahw: number, ahh: number, bx: number, by: number, bhw: number, bhh: number): Manifold | null {
  const dx = bx - ax;
  const dy = by - ay;
  const overlapX = ahw + bhw - Math.abs(dx);
  if (overlapX <= 0) return null;
  const overlapY = ahh + bhh - Math.abs(dy);
  if (overlapY <= 0) return null;
  if (overlapX < overlapY) {
    const sign = dx < 0 ? -1 : 1;
    return { normal: [sign, 0], penetration: overlapX };
  }
  const sign = dy < 0 ? -1 : 1;
  return { normal: [0, sign], penetration: overlapY };
}

function resolvePair(a: RigidBody, b: RigidBody, cfg: RigidConfigResolved): void {
  const m = detectCollision(a, b);
  if (!m) return;

  const invMassA = a.isStatic ? 0 : 1 / rigidMass(a);
  const invMassB = b.isStatic ? 0 : 1 / rigidMass(b);
  const invSum = invMassA + invMassB;
  if (invSum <= 0) return;

  // Velocidad relativa sobre la normal
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velAlongNormal = rvx * m.normal[0] + rvy * m.normal[1];

  // Impulso escalar (solo si se acercan). Restitución anulada en contactos de
  // reposo (|velN| < 1): evita el jitter que acumula energía en pilas.
  if (velAlongNormal < 0) {
    const speed = -velAlongNormal;
    const e0 = Math.min(a.restitution, b.restitution);
    const e = speed < 1 ? 0 : e0;
    const jImpulse = (-(1 + e) * velAlongNormal) / invSum;
    const jx = jImpulse * m.normal[0];
    const jy = jImpulse * m.normal[1];
    if (!a.isStatic) {
      a.vx -= jx * invMassA;
      a.vy -= jy * invMassA;
    }
    if (!b.isStatic) {
      b.vx += jx * invMassB;
      b.vy += jy * invMassB;
    }

    // Fricción tangencial (Coulomb: |jt| <= mu * |j|)
    const tx = -m.normal[1];
    const ty = m.normal[0];
    const velAlongTangent = rvx * tx + rvy * ty;
    const mu = Math.sqrt(a.friction * b.friction);
    let jt = -velAlongTangent / invSum;
    const maxJt = Math.abs(mu * jImpulse);
    jt = clampN(jt, -maxJt, maxJt);
    const jtx = jt * tx;
    const jty = jt * ty;
    if (!a.isStatic) {
      a.vx -= jtx * invMassA;
      a.vy -= jty * invMassA;
    }
    if (!b.isStatic) {
      b.vx += jtx * invMassB;
      b.vy += jty * invMassB;
    }
  }

  // Corrección posicional Baumgarte (por masa inversa, evita hundimiento)
  const correctionMag = (Math.max(m.penetration - cfg.slop, 0) / invSum) * cfg.percent;
  const cxv = correctionMag * m.normal[0];
  const cyv = correctionMag * m.normal[1];
  if (!a.isStatic) {
    a.x -= cxv * invMassA;
    a.y -= cyv * invMassA;
  }
  if (!b.isStatic) {
    b.x += cxv * invMassB;
    b.y += cyv * invMassB;
  }
}

function clampN(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Energía mecánica del mundo rígido: KE (½mv²) + PE (m·g·h, altura medida contra y=0 hacia arriba). */
export function rigidMechanicalEnergy(state: RigidState, config?: RigidConfig): { kinetic: number; potential: number; total: number } {
  const cfg: RigidConfigResolved = rigidConfigSchema.parse(config ?? {});
  let kinetic = 0;
  let potential = 0;
  for (const b of state.bodies) {
    if (b.isStatic) continue;
    const m = rigidMass(b);
    kinetic += 0.5 * m * (b.vx * b.vx + b.vy * b.vy);
    potential += m * (-cfg.gravity[1]) * b.y;
  }
  return { kinetic, potential, total: kinetic + potential };
}

/** Momento lineal total (para tests de conservación con gravedad cero). */
export function rigidTotalMomentum(state: RigidState): Vec2 {
  let px = 0;
  let py = 0;
  for (const b of state.bodies) {
    if (b.isStatic) continue;
    const m = rigidMass(b);
    px += m * b.vx;
    py += m * b.vy;
  }
  return [px, py];
}

/** Suelo estático AABB que abarca `width`, centrado en x=0, superficie superior en y=topY. */
export function createStaticFloor(width = 2000, topY = 400, thickness = 100): RigidBody {
  return {
    id: 'floor',
    shape: { kind: 'box', hw: width / 2, hh: thickness / 2 },
    x: 0,
    y: topY + thickness / 2,
    vx: 0,
    vy: 0,
    density: 1,
    restitution: 0,
    friction: 0.6,
    isStatic: true,
  };
}

/** Cuerpo dinámico con defaults razonables (id obligatorio para trazabilidad). */
export function createBody(id: string, shape: RigidShape, x: number, y: number, overrides?: Partial<Omit<RigidBody, 'id' | 'shape' | 'x' | 'y'>>): RigidBody {
  return rigidBodySchema.parse({ id, shape, x, y, ...overrides });
}

/** Simula N frames seguidos (conveniencia sobre stepRigid). */
export function simulateRigid(state: RigidState, frames: number, config?: RigidConfig): RigidState {
  let cur = state;
  for (let i = 0; i < frames; i++) cur = stepRigid(cur, config);
  return cur;
}

/* ------------------------------------------------------------------ */
/* Render HTML autocontenido (patrón sdf/codevfx)                      */
/* ------------------------------------------------------------------ */

export interface PhysicsHtmlOptions {
  width?: number;
  height?: number;
  title?: string;
  /** Color de fondo (Dark Obsidian por defecto). */
  background?: string;
  accent?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Embebe JSON dentro de un bloque <script>. El contenido de script es RAW TEXT: las
 * entidades HTML (&quot;) NO se decodifican ahí, así que solo hay que neutralizar la
 * secuencia `</` (y cualquier `<`) con escapes \u003c válidos en JS/JSON.
 */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * HTML5 canvas autocontenido que anima el mundo físico dado (sin JS externo, sin recursos
 * remotos, Dark Obsidian). Respeta prefers-reduced-motion renderizando solo el fotograma inicial.
 */
export function renderPhysicsHtml(
  world: { verlet?: { state: VerletState; container: VerletContainer }; rigid?: RigidState },
  options?: PhysicsHtmlOptions,
): string {
  const w = options?.width ?? 800;
  const h = options?.height ?? 600;
  const bg = options?.background ?? '#08080a';
  const accent = options?.accent ?? '#8b5cf6';
  const title = options?.title ?? 'UltraIa physics2d â€” simulación determinista';

  const payload = scriptJson({
    verlet: world.verlet
      ? { state: world.verlet.state, container: world.verlet.container }
      : null,
    rigid: world.rigid ?? null,
  });

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  html,body{margin:0;padding:0;background:${bg};color:#e7e7f0;font-family:system-ui,sans-serif}
  main{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px}
  canvas{border-radius:10px;border:1px solid #1f1f2a;background:#111115;touch-action:none}
  p{max-width:${w}px;font-size:13px;color:#9a9ab0;margin:0}
</style>
</head>
<body>
<main>
  <canvas id="c" width="${w}" height="${h}" role="img" aria-labelledby="desc"></canvas>
  <p id="desc">${esc(title)}. Simulación determinista (sin red ni dependencias).</p>
</main>
<script>
"use strict";
var WORLD=${payload};
var cv=document.getElementById("c"),ctx=cv.getContext("2d");
var W=cv.width,H=cv.height,BG="#111115",FG="${accent}",HAIR="#1f1f2a";
function draw(){
 ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
 var v=WORLD.verlet;
 if(v){
   var c=v.container;
   ctx.strokeStyle=HAIR;ctx.lineWidth=2;ctx.beginPath();
   if(c.kind==="circle"){ctx.arc(c.cx,c.cy,c.radius,0,Math.PI*2);}
   else{ctx.rect(c.x,c.y,c.width,c.height);}
   ctx.stroke();
   ctx.fillStyle=FG;
   var ps=v.state.particles;
   for(var i=0;i<ps.length;i++){ctx.beginPath();ctx.arc(ps[i].x,ps[i].y,Math.max(ps[i].radius,1.5),0,Math.PI*2);ctx.fill();}
   ctx.strokeStyle=FG;ctx.beginPath();
   var ls=v.state.links;
   for(var k=0;k<ls.length;k++){var a=ps[ls[k].a],b=ps[ls[k].b];if(a&&b){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}}
   ctx.stroke();
 }
 var rb=WORLD.rigid;
 if(rb){
   for(var q=0;q<rb.bodies.length;q++){
     var bd=rb.bodies[q];
     ctx.save();
     ctx.translate(bd.x,bd.y);
     if(bd.isStatic){ctx.fillStyle="#2b2b38";}
     else{ctx.fillStyle=q%2?"${accent}":"#22d3ee";}
     ctx.beginPath();
     if(bd.shape.kind==="circle"){ctx.arc(0,0,bd.shape.r,0,Math.PI*2);ctx.fill();}
     else{ctx.fillRect(-bd.shape.hw,-bd.shape.hh,bd.shape.hw*2,bd.shape.hh*2);}
     ctx.restore();
   }
 }
}
draw();
// Nota: el fotograma es estático por diseño (el motor vive en @ultraia/core; el HTML es
// una vista determinista del estado dado â€” sin re-simulación en el navegador).
</script>
</body>
</html>`;
}
