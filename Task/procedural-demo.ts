// -----------------------------------------------------------------------------
// Task/procedural-demo.ts - demo REAL de las librerÃ­as procedurales (loop-93)
// -----------------------------------------------------------------------------
// Genera artefactos REALES en disco para verificar el pipeline completo:
//   matemÃ¡tica â†’ geometrÃ­a (superShape/MÃ¶bius) â†’ imÃ¡genes PNG reales â†’ video MP4.
//
// Salidas:
//   resultTask/procedural/            â† evidencia versionada (README + manifest
//                                        + 2 PNG de prueba ligeros)
//   .ultraia/procedural/demo-video/   â† frames + MP4 (gitignored)
//
// Uso: node_modules\.bin\vite-node.cmd Task/procedural-demo.ts [--quick]
// -----------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  mobiusSurface,
  superShape3D,
  superShapeRadius,
  meshToObjText,
  meshToGltf,
  meshStats,
} from '../packages/core/src/tools/geometry';
import { encodePng, renderImagePng, writePngAtomic, valuesToRgba, writeGifAtomic } from '../packages/core/src/tools/pngrender';
import { mandelbrot } from '../packages/core/src/tools/generative';
import { resolveSpec, framePixelFn, planProcVid, renderFrames, writeManifest, buildRenderScript, renderFramePng, renderGifBytes } from '../packages/core/src/tools/procvid';

const ROOT = process.cwd();
const EVIDENCE = path.join(ROOT, 'resultTask', 'procedural');
const WORK = path.join(ROOT, '.ultraia', 'procedural');
const QUICK = process.argv.includes('--quick');

function has(cmd: string): boolean {
  try {
    execFileSync('where', [cmd], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const started = Date.now();
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.mkdirSync(WORK, { recursive: true });
  const manifest: Record<string, unknown> = { generator: 'ultraia-procedural-demo', artifacts: {} as Record<string, unknown> };
  const artifacts = manifest.artifacts as Record<string, unknown>;

  /* 1) PNG supershape (relleno por radio de Gielis) */
  {
    const W = QUICK ? 192 : 384;
    const H = QUICK ? 192 : 384;
    const paramsA = { m: 8, n1: 0.5, n2: 0.5, n3: 8 };
    const bytes = renderImagePng({ width: W, height: H }, (x, y) => {
      const nx = (x - W / 2) / (W * 0.42);
      const ny = -(y - H / 2) / (H * 0.42);
      const r = Math.hypot(nx, ny);
      const phi = Math.atan2(ny, nx);
      const limit = superShapeRadius(paramsA, phi);
      if (r <= limit) {
        const shade = 0.35 + 0.55 * (1 - r / Math.max(1e-9, limit));
        return [
          Math.round(139 * shade + 40),
          Math.round(92 * shade + 20),
          Math.round(246 * shade),
        ];
      }
      return [10, 10, 14];
    });
    const file = path.join(EVIDENCE, QUICK ? 'supershape-quick.png' : 'supershape.png');
    await writePngAtomic(file, bytes);
    artifacts.supershapePng = { path: path.relative(ROOT, file), bytes: bytes.byteLength };
  }

  /* 2) PNG Mandelbrot real vÃ­a puente generative->pngrender */
  {
    const W = QUICK ? 240 : 420;
    const H = QUICK ? 150 : 262;
    const values = mandelbrot(W, H, { center: [-0.743643887037151, 0.13182590420533], zoom: QUICK ? 60 : 350, maxIter: 220 });
    const rgba = valuesToRgba(values, W, H, 'fire');
    const file = path.join(EVIDENCE, QUICK ? 'mandelbrot-quick.png' : 'mandelbrot.png');
    await writePngAtomic(file, encodePng({ width: W, height: H, rgba }));
    artifacts.mandelbrotPng = { path: path.relative(ROOT, file), source: 'generative.mandelbrot -> pngrender.valuesToRgba' };
  }

  /* 3) Modelos 3D: MÃ¶bius OBJ + superShape glTF 2.0 */
  {
    const mobius = mobiusSurface({ radius: 1, width: 0.6, uSegs: QUICK ? 32 : 96, vSegs: 12 });
    const objPath = path.join(EVIDENCE, 'mobius.obj');
    fs.writeFileSync(objPath, meshToObjText(mobius, 'ultraia_mobius'), 'utf8');
    artifacts.mobiusObj = { path: path.relative(ROOT, objPath), ...geometryStats(mobius) };

    const shape = superShape3D({ m: 6, n1: 0.4, n2: 1.7, n3: 1.7 }, { m: 3, n1: 0.5, n2: 0.5, n3: 3 }, {
      uSegs: QUICK ? 32 : 72,
      vSegs: QUICK ? 16 : 36,
    });
    const gltfPath = path.join(EVIDENCE, 'supershape.gltf');
    fs.writeFileSync(gltfPath, meshToGltf(shape, 'ultraia_supershape'), 'utf8');
    artifacts.supershapeGltf = { path: path.relative(ROOT, gltfPath), ...geometryStats(shape), spec: 'glTF 2.0 embedded base64' };
  }

  /* 4) VIDEO real: frames PNG + ffmpeg (fail-soft si no estÃ¡ instalado) */
  const ffmpegOk = has('ffmpeg');
  let video: Record<string, unknown> = { rendered: false, reason: ffmpegOk ? null : 'ffmpeg no encontrado en PATH (winget install Gyan.FFmpeg)' };
  if (ffmpegOk) {
    const spec = resolveSpec({
      animation: 'waves',
      width: 320,
      height: 640,
      fps: 24,
      durationSec: 2,
      outName: 'demo-video',
      palette: 'ice',
    });
    const plan = planProcVid(spec, { outDir: WORK });
    const frames = await renderFrames(spec, plan);
    await writeManifest(plan);
    const { sh } = buildRenderScript(plan);
    fs.writeFileSync(path.join(plan.outDir, `${plan.outName}.render.sh`), sh, 'utf8');
    execFileSync('ffmpeg', plan.ffmpegArgv.slice(1), { stdio: 'pipe' });
    // un frame del video como evidencia ligera
    const frameBytes = renderFramePng(spec, 0);
    await writePngAtomic(path.join(EVIDENCE, QUICK ? 'video-frame-quick.png' : 'video-frame.png'), frameBytes);
    let duration: number | null = null;
    try {
      const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', plan.outputPath], { encoding: 'utf8' });
      duration = Number(probe.trim());
    } catch {
      duration = null;
    }
    video = {
      rendered: true,
      animation: spec.animation,
      width: spec.width,
      height: spec.height,
      fps: spec.fps,
      framesWritten: frames.count,
      mp4: path.relative(ROOT, plan.outputPath),
      mp4Bytes: fs.statSync(plan.outputPath).size,
      probedDurationSec: duration,
      expectedDurationSec: spec.durationSec,
    };
  }
  manifest.video = video;

  /* 5) GIF animado nativo (sin ffmpeg) */
  {
    const gifSpec = resolveSpec({
      animation: 'shape-morph',
      width: QUICK ? 96 : 160,
      height: QUICK ? 96 : 160,
      fps: 10,
      durationSec: QUICK ? 1.6 : 2.4,
      outName: 'demo-gif',
      palette: 'neoViolet',
    });
    const gifBytes = await renderGifBytes(gifSpec, { loop: true });
    const gifPath = path.join(WORK, 'demo.gif');
    await writeGifAtomic(gifPath, gifBytes);
    const evidence = path.join(EVIDENCE, 'demo-gif-preview.png');
    const { framePixelFn: fpf } = await import('../packages/core/src/tools/procvid');
    const preview = renderImagePng({ width: gifSpec.width, height: gifSpec.height }, fpf(gifSpec, 0.5));
    await writePngAtomic(evidence, preview);
    const mcBytes = await renderGifBytes(gifSpec, { loop: true, palette: 'mediancut' });
    const mcPath = path.join(WORK, 'demo-gif-mc.gif');
    await writeGifAtomic(mcPath, mcBytes);
    manifest.gif = {
      rendered: true,
      animation: gifSpec.animation,
      frames: gifSpec.frameCount,
      path: path.relative(ROOT, gifPath),
      bytes: gifBytes.byteLength,
      encoder: 'pngrender.encodeGif (GIF89a puro TypeScript, sin ffmpeg)',
      mediancut: { path: path.relative(ROOT, mcPath), bytes: mcBytes.byteLength },
      evidenceFrame: path.relative(ROOT, evidence),
    };
  }
  /* README + manifest determinista */
  const readme = buildReadme(manifest);
  fs.writeFileSync(path.join(EVIDENCE, 'README.md'), readme, 'utf8');
  fs.writeFileSync(path.join(EVIDENCE, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({ ok: true, elapsedMs: Date.now() - started, evidence: path.relative(ROOT, EVIDENCE), video }, null, 2));
}

function geometryStats(mesh: { vertices: number[][]; faces: number[][] }): Record<string, unknown> {
  const s = meshStats({ vertices: mesh.vertices, faces: mesh.faces });
  return { vertices: s.vertexCount, faces: s.faceCount };
}

function buildReadme(manifest: Record<string, unknown>): string {
  return `# Procedural demo â€” librerÃ­as geometry / pngrender / procvid (loop-93)

Artefactos generados 100% desde cÃ³digo determinista (matemÃ¡tica + geometrÃ­a + lÃ³gica),
sin IA generativa ni red. Regenerar con:

\`\`\`
node_modules\\.bin\\vite-node.cmd Task/procedural-demo.ts [--quick]
\`\`\`

## Artefactos

| Archivo | QuÃ© demuestra |
|---|---|
| \`supershape*.png\` | superfÃ³rmula de Gielis (\`m=8,n1=n2=0.5,n3=8\`) rasterizada por \`pngrender.renderImagePng\` |
| \`mandelbrot*.png\` | puente \`generative.mandelbrot\` â†’ \`pngrender.valuesToRgba\` (paleta fire) |
| \`mobius.obj\` | banda de MÃ¶bius como malla explÃ­cita exportada a Wavefront OBJ |
| \`supershape.gltf\` | superShape 3D en glTF 2.0 vÃ¡lido (buffer embebido base64; Ã¡brelo en three.js/Blender) |
| \`video-frame*.png\` | frame de la animaciÃ³n \`waves\` de \`procvid\` |

## Video

El MP4 completo se escribe en \`.ultraia/procedural/demo-video/demo-video.mp4\` (gitignored):
frames PNG reales + ensamblado ffmpeg segÃºn el argv planificado (\`libx264 crf18 yuv420p faststart\`).
DuraciÃ³n esperada 2s @ 24fps. Verificado con \`ffprobe\` cuando ffmpeg estÃ¡ disponible.

Estado de esta corrida: \`${JSON.stringify(manifest.video)}\`

## MÃ³dulos

- \`packages/core/src/tools/geometry.ts\` â€” superfÃ³rmula de Gielis 2D/3D, MÃ¶bius, ops de malla, glTF/OBJ.
- \`packages/core/src/tools/pngrender.ts\` â€” encoder PNG puro TypeScript (determinista byte a byte).
- \`packages/core/src/tools/procvid.ts\` â€” animaciones puras â†’ frames PNG â†’ plan ffmpeg.
`;
}

main().catch((err: unknown) => {
  console.error('[procedural-demo] FALLO:', err instanceof Error ? err.message : err);
  process.exit(1);
});
