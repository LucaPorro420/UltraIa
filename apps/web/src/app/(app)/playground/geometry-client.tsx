'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Interactive 2D Superformula viewer.
 * Renders the Gielis superfórmula on a Canvas element.
 * Parameters are adjustable via sliders.
 */

const PRESETS: Record<string, { m: number; n1: number; n2: number; n3: number; a: number; b: number }> = {
  circle: { m: 2, n1: 2, n2: 2, n3: 2, a: 1, b: 1 },
  star: { m: 5, n1: 2, n2: 7, n3: 7, a: 1, b: 1 },
  flower: { m: 6, n1: 50, n2: 50, n3: 50, a: 1, b: 1 },
  asteroid: { m: 3, n1: 0.5, n2: 0.5, n3: 0.5, a: 1, b: 1 },
  diamond: { m: 4, n1: 1, n2: 1, n3: 1, a: 1, b: 1 },
  hexagon: { m: 6, n1: 100, n2: 100, n3: 100, a: 1, b: 1 },
  heart: { m: 1, n1: 0.5, n2: 1.7, n3: 1.7, a: 1, b: 1 },
  cross: { m: 4, n1: 0.2, n2: 0.2, n3: 0.2, a: 1, b: 1 },
};

function superformula(theta: number, m: number, n1: number, n2: number, n3: number, a: number, b: number): number {
  const t1 = Math.pow(Math.abs(Math.cos((m * theta) / 4) / a), n2);
  const t2 = Math.pow(Math.abs(Math.sin((m * theta) / 4) / b), n3);
  return Math.pow(t1 + t2, -1 / n1);
}

function drawSuperformula(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  m: number,
  n1: number,
  n2: number,
  n3: number,
  a: number,
  b: number,
  color: string,
  fill: boolean,
) {
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) * 0.38;
  const steps = 720;

  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#0c0c10';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = '#1a1a2a';
  ctx.lineWidth = 0.5;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + (i * scale) / 2, 0);
    ctx.lineTo(cx + (i * scale) / 2, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, cy + (i * scale) / 2);
    ctx.lineTo(w, cy + (i * scale) / 2);
    ctx.stroke();
  }

  // Superformula path
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const r = superformula(theta, m, n1, n2, n3, a, b);
    const x = cx + r * scale * Math.cos(theta);
    const y = cy + r * scale * Math.sin(theta);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = color + '33'; // 20% opacity
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

export function GeometryClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preset, setPreset] = useState('circle');
  const [m, setM] = useState(2);
  const [n1, setN1] = useState(2);
  const [n2, setN2] = useState(2);
  const [n3, setN3] = useState(2);
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [color, setColor] = useState('#8b5cf6');
  const [fill, setFill] = useState(true);
  const [exporting, setExporting] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSuperformula(ctx, canvas.width, canvas.height, m, n1, n2, n3, a, b, color, fill);
  }, [m, n1, n2, n3, a, b, color, fill]);

  useEffect(() => {
    draw();
  }, [draw]);

  function applyPreset(name: string) {
    const p = PRESETS[name];
    if (!p) return;
    setPreset(name);
    setM(p.m);
    setN1(p.n1);
    setN2(p.n2);
    setN3(p.n3);
    setA(p.a);
    setB(p.b);
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExporting(true);
    const link = document.createElement('a');
    link.download = `superformula-${preset}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setExporting(false);
  }

  function exportSvg() {
    const steps = 720;
    const scale = 150;
    const cx = 200;
    const cy = 200;
    const points: string[] = [];

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * 2 * Math.PI;
      const r = superformula(theta, m, n1, n2, n3, a, b);
      const x = cx + r * scale * Math.cos(theta);
      const y = cy + r * scale * Math.sin(theta);
      points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect width="400" height="400" fill="#0c0c10"/>
  <path d="${points.join(' ')} Z" fill="${fill ? color + '33' : 'none'}" stroke="${color}" stroke-width="2"/>
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = `superformula-${preset}-${Date.now()}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const inputCls = 'w-full rounded-lg border border-[#26263a] bg-[#0c0c10] px-2 py-1.5 text-sm text-[#e7e7ee]';
  const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-[#9a9aae]';

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      {/* Canvas */}
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
          <button
            onClick={exportSvg}
            className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]"
          >
            Export SVG
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Presets */}
        <div>
          <label className={labelCls}>Presets</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => applyPreset(name)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  preset === name
                    ? 'bg-[#8b5cf6] text-white'
                    : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6] hover:border-[#3a3a52]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div>
          <label className={labelCls}>m (symmetry: {m})</label>
          <input type="range" min={1} max={20} step={1} value={m} onChange={(e) => setM(Number(e.target.value))} className="w-full accent-[#8b5cf6]" />
        </div>
        <div>
          <label className={labelCls}>n1 ({n1})</label>
          <input type="range" min={0.1} max={100} step={0.1} value={n1} onChange={(e) => setN1(Number(e.target.value))} className="w-full accent-[#8b5cf6]" />
        </div>
        <div>
          <label className={labelCls}>n2 ({n2})</label>
          <input type="range" min={0.1} max={100} step={0.1} value={n2} onChange={(e) => setN2(Number(e.target.value))} className="w-full accent-[#8b5cf6]" />
        </div>
        <div>
          <label className={labelCls}>n3 ({n3})</label>
          <input type="range" min={0.1} max={100} step={0.1} value={n3} onChange={(e) => setN3(Number(e.target.value))} className="w-full accent-[#8b5cf6]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>a ({a})</label>
            <input type="range" min={0.1} max={5} step={0.1} value={a} onChange={(e) => setA(Number(e.target.value))} className="w-full accent-[#8b5cf6]" />
          </div>
          <div>
            <label className={labelCls}>b ({b})</label>
            <input type="range" min={0.1} max={5} step={0.1} value={b} onChange={(e) => setB(Number(e.target.value))} className="w-full accent-[#8b5cf6]" />
          </div>
        </div>

        {/* Color + Fill */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Color</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-full cursor-pointer rounded-lg border border-[#26263a] bg-[#0c0c10]" />
          </div>
          <div>
            <label className={labelCls}>Fill</label>
            <button
              onClick={() => setFill(!fill)}
              className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                fill
                  ? 'border-[#8b5cf6] bg-[#8b5cf6]/15 text-[#8b5cf6]'
                  : 'border-[#26263a] bg-[#0c0c10] text-[#c7c7d6]'
              }`}
            >
              {fill ? 'Filled' : 'Stroke only'}
            </button>
          </div>
        </div>

        {/* Formula display */}
        <div className="rounded-lg border border-[#26263a] bg-[#0c0c10] p-3">
          <div className="text-xs text-[#6b6b80]">Superformula</div>
          <code className="mt-1 block text-xs text-[#e7e7ee]">
            r(&theta;) = (|cos(m&theta;/4)/a|^n2 + |sin(m&theta;/4)/b|^n3)^(-1/n1)
          </code>
          <div className="mt-2 text-xs text-[#9a9aae]">
            m={m}, n1={n1}, n2={n2}, n3={n3}, a={a}, b={b}
          </div>
        </div>
      </div>
    </div>
  );
}
