/**
 * creativo.ts — Motor de creative coding por codigo puro (C70, 19/08/2026).
 *
 * Fuente: skill "Creative Code Architect & Automator" del usuario (guardada en
 * .opencode/skills/creative-code-architect/) + plan creative-coding aprobado.
 * Principios: razonamiento matematico/fisico primero, sin assets externos,
 * todo generado por ecuaciones (gravedad/friccion/rebote, ondas), 60 FPS.
 *
 * Dominio 100% determinista y keyless: NUNCA ejecuta canvas/audio; genera la
 * especificacion matematica (trayectorias) y el HTML autocontenido que la
 * reproduce en el navegador (patron codevfx.renderEffectHtml).
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas zod (tool + dominio)
// ---------------------------------------------------------------------------

export const ballSchema = z.object({
  /** Radio en px (1-200). */
  radius: z.number().min(1).max(200).default(18),
  /** Posicion inicial (px). */
  x: z.number().default(120),
  y: z.number().default(60),
  /** Velocidad inicial (px/s). */
  vx: z.number().default(240),
  vy: z.number().default(0),
  /** Masa relativa (afecta energia, no la gravedad). */
  mass: z.number().min(0.1).max(100).default(1),
  /** Coeficiente de restitucion del rebote (0 = sin rebote, 1 = elastico). */
  restitution: z.number().min(0).max(1).default(0.82),
  /** Color base hex para el HTML (el dominio no dibuja). */
  color: z.string().default('#8b5cf6'),
});
/** Entrada parcial con defaults (z.input) para llamadas directas — ver precedente videoqa VideoqaInputLike. */
export type BallLike = z.input<typeof ballSchema>;
export type Ball = z.infer<typeof ballSchema>;

export const physicsOptionsSchema = z.object({
  /** Integrador: 'euler' | 'verlet'. */
  integrator: z.enum(['euler', 'verlet']).default('euler'),
  /** Gravedad en px/s^2 (positiva = hacia abajo). */
  gravity: z.number().default(980),
  /** Friccion de aire por segundo (0-1): v *= (1 - damping*dt). */
  damping: z.number().min(0).max(0.99).default(0.02),
  /** Friccion del suelo al rebotar (0-1) sobre vx. */
  floorFriction: z.number().min(0).max(1).default(0.3),
  /** Ancho del mundo en px. */
  width: z.number().min(100).max(4000).default(800),
  /** Alto del mundo en px. */
  height: z.number().min(100).max(10000).default(600),
  /** Paso de tiempo en segundos (default 1/60 = 60 FPS). */
  dt: z.number().min(1 / 1000).max(1).default(1 / 60),
  /** Duracion total simulada en segundos. */
  durationSec: z.number().min(0.1).max(120).default(3),
  /** Semilla del PRNG para escenas (determinismo). */
  seed: z.number().default(1337),
});
export type PhysicsOptions = z.infer<typeof physicsOptionsSchema>;
export type PhysicsOptionsLike = z.input<typeof physicsOptionsSchema>;

export const sceneSchema = z.object({
  balls: z.array(ballSchema).min(1).max(64),
  physics: physicsOptionsSchema,
});
export type Scene = z.infer<typeof sceneSchema>;

export const impactSoundSchema = z.object({
  /** Forma de onda del oscilador. */
  waveform: z.enum(['sine', 'triangle', 'square', 'sawtooth']).default('sine'),
  /** Frecuencia inicial Hz (20-8000). */
  frequencyStartHz: z.number().min(20).max(8000).default(320),
  /** Frecuencia final Hz (decaimiento, < start). */
  frequencyEndHz: z.number().min(20).max(8000).default(120),
  /** Ganancia inicial 0-1. */
  gainStart: z.number().min(0).max(1).default(0.35),
  /** Ganancia final (≈0). */
  gainEnd: z.number().min(0).max(1).default(0.001),
  /** Duracion en segundos (impacto corto: 0.02-1). */
  durationSec: z.number().min(0.02).max(1).default(0.18),
  /** Exponente del decaimiento exponencial (1 = natural). */
  decayExponent: z.number().min(0.5).max(4).default(1.6),
});
export type ImpactSound = z.infer<typeof impactSoundSchema>;
export type ImpactSoundLike = z.input<typeof impactSoundSchema>;

// ---------------------------------------------------------------------------
// PRNG determinista (mulberry32 — mismo patron que generative.ts)
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Fisica: simulacion determinista paso a paso
// ---------------------------------------------------------------------------

export type SimStep = {
  /** Tiempo absoluto (s). */
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Energia mecanica E = 0.5*m*(vx^2+vy^2) + m*g*(height - y) (unidades arbitrarias). */
  energy: number;
  /** True si este paso acabo de rebotar. */
  bounced: boolean;
};

export type BounceEvent = {
  t: number;
  surface: 'floor' | 'wall-left' | 'wall-right';
  velocityYBefore: number;
  velocityYAfter: number;
};

export type SimulationResult = {
  ball: Ball;
  steps: SimStep[];
  bounces: BounceEvent[];
  energyInitial: number;
  energyFinal: number;
  /** Razon de energia final/inicial (<=1 con restitucion <1). */
  energyRatio: number;
};

function energyOf(ball: Ball, x: number, y: number, vx: number, vy: number, g: number, h: number): number {
  return 0.5 * ball.mass * (vx * vx + vy * vy) + ball.mass * g * (h - y);
}

/**
 * Simula una pelota con gravedad, friccion de aire y rebotes (suelo + paredes).
 * Integracion Euler o Verlet (segundo orden). Determinista: misma entrada,
 * misma salida. El dominio NUNCA dibuja ni ejecuta nada.
 */
export function simulateBall(ballIn: BallLike, opts: PhysicsOptionsLike = {}): SimulationResult {
  const ball = ballSchema.parse(ballIn);
  const p = physicsOptionsSchema.parse(opts);
  const dt = p.dt;
  const maxSteps = Math.min(Math.ceil(p.durationSec / dt), 60 * 120); // anti-runaway
  const steps: SimStep[] = [];
  const bounces: BounceEvent[] = [];

  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  let vy = ball.vy;
  let px = x - vx * dt; // paso previo (Verlet)
  let py = y - vy * dt;

  const e0 = energyOf(ball, x, y, vx, vy, p.gravity, p.height);
  let prevBounceT = -Infinity;

  for (let i = 0; i < maxSteps; i++) {
    const t = i * dt;
    let bounced = false;

    if (p.integrator === 'verlet') {
      // Verlet: x' = 2x - x_prev + a*dt^2
      const nx = 2 * x - px + 0 * dt * dt;
      const ny = 2 * y - py + p.gravity * dt * dt;
      vx = (nx - px) / (2 * dt);
      vy = (ny - py) / (2 * dt);
      px = x;
      py = y;
      x = nx;
      y = ny;
    } else {
      // Euler semi-implicito: v += a*dt; x += v*dt
      vy += p.gravity * dt;
      x += vx * dt;
      y += vy * dt;
    }

    // Friccion de aire (v *= 1 - damping*dt)
    const airFactor = Math.max(0, 1 - p.damping * dt);
    vx *= airFactor;
    vy *= airFactor;

    // Rebote suelo (y = radio)
    if (y >= p.height - ball.radius) {
      const vyBefore = vy;
      y = p.height - ball.radius;
      vy = -vy * ball.restitution;
      vx *= 1 - p.floorFriction; // friccion del suelo sobre vx
      bounced = true;
      if (t - prevBounceT > dt) {
        bounces.push({ t, surface: 'floor', velocityYBefore: vyBefore, velocityYAfter: vy });
        prevBounceT = t;
      }
    }
    // Rebote pared izquierda
    if (x <= ball.radius) {
      const vxBefore = vx;
      x = ball.radius;
      vx = -vx * ball.restitution;
      bounced = true;
      if (Math.abs(vxBefore) > 1) bounces.push({ t, surface: 'wall-left', velocityYBefore: vy, velocityYAfter: vy });
    }
    // Rebote pared derecha
    if (x >= p.width - ball.radius) {
      const vxBefore = vx;
      x = p.width - ball.radius;
      vx = -vx * ball.restitution;
      bounced = true;
      if (Math.abs(vxBefore) > 1) bounces.push({ t, surface: 'wall-right', velocityYBefore: vy, velocityYAfter: vy });
    }

    steps.push({
      t: Number(t.toFixed(6)),
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      vx: Number(vx.toFixed(3)),
      vy: Number(vy.toFixed(3)),
      energy: Number(energyOf(ball, x, y, vx, vy, p.gravity, p.height).toFixed(6)),
      bounced,
    });
  }

  const eFinal = energyOf(ball, x, y, vx, vy, p.gravity, p.height);
  return {
    ball,
    steps,
    bounces,
    energyInitial: e0,
    energyFinal: eFinal,
    energyRatio: e0 === 0 ? 1 : Number((eFinal / e0).toFixed(6)),
  };
}

/**
 * Planifica una escena de N pelotas determinista (seed): posiciones/velocidades
 * distribuidas por el mundo, colores por rotacion de matiz.
 */
export function planScene(opts: { count?: number; seed?: number; width?: number; height?: number } = {}): Scene {
  const count = Math.max(1, Math.min(64, opts.count ?? 4));
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;
  const rand = mulberry32(opts.seed ?? 1337);
  const balls: Ball[] = [];
  for (let i = 0; i < count; i++) {
    const radius = 10 + rand() * 26;
    const hue = Math.floor(rand() * 360);
    balls.push({
      radius: Number(radius.toFixed(2)),
      x: Number((radius + rand() * (width - 2 * radius)).toFixed(2)),
      y: Number((radius + rand() * (height * 0.35)).toFixed(2)),
      vx: Number(((rand() - 0.5) * 460).toFixed(2)),
      vy: Number((rand() * 60).toFixed(2)),
      mass: Number((0.5 + rand() * 2.5).toFixed(2)),
      restitution: Number((0.7 + rand() * 0.25).toFixed(3)),
      color: `hsl(${hue} 85% 62%)`,
    });
  }
  return { balls, physics: physicsOptionsSchema.parse({ width, height, seed: opts.seed ?? 1337 }) };
}

// ---------------------------------------------------------------------------
// Sonido: especificacion Web Audio del impacto (sintesis pura, sin ejecutar)
// ---------------------------------------------------------------------------

/**
 * Genera la especificacion del sonido de impacto: oscilador + ganancia con
 * decaimiento exponencial (Web Audio API: oscillatorNode + gainNode).
 * La intensidad (0-100) modula frecuencia y ganancia.
 */
export function soundImpact(intensity: number, opts: ImpactSoundLike = {}): ImpactSound {
  const k = Math.max(0, Math.min(100, intensity));
  const base: ImpactSound = {
    waveform: 'sine',
    frequencyStartHz: Math.round(180 + k * 6), // 180-780 Hz
    frequencyEndHz: Math.round(90 + k * 2.5),
    gainStart: Number((0.08 + (k / 100) * 0.5).toFixed(3)),
    gainEnd: 0.001,
    durationSec: Number((0.1 + (k / 100) * 0.2).toFixed(3)),
    decayExponent: 1.6,
  };
  return impactSoundSchema.parse({ ...base, ...opts });
}

// ---------------------------------------------------------------------------
// HTML autocontenido (sin URLs, sin deps, 60 FPS, Web Audio en impacto)
// ---------------------------------------------------------------------------

export type CanvasHtmlOptions = {
  width?: number;
  height?: number;
  /** Titulo de la ventana. */
  title?: string;
  /** Mostrar HUD de energia (bool). */
  hud?: boolean;
};

/**
 * Genera un HTML5 Canvas autocontenido que reproduce la escena con la MISMA
 * ecuacion fisica del dominio (Euler, dt=1/60, damping, restitucion) mas el
 * sonido de impacto con Web Audio (AudioContext creado en el primer click por
 * la autoplay policy). Sin recursos externos: 100% programado.
 */
export function renderCanvasHtml(scene: Scene, opts: CanvasHtmlOptions = {}): string {
  const s = sceneSchema.parse(scene);
  const w = opts.width ?? s.physics.width;
  const h = opts.height ?? s.physics.height;
  const title = opts.title ?? 'UltraIa — Creative Physics';
  const hud = opts.hud ?? true;
  const ballsJson = JSON.stringify(s.balls);
  const physicsJson = JSON.stringify({ ...s.physics, width: w, height: h });

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  html,body{margin:0;padding:0;background:#08080a;color:#e4e4e7;overflow:hidden;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  canvas{display:block;width:100vw;height:100vh;cursor:crosshair}
  #hud{position:fixed;top:12px;left:14px;font-size:12px;line-height:1.6;opacity:.75;pointer-events:none;text-shadow:0 1px 2px #000}
  #hint{position:fixed;bottom:12px;left:14px;font-size:11px;opacity:.4;pointer-events:none}
</style>
</head>
<body>
<canvas id="cv"></canvas>
${hud ? '<div id="hud">UltraIa · código puro · 60 FPS</div>' : ''}
<div id="hint">click → activar sonido Web Audio (impactos)</div>
<script>
(function(){
  var canvas = document.getElementById('cv');
  var ctx = canvas.getContext('2d');
  var W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;
  var balls = ${ballsJson};
  var ph = ${physicsJson};
  var audioCtx = null;
  var lastClick = 0;
  canvas.addEventListener('pointerdown', function(){
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    // mini-thump al activar
    var t = audioCtx.currentTime;
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.13);
  });
  function impact(spec){
    if (!audioCtx) return;
    var t = audioCtx.currentTime;
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = spec.waveform;
    o.frequency.setValueAtTime(spec.frequencyStartHz, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, spec.frequencyEndHz), t + spec.durationSec);
    g.gain.setValueAtTime(spec.gainStart, t);
    g.gain.exponentialRampToValueAtTime(spec.gainEnd, t + spec.durationSec);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + spec.durationSec + 0.02);
  }
  var dt = ph.dt, g = ph.gravity, damp = ph.damping;
  var prev = performance.now();
  function frame(now){
    requestAnimationFrame(frame);
    var elapsed = (now - prev) / 1000; prev = now;
    var sub = Math.min(4, Math.max(1, Math.round(elapsed / dt)));
    for (var k = 0; k < sub; k++) step();
    draw();
  }
  function step(){
    for (var i = 0; i < balls.length; i++){
      var b = balls[i];
      b.vy += g * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      var af = Math.max(0, 1 - damp * dt);
      b.vx *= af; b.vy *= af;
      var bounced = false;
      if (b.y >= H - b.radius){ b.y = H - b.radius; b.vy = -b.vy * b.restitution; b.vx *= (1 - ph.floorFriction); bounced = true; }
      if (b.x <= b.radius){ b.x = b.radius; b.vx = -b.vx * b.restitution; bounced = true; }
      if (b.x >= W - b.radius){ b.x = W - b.radius; b.vx = -b.vx * b.restitution; bounced = true; }
      if (bounced && audioCtx && Math.abs(b.vy) > 40){
        impact({ waveform:'sine',
          frequencyStartHz: 180 + Math.abs(b.vy) * 0.9,
          frequencyEndHz: 60 + Math.abs(b.vy) * 0.25,
          gainStart: Math.min(0.5, 0.05 + Math.abs(b.vy) / 2500),
          gainEnd: 0.001,
          durationSec: 0.12 + Math.abs(b.vy) / 20000,
          decayExponent: 1.6 });
      }
    }
  }
  function draw(){
    ctx.fillStyle = '#08080a'; ctx.fillRect(0, 0, W, H);
    // suelo sutil
    ctx.strokeStyle = 'rgba(139,92,246,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H - 0.5); ctx.lineTo(W, H - 0.5); ctx.stroke();
    for (var i = 0; i < balls.length; i++){
      var b = balls[i];
      // brillo radial por velocidad (energia visual)
      var sp = Math.min(1, Math.hypot(b.vx, b.vy) / 900);
      var grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, b.radius * (1 + sp * 0.9));
      grad.addColorStop(0, b.color);
      grad.addColorStop(0.55, b.color);
      grad.addColorStop(1, 'rgba(8,8,10,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * (1 + sp * 0.9), 0, Math.PI * 2); ctx.fill();
      // nucleo
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.25 + sp * 0.55;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    var hud = document.getElementById('hud');
    if (hud){
      var E = 0;
      for (var j = 0; j < balls.length; j++){ var bj = balls[j]; E += 0.5 * bj.mass * (bj.vx*bj.vx + bj.vy*bj.vy); }
      hud.textContent = 'UltraIa · código puro · 60 FPS · E=' + E.toFixed(0) + ' · ' + balls.length + ' cuerpos';
    }
  }
  requestAnimationFrame(frame);
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Tool: creativo_generar
// ---------------------------------------------------------------------------

export const creativoActionSchema = z.object({
  action: z.enum(['simular', 'planificar', 'render']),
  /** Para simular: una pelota. */
  ball: ballSchema.optional(),
  /** Para simular/render: opciones de fisica. */
  physics: physicsOptionsSchema.optional(),
  /** Para planificar: cantidad de cuerpos. */
  count: z.number().min(1).max(64).optional(),
  /** Para render: escena completa (si falta, se planifica con count). */
  scene: sceneSchema.optional(),
  /** Intensidad del sonido de impacto 0-100 (render). */
  impactIntensity: z.number().min(0).max(100).optional(),
  /** Opciones del HTML. */
  html: z.object({ width: z.number().optional(), height: z.number().optional(), title: z.string().optional(), hud: z.boolean().optional() }).optional(),
});

export type CreativoAction = z.infer<typeof creativoActionSchema>;

export type CreativoResult =
  | { action: 'simular'; simulation: SimulationResult }
  | { action: 'planificar'; scene: Scene }
  | { action: 'render'; scene: Scene; html: string; sound: ImpactSound };

export function creativoGenerar(input: CreativoAction): CreativoResult {
  const a = creativoActionSchema.parse(input);
  switch (a.action) {
    case 'simular': {
      const ball = a.ball ?? ballSchema.parse({});
      return { action: 'simular', simulation: simulateBall(ball, a.physics) };
    }
    case 'planificar': {
      const scene = planScene({ count: a.count ?? 4, seed: a.physics?.seed, width: a.physics?.width, height: a.physics?.height });
      return { action: 'planificar', scene };
    }
    case 'render': {
      const scene = a.scene ?? planScene({ count: a.count ?? 4, seed: a.physics?.seed, width: a.physics?.width, height: a.physics?.height });
      const html = renderCanvasHtml(scene, a.html);
      const sound = soundImpact(a.impactIntensity ?? 40);
      return { action: 'render', scene, html, sound };
    }
  }
}

export const creativo = {
  simulateBall,
  planScene,
  soundImpact,
  renderCanvasHtml,
  creativoGenerar,
  ballSchema,
  physicsOptionsSchema,
  sceneSchema,
  impactSoundSchema,
  creativoActionSchema,
};