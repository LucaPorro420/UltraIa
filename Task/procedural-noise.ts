// -----------------------------------------------------------------------------
// Task/procedural-noise.ts - demo REAL de los generadores de ruido (loop-147)
// -----------------------------------------------------------------------------
// Genera artefactos REALES en disco para verificar el pipeline completo:
//   matemática (value/fbm/worley de generative.ts) → PNG/GIF reales (pngrender.ts).
//
// Salidas (NO commiteadas; evidencia versionada en resultTask/...):
//   resultTask/procedural-noise/
//     value-noise.png      valueNoiseField        palette obsidian
//     fbm.png              fbmField (5 octavas)   palette neoViolet
//     worley.png           worleyField euclidean  palette ice
//     fbm-ridged.png       1 - |2*fbm - 1|        palette fire  (composición)
//     fbm-animated.gif     16 frames fbm2D+morph  palette rgb332 (animado, keyless)
//     manifest.json        metadatos + fnv1a (determinismo)
//
// Uso: node_modules\.bin\vite-node.cmd Task/procedural-noise.ts
// -----------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  fbm2D,
  fbmField,
  fnv1a,
  valueNoiseField,
  worleyField,
} from '../packages/core/src/tools/generative';
import {
  encodeGif,
  encodePng,
  valuesToRgba,
  writeGifAtomic,
  writePngAtomic,
} from '../packages/core/src/tools/pngrender';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'resultTask', 'procedural-noise');
const W = 256;
const H = 256;

type Artifact = { name: string; bytes: number; fnv: string };

async function emitPng(name: string, field: Float32Array, palette: string): Promise<Artifact> {
  const rgba = valuesToRgba(field, W, H, palette);
  const png = encodePng({ width: W, height: H, rgba });
  await writePngAtomic(path.join(OUT, name), png);
  return { name, bytes: png.length, fnv: fnv1a(rgba) };
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const artifacts: Artifact[] = [];

  /* 1) value noise */
  artifacts.push(await emitPng('value-noise.png', valueNoiseField(W, H, { seed: 7, scale: 24 }), 'obsidian'));

  /* 2) fBm (suma de octavas de value noise) */
  const fbmData = fbmField(W, H, { seed: 3, octaves: 5, persistence: 0.55, lacunarity: 2, scale: 24 });
  artifacts.push(await emitPng('fbm.png', fbmData, 'neoViolet'));

  /* 3) Worley / cellular (Voronoi F1) */
  artifacts.push(await emitPng('worley.png', worleyField(W, H, { seed: 11, scale: 28, metric: 'euclidean' }), 'ice'));

  /* 4) ridged fBm (composición determinista sobre fbm) */
  const ridged = new Float32Array(W * H);
  for (let i = 0; i < fbmData.length; i++) ridged[i] = 1 - Math.abs(2 * fbmData[i] - 1);
  artifacts.push(await emitPng('fbm-ridged.png', ridged, 'fire'));

  /* 5) GIF animado: fBm morphing en el tiempo (keyless, codificador puro TS) */
  const GW = 160;
  const GH = 160;
  const FRAMES = 16;
  const gifFrames: Uint8Array[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const t = f / FRAMES;
    const field = new Float32Array(GW * GH);
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        field[y * GW + x] = fbm2D((x + t * 40) / 18, (y + t * 40) / 18, {
          seed: 3,
          octaves: 4,
          persistence: 0.5,
          lacunarity: 2,
        });
      }
    }
    gifFrames.push(valuesToRgba(field, GW, GH, 'neoViolet'));
  }
  const gifBytes = encodeGif(gifFrames, { width: GW, height: GH, delayMs: 80, loop: true, palette: 'rgb332' });
  await writeGifAtomic(path.join(OUT, 'fbm-animated.gif'), gifBytes);
  artifacts.push({ name: 'fbm-animated.gif', bytes: gifBytes.length, fnv: fnv1a(gifBytes) });

  const manifest = { generator: 'ultraia-procedural-noise', width: W, height: H, gif: { width: GW, height: GH, frames: FRAMES }, artifacts };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('[procedural-noise] artifacts generados en', OUT);
  for (const a of artifacts) {
    console.log(`  ${a.name.padEnd(20)} ${String(a.bytes).padStart(8)} bytes  fnv1a=${a.fnv}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
