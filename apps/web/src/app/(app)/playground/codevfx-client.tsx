'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Interactive CodeVFX Effect Planner.
 * 9 VFX kinds with intensity/speed controls, real-time particle preview, HTML export.
 */

type EffectKind = 'fire' | 'ice' | 'lightning' | 'meteor' | 'beam' | 'ground' | 'void' | 'plasma' | 'frost';

interface VfxInfo {
  kind: EffectKind;
  name: string;
  hotkey: string;
  base: string;
  accent: string;
  energy: string;
  gravity: number;
  wind: number;
  friction: number;
  shape: 'line' | 'zone';
}

const VFX_KINDS: VfxInfo[] = [
  { kind: 'fire', name: 'Pyro Blast', hotkey: 'Q', base: '#ff6b35', accent: '#ffd166', energy: '#ff2d2d', gravity: -140, wind: 18, friction: 0.985, shape: 'line' },
  { kind: 'ice', name: 'Cryo Field', hotkey: 'W', base: '#7dd3fc', accent: '#e0f2fe', energy: '#38bdf8', gravity: 22, wind: -8, friction: 0.99, shape: 'line' },
  { kind: 'lightning', name: 'Storm Arc', hotkey: 'E', base: '#c4b5fd', accent: '#fff', energy: '#8b5cf6', gravity: 60, wind: 40, friction: 0.95, shape: 'line' },
  { kind: 'meteor', name: 'Meteor Streak', hotkey: 'R', base: '#fb923c', accent: '#fde68a', energy: '#ea580c', gravity: 240, wind: -30, friction: 0.98, shape: 'line' },
  { kind: 'beam', name: 'Focus Beam', hotkey: 'F', base: '#a5f3fc', accent: '#f0fdfa', energy: '#22d3ee', gravity: 0, wind: 0, friction: 0.99, shape: 'line' },
  { kind: 'ground', name: 'Terra Surge', hotkey: 'X', base: '#d6a354', accent: '#f5e6c8', energy: '#a16207', gravity: -60, wind: 6, friction: 0.98, shape: 'zone' },
  { kind: 'void', name: 'Void Singularity', hotkey: 'V', base: '#312e81', accent: '#a78bfa', energy: '#0f0f17', gravity: -12, wind: 0, friction: 0.99, shape: 'zone' },
  { kind: 'plasma', name: 'Plasma Field', hotkey: 'C', base: '#f0abfc', accent: '#818cf8', energy: '#e879f9', gravity: 0, wind: 12, friction: 0.99, shape: 'zone' },
  { kind: 'frost', name: 'Hoarfrost', hotkey: 'B', base: '#bae6fd', accent: '#f8fafc', energy: '#0ea5e9', gravity: -4, wind: -16, friction: 0.99, shape: 'line' },
];

// Particle simulation
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function spawnParticles(kind: VfxInfo, intensity: number, canvasW: number, canvasH: number): Particle[] {
  const count = Math.round(10 + intensity * 0.8);
  const particles: Particle[] = [];
  const [hue] = hexToHsl(kind.base);

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 0.5 + Math.random() * 2;
    const isZone = kind.shape === 'zone';

    particles.push({
      x: isZone ? canvasW * 0.2 + Math.random() * canvasW * 0.6 : canvasW * 0.5,
      y: isZone ? canvasH * 0.2 + Math.random() * canvasH * 0.6 : canvasH * 0.7,
      vx: Math.cos(angle) * speed * (kind.wind / 20),
      vy: Math.sin(angle) * speed + kind.gravity / 100,
      life: 1,
      maxLife: 30 + Math.random() * 60,
      size: 2 + Math.random() * 4,
      hue: hue + (Math.random() - 0.5) * 30,
    });
  }
  return particles;
}

function updateParticles(particles: Particle[], kind: VfxInfo): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vx: p.vx * kind.friction + kind.wind * 0.001,
      vy: p.vy * kind.friction + kind.gravity * 0.001,
      life: p.life - 1 / p.maxLife,
      size: p.size * 0.99,
    }))
    .filter((p) => p.life > 0);
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  particles: Particle[],
  kind: VfxInfo,
) {
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#0c0c10';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = '#1a1a2a';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < w; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
  }
  for (let i = 0; i < h; i += 40) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
  }

  // Particles
  for (const p of particles) {
    const alpha = p.life * 0.8;
    const [h2, s, l] = hexToHsl(kind.base);
    const adjH = p.hue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${adjH}, ${s}%, ${l}%, ${alpha})`;
    ctx.fill();

    // Glow
    if (p.size > 2) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${adjH}, ${s}%, ${l}%, ${alpha * 0.15})`;
      ctx.fill();
    }
  }

  // Origin indicator
  if (kind.shape === 'line') {
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.7, 6, 0, Math.PI * 2);
    ctx.fillStyle = kind.base + '80';
    ctx.fill();
    ctx.strokeStyle = kind.base;
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 20, 0, Math.PI * 2);
    ctx.strokeStyle = kind.base + '40';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Plan data structure
interface EffectPlan {
  kind: EffectKind;
  name: string;
  intensity: number;
  speed: number;
  palette: { base: string; accent: string; energy: string };
  physics: { gravity: number; wind: number; friction: number };
  particles: { count: number; minSize: number; maxSize: number; life: number };
  layers: { id: string; blend: string; opacity: number }[];
  hotkey: string;
}

function buildPlan(kind: VfxInfo, intensity: number, speed: number): EffectPlan {
  const count = Math.round(10 + intensity * 0.8);
  return {
    kind: kind.kind,
    name: kind.name,
    intensity,
    speed,
    palette: { base: kind.base, accent: kind.accent, energy: kind.energy },
    physics: { gravity: kind.gravity, wind: kind.wind, friction: kind.friction },
    particles: { count, minSize: 1, maxSize: 6, life: 40 + intensity * 0.6 },
    layers: [
      { id: 'main', blend: kind.shape === 'zone' ? 'screen' : 'source-over', opacity: 0.9 },
      { id: 'glow', blend: 'lighter', opacity: 0.3 },
    ],
    hotkey: kind.hotkey,
  };
}

function renderPlanHtml(plan: EffectPlan): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${plan.name} - CodeVFX</title>
<style>body{margin:0;background:#08080a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace}
canvas{border:1px solid #1f1f2a;border-radius:8px}
.info{position:fixed;bottom:16px;left:16px;color:#9a9aae;font-size:12px}</style></head>
<body>
<canvas id="c" width="400" height="400"></canvas>
<div class="info">${plan.name} | ${plan.kind} | intensity=${plan.intensity} | speed=${plan.speed}</div>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');
const particles=[];
const base="${plan.palette.base}";
const g=${plan.physics.gravity},w=${plan.physics.wind},f=${plan.physics.friction};
const count=${plan.particles.count};
for(let i=0;i<count;i++){
  particles.push({x:200,y:280,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4-2,
    life:1,s:${plan.particles.maxSize}});
}
function frame(){
  x.fillStyle='#0c0c10';x.fillRect(0,0,400,400);
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.vx*=f;p.vy*=f;p.vy+=g/100;p.vx+=w/2000;p.life-=0.015;
    if(p.life<=0){p.x=200;p.y=280;p.vx=(Math.random()-0.5)*4;p.vy=(Math.random()-0.5)*4-2;p.life=1;}
    x.globalAlpha=p.life*0.8;x.fillStyle=base;x.beginPath();x.arc(p.x,p.y,p.s*p.life,0,Math.PI*2);x.fill();
    x.globalAlpha=p.life*0.15;x.beginPath();x.arc(p.x,p.y,p.s*2.5,0,Math.PI*2);x.fill();
  }
  x.globalAlpha=1;requestAnimationFrame(frame);
}
frame();
</script></body></html>`;
}

export function CodevfxClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [kind, setKind] = useState<EffectKind>('fire');
  const [intensity, setIntensity] = useState(50);
  const [speed, setSpeed] = useState(1);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const vfxInfo = VFX_KINDS.find((v) => v.kind === kind)!;
  const plan = buildPlan(vfxInfo, intensity, speed);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Spawn new particles periodically
    if (Math.random() < 0.15 * speed) {
      const newP = spawnParticles(vfxInfo, intensity, canvas.width, canvas.height);
      particlesRef.current.push(...newP);
    }

    particlesRef.current = updateParticles(particlesRef.current, vfxInfo);
    drawParticles(ctx, canvas.width, canvas.height, particlesRef.current, vfxInfo);

    rafRef.current = requestAnimationFrame(animate);
  }, [vfxInfo, intensity, speed]);

  useEffect(() => {
    particlesRef.current = [];
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  function selectKind(k: EffectKind) {
    setKind(k);
    particlesRef.current = [];
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `vfx-${kind}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function exportHtml() {
    const html = renderPlanHtml(plan);
    const blob = new Blob([html], { type: 'text/html' });
    const link = document.createElement('a');
    link.download = `vfx-${kind}-${Date.now()}.html`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportPlanJson() {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `vfx-${kind}-plan.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

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
          <button onClick={exportPng} className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]">
            Export PNG
          </button>
          <button onClick={exportHtml} className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]">
            Export HTML
          </button>
          <button onClick={exportPlanJson} className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]">
            Export Plan JSON
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Kind picker */}
        <div>
          <label className={labelCls}>Effect Kind</label>
          <div className="grid grid-cols-3 gap-1.5">
            {VFX_KINDS.map((v) => (
              <button
                key={v.kind}
                onClick={() => selectKind(v.kind)}
                className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
                  kind === v.kind
                    ? 'text-white'
                    : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6] hover:border-[#3a3a52]'
                }`}
                style={kind === v.kind ? { backgroundColor: v.base } : undefined}
              >
                <span className="font-mono text-[10px] opacity-60">{v.hotkey}</span> {v.name.split(' ')[0]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-[#6b6b80]">
            {vfxInfo.name} | {vfxInfo.shape} | gravity={vfxInfo.gravity} wind={vfxInfo.wind}
          </p>
        </div>

        {/* Intensity */}
        <div>
          <div className="flex justify-between text-xs">
            <span className="text-[#9a9aae]">Intensity</span>
            <span className="text-[#e7e7ee]">{intensity}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-[#8b5cf6]"
          />
          <div className="flex justify-between text-[10px] text-[#6b6b80]">
            <span>Minimal</span><span>Maximum</span>
          </div>
        </div>

        {/* Speed */}
        <div>
          <div className="flex justify-between text-xs">
            <span className="text-[#9a9aae]">Speed</span>
            <span className="text-[#e7e7ee]">{speed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full accent-[#8b5cf6]"
          />
        </div>

        {/* Palette preview */}
        <div>
          <label className={labelCls}>Palette</label>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-[#26263a] p-2 text-center">
              <div className="mb-1 h-6 rounded" style={{ backgroundColor: vfxInfo.base }} />
              <span className="text-[10px] text-[#6b6b80]">base</span>
            </div>
            <div className="flex-1 rounded-lg border border-[#26263a] p-2 text-center">
              <div className="mb-1 h-6 rounded" style={{ backgroundColor: vfxInfo.accent }} />
              <span className="text-[10px] text-[#6b6b80]">accent</span>
            </div>
            <div className="flex-1 rounded-lg border border-[#26263a] p-2 text-center">
              <div className="mb-1 h-6 rounded" style={{ backgroundColor: vfxInfo.energy }} />
              <span className="text-[10px] text-[#6b6b80]">energy</span>
            </div>
          </div>
        </div>

        {/* Plan preview */}
        <div className="rounded-lg border border-[#26263a] bg-[#0c0c10] p-3">
          <div className="text-xs text-[#6b6b80]">Effect Plan</div>
          <pre className="mt-1 overflow-x-auto text-[10px] text-[#e7e7ee]">
{JSON.stringify({
  kind: plan.kind,
  intensity: plan.intensity,
  speed: plan.speed,
  particles: plan.particles.count,
  physics: plan.physics,
}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
