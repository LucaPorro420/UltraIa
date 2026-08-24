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


/* ================================================================== */
/* v2 - Principios avanzados portados del fuente real vendido          */
/* (vendor/LinearAbiltyCastingThreeJS commit ba61847cb688, MIT).        */
/* Port ORIGINAL de PRINCIPIOS de arquitectura: nada de codigo copiado. */
/* Referencias de valor verificado en el vendor:                        */
/*   - src/config/settings.js: settings-as-API (todo en unidades fisicas)*/
/*   - src/abilities/Ability.js: phase machine + records fraccionales   */
/*   - src/materials/LightningMaterial.js: dos relojes + ruido lineal   */
/*   - src/materials/BeamMaterial.js: triple capa halo/sheath/core      */
/*   - src/effects/ZoneIndicator.js: snap outCubic x bump               */
/*   - src/effects/GroundDecals.js: anti-patron de muestreo angular     */
/*   - src/particles/ParticleSystem.js: ring buffer + siluetas puras    */
/* ================================================================== */

function sat01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function vfxEaseOutQuad(t: number): number {
  const x = sat01(t);
  return 1 - (1 - x) * (1 - x);
}
function vfxEaseOutCubic(t: number): number {
  return 1 - Math.pow(1 - sat01(t), 3);
}

/** Maximo de casts simultaneos compartido entre tipos (AbilityManager.MAX_CONCURRENT). */
export const MAX_CONCURRENT_CASTS = 4;
/** Pool de luces dinamicas creado en boot; acquire() devuelve null cuando se agota. */
export const LIGHT_POOL_SIZE = 6;

export type SettingsUnit = 'm' | 'm/s' | 's' | 'hz' | 'ratio' | 'count';

export interface SettingsParam {
  value: number;
  min: number;
  max: number;
  unit: SettingsUnit;
  label: string;
}

export type SettingsGroup = Record<string, SettingsParam>;

export interface EffectSettingsTree {
  kind: EffectKind;
  global: SettingsGroup;
  cast: SettingsGroup;
  effect: SettingsGroup;
}

export type CastShape = 'line' | 'zone';

/** Kinds que se apuntan por zona (AoE de suelo); el resto son lineales. */
export const ZONE_KINDS: readonly EffectKind[] = ['ground', 'void', 'plasma'];

export function castShapeFor(kind: EffectKind): CastShape {
  return ZONE_KINDS.includes(kind) ? 'zone' : 'line';
}

const GLOBAL_GROUP: SettingsGroup = {
  timeScale: { value: 1.0, min: 0.05, max: 3, unit: 'ratio', label: 'escala temporal global' },
  speed: { value: 1.0, min: 0.1, max: 3, unit: 'ratio', label: 'multiplicador de velocidad de viaje' },
  glow: { value: 1.0, min: 0, max: 4, unit: 'ratio', label: 'emisivo alimentado al bloom' },
  noiseStrength: { value: 1.0, min: 0, max: 3, unit: 'ratio', label: 'fuerza de ruido maestra' },
  particleCount: { value: 1.0, min: 0, max: 3, unit: 'ratio', label: 'multiplicador de particulas' },
  particleLifetime: { value: 1.0, min: 0.1, max: 3, unit: 'ratio', label: 'multiplicador de vida' },
  lightIntensity: { value: 1.0, min: 0, max: 4, unit: 'ratio', label: 'intensidad de luz dinamica' },
  opacity: { value: 1.0, min: 0.1, max: 1, unit: 'ratio', label: 'opacidad global' },
  cameraShake: { value: 1.0, min: 0, max: 3, unit: 'ratio', label: 'sacudida de camara' },
};

/** Overrides por kind sobre el contrato de cast base (todo en metros/segundos). */
const CAST_OVERRIDES: Partial<Record<EffectKind, SettingsGroup>> = {
  ice: {
    range: { value: 12, min: 1, max: 20, unit: 'm', label: 'alcance' },
    speed: { value: 26, min: 2, max: 60, unit: 'm/s', label: 'velocidad del frente' },
  },
  lightning: {
    range: { value: 14, min: 1, max: 22, unit: 'm', label: 'alcance' },
    speed: { value: 34, min: 4, max: 80, unit: 'm/s', label: 'velocidad del frente' },
  },
  meteor: {
    range: { value: 13, min: 2, max: 20, unit: 'm', label: 'alcance' },
    speed: { value: 18, min: 2, max: 40, unit: 'm/s', label: 'velocidad del proyectil' },
  },
  beam: {
    range: { value: 16, min: 2, max: 24, unit: 'm', label: 'alcance' },
    speed: { value: 30, min: 4, max: 70, unit: 'm/s', label: 'velocidad del frente' },
  },
};

function castGroupFor(kind: EffectKind): SettingsGroup {
  const zone = castShapeFor(kind) === 'zone';
  const base: SettingsGroup = {
    range: { value: 12, min: 1, max: 20, unit: 'm', label: 'alcance' },
    // El upstream exige minRange 0 en la trampa de zona: una trampa que no
    // puedes soltar a tus propios pies pierde la mitad de sus usos.
    minRange: { value: zone ? 0 : 1.5, min: 0, max: 10, unit: 'm', label: 'alcance minimo' },
    speed: { value: 24, min: 2, max: 60, unit: 'm/s', label: 'velocidad del frente' },
    cooldown: { value: 2.5, min: 0, max: 20, unit: 's', label: 'enfriamiento por habilidad' },
  };
  if (zone) {
    base.zoneRadius = { value: 4.5, min: 1, max: 8, unit: 'm', label: 'radio de la zona' };
  }
  const over = CAST_OVERRIDES[kind];
  return over ? { ...base, ...over } : base;
}

function effectGroupFor(kind: EffectKind): SettingsGroup {
  const def = KIND_DEFS[kind];
  return {
    intensity: { value: 50, min: 0, max: 100, unit: 'ratio', label: 'intensidad reactiva' },
    wind: { value: def.physics.wind, min: -100, max: 100, unit: 'm/s', label: 'viento lateral' },
    friction: { value: def.physics.friction, min: 0.8, max: 1, unit: 'ratio', label: 'friccion por frame' },
  };
}

// Arbol de settings vivo del efecto (patron settings-as-API del upstream):
// shaders/particulas/luces LEEN este arbol cada frame; un preset se fusiona
// con deepMergePreset y todos los bindings siguen validos sin rebuild.
export function effectSettingsTree(kind: EffectKind): EffectSettingsTree {
  return { kind, global: { ...GLOBAL_GROUP }, cast: castGroupFor(kind), effect: effectGroupFor(kind) };
}

// Deep merge INMUTABLE estilo presets del upstream: objetos se mezclan,
// arrays y scalars reemplazan.
export function deepMergePreset<T>(base: T, patch: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    if (
      pv !== null && typeof pv === 'object' && !Array.isArray(pv) &&
      bv !== null && typeof bv === 'object' && !Array.isArray(bv)
    ) {
      out[key] = deepMergePreset(bv as Record<string, unknown>, pv as Record<string, unknown>);
    } else {
      out[key] = pv;
    }
  }
  return out as unknown as T;
}
// Registro de spawn: SOLO fracciones sin unidad + seed + timestamp-evento.
export interface SpawnRecord {
  kind: EffectKind;
  seed: number;
  distance01: number;
  lateral01: number;
  spawnedAtMs: number;
}

// Captura un spawn SIN dimensiones: ningun metro, radian o segundo queda
// congelado (principio no-dimensions-on-CPU del upstream). Todo lo demas se
// resuelve con resolveSpawnDimensions contra el arbol de settings VIGENTE.
export function fractionalSpawn(
  kind: EffectKind,
  opts: { seed?: number; distance01?: number; lateral01?: number; atMs?: number } = {},
): SpawnRecord {
  const seed = opts.seed === undefined ? 0.42 : sat01(opts.seed);
  return {
    kind,
    seed,
    distance01: sat01(opts.distance01 ?? 0.75),
    lateral01: Math.max(-1, Math.min(1, opts.lateral01 ?? 0)),
    spawnedAtMs: opts.atMs ?? 0,
  };
}

export interface ResolvedDimensions {
  distanceM: number;
  speedMps: number;
  easeIn: number;
  shimmer: number;
  shape: CastShape;
  zoneRadiusM: number | null;
}

// Brillo de luz dinamica: shimmer lento (el hielo destella, no parpadea).
export function lightShimmer(ageSec: number): number {
  return +(0.9 + 0.1 * Math.sin(ageSec * 9.3) * Math.sin(ageSec * 3.7)).toFixed(6);
}

// Resuelve el record fraccional CONTRA el arbol dado (o el vigente):
// distancia = minRange + distance01 * (range - minRange); velocidad =
// cast.speed * global.speed; ease-in del frente keyed a edad (ventana 0.08s
// outQuad) para que el frente tenga peso sin multiplicar el primer paso por 0.
export function resolveSpawnDimensions(
  record: SpawnRecord,
  tree?: EffectSettingsTree,
  ageSec = 0,
): ResolvedDimensions {
  const t = tree ?? effectSettingsTree(record.kind);
  const range = t.cast.range.value;
  const minRange = t.cast.minRange.value;
  const distanceM = minRange + record.distance01 * (range - minRange);
  const speedMps = t.cast.speed.value * t.global.speed.value;
  return {
    distanceM: +Math.max(0.1, distanceM).toFixed(4),
    speedMps: +speedMps.toFixed(4),
    easeIn: +vfxEaseOutQuad(ageSec / 0.08).toFixed(6),
    shimmer: lightShimmer(ageSec),
    shape: castShapeFor(record.kind),
    zoneRadiusM: t.cast.zoneRadius ? t.cast.zoneRadius.value : null,
  };
}

export type VfxPhase = 'windup' | 'travel' | 'impact' | 'fade' | 'done';

export interface PhasePlan {
  kind: EffectKind;
  phases: VfxPhase[];
  windupS: number;
  impactS: number;
  fadeS: number;
}

export interface PhaseState {
  phase: VfxPhase;
  t: number;
}

const WINDUP_KINDS: readonly EffectKind[] = ['beam', 'plasma'];

// Plan de fases del cast. El beat wind-up del upstream no toca la maquina:
// advance() simplemente se niega a soltar el frente hasta cargar; aqui se
// modela como fase previa con duracion propia (solo beam/plasma).
export function phaseMachine(kind: EffectKind): PhasePlan {
  const withWindup = WINDUP_KINDS.includes(kind);
  return {
    kind,
    phases: withWindup ? ['windup', 'travel', 'impact', 'fade'] : ['travel', 'impact', 'fade'],
    windupS: withWindup ? (kind === 'beam' ? 0.9 : 0.7) : 0,
    impactS: 1.1,
    fadeS: 1.2,
  };
}

// Evalua la fase a una edad dada (s). Determinista: misma entrada -> mismo
// estado (sin reloj real).
export function evaluatePhase(plan: PhasePlan, ageSec: number, distanceM: number, speedMps: number): PhaseState {
  let remaining = Math.max(0, ageSec);
  for (const phase of plan.phases) {
    const dur =
      phase === 'windup'
        ? plan.windupS
        : phase === 'travel'
          ? Math.max(0.0001, distanceM / Math.max(0.0001, speedMps))
          : phase === 'impact'
            ? plan.impactS
            : plan.fadeS;
    if (remaining < dur || phase === 'fade') {
      if (remaining >= dur) return { phase: 'done', t: 1 };
      return { phase, t: +sat01(remaining / dur).toFixed(6) };
    }
    remaining -= dur;
  }
  return { phase: 'done', t: 1 };
}

export interface FlickerClocks {
  strikeIndex: number;
  crawlPhase: number;
}

// Los dos relojes del rayo del upstream: restrike SNAPATEA cada filamento a
// una forma nueva N veces por segundo y crawl desliza los quiebres en medio;
// juntos evitan que un bolt sostenido parezca una cinta estatica.
// Defaults verificados en LightningMaterial (uRestrike 24, uCrawl 3.2).
export function flickerClocks(
  timeSec: number,
  opts: { restrikeHz?: number; crawlSpeed?: number } = {},
): FlickerClocks {
  const restrikeHz = Math.max(0.01, opts.restrikeHz ?? 24);
  const crawlSpeed = Math.max(0, opts.crawlSpeed ?? 3.2);
  const strikeIndex = Math.floor(timeSec * restrikeHz);
  const raw = timeSec * crawlSpeed;
  return { strikeIndex, crawlPhase: +(raw - Math.floor(raw)).toFixed(6) };
}

export type NoiseProfile = 'piecewise-linear' | 'smooth-flow' | 'dual-space-fbm' | 'domain-warped-plane';

export interface NoiseProfileSpec {
  profile: NoiseProfile;
  rationale: string;
  sampling: 'plane' | 'world+local';
}

// El perfil de ruido ES la personalidad: rayo con rampa LINEAL (smoothstep
// redondearia las esquinas y las esquinas son toda la lectura del rayo);
// beam suave estirado contra el flujo (un beam que se quiebra es un bolt);
// hielo con fbm dual (fracturas en espacio MUNDO de tamano fisico fijo +
// escarcha en espacio LOCAL siguiendo el eje de cada cristal).
export function noiseProfileFor(kind: EffectKind): NoiseProfileSpec {
  switch (kind) {
    case 'lightning':
    case 'meteor':
      return { profile: 'piecewise-linear', rationale: 'las esquinas SON el rayo; una rampa suave las redondea y mata la lectura', sampling: 'plane' };
    case 'beam':
    case 'plasma':
      return { profile: 'smooth-flow', rationale: 'ruido suave estirado contra el flujo y arrastrandose: un beam que se quiebra es un bolt', sampling: 'plane' };
    case 'ice':
    case 'frost':
      return { profile: 'dual-space-fbm', rationale: 'fracturas en espacio mundo + rime en espacio local (sigue el eje de cada cristal)', sampling: 'world+local' };
    default:
      return { profile: 'domain-warped-plane', rationale: 'muestreo en plano con domain warp para que las vetas serpenteen y bifurquen', sampling: 'plane' };
  }
}
export interface AimIndicatorPlan {
  silhouette: 'rounded-union(box-shaft, triangle-head)';
  units: 'metres';
  shaftHalfWidthM: number;
  headLengthM: number;
  headHalfWidthM: number;
  cornerRoundM: number;
  startOffsetM: number;
  outlineM: number;
  chevronsPerMetre: number;
  chevronScrollMps: number;
  frostNoisePerMetre: number;
  voronoiPlateScale: number;
  rangeM: number;
  minRangeM: number;
  derivation: string[];
}

// Plan de la flecha League-style: UN quad de suelo cuya SDF se remapea a
// METROS desde el caster, asi el shaft conserva su anchura fisica tenga el
// cast 3 m o 15 m. Union redondeada de caja (shaft) + triangulo exacto de
// iq (cabeza). De esa UNA SDF derivan contorno, lavado interior rim-weighted,
// chevrones (fase sesgada por |x|), escarcha y placas voronoi.
export function aimIndicatorPlan(opts: { rangeM?: number; minRangeM?: number } = {}): AimIndicatorPlan {
  const rangeM = Math.max(0.5, opts.rangeM ?? 12);
  const minRangeM = Math.max(0, Math.min(opts.minRangeM ?? 0, rangeM));
  return {
    silhouette: 'rounded-union(box-shaft, triangle-head)',
    units: 'metres',
    shaftHalfWidthM: 0.42,
    headLengthM: 2.6,
    headHalfWidthM: 1.35,
    cornerRoundM: 0.12,
    startOffsetM: 0.9,
    outlineM: 0.09,
    chevronsPerMetre: 0.55,
    chevronScrollMps: 2.4,
    frostNoisePerMetre: 1.6,
    voronoiPlateScale: 2.4,
    rangeM: +rangeM.toFixed(3),
    minRangeM: +minRangeM.toFixed(3),
    derivation: [
      'sdBox(shaft) union sdTriangleIq(head) con redondeo',
      'outline = edge de la misma SDF',
      'lavado interior con peso en el borde',
      'chevrones: banda con fase sesgada por |x| -> apuntan hacia el tip',
      'escarcha fbm + placas voronoi comiendo el interior',
      'ring en los pies del caster + arco del limite de alcance',
    ],
  };
}

export interface ZoneIndicatorPlan {
  units: 'metres';
  boundaryM: number;
  boundaryBias: number;
  linerM: number;
  fillFalloff: number;
  contourRings: number;
  ringSpeedRadiiPerS: number;
  ticks: number;
  tickLengthM: number;
  snap: number;
  bumpExponent: number;
  growEasing: 'outCubic';
  personalityNote: string;
}

// Radio SNATEADO exacto del upstream: grow outCubic x bump sin(pi*t^p)
// cuyo pico es tardio y muere EXACTAMENTE en 1 -> el circulo se pasa de su
// radio y vuelve a asentarse.
export function snappedZoneRadius(radiusM: number, reveal01: number, snap = 1.18, bumpExponent = 1.7): number {
  const t = sat01(reveal01);
  const bump = Math.sin(Math.PI * Math.pow(t, bumpExponent));
  return +(radiusM * vfxEaseOutCubic(t) * (1 + (snap - 1) * bump)).toFixed(4);
}

// Plan del circulo de zona (far cast): el borde mide SU GROSOR EN METROS
// (0.34 m) sea el radio 2 m u 8 m, partido sobre el radio nominal por
// boundaryBias para que el labio EXTERIOR diga donde termina el efecto.
// Un solo numero (zoneRadius) mueve indicador, tentaculos, arcos de rim,
// campo quemado y garganta de la columna JUNTOS y en vivo.
export function zoneIndicatorPlan(opts: { zoneRadiusM?: number; snap?: number } = {}): ZoneIndicatorPlan {
  return {
    units: 'metres',
    boundaryM: 0.34,
    boundaryBias: 0.35,
    linerM: 0.05,
    fillFalloff: 1.5,
    contourRings: 2,
    ringSpeedRadiiPerS: 0.35,
    ticks: 24,
    tickLengthM: 0.42,
    snap: opts.snap ?? 1.18,
    bumpExponent: 1.7,
    growEasing: 'outCubic',
    personalityNote:
      'el circulo se abre PASANDOSE de su radio y vuelve a asentarse; uno lineal lee como elemento de UI',
  };
}

export type ParticleSilhouette = 'soft' | 'smoke' | 'streak' | 'chip' | 'ring';

export interface ParticleSystemDef {
  id: string;
  capacity: number;
  silhouette: ParticleSilhouette;
  blending: 'additive' | 'normal';
  gravitySign: 1 | -1 | 0;
  gradient: [string, string, string, string];
}

export interface ParticleSystemSpec {
  kind: EffectKind;
  systems: ParticleSystemDef[];
  designNote: string;
}

function grad4(palette: { base: string; accent: string; energy: string }): [string, string, string, string] {
  return [palette.energy, palette.accent, palette.base, '#0b0b10'];
}

// Sistemas de particulas por familia (GPU instanciada; la CPU solo escribe
// spawns de slots cambiados en un ring buffer: emitir de mas RECICLA, nunca
// aloja). Siluetas 100% procedurales: cero texturas de sprite.
export function particleSystemSpec(kind: EffectKind): ParticleSystemSpec {
  const p = KIND_DEFS[kind].palette;
  const g = grad4(p);
  switch (kind) {
    case 'ice':
      return {
        kind,
        systems: [
          { id: 'mist', capacity: 900, silhouette: 'soft', blending: 'normal', gravitySign: 0, gradient: g },
          { id: 'shards', capacity: 400, silhouette: 'chip', blending: 'additive', gravitySign: 1, gradient: g },
          { id: 'glitter', capacity: 600, silhouette: 'soft', blending: 'additive', gravitySign: -1, gradient: g },
        ],
        designNote: 'niebla NON-additive para que la bruma ocluya de verdad y de profundidad al campo',
      };
    case 'lightning':
      return {
        kind,
        systems: [
          { id: 'sparks', capacity: 1200, silhouette: 'streak', blending: 'additive', gravitySign: 1, gradient: g },
          { id: 'motes', capacity: 500, silhouette: 'soft', blending: 'additive', gravitySign: 0, gradient: g },
          { id: 'smoke', capacity: 300, silhouette: 'smoke', blending: 'normal', gravitySign: 0, gradient: g },
          { id: 'debris', capacity: 200, silhouette: 'chip', blending: 'additive', gravitySign: 1, gradient: g },
        ],
        designNote: 'sparks emitidos desde VARIOS puntos del bolt por frame: un solo origen lee como fireworks',
      };
    case 'beam':
      return {
        kind,
        systems: [
          { id: 'motes-intake', capacity: 700, silhouette: 'soft', blending: 'additive', gravitySign: 0, gradient: g },
          { id: 'sparks-forward', capacity: 800, silhouette: 'streak', blending: 'additive', gravitySign: 0, gradient: g },
          { id: 'steam', capacity: 350, silhouette: 'smoke', blending: 'normal', gravitySign: -1, gradient: g },
          { id: 'debris', capacity: 250, silhouette: 'chip', blending: 'additive', gravitySign: 1, gradient: g },
        ],
        designNote: 'los motes se usan DOS veces (intake del orbe y deriva de la columna); sparks arrastrados downrange = lectura de presion',
      };
    case 'meteor':
      return {
        kind,
        systems: [
          { id: 'embers-wake', capacity: 900, silhouette: 'streak', blending: 'additive', gravitySign: 1, gradient: g },
          { id: 'smoke', capacity: 400, silhouette: 'smoke', blending: 'normal', gravitySign: -1, gradient: g },
          { id: 'chunks', capacity: 300, silhouette: 'chip', blending: 'additive', gravitySign: 1, gradient: g },
          { id: 'shockwave', capacity: 60, silhouette: 'ring', blending: 'additive', gravitySign: 0, gradient: g },
        ],
        designNote: 'wake raymarched del proyectil calentandose + shockwaves como siluetas ring puras',
      };
    default:
      return {
        kind,
        systems: [
          { id: 'core-plume', capacity: 700, silhouette: 'soft', blending: 'additive', gravitySign: kind === 'fire' ? -1 : 0, gradient: g },
          { id: 'dust', capacity: 350, silhouette: 'smoke', blending: 'normal', gravitySign: 0, gradient: g },
          { id: 'burst-ring', capacity: 80, silhouette: 'ring', blending: 'additive', gravitySign: 0, gradient: g },
        ],
        designNote: 'familia generica: pluma central + polvo non-additive + anillo de burst procedural',
      };
  }
}
export interface PipelinePass {
  order: number;
  id: string;
  detail: string;
}

export interface RenderPipelinePlan {
  passes: PipelinePass[];
  gradeTerms: string[];
  notes: string[];
}

// Stack de render del upstream como DATOS ordenados: prepass de profundidad
// half-res para intersecciones suaves, gancho de distorsion, bloom, ACES y
// un UNICO resample de grade que pliega todos los terminos.
export function renderPipelinePlan(): RenderPipelinePlan {
  return {
    passes: [
      { order: 1, id: 'depth-prepass', detail: 'mundo opaco a buffer half-res; todo shader VFX lo muestrea para intersecciones suaves' },
      { order: 2, id: 'distortion-hook', detail: 'offsets UV screen-space half-res; vacio hoy, es EL gancho de una refraccion futura' },
      { order: 3, id: 'scene', detail: 'render con sombras direccionales actualizadas UNA vez por frame' },
      { order: 4, id: 'bloom', detail: 'alimentado por glow global (multiplicador emisivo)' },
      { order: 5, id: 'tonemap-aces', detail: 'respuesta filmica ACES antes del grade' },
      { order: 6, id: 'grade', detail: 'aberracion cromatica + lift/gain + contraste + saturacion + temperatura + vineta + grano + flash en UN resample' },
    ],
    gradeTerms: ['chromaticAberration', 'lift', 'gain', 'contrast', 'saturation', 'temperature', 'vignette', 'filmGrain', 'impactFlash'],
    notes: [
      'pixelRatio capped en 1.75; buffers depth/distortion a media resolucion',
      'compileAsync durante boot para que el primer cast no compile shaders en caliente',
      'las 6 luces dinamicas se crean aparcadas a 0: cambiar el conteo recompila TODOS los materiales',
    ],
  };
}

export interface DecalSamplingDesc {
  sampling: 'plane' | 'angular' | string;
  domainWarp?: boolean;
  space?: string;
}

export interface DecalValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

// Guarda del anti-patron DOCUMENTADO en el vendor (GroundDecals FROST):
// manejar la silueta desde atan(y,x) entrega a cada radio del mismo bearing
// el mismo valor de lobe - literalmente como se dibuja una estrella. La
// version correcta muestrea EN EL PLANO (q = c * max(0.35, radio)) y deforma
// el lookup con fbm (patron warp ~0.45) para que las vetas serpenteen.
export function validateDecalSampling(desc: DecalSamplingDesc): DecalValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = String(desc.sampling || '').toLowerCase();
  if (s === 'angular' || s.includes('atan') || s.includes('polar')) {
    errors.push(
      'ANGULAR_SAMPLING_DRAWS_STARS: un lookup angular da a cada radio del mismo bearing el mismo valor de lobe - dibuja una estrella/firework, no una quemadura',
    );
  }
  if (!desc.domainWarp) {
    warnings.push('DOMAIN_WARP_RECOMMENDED: samplea en plano y deforma el lookup con fbm (~0.45) para vetas que serpentean y bifurcan');
  }
  return { ok: errors.length === 0, errors, warnings };
}

export interface GeometryShapeParams {
  facets: number;
  taper: number;
  roughness: number;
  bend: number;
}

// Hash estable de SOLO los params de forma que no caben en una transform por
// instancia y se hornean en geometria (formato de clave del patron upstream:
// facets entero + 3 decimales fijos). Mover cualquier otro slider NO
// reconstruye geometria.
export function geometryShapeHash(p: GeometryShapeParams): string {
  return Math.round(p.facets) + '|' + Number(p.taper).toFixed(3) + '|' + Number(p.roughness).toFixed(3) + '|' + Number(p.bend).toFixed(3);
}

export function needsGeometryRebuild(a: GeometryShapeParams, b: GeometryShapeParams): boolean {
  return geometryShapeHash(a) !== geometryShapeHash(b);
}

export interface DrawCallBudget {
  kind: EffectKind;
  calls: number;
  breakdown: Array<{ what: string; calls: number }>;
  caps: Record<string, number>;
  lights: { poolSize: number; usedByEffect: number };
}

// Presupuesto de draws medido del upstream: un bolt completo = 2 llamadas sin
// importar cuantos filamentos (la forma jamas toca la CPU); snare completo 3
// (+2 si su circulo esta armado); beam 6 (3 pasadas del tubo + coils + discos
// + orbe); campo de hielo = 3 meshes instanciados, techo 288 cristales.
export function drawCallBudget(kind: EffectKind, opts: { zoneCircleArmed?: boolean } = {}): DrawCallBudget {
  switch (kind) {
    case 'ice':
      return {
        kind,
        calls: 6,
        breakdown: [
          { what: 'campo de cristales (3 variantes de facetado)', calls: 3 },
          { what: 'mist + shards + glitter', calls: 3 },
        ],
        caps: { crystals: 288 },
        lights: { poolSize: LIGHT_POOL_SIZE, usedByEffect: 1 },
      };
    case 'lightning':
      return {
        kind,
        calls: 6,
        breakdown: [
          { what: 'bolt ribbon halo + core', calls: 2 },
          { what: 'burns/scorch decals', calls: 1 },
          { what: 'sparks/motes/smoke/debris', calls: 3 },
        ],
        caps: { filaments: 24, samplesPerFilament: 72 },
        lights: { poolSize: LIGHT_POOL_SIZE, usedByEffect: 1 },
      };
    case 'beam':
      return {
        kind,
        calls: 10,
        breakdown: [
          { what: 'tubo x3 pasadas (halo/sheath/core sobre UNA geometria)', calls: 3 },
          { what: 'coils helicoidales instanciadas', calls: 1 },
          { what: 'discos de choque instanciados', calls: 1 },
          { what: 'orbe de carga', calls: 1 },
          { what: 'motes/sparks/steam/debris', calls: 4 },
        ],
        caps: { coils: 12, shockDiscs: 16 },
        lights: { poolSize: LIGHT_POOL_SIZE, usedByEffect: 2 },
      };
    default: {
      const zone = castShapeFor(kind) === 'zone';
      const circleCalls = zone && opts.zoneCircleArmed ? 2 : 0;
      return {
        kind,
        calls: (zone ? 3 : 4) + circleCalls,
        breakdown: zone
          ? [
              { what: 'jaula instanciada (leash/columna/tentaculos/rim)', calls: 2 },
              { what: 'campo quemado del suelo (quad vivo re-escalable)', calls: 1 },
            ]
          : [
              { what: 'geometria/proyectil principal', calls: 2 },
              { what: 'decals de impacto', calls: 1 },
              { what: 'particulares de familia', calls: 1 },
            ],
        caps: zone ? { jaulaRoles: 56 } : {},
        lights: { poolSize: LIGHT_POOL_SIZE, usedByEffect: 1 },
      };
    }
  }
}

// Namespace v2: principios avanzados portados del fuente real vendido.
export const codevfxV2 = {
  effectSettingsTree,
  deepMergePreset,
  fractionalSpawn,
  resolveSpawnDimensions,
  lightShimmer,
  phaseMachine,
  evaluatePhase,
  flickerClocks,
  noiseProfileFor,
  castShapeFor,
  aimIndicatorPlan,
  zoneIndicatorPlan,
  snappedZoneRadius,
  particleSystemSpec,
  renderPipelinePlan,
  validateDecalSampling,
  geometryShapeHash,
  needsGeometryRebuild,
  drawCallBudget,
  MAX_CONCURRENT_CASTS,
  LIGHT_POOL_SIZE,
};