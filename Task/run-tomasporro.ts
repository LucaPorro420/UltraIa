#!/usr/bin/env node
/**
 * UltraIa — AI Travel Video Generator for @tomassporro
 * Generates a cinematic 9:16 travel video from keyless AI landscapes (Pollinations)
 * with Ken Burns zoompan, chained xfade transitions, and background music.
 *
 * Usage:
 *   node Task/run-tomasporro.ts [--destino "Nombre"] [--estilo naturaleza|aventura|relax|cultura] [--duracion 45] [--escenas 6]
 *   node Task/run-tomasporro.ts --help
 *
 * Output: VideoTask&Memory/tomasporro/travel-tomasporro-ia-<timestamp>.mp4
 */

import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { fetch } from 'undici';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import travel engine from core (tsx/vite-node will transpile)
import { travel } from '../packages/core/src/tools/travel.ts';

const { planTravelVideo, replicateLandscape, buildTravelRender, slugifyDestino } = travel;

interface RunnerOptions {
  destino: string;
  estilo: 'naturaleza' | 'aventura' | 'relax' | 'cultura';
  duracionSeg: number;
  escenas: number;
  outDir: string;
  dryRun: boolean;
}

const DEFAULTS: Omit<RunnerOptions, 'destino' | 'outDir'> = {
  estilo: 'naturaleza',
  duracionSeg: 45,
  escenas: 6,
  dryRun: false,
};

const OUTPUT_DIR = 'VideoTask&Memory/tomasporro';
const TEMP_BASE = '.ultraia/travel/tomasporro/ia';

function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npx vite-node Task/run-tomasporro.ts [options]

Options:
  --destino <string>     Destination name (default: "Tomás Porro - Mundo")
  --estilo <estilo>      naturaleza | aventura | relax | cultura (default: naturaleza)
  --duracion <seconds>   Total duration 30-60 (default: 45)
  --escenas <count>      Number of scenes 3-7 (default: 6)
  --out <dir>            Output directory (default: VideoTask&Memory/tomasporro)
  --dry-run              Generate plan and ffmpeg commands only, don't execute
  --help, -h             Show this help

Examples:
  npx vite-node Task/run-tomasporro.ts --destino "Cusco" --estilo aventura --duracion 50
  npx vite-node Task/run-tomasporro.ts --dry-run
`);
    process.exit(0);
  }

  const opts: RunnerOptions = {
    destino: 'Tomás Porro - Mundo',
    outDir: OUTPUT_DIR,
    ...DEFAULTS,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case '--destino':
        opts.destino = next;
        i++;
        break;
      case '--estilo':
        if (['naturaleza', 'aventura', 'relax', 'cultura'].includes(next)) {
          opts.estilo = next as RunnerOptions['estilo'];
          i++;
        }
        break;
      case '--duracion':
        opts.duracionSeg = clampInt(Number(next), 30, 60);
        i++;
        break;
      case '--escenas':
        opts.escenas = clampInt(Number(next), 3, 7);
        i++;
        break;
      case '--out':
        opts.outDir = next;
        i++;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
    }
  }

  return opts;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  const stream = createWriteStream(destPath);
  await pipeline(response.body!, stream);
}

async function runFFmpeg(argv: string[], cwd: string): Promise<{ success: boolean; output: string }> {
  console.log(`  ▶ ${argv.join(' ')}`);
  const result = spawnSync('ffmpeg', argv.slice(1), { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 300000 });
  if (result.error) {
    return { success: false, output: result.error.message };
  }
  if (result.status !== 0) {
    return { success: false, output: result.stderr || result.stdout || `Exit code ${result.status}` };
  }
  return { success: true, output: result.stdout };
}

async function main() {
  const opts = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFileName = `travel-tomasporro-ia-${timestamp}.mp4`;
  const outputPath = resolve(opts.outDir, outFileName);
  const tempDir = resolve(TEMP_BASE, slugifyDestino(opts.destino), 'scenes');

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  UltraIa — AI Travel Video Generator for @tomassporro      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n🎬 Destination: ${opts.destino}`);
  console.log(`🎨 Style: ${opts.estilo} | Duration: ${opts.duracionSeg}s | Scenes: ${opts.escenas}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📂 Temp: ${tempDir}`);
  console.log(`${opts.dryRun ? '\n🔍 DRY RUN — no execution\n' : ''}`);

  // 1. Create travel plan
  console.log('\n📋 Creating travel plan...');
  const plan = planTravelVideo(opts.destino, {
    idioma: 'es',
    estilo: opts.estilo,
    duracionSeg: opts.duracionSeg,
    escenas: opts.escenas,
  });

  console.log(`   Title: ${plan.titulo}`);
  console.log(`   Hook: ${plan.hook}`);
  console.log(`   Scenes (${plan.escenas.length}):`);
  plan.escenas.forEach((s, i) => {
    console.log(`     ${i + 1}. ${s.descripcion} [${s.motion}] ${s.duracionSeg}s`);
  });
  console.log(`   CTA: ${plan.cta}`);
  console.log(`   Music suggestion: ${plan.musicaSugerida}`);

  // 2. Generate Pollinations URLs for each scene
  console.log('\n🖼️  Generating landscape prompts & Pollinations URLs...');
  const sceneUrls: string[] = [];
  for (let i = 0; i < plan.escenas.length; i++) {
    const basePrompt = plan.escenas[i].promptImagen;
    const result = replicateLandscape(basePrompt, {
      variaciones: 1,
      seed: 20260818 + i,
      width: 720,
      height: 1280,
    });
    sceneUrls.push(result.urls[0]);
    console.log(`   Scene ${i + 1}: ${result.prompts[0]}`);
    console.log(`     → ${result.urls[0]}`);
  }

  // 3. Download images
  if (!opts.dryRun) {
    console.log('\n⬇️  Downloading images...');
    mkdirSync(tempDir, { recursive: true });
    for (let i = 0; i < sceneUrls.length; i++) {
      const imgPath = resolve(tempDir, `img-${i}.jpg`);
      try {
        await downloadImage(sceneUrls[i], imgPath);
        const fstat = existsSync(imgPath) ? require('fs').statSync(imgPath) : null;
        const sizeKB = fstat ? Math.round(fstat.size / 1024) : 0;
        console.log(`   ✓ img-${i}.jpg (${sizeKB} KB)`);
      } catch (e) {
        console.error(`   ✗ Failed to download scene ${i}: ${e}`);
        process.exit(1);
      }
    }
  }

  // 4. Generate music (procedural fallback via core, or skip)
  let bgmPath: string | null = null;
  if (!opts.dryRun) {
    console.log('\n🎵 Generating background music (procedural fallback)...');
    try {
      const { composeMusic } = await import('../packages/core/src/omag/sound.ts');
      bgmPath = resolve(tempDir, 'bgm.wav');
      const music = composeMusic({ style: 'ambient', durationSec: plan.duracionSeg, bpm: 70, key: 'Am' });
      writeFileSync(bgmPath, music.wav);
      console.log(`   ✓ Procedural BGM generated: ${bgmPath}`);
    } catch (e) {
      console.log(`   ⚠ Music generation failed (continuing without): ${e}`);
      bgmPath = null;
    }
  }

  // 5. Build ffmpeg render plan
  console.log('\n🔧 Building ffmpeg render plan...');
  const renderPlan = buildTravelRender(plan, {
    imagenesDir: tempDir,
    narracionMp3: null, // no narration per user preference
    bgmMp3: bgmPath,
    outFile: outFileName,
    width: 720,
    height: 1280,
    fps: 30,
    fadeSec: 0.6,
  });

  console.log(`   Steps: ${renderPlan.pasos.length}`);
  renderPlan.pasos.forEach((p, i) => console.log(`     ${i + 1}. ${p}`));
  console.log(`   Total duration: ${renderPlan.manifest.duracionSeg.toFixed(1)}s`);
  console.log(`   Output: ${renderPlan.manifest.outFile}`);

  // 6. Execute ffmpeg
  if (opts.dryRun) {
    console.log('\n🔍 DRY RUN — ffmpeg commands that would run:');
    renderPlan.argv.forEach((argv, i) => {
      console.log(`\n  [Step ${i + 1}]`);
      console.log(`  ${argv.join(' ')}`);
    });
    console.log('\n✅ Dry run complete. Use without --dry-run to execute.');
    return;
  }

  console.log('\n🚀 Executing ffmpeg pipeline...');
  mkdirSync(opts.outDir, { recursive: true });
  const startTime = Date.now();

  for (let i = 0; i < renderPlan.argv.length; i++) {
    const argv = renderPlan.argv[i];
    const { success, output } = await runFFmpeg(argv, tempDir);
    if (!success) {
      console.error(`\n❌ Step ${i + 1} failed:`);
      console.error(output);
      process.exit(1);
    }
    if (i < renderPlan.argv.length - 1) {
      console.log(`   ✓ Step ${i + 1} complete`);
    }
  }

  // 7. Add outro credit "@tomassporro" with fade
  const creditSrc = resolve(tempDir, outFileName);
  if (!existsSync(creditSrc)) {
    console.error('\n❌ Output file not found after render');
    process.exit(1);
  }
  const creditOut = resolve(tempDir, `credit-${outFileName}`);
  const creditArgv = [
    'ffmpeg', '-y',
    '-i', outFileName,
    '-vf', "drawtext=text='@tomassporro':fontfile='C\\:/Windows/Fonts/segoeui.ttf':fontsize=48:fontcolor=white@0.9:borderw=2:bordercolor=black@0.5:x=(w-text_w)/2:y=h-100:enable='between(t,42,45)':alpha='if(lt(t,43), (t-42)/1, if(gt(t,44), (45-t)/1, 1))'",
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k',
    `credit-${outFileName}`
  ];
  console.log('\n🎬 Adding outro credit "@tomassporro"...');
  const { success: creditOk, output: creditOutMsg } = await runFFmpeg(creditArgv, tempDir);
  if (!creditOk) {
    console.error('⚠ Credit overlay failed (continuing without):', creditOutMsg);
  } else {
    console.log('   ✓ Credit added');
  }

  // 8. Move final output to destination
  const finalWithCredit = existsSync(creditOut) ? creditOut : creditSrc;
  const fs = await import('node:fs');
  fs.renameSync(finalWithCredit, outputPath);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  console.log(`\n✅ Video generated successfully in ${elapsed}s!`);
  console.log(`📁 ${outputPath} (${sizeMB} MB)`);
  console.log(`⏱️  Duration: ${renderPlan.manifest.duracionSeg.toFixed(1)}s @ 720x1280 30fps`);
  console.log(`\n🎬 Ready for @tomassporro — cinematic 9:16 travel video with Ken Burns, xfade transitions, and @tomassporro credit fade.`);
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});