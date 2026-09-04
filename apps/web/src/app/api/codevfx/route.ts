//! POST /api/codevfx — VFX effect planning + HTML5 canvas demo generation.
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/codevfx
 * Returns effect plan + self-contained HTML5 canvas demo.
 * Body: { kind, intensity?, speed? }
 */

type EffectKind = 'fire' | 'ice' | 'lightning' | 'meteor' | 'beam' | 'ground' | 'void' | 'plasma' | 'frost';

const VFX_DATA: Record<EffectKind, {
  name: string; hotkey: string;
  base: string; accent: string; energy: string;
  gravity: number; wind: number; friction: number;
  shape: 'line' | 'zone';
}> = {
  fire:      { name: 'Pyro Blast',        hotkey: 'Q', base: '#ff6b35', accent: '#ffd166', energy: '#ff2d2d', gravity: -140, wind: 18,  friction: 0.985, shape: 'line' },
  ice:       { name: 'Cryo Field',        hotkey: 'W', base: '#7dd3fc', accent: '#e0f2fe', energy: '#38bdf8', gravity: 22,   wind: -8,  friction: 0.99,  shape: 'line' },
  lightning: { name: 'Storm Arc',         hotkey: 'E', base: '#c4b5fd', accent: '#fff',    energy: '#8b5cf6', gravity: 60,   wind: 40,  friction: 0.95,  shape: 'line' },
  meteor:    { name: 'Meteor Streak',     hotkey: 'R', base: '#fb923c', accent: '#fde68a', energy: '#ea580c', gravity: 240,  wind: -30, friction: 0.98,  shape: 'line' },
  beam:      { name: 'Focus Beam',        hotkey: 'F', base: '#a5f3fc', accent: '#f0fdfa', energy: '#22d3ee', gravity: 0,    wind: 0,   friction: 0.99,  shape: 'line' },
  ground:    { name: 'Terra Surge',       hotkey: 'X', base: '#d6a354', accent: '#f5e6c8', energy: '#a16207', gravity: -60,  wind: 6,   friction: 0.98,  shape: 'zone' },
  void:      { name: 'Void Singularity',  hotkey: 'V', base: '#312e81', accent: '#a78bfa', energy: '#0f0f17', gravity: -12,  wind: 0,   friction: 0.99,  shape: 'zone' },
  plasma:    { name: 'Plasma Field',      hotkey: 'C', base: '#f0abfc', accent: '#818cf8', energy: '#e879f9', gravity: 0,    wind: 12,  friction: 0.99,  shape: 'zone' },
  frost:     { name: 'Hoarfrost',         hotkey: 'B', base: '#bae6fd', accent: '#f8fafc', energy: '#0ea5e9', gravity: -4,   wind: -16, friction: 0.99,  shape: 'line' },
};

function buildPlan(kind: EffectKind, intensity: number, speed: number) {
  const v = VFX_DATA[kind];
  const count = Math.round(10 + intensity * 0.8);
  return {
    kind,
    name: v.name,
    intensity,
    speed,
    palette: { base: v.base, accent: v.accent, energy: v.energy },
    physics: { gravity: v.gravity, wind: v.wind, friction: v.friction },
    particles: { count, minSize: 1, maxSize: 6, life: Math.round(40 + intensity * 0.6) },
    layers: [
      { id: 'main', blend: v.shape === 'zone' ? 'screen' : 'source-over', opacity: 0.9 },
      { id: 'glow', blend: 'lighter', opacity: 0.3 },
    ],
    hotkey: v.hotkey,
    shape: v.shape,
  };
}

function renderHtml(plan: ReturnType<typeof buildPlan>): string {
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

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { kind?: string; intensity?: number; speed?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const kind = (body.kind ?? 'fire') as EffectKind;
  if (!VFX_DATA[kind]) {
    return NextResponse.json({ error: `unknown kind: ${kind}. valid: ${Object.keys(VFX_DATA).join(',')}` }, { status: 400 });
  }

  const intensity = Math.max(0, Math.min(100, typeof body.intensity === 'number' ? body.intensity : 50));
  const speed = Math.max(0.1, Math.min(3, typeof body.speed === 'number' ? body.speed : 1));

  const plan = buildPlan(kind, intensity, speed);
  const html = renderHtml(plan);

  return NextResponse.json({ plan, html });
}
