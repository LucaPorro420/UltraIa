/**
 * codevfx — Code-Driven Visual Effects (capability `codevfx`)
 *
 * Port ORIGINAL de los PRINCIPIOS del patrón "Elemental Sandbox VFX"
 * (fuente: enlaces.txt → https://www.instagram.com/p/DcJDsghiJne/,
 * repo achrefelouafi/LinearAbiltyCastingThreeJS, MIT — Three.js + GLSL a mano).
 * Nada de código copiado; solo los principios transferibles:
 *
 *   1. Sin assets externos: sin texturas, sprites ni meshes — todo es
 *      matemática (shaders GLSL + partículas procedimentales).
 *   2. GLSL hand-written: cada efecto define su propio fragment shader.
 *   3. 6 habilidades con teclas Q/E/R/F/V/X → este port define 9 kinds.
 *   4. Realismo = colorimetría coherente (HSL) + física creíble (gravedad,
 *      viento, fricción) + cámara con perspectiva y curvatura.
 *   5. Reactividad: el efecto responde a intensidad (input) en capas.
 *
 * Determinista, keyless, sin dependencias (patrón growth/vfx del repo).
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export const EFFECT_KINDS = [
  'fire',
  'ice',
  'lightning',
  'meteor',
  'beam',
  'ground',
  'void',
  'plasma',
  'frost',
] as const;

export type EffectKind = (typeof EFFECT_KINDS)[number];

export type EffectOptions = {
  /** Intensidad reactiva del input (0-100). Afecta capas y partículas. */
  intensity?: number;
  /** Velocidad temporal del efecto (0.1-3). */
  speed?: number;
};

export type VfxLayer = {
  id: string;
  blend: 'source-over' | 'lighter' | 'multiply' | 'screen';
  opacity: number;
};

export type EffectPlan = {
  kind: EffectKind;
  name: string;
  /** Intensidad normalizada 0-100 (clampada) y velocidad temporal. */
  intensity: number;
  speed: number;
  /** Colorimetría: base + acento + energía (hex). */
  palette: { base: string; accent: string; energy: string };
  /** Física: gravedad (px/s², negativo = arriba), viento x, fricción 0-1. */
  physics: { gravity: number; wind: number; friction: number };
  particles: { count: number; minSize: number; maxSize: number; life: number };
  /** GLSL hand-written (snippet del fragment shader, sin assets). */
  shaderGlsl: string;
  layers: VfxLayer[];
  /** Clave sugerida de habilidad (patrón Q/E/R/F/V/X). */
  hotkey: string;
};

export type Colorimetric = {
  hex: string;
  hsl: { h: number; s: number; l: number };
  warmth: number; // -1 frío … +1 cálido
};

export type ColorimetryReport = {
  colors: Colorimetric[];
  saturationMean: number; // 0-100
  warmthMean: number; // -1 … +1
  dominant: string;
  coherent: boolean; // |delta sat| entre colores <= 35 y |delta warmth| <= 1.2
};

export type CurvatureResult = {
  /** color de sombra en hex (lado con curvatura lejana) */
  shadow: string;
  /** color de luz en hex (lado con curvatura cercana) */
  highlight: string;
  /** factor de sombreado aplicado (0-1) */
  factor: number;
  /** degradado sugerido: de highlight a shadow */
  gradient: [string, string, string];
};

export type CameraSpec = {
  fov: number; // grados
  distance: number; // unidades
  tilt: number; // grados (elevación)
  roll: number;
  parallax: number; // 0-1, separación capas
};

export type PerspectivePlan = {
  camera: CameraSpec;
  /** desplazamiento de capas por profundidad (px) para parallax */
  layerOffsets: Array<{ depth: number; offsetPx: number }>;
  /** relación de aspecto recomendada */
  aspect: string;
};

/* ------------------------------------------------------------------ */
/* Datos por kind                                                      */
/* ------------------------------------------------------------------ */

const KIND_DEFS: Record<EffectKind, Omit<EffectPlan, 'particles' | 'intensity' | 'speed'> & { pCount: number; pLife: number }> = {
  fire: {
    kind: 'fire',
    name: 'Pyro Blast',
    palette: { base: '#ff6b35', accent: '#ffd166', energy: '#ff2d2d' },
    physics: { gravity: -140, wind: 18, friction: 0.985 },
    pCount: 420,
    pLife: 1.6,
    shaderGlsl:
      'vec3 fire(vec2 uv, float t) { float d = length(uv - vec2(0.5, 0.1)); float n = sin(uv.x*28.0 - t*9.0)*0.5 + 0.5; float core = smoothstep(0.42, 0.0, d*(1.0 - 0.35*n)); return vec3(1.0, 0.42 + 0.35*n, 0.18) * core; }',
    layers: [{ id: 'core', blend: 'lighter', opacity: 1 }, { id: 'smoke', blend: 'multiply', opacity: 0.55 }],
    hotkey: 'Q',
  },
  ice: {
    kind: 'ice',
    name: 'Cryo Field',
    palette: { base: '#7dd3fc', accent: '#e0f2fe', energy: '#38bdf8' },
    physics: { gravity: 22, wind: -8, friction: 0.99 },
    pCount: 320,
    pLife: 2.1,
    shaderGlsl:
      'vec3 ice(vec2 uv, float t) { float d = length(uv - vec2(0.5, 0.6)); float c = 0.5 + 0.5*sin(uv.x*46.0 + uv.y*31.0 + t*3.5); float spike = smoothstep(0.36, 0.0, d - 0.06*c); return vec3(0.49 + 0.18*c, 0.83 + 0.12*c, 0.99) * spike; }',
    layers: [{ id: 'crystal', blend: 'source-over', opacity: 0.9 }, { id: 'glow', blend: 'screen', opacity: 0.5 }],
    hotkey: 'W',
  },
  lightning: {
    kind: 'lightning',
    name: 'Storm Arc',
    palette: { base: '#c4b5fd', accent: '#ffffff', energy: '#8b5cf6' },
    physics: { gravity: 60, wind: 40, friction: 0.95 },
    pCount: 240,
    pLife: 0.45,
    shaderGlsl:
      'vec3 bolt(vec2 uv, float t) { float seg = fract(sin(uv.x*97.0 + t*23.0)*43758.5); float y = abs(uv.y - 0.5 - (seg-0.5)*0.7); float w = 0.012 + 0.02*(1.0-uv.y); float b = smoothstep(w, 0.0, y); return vec3(0.98, 0.93, 1.0) * b * (0.6 + 0.4*sin(t*30.0)); }',
    layers: [{ id: 'arc', blend: 'lighter', opacity: 1 }, { id: 'spark', blend: 'screen', opacity: 0.7 }],
    hotkey: 'E',
  },
  meteor: {
    kind: 'meteor',
    name: 'Meteor Streak',
    palette: { base: '#fb923c', accent: '#fde68a', energy: '#ea580c' },
    physics: { gravity: 240, wind: -30, friction: 0.98 },
    pCount: 180,
    pLife: 0.8,
    shaderGlsl:
      'vec3 meteor(vec2 uv, float t) { float trail = exp(-uv.y*7.0); float core = smoothstep(0.08, 0.0, length(uv - vec2(0.5, 0.9 - 0.8*t))); return vec3(1.0, 0.65, 0.35) * (trail*0.7 + core); }',
    layers: [{ id: 'streak', blend: 'lighter', opacity: 1 }, { id: 'shock', blend: 'screen', opacity: 0.4 }],
    hotkey: 'R',
  },
  beam: {
    kind: 'beam',
    name: 'Focus Beam',
    palette: { base: '#a5f3fc', accent: '#f0fdfa', energy: '#22d3ee' },
    physics: { gravity: 0, wind: 0, friction: 0.99 },
    pCount: 500,
    pLife: 1.0,
    shaderGlsl:
      'vec3 beam(vec2 uv, float t) { float x = abs(uv.x - 0.5); float body = smoothstep(0.18, 0.04, x + 0.06*sin(uv.y*40.0 + t*8.0)); float edge = smoothstep(0.22, 0.18, x); return vec3(0.65, 0.95, 1.0)*(body*0.9 + edge*0.35); }',
    layers: [{ id: 'beam', blend: 'lighter', opacity: 0.9 }, { id: 'haze', blend: 'screen', opacity: 0.3 }],
    hotkey: 'F',
  },
  ground: {
    kind: 'ground',
    name: 'Terra Surge',
    palette: { base: '#d6a354', accent: '#f5e6c8', energy: '#a16207' },
    physics: { gravity: -60, wind: 6, friction: 0.98 },
    pCount: 380,
    pLife: 1.3,
    shaderGlsl:
      'vec3 terra(vec2 uv, float t) { float ridge = abs(fract(uv.y*9.0 + sin(uv.x*14.0 + t)*0.5) - 0.5)*2.0; float surge = smoothstep(0.5, 0.0, length(uv - vec2(0.5, 0.05 + 0.3*ridge))); return vec3(0.84, 0.64, 0.33) * (surge*0.8 + 0.2); }',
    layers: [{ id: 'surge', blend: 'source-over', opacity: 0.85 }, { id: 'debris', blend: 'screen', opacity: 0.5 }],
    hotkey: 'X',
  },
  void: {
    kind: 'void',
    name: 'Void Singularity',
    palette: { base: '#312e81', accent: '#a78bfa', energy: '#0f0f17' },
    physics: { gravity: -12, wind: 0, friction: 0.99 },
    pCount: 300,
    pLife: 1.8,
    shaderGlsl:
      'vec3 voidFx(vec2 uv, float t) { float d = length(uv - vec2(0.5)); float ring = smoothstep(0.06, 0.0, abs(d - 0.32 - 0.05*sin(t*2.0))); float swirl = 0.5 + 0.5*sin(atan(uv.y-0.5, uv.x-0.5)*5.0 - t*3.0); return mix(vec3(0.05,0.04,0.09), vec3(0.65,0.55,0.98), ring*swirl); }',
    layers: [{ id: 'ring', blend: 'lighter', opacity: 0.8 }, { id: 'absorb', blend: 'multiply', opacity: 0.7 }],
    hotkey: 'V',
  },
  plasma: {
    kind: 'plasma',
    name: 'Plasma Field',
    palette: { base: '#f0abfc', accent: '#818cf8', energy: '#e879f9' },
    physics: { gravity: 0, wind: 12, friction: 0.99 },
    pCount: 450,
    pLife: 1.2,
    shaderGlsl:
      'vec3 plasmaFx(vec2 uv, float t) { float v = sin(uv.x*10.0 + t*2.5) + sin(uv.y*10.0 + t*3.1) + sin((uv.x+uv.y)*7.0 - t*1.7); v /= 3.0; return vec3(0.94, 0.67, 0.98)*smoothstep(-0.2, 0.9, v); }',
    layers: [{ id: 'field', blend: 'screen', opacity: 0.85 }, { id: 'wave', blend: 'lighter', opacity: 0.4 }],
    hotkey: 'C',
  },
  frost: {
    kind: 'frost',
    name: 'Hoarfrost',
    palette: { base: '#bae6fd', accent: '#f8fafc', energy: '#0ea5e9' },
    physics: { gravity: -4, wind: -16, friction: 0.99 },
    pCount: 260,
    pLife: 2.4,
    shaderGlsl:
      'vec3 frostFx(vec2 uv, float t) { float h = sin(uv.x*31.0 + t)*0.5 + sin(uv.y*47.0 + t*0.7)*0.5; float branch = smoothstep(0.42, 0.0, abs(h) - 0.08); return vec3(0.73, 0.9, 0.99)*branch; }',
    layers: [{ id: 'branch', blend: 'source-over', opacity: 0.9 }, { id: 'glint', blend: 'screen', opacity: 0.5 }],
    hotkey: 'B',
  },
};

/* ------------------------------------------------------------------ */
/* planEffect                                                          */
/* ------------------------------------------------------------------ */

export function planEffect(kind: EffectKind, opts: EffectOptions = {}): EffectPlan {
  const def = KIND_DEFS[kind];
  const intensity = clamp(opts.intensity ?? 50, 0, 100);
  const speed = clamp(opts.speed ?? 1, 0.1, 3);
  // La intensidad escala partículas (±40%) y vida (±25%), de forma determinista.
  const count = Math.round(def.pCount * (0.6 + 0.008 * intensity));
  const life = +(def.pLife * (1 + (intensity - 50) / 200)).toFixed(2);
  const { pCount: _p, pLife: _l, ...rest } = def;
  return {
    ...rest,
    particles: { count, minSize: 1.2, maxSize: 3.4, life },
    speed,
    intensity,
  } as EffectPlan;
}

/* ------------------------------------------------------------------ */
/* colorimetryAnalyze                                                  */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Calor de un color: -1 (azul frío) … +1 (rojo cálido) basado en el hue. */
function warmthOf(h: number): number {
  // 0 rojo → +1; 60 amarillo → +0.5; 180 cian → -0.5; 240 azul → -1; 300 magenta → +0.2
  const w = Math.cos(((h - 20) * Math.PI) / 180);
  return Math.round(w * 100) / 100;
}

export function colorimetryAnalyze(hexes: string[]): ColorimetryReport {
  if (hexes.length === 0) throw new Error('colorimetry requiere al menos un color');
  const colors: Colorimetric[] = hexes.map((hex) => {
    const { r, g, b } = hexToRgb(hex);
    const hsl = rgbToHsl(r, g, b);
    return { hex, hsl, warmth: warmthOf(hsl.h) };
  });
  const saturationMean = Math.round(colors.reduce((a, c) => a + c.hsl.s, 0) / colors.length);
  const warmthMean = colors.reduce((a, c) => a + c.warmth, 0) / colors.length;
  // Dominante: el color con mayor luminancia (peso visual).
  const dominant = [...colors].sort((a, b) => b.hsl.l - a.hsl.l)[0].hex;
  const satSpread = Math.max(...colors.map((c) => c.hsl.s)) - Math.min(...colors.map((c) => c.hsl.s));
  const warmthSpread = Math.max(...colors.map((c) => c.warmth)) - Math.min(...colors.map((c) => c.warmth));
  const coherent = satSpread <= 35 && warmthSpread <= 1.2;
  return { colors, saturationMean, warmthMean, dominant, coherent };
}

/* ------------------------------------------------------------------ */
/* curvatureShade                                                      */
/* ------------------------------------------------------------------ */

export function curvatureShade(hex: string, curvature: number, lightDir = 45): CurvatureResult {
  const c = clamp(curvature, 0, 1); // 0 plano, 1 muy curvo
  const { r, g, b } = hexToRgb(hex);
  const light = lightDir / 360; // dónde cae la luz (0-1)
  const shadowFactor = 0.22 + 0.4 * c; // cuánto se oscurece el lado opuesto
  const highlightFactor = 0.12 + 0.3 * c; // cuánto se aclara el lado cercano
  const shade = (v: number, f: number, sign: 1 | -1) =>
    clamp(Math.round(sign === 1 ? v + (255 - v) * f : v * (1 - f)), 0, 255);
  const shadow = toHex(shade(r, shadowFactor, -1), shade(g, shadowFactor, -1), shade(b, shadowFactor, -1));
  const highlight = toHex(shade(r, highlightFactor, 1), shade(g, highlightFactor, 1), shade(b, highlightFactor, 1));
  const mid = toHex(
    shade(r, shadowFactor * (0.5 - light * 0.4), 1),
    shade(g, shadowFactor * (0.5 - light * 0.4), 1),
    shade(b, shadowFactor * (0.5 - light * 0.4), 1),
  );
  return { shadow, highlight, factor: shadowFactor, gradient: [highlight, mid, shadow] };
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ */
/* perspectivePlan                                                     */
/* ------------------------------------------------------------------ */

export function perspectivePlan(depthLayers: number, opts: { distance?: number; tilt?: number } = {}): PerspectivePlan {
  const n = clamp(depthLayers, 1, 8);
  const distance = opts.distance ?? 12;
  const tilt = opts.tilt ?? 18;
  const fov = Math.round(2 * Math.atan(9 / distance) * (180 / Math.PI));
  const layerOffsets = Array.from({ length: n }, (_, i) => {
    const depth = n === 1 ? 1 : i / (n - 1); // 0 cercano … 1 lejano
    return { depth: Math.round(depth * 100) / 100, offsetPx: Math.round(depth * 34) };
  });
  return {
    camera: { fov, distance, tilt, roll: 0, parallax: 0.7 },
    layerOffsets,
    aspect: '16:9',
  };
}

/* ------------------------------------------------------------------ */
/* renderEffectHtml                                                    */
/* ------------------------------------------------------------------ */

export function renderEffectHtml(plan: EffectPlan, opts: { width?: number; height?: number; title?: string } = {}): string {
  const w = opts.width ?? 640;
  const h = opts.height ?? 360;
  const title = opts.title ?? `codevfx — ${plan.name}`;
  const glslSnippet = plan.shaderGlsl.replace(/\n/g, ' ').replace(/"/g, "'");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  html,body{margin:0;height:100%;background:#08080a;overflow:hidden}
  canvas{display:block;width:100%;height:100%;cursor:crosshair}
  .tag{position:fixed;left:10px;bottom:8px;font:11px ui-monospace,monospace;color:#8b8b98;opacity:.85}
  .kbd{position:fixed;right:10px;bottom:8px;font:11px ui-monospace,monospace;color:#8b5cf6}
</style>
</head>
<body>
<canvas id="fx"></canvas>
<div class="tag">${plan.name} — 100% code, sin assets</div>
<div class="kbd">${plan.hotkey} · ${plan.particles.count} partículas</div>
<script>
// GLSL hand-written (referencia del fragment shader del efecto):
// ${glslSnippet}
const kind = ${JSON.stringify(plan.kind)};
const palette = ${JSON.stringify(plan.palette)};
const physics = ${JSON.stringify(plan.physics)};
const layers = ${JSON.stringify(plan.layers)};
const opts = { count: ${plan.particles.count}, life: ${plan.particles.life}, speed: ${plan.speed} };
const cv = document.getElementById('fx');
const ctx = cv.getContext('2d');
function fit(){ const d = Math.min(window.devicePixelRatio||1, 2); cv.width = innerWidth*d; cv.height = innerHeight*d; ctx.setTransform(d,0,0,d,0,0); }
fit(); addEventListener('resize', fit);
let intensity = 50, t = 0;
addEventListener('pointermove', e => { intensity = clamp(50 + (e.clientX/innerWidth - .5)*100, 0, 100); });
addEventListener('keydown', e => { if (e.key.toLowerCase() === ${JSON.stringify(plan.hotkey.toLowerCase())}) intensity = 100; });
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function hex(c){ const n=parseInt(c.slice(1),16); return [n>>16&255, n>>8&255, n&255]; }
function part(){ return { x: Math.random()*innerWidth, y: innerHeight + Math.random()*40, vx: (Math.random()-.5)*60, vy: -(Math.random()*180+60), s: opts.speed*(.4+Math.random()*1.4), life: 0, max: opts.life*(.6+Math.random()*.8) }; }
let ps = Array.from({ length: opts.count }, part);
function tick(){
  t += .016*opts.speed;
  const w = innerWidth, h = innerHeight;
  ctx.fillStyle = 'rgba(8,8,10,' + (kind==='beam'||kind==='plasma' ? .12 : .24) + ')';
  ctx.fillRect(0,0,w,h);
  const [br,bg,bb] = hex(palette.base), [ar,ag,ab] = hex(palette.accent);
  ctx.globalCompositeOperation = 'lighter';
  ps.forEach(p => {
    p.vy += physics.gravity*opts.speed*.016*(1 - intensity/140);
    p.vx += physics.wind*opts.speed*.016 + (Math.random()-.5)*8;
    p.vx *= physics.friction; p.vy *= physics.friction;
    p.x += p.vx*.016*opts.speed*60*.016; p.y += p.vy*.016*opts.speed*60*.016;
    p.life += .016;
    const lifeF = 1 - p.life/p.max;
    if (p.life >= p.max || p.y > h+30 || p.y < -40) { Object.assign(p, part()); return; }
    const r = (p.s*2.2)*(.5+lifeF);
    const g2 = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
    const mixA = (intensity/100);
    g2.addColorStop(0, 'rgba(' + Math.round(br+(ar-br)*mixA) + ',' + Math.round(bg+(ag-bg)*mixA) + ',' + Math.round(bb+(ab-bb)*mixA) + ',' + (.85*lifeF) + ')');
    g2.addColorStop(1, 'rgba(' + Math.round(br) + ',' + Math.round(bg) + ',' + Math.round(bb) + ',0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,6.283); ctx.fill();
  });
  // Capa de halo en el centro según el blend del plan
  layers.forEach(l => {
    ctx.globalCompositeOperation = l.blend;
    ctx.globalAlpha = l.opacity*(.5 + intensity/200);
    const g3 = ctx.createRadialGradient(w/2,h*.42,0,w/2,h*.42,w*.28);
    g3.addColorStop(0, hex(palette.energy).length ? 'rgba(' + hex(palette.energy).join(',') + ',.5)' : 'rgba(139,92,246,.5)');
    g3.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g3; ctx.fillRect(0,0,w,h);
  });
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  requestAnimationFrame(tick);
}
tick();
</script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Helpers + export                                                    */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export const codevfx = {
  planEffect,
  colorimetryAnalyze,
  curvatureShade,
  perspectivePlan,
  renderEffectHtml,
  EFFECT_KINDS,
};

export const CodeVfxSchema = z.object({});
