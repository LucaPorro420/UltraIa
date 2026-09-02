/**
 * chaos-game-demo — Renders all 7 chaos game presets as real PNG files.
 *
 * Usage: npx vite-node Task/chaos-game-demo.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  generateChaosGame,
  chaosDensityToRgba,
  listPresets,
  type ChaosPreset,
} from '../packages/core/src/tools/chaos-game';
import { encodePng } from '../packages/core/src/tools/pngrender';

const OUT_DIR = path.resolve('resultTask', 'chaos-game');

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const presets = listPresets();
  const results: string[] = [];

  for (const { name } of presets) {
    console.log(`Rendering ${name}...`);
    const t0 = Date.now();

    const result = generateChaosGame({
      preset: name as ChaosPreset,
      iterations: 200000,
      width: 800,
      height: 800,
      seed: 42,
    });

    const rgba = chaosDensityToRgba(
      result.density,
      result.gridWidth,
      result.gridHeight,
      'neoViolet',
    );

    const png = encodePng({
      width: result.gridWidth,
      height: result.gridHeight,
      rgba,
    });

    const filename = `chaos-${name}.png`;
    const filepath = path.join(OUT_DIR, filename);
    await writeFile(filepath, png);

    const elapsed = Date.now() - t0;
    const sizeKB = (png.length / 1024).toFixed(1);
    results.push(`  ${filename} — ${sizeKB} KB, ${elapsed}ms, checksum ${result.checksum}`);
    console.log(`  ✓ ${filename} (${sizeKB} KB, ${elapsed}ms)`);
  }

  // Write manifest
  const manifest = {
    generated: new Date().toISOString(),
    engine: 'chaos-game v1.0',
    presets: results.length,
    files: results,
  };
  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`\nDone! ${results.length} fractals in ${OUT_DIR}`);
  console.log(results.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
