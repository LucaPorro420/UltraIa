// Evidencia v2 (iter-103): renders del rasterizador 3D + frames de animaciones nuevas
import * as fs from 'node:fs';
import * as path from 'node:path';
import { torusKnot, superShape3D, mobiusSurface, renderMeshPng } from '../packages/core/src/tools/geometry';
import { resolveSpec, renderFramePng } from '../packages/core/src/tools/procvid';
import { writePngAtomic } from '../packages/core/src/tools/pngrender';

const OUT = path.join(process.cwd(), 'resultTask', 'procedural');
fs.mkdirSync(OUT, { recursive: true });

async function main(): Promise<void> {
  // 1) Nudo tórico (2,3) sombreado Neo Violet
  const knot = torusKnot({ p: 2, q: 3, tubularSegments: 120, radialSegments: 16 });
  await writePngAtomic(path.join(OUT, 'torus-knot-render.png'), renderMeshPng(knot, { width: 320, height: 320, palette: 'neoViolet', yaw: 0.8, pitch: 0.4 }));
  // 2) Nudo tórico (3,2) hielo, otra luz
  const knot32 = torusKnot({ p: 3, q: 2, tubularSegments: 110, radialSegments: 14 });
  await writePngAtomic(path.join(OUT, 'torus-knot-32-ice.png'), renderMeshPng(knot32, { width: 320, height: 320, palette: 'ice', yaw: 1.2, pitch: 0.25, lightDir: [0.2, 0.9, 0.35] }));
  // 3) Supershape fire
  const ss = superShape3D({ m: 6, n1: 0.5, n2: 1.7, n3: 1.7 }, { m: 0, n1: 1, n2: 1, n3: 1 });
  await writePngAtomic(path.join(OUT, 'supershape-3d-fire.png'), renderMeshPng(ss, { width: 288, height: 288, palette: 'fire', yaw: 0.5 }));
  // 4) Möbius mono
  await writePngAtomic(path.join(OUT, 'mobius-mono.png'), renderMeshPng(mobiusSurface({}), { width: 288, height: 192, palette: 'mono', yaw: 1.1, pitch: 0.55 }));

  // 5) Frames de las 4 animaciones nuevas de procvid
  for (const anim of ['tunnel', 'metaballs', 'kaleido', 'starfield'] as const) {
    const spec = resolveSpec({ animation: anim, width: 240, height: 240, fps: 12, durationSec: 2 });
    await writePngAtomic(path.join(OUT, `anim-${anim}.png`), renderFramePng(spec, Math.floor(spec.frameCount / 3)));
  }
  console.log('evidencia v2 escrita en resultTask/procedural/');
}
void main();
