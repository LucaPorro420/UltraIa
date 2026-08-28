// -----------------------------------------------------------------------------
// Task/procedural-fbm-video.ts - capstone del ciclo de ruido (loop-149)
// -----------------------------------------------------------------------------
// Genera un VIDEO REAL de la animación `fbm-flow` (fractal flow sobre fbm2D) para
// verificar el pipeline de animación end-to-end. GIF89a 100% TypeScript vía
// procvid.renderGifBytes (sin ffmpeg, sin red, determinista).
//
// Salidas (NO commiteadas; evidencia en resultTask/...):
//   resultTask/procedural-fbm-video/
//     fbm-flow.gif         animación real (24 frames, keyless)
//     fbm-flow-poster.png  frame 0 (still)
//     manifest.json        metadatos + fnv1a (determinismo)
//
// Uso: node_modules\.bin\vite-node.cmd Task/procedural-fbm-video.ts
// -----------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  renderFramePng,
  renderGifBytes,
  resolveSpec,
} from '../packages/core/src/tools/procvid';
import { fnv1a } from '../packages/core/src/tools/generative';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'resultTask', 'procedural-fbm-video');

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });

  const spec = resolveSpec({
    animation: 'fbm-flow',
    width: 320,
    height: 320,
    fps: 12,
    durationSec: 2,
    seed: 7,
    palette: 'neoViolet',
    outName: 'fbm-flow',
  });

  const gif = await renderGifBytes(spec);
  const poster = renderFramePng(spec, 0);

  await fs.promises.writeFile(path.join(OUT, 'fbm-flow.gif'), gif);
  await fs.promises.writeFile(path.join(OUT, 'fbm-flow-poster.png'), poster);

  const manifest = {
    generator: 'ultraia-procedural-fbm-video',
    animation: 'fbm-flow',
    width: spec.width,
    height: spec.height,
    fps: spec.fps,
    frameCount: spec.frameCount,
    artifacts: {
      'fbm-flow.gif': { bytes: gif.length, fnv: fnv1a(gif) },
      'fbm-flow-poster.png': { bytes: poster.length, fnv: fnv1a(poster) },
    },
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('[procedural-fbm-video]'); // eslint-disable-line no-console
  console.log(`  fbm-flow.gif         ${gif.length} bytes  fnv=${fnv1a(gif)}`); // eslint-disable-line no-console
  console.log(`  fbm-flow-poster.png  ${poster.length} bytes  fnv=${fnv1a(poster)}`); // eslint-disable-line no-console
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
