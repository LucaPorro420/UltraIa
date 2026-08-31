import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';
import {
  superShape2D,
  meshToObjText,
  meshToGltf,
} from '@ultraia/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/geometry
 * Generates a 2D superfórmula curve and exports as SVG + optional OBJ/glTF.
 * Body: { m, n1, n2, n3, a?, b?, export?: 'svg' | 'obj' | 'gltf' }
 */

function superformula(theta: number, m: number, n1: number, n2: number, n3: number, a: number, b: number): number {
  const t1 = Math.pow(Math.abs(Math.cos((m * theta) / 4) / a), n2);
  const t2 = Math.pow(Math.abs(Math.sin((m * theta) / 4) / b), n3);
  return Math.pow(t1 + t2, -1 / n1);
}

function generateSvg(m: number, n1: number, n2: number, n3: number, a: number, b: number, size = 400): string {
  const steps = 720;
  const scale = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const points: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const r = superformula(theta, m, n1, n2, n3, a, b);
    const x = cx + r * scale * Math.cos(theta);
    const y = cy + r * scale * Math.sin(theta);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#0c0c10"/>
  <path d="${points.join(' ')} Z" fill="#8b5cf633" stroke="#8b5cf6" stroke-width="2"/>
</svg>`;
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { m?: number; n1?: number; n2?: number; n3?: number; a?: number; b?: number; export?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const m = typeof body.m === 'number' ? Math.max(1, Math.min(20, Math.round(body.m))) : 5;
  const n1 = typeof body.n1 === 'number' ? Math.max(0.1, Math.min(100, body.n1)) : 2;
  const n2 = typeof body.n2 === 'number' ? Math.max(0.1, Math.min(100, body.n2)) : 7;
  const n3 = typeof body.n3 === 'number' ? Math.max(0.1, Math.min(100, body.n3)) : 7;
  const a = typeof body.a === 'number' ? Math.max(0.1, Math.min(5, body.a)) : 1;
  const b = typeof body.b === 'number' ? Math.max(0.1, Math.min(5, body.b)) : 1;

  const svg = generateSvg(m, n1, n2, n3, a, b);

  const result: Record<string, unknown> = {
    params: { m, n1, n2, n3, a, b },
    svg,
    formula: `r(theta) = (|cos(m*theta/4)/a|^n2 + |sin(m*theta/4)/b|^n3)^(-1/n1)`,
  };

  // Optional 3D export via core geometry
  if (body.export === 'obj' || body.export === 'gltf') {
    try {
      const mesh = superShape2D(m, n1, n2, n3, a, b, 200);
      if (body.export === 'obj') {
        result.obj = meshToObjText(mesh);
      } else {
        result.gltf = meshToGltf(mesh);
      }
    } catch (e) {
      result.exportError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(result);
}
