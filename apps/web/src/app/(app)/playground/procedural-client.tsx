'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Interactive Procedural Animation Picker.
 * 18 animation types with param controls and static frame preview.
 * Uses client-side pixel rendering for instant feedback.
 */

type Animation =
  | 'plasma' | 'waves' | 'orbits' | 'noise-flow' | 'fbm-flow'
  | 'fractal-zoom' | 'shape-morph' | 'tunnel' | 'metaballs' | 'kaleido'
  | 'starfield' | 'voronoi' | 'reaction-diffusion' | 'fire' | 'fireflies'
  | 'circuit' | 'aurora';

interface AnimInfo {
  name: Animation;
  label: string;
  desc: string;
  palette: string;
  params: { key: string; label: string; min: number; max: number; step: number; default: number }[];
}

const ANIMATIONS: AnimInfo[] = [
  {
    name: 'plasma', label: 'Plasma', desc: 'Suma de sinusoides 2D', palette: 'fire',
    params: [
      { key: 'freq1', label: 'Freq 1', min: 0.5, max: 8, step: 0.5, default: 2 },
      { key: 'freq2', label: 'Freq 2', min: 0.5, max: 8, step: 0.5, default: 3 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
    ],
  },
  {
    name: 'waves', label: 'Waves', desc: 'Bandas sinusoidales con wobble', palette: 'ice',
    params: [
      { key: 'k', label: 'K', min: 2, max: 20, step: 1, default: 8 },
      { key: 'amp', label: 'Amplitude', min: 5, max: 60, step: 1, default: 20 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
    ],
  },
  {
    name: 'orbits', label: 'Orbits', desc: 'Cuerpos orbitantes con glow gaussiano', palette: 'neoViolet',
    params: [
      { key: 'bodies', label: 'Bodies', min: 2, max: 24, step: 1, default: 6 },
      { key: 'radius', label: 'Radius', min: 0.1, max: 0.45, step: 0.05, default: 0.3 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
    ],
  },
  {
    name: 'noise-flow', label: 'Noise Flow', desc: 'Simplex noise temporal', palette: 'obsidian',
    params: [
      { key: 'scale', label: 'Scale', min: 2, max: 30, step: 1, default: 10 },
      { key: 'flowSpeed', label: 'Flow Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
      { key: 'warp', label: 'Warp', min: 0, max: 2, step: 0.1, default: 0.5 },
    ],
  },
  {
    name: 'fbm-flow', label: 'FBM Flow', desc: 'fBm multi-octava flow', palette: 'neoViolet',
    params: [
      { key: 'scale', label: 'Scale', min: 2, max: 30, step: 1, default: 8 },
      { key: 'flowSpeed', label: 'Flow Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
      { key: 'octaves', label: 'Octaves', min: 1, max: 8, step: 1, default: 4 },
    ],
  },
  {
    name: 'fractal-zoom', label: 'Fractal Zoom', desc: 'Mandelbrot zoom por frame', palette: 'fire',
    params: [
      { key: 'maxIter', label: 'Max Iter', min: 16, max: 256, step: 16, default: 64 },
      { key: 'zoomStart', label: 'Zoom Start', min: 0.5, max: 3, step: 0.5, default: 1 },
      { key: 'zoomEnd', label: 'Zoom End', min: 2, max: 20, step: 1, default: 8 },
    ],
  },
  {
    name: 'shape-morph', label: 'Shape Morph', desc: 'Interpolacion superfórmula', palette: 'ice',
    params: [
      { key: 'aM', label: 'M Start', min: 1, max: 12, step: 1, default: 2 },
      { key: 'bM', label: 'M End', min: 1, max: 12, step: 1, default: 6 },
      { key: 'size', label: 'Size', min: 0.2, max: 1, step: 0.1, default: 0.6 },
    ],
  },
  {
    name: 'tunnel', label: 'Tunnel', desc: 'Tunel radial infinito', palette: 'obsidian',
    params: [
      { key: 'rings', label: 'Rings', min: 4, max: 24, step: 1, default: 12 },
      { key: 'twist', label: 'Twist', min: 0, max: 8, step: 0.5, default: 3 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
    ],
  },
  {
    name: 'metaballs', label: 'Metaballs', desc: 'Fusion 2D de metaballs', palette: 'fire',
    params: [
      { key: 'count', label: 'Count', min: 2, max: 6, step: 1, default: 3 },
      { key: 'radius', label: 'Radius', min: 0.05, max: 0.2, step: 0.01, default: 0.1 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
    ],
  },
  {
    name: 'kaleido', label: 'Kaleidoscope', desc: 'Kaleidoscopio con N cuñas', palette: 'neoViolet',
    params: [
      { key: 'wedges', label: 'Wedges', min: 3, max: 16, step: 1, default: 6 },
      { key: 'freq', label: 'Freq', min: 1, max: 12, step: 1, default: 4 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
    ],
  },
  {
    name: 'starfield', label: 'Starfield', desc: 'Warp-speed 3D estrellas', palette: 'obsidian',
    params: [
      { key: 'stars', label: 'Stars', min: 20, max: 400, step: 20, default: 200 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1.5 },
      { key: 'density', label: 'Density', min: 0.1, max: 2, step: 0.1, default: 0.5 },
    ],
  },
  {
    name: 'voronoi', label: 'Voronoi', desc: 'Celdas Voronoi animadas', palette: 'ice',
    params: [
      { key: 'sites', label: 'Sites', min: 3, max: 30, step: 1, default: 10 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
      { key: 'edgeWidth', label: 'Edge Width', min: 0.5, max: 4, step: 0.5, default: 1.5 },
    ],
  },
  {
    name: 'reaction-diffusion', label: 'Reaction-Diff', desc: 'Patrones de Turing', palette: 'obsidian',
    params: [
      { key: 'waves', label: 'Waves', min: 2, max: 8, step: 1, default: 4 },
      { key: 'feed', label: 'Feed', min: 0.01, max: 0.08, step: 0.005, default: 0.055 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
    ],
  },
  {
    name: 'fire', label: 'Fire', desc: 'Fuego procedimental', palette: 'fire',
    params: [
      { key: 'scale', label: 'Scale', min: 2, max: 20, step: 1, default: 8 },
      { key: 'turbulence', label: 'Turbulence', min: 0.5, max: 4, step: 0.5, default: 2 },
      { key: 'intensity', label: 'Intensity', min: 0.2, max: 2, step: 0.1, default: 1 },
    ],
  },
  {
    name: 'fireflies', label: 'Fireflies', desc: 'Puntos glow orbitantes', palette: 'neoViolet',
    params: [
      { key: 'count', label: 'Count', min: 3, max: 40, step: 1, default: 15 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
      { key: 'glowRadius', label: 'Glow Radius', min: 2, max: 20, step: 1, default: 8 },
    ],
  },
  {
    name: 'circuit', label: 'Circuit', desc: 'Board de circuitos animado', palette: 'ice',
    params: [
      { key: 'gridSize', label: 'Grid Size', min: 4, max: 20, step: 1, default: 10 },
      { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.2, default: 1 },
      { key: 'lineWidth', label: 'Line Width', min: 0.5, max: 3, step: 0.5, default: 1.5 },
    ],
  },
  {
    name: 'aurora', label: 'Aurora', desc: 'Cortinas boreales', palette: 'neoViolet',
    params: [
      { key: 'layers', label: 'Layers', min: 2, max: 6, step: 1, default: 3 },
      { key: 'scale', label: 'Scale', min: 2, max: 20, step: 1, default: 8 },
      { key: 'drift', label: 'Drift', min: 0.2, max: 4, step: 0.2, default: 1 },
    ],
  },
];

// Simple hash for deterministic noise
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

// Pseudo-random from seed
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Simple 2D noise (value noise)
function valueNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const hash = (a: number, b: number) => {
    const rng = seededRandom(fnv1a(`${a},${b},${seed}`));
    return rng();
  };

  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);

  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) +
         (n01 * (1 - sx) + n11 * sx) * sy;
}

// FBM (fractal brownian motion)
function fbm(x: number, y: number, octaves: number, seed: number): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * valueNoise2D(x * freq, y * freq, seed + i * 1000);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

// Color from palette (HSL-based)
function paletteColor(t: number, palette: string): [number, number, number] {
  const p = t < 0 ? 0 : t > 1 ? 1 : t;
  switch (palette) {
    case 'fire':
      return [
        Math.round(255 * Math.min(1, p * 2)),
        Math.round(255 * Math.min(1, Math.max(0, p * 3 - 1))),
        Math.round(80 * Math.max(0, p - 0.5)),
      ];
    case 'ice':
      return [
        Math.round(100 + 155 * (1 - p)),
        Math.round(180 + 75 * p),
        Math.round(220 + 35 * p),
      ];
    case 'neoViolet':
      return [
        Math.round(139 + 116 * p),
        Math.round(92 - 30 * p),
        Math.round(246 - 60 * (1 - p)),
      ];
    case 'obsidian':
      return [
        Math.round(20 + 40 * p),
        Math.round(20 + 40 * p),
        Math.round(30 + 50 * p),
      ];
    default:
      return [Math.round(255 * p), Math.round(255 * p), Math.round(255 * p)];
  }
}

// Render static frame to canvas
function renderFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  animation: Animation,
  params: Record<string, number>,
  palette: string,
  time: number,
) {
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const seed = 1337;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      let t = 0;

      switch (animation) {
        case 'plasma': {
          const f1 = params.freq1 ?? 2;
          const f2 = params.freq2 ?? 3;
          t = (Math.sin(nx * f1 * Math.PI + time) + Math.sin(ny * f2 * Math.PI + time * 0.7) + 2) / 4;
          break;
        }
        case 'waves': {
          const k = params.k ?? 8;
          const amp = (params.amp ?? 20) / 200;
          t = (Math.sin(ny * k * Math.PI + Math.sin(nx * 3 + time) * amp + time) + 1) / 2;
          break;
        }
        case 'orbits': {
          const bodies = Math.round(params.bodies ?? 6);
          const radius = params.radius ?? 0.3;
          let minD = 999;
          for (let i = 0; i < bodies; i++) {
            const angle = (i / bodies) * Math.PI * 2 + time * (0.3 + i * 0.1);
            const bx = 0.5 + radius * Math.cos(angle);
            const by = 0.5 + radius * Math.sin(angle);
            const d = Math.hypot(nx - bx, ny - by);
            minD = Math.min(minD, d);
          }
          t = Math.max(0, 1 - minD * 6);
          break;
        }
        case 'noise-flow':
        case 'fbm-flow': {
          const sc = (params.scale ?? 8) / 40;
          const fw = params.flowSpeed ?? 1;
          const oct = animation === 'fbm-flow' ? (params.octaves ?? 4) : 3;
          t = fbm(nx / sc + time * fw * 0.3, ny / sc + time * fw * 0.2, oct, seed);
          break;
        }
        case 'fractal-zoom': {
          const maxIter = Math.round(params.maxIter ?? 64);
          const zStart = params.zoomStart ?? 1;
          const zEnd = params.zoomEnd ?? 8;
          const zoom = zStart + (zEnd - zStart) * time;
          const cx = -0.7;
          const cy = 0.27;
          const x0 = cx + (nx - 0.5) * 3 / zoom;
          const y0 = cy + (ny - 0.5) * 3 / zoom;
          let zx = 0, zy = 0;
          let iter = 0;
          while (zx * zx + zy * zy < 4 && iter < maxIter) {
            const tmp = zx * zx - zy * zy + x0;
            zy = 2 * zx * zy + y0;
            zx = tmp;
            iter++;
          }
          t = iter / maxIter;
          break;
        }
        case 'shape-morph': {
          const mA = params.aM ?? 2;
          const mB = params.bM ?? 6;
          const m = mA + (mB - mA) * time;
          const theta = Math.atan2(ny - 0.5, nx - 0.5);
          const r = Math.pow(Math.pow(Math.abs(Math.cos(m * theta / 4)), 2) + Math.pow(Math.abs(Math.sin(m * theta / 4)), 2), -0.5);
          const dist = Math.hypot(nx - 0.5, ny - 0.5);
          t = Math.max(0, 1 - Math.abs(dist - r * 0.4) * 10);
          break;
        }
        case 'tunnel': {
          const rings = params.rings ?? 12;
          const twist = params.twist ?? 3;
          const dx = nx - 0.5;
          const dy = ny - 0.5;
          const d = Math.hypot(dx, dy) + 0.001;
          const a = Math.atan2(dy, dx);
          const ringVal = (d * rings + time * 3) % 1;
          const twistVal = (a / Math.PI + twist * d + time * 0.5) % 1;
          t = (ringVal < 0.1 || twistVal < 0.05) ? 1 : ringVal * 0.5;
          break;
        }
        case 'metaballs': {
          const count = Math.round(params.count ?? 3);
          const rad = params.radius ?? 0.1;
          let sum = 0;
          for (let i = 0; i < count; i++) {
            const bx = 0.5 + rad * 2 * Math.cos(time * (0.5 + i * 0.3) + i * 2.1);
            const by = 0.5 + rad * 2 * Math.sin(time * (0.4 + i * 0.2) + i * 1.7);
            sum += rad / Math.hypot(nx - bx, ny - by);
          }
          t = Math.min(1, sum);
          break;
        }
        case 'kaleido': {
          const wedges = Math.round(params.wedges ?? 6);
          const freq = params.freq ?? 4;
          const a = Math.atan2(ny - 0.5, nx - 0.5);
          const sector = ((a + Math.PI) / (Math.PI * 2) * wedges) % 1;
          const d = Math.hypot(nx - 0.5, ny - 0.5);
          t = (Math.sin(sector * freq * Math.PI + time) + 1) / 2 * Math.max(0, 1 - d * 2);
          break;
        }
        case 'starfield': {
          const rng = seededRandom(fnv1a(`${x},${y}`));
          const z = rng();
          const sx = 0.5 + ((nx - 0.5) * 0.5 / (z + 0.01) + time * 0.1) % 1;
          const sy = 0.5 + ((ny - 0.5) * 0.5 / (z + 0.01)) % 1;
          const d = Math.hypot(nx - sx, ny - sy);
          t = Math.max(0, 1 - d * 30) * z;
          break;
        }
        case 'voronoi': {
          const sites = Math.round(params.sites ?? 10);
          let minD = 999, minD2 = 999;
          for (let i = 0; i < sites; i++) {
            const rng = seededRandom(fnv1a(`v${i},${seed}`));
            const sx = rng();
            const sy = rng();
            const d = Math.hypot(nx - sx, ny - sy);
            if (d < minD) { minD2 = minD; minD = d; }
            else if (d < minD2) { minD2 = d; }
          }
          const ew = (params.edgeWidth ?? 1.5) / 200;
          t = minD2 - minD < ew ? 1 : 0;
          break;
        }
        case 'reaction-diffusion': {
          const w2 = params.waves ?? 4;
          t = fbm(nx * w2 + Math.sin(time) * 0.3, ny * w2 + Math.cos(time) * 0.3, 3, seed);
          t = Math.pow(t, 1.5);
          break;
        }
        case 'fire': {
          const sc = (params.scale ?? 8) / 30;
          const turb = params.turbulence ?? 2;
          const v = fbm(nx / sc + Math.sin(time * 0.5) * turb * 0.1, (1 - ny) / sc + time * 0.3, 5, seed);
          t = Math.pow(v, 1.2) * ny * 2;
          break;
        }
        case 'fireflies': {
          const count = Math.round(params.count ?? 15);
          const gr = (params.glowRadius ?? 8) / 100;
          let glow = 0;
          for (let i = 0; i < count; i++) {
            const rng = seededRandom(fnv1a(`f${i}`));
            const fx = 0.1 + rng() * 0.8;
            const fy = 0.1 + rng() * 0.8;
            const d = Math.hypot(nx - fx, ny - fy);
            glow += Math.max(0, 1 - d / gr) * 0.5;
          }
          t = Math.min(1, glow);
          break;
        }
        case 'circuit': {
          const gs = Math.round(params.gridSize ?? 10);
          const cellX = Math.floor(nx * gs);
          const cellY = Math.floor(ny * gs);
          const rng = seededRandom(fnv1a(`c${cellX},${cellY},${seed}`));
          const v = rng();
          const fx = (nx * gs) % 1;
          const fy = (ny * gs) % 1;
          const lw = (params.lineWidth ?? 1.5) / gs / 2;
          const edge = fx < lw || fx > 1 - lw || fy < lw || fy > 1 - lw;
          t = edge && v > 0.4 ? v : 0;
          break;
        }
        case 'aurora': {
          const layers = Math.round(params.layers ?? 3);
          const sc = (params.scale ?? 8) / 30;
          let val = 0;
          for (let l = 0; l < layers; l++) {
            const yOff = 0.2 + l * 0.15;
            const wave = Math.sin(nx * 6 + time + l) * sc;
            const d = Math.abs(ny - yOff - wave);
            val += Math.max(0, 1 - d * 8) / layers;
          }
          t = val;
          break;
        }
      }

      const [r, g, b] = paletteColor(t, palette);
      const idx = (y * w + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

const PALETTE_MAP: Record<string, string> = {
  plasma: 'fire', waves: 'ice', orbits: 'neoViolet', 'noise-flow': 'obsidian',
  'fbm-flow': 'neoViolet', 'fractal-zoom': 'fire', 'shape-morph': 'ice',
  tunnel: 'obsidian', metaballs: 'fire', kaleido: 'neoViolet',
  starfield: 'obsidian', voronoi: 'ice', 'reaction-diffusion': 'obsidian',
  fire: 'fire', fireflies: 'neoViolet', circuit: 'ice', aurora: 'neoViolet',
};

export function ProceduralClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [anim, setAnim] = useState<Animation>('fbm-flow');
  const [params, setParams] = useState<Record<string, number>>({});
  const [time, setTime] = useState(0);
  const [renderSize, setRenderSize] = useState(200);
  const [exporting, setExporting] = useState(false);

  const animInfo = ANIMATIONS.find((a) => a.name === anim)!;
  const palette = PALETTE_MAP[anim] ?? 'obsidian';

  // Get param value (use default if not set)
  const getParam = useCallback((key: string) => {
    const def = animInfo.params.find((p) => p.key === key);
    return params[key] ?? def?.default ?? 0;
  }, [animInfo, params]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render at lower resolution for performance, scale up
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = renderSize;
    tmpCanvas.height = renderSize;
    const tmpCtx = tmpCanvas.getContext('2d')!;

    const allParams: Record<string, number> = {};
    for (const p of animInfo.params) {
      allParams[p.key] = getParam(p.key);
    }

    renderFrame(tmpCtx, renderSize, renderSize, anim, allParams, palette, time);

    // Scale up to display canvas
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tmpCanvas, 0, 0, canvas.width, canvas.height);
  }, [anim, animInfo, getParam, palette, time, renderSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Animation loop
  useEffect(() => {
    let raf: number;
    let startTime = performance.now();
    const animate = (now: number) => {
      setTime(((now - startTime) / 1000) % 10);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  function setParam(key: string, value: number) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function selectAnim(name: Animation) {
    setAnim(name);
    setParams({});
    setRenderSize(name === 'fractal-zoom' ? 120 : 200);
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExporting(true);
    const link = document.createElement('a');
    link.download = `procedural-${anim}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setExporting(false);
  }

  const inputCls = 'w-full rounded-lg border border-[#26263a] bg-[#0c0c10] px-2 py-1.5 text-sm text-[#e7e7ee]';
  const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-[#9a9aae]';

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      {/* Preview */}
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="rounded-lg border border-[#26263a]"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={exportPng}
            disabled={exporting}
            className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52] disabled:opacity-50"
          >
            Export PNG
          </button>
          <span className="self-center text-xs text-[#6b6b80]">
            t={time.toFixed(2)} | {renderSize}px
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
        {/* Animation picker */}
        <div>
          <label className={labelCls}>Animation</label>
          <div className="grid grid-cols-3 gap-1.5">
            {ANIMATIONS.map((a) => (
              <button
                key={a.name}
                onClick={() => selectAnim(a.name)}
                className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
                  anim === a.name
                    ? 'bg-[#8b5cf6] text-white'
                    : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6] hover:border-[#3a3a52]'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-[#6b6b80]">{animInfo.desc}</p>
        </div>

        {/* Parameters */}
        <div className="space-y-3">
          <label className={labelCls}>Parameters</label>
          {animInfo.params.map((p) => (
            <div key={p.key}>
              <div className="flex justify-between text-xs">
                <span className="text-[#9a9aae]">{p.label}</span>
                <span className="text-[#e7e7ee]">{getParam(p.key)}</span>
              </div>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={getParam(p.key)}
                onChange={(e) => setParam(p.key, Number(e.target.value))}
                className="w-full accent-[#8b5cf6]"
              />
            </div>
          ))}
        </div>

        {/* Render quality */}
        <div>
          <label className={labelCls}>Render Quality ({renderSize}px)</label>
          <div className="flex gap-1.5">
            {[100, 150, 200, 300].map((s) => (
              <button
                key={s}
                onClick={() => setRenderSize(s)}
                className={`rounded-md px-2 py-1 text-xs ${
                  renderSize === s
                    ? 'bg-[#8b5cf6] text-white'
                    : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="rounded-lg border border-[#26263a] bg-[#0c0c10] p-3">
          <div className="text-xs text-[#6b6b80]">About</div>
          <p className="mt-1 text-xs text-[#9a9aae]">
            Renderizado local en Canvas. Para video real (ffmpeg), usa{' '}
            <code className="text-[#8b5cf6]">/api/procedural</code> con{' '}
            <code className="text-[#8b5cf6]">kind=&apos;{anim}&apos;</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
