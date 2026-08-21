#!/usr/bin/env node
/**
 * Build professional travel video from REAL @tomassporro stories (clean, no text overlays)
 * Concatenates 12 clips with xfade transitions + outro credit
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const CLIP_DIR = 'C:/Users/UTEC-5695/Desktop/UltraIa/VideoTask&Memory/historyTravelTP';
const OUT_DIR = 'C:/Users/UTEC-5695/Desktop/UltraIa/VideoTask&Memory/tomasporro';

// Clean clips from OCR analysis (no text overlays)
const CLEAN_CLIPS = [
  { file: '3841771215548292200.mp4', dur: 10.933333 },
  { file: '3843044780557958674.mp4', dur: 21.533333 },
  { file: '3852651808502463475.mp4', dur: 4.733333 },
  { file: '3854993852575142541.mp4', dur: 7.833333 },
  { file: '3856276995806500482.mp4', dur: 17.333333 },
  { file: '3857162611989545671.mp4', dur: 6.2 },
  { file: '3857163040764899517.mp4', dur: 23.066667 },
  { file: '3857164527410741334.mp4', dur: 32.966667 },
  { file: '3862117863893396925.mp4', dur: 20.0 },
  { file: '3862127367179647109.mp4', dur: 6.566667 },
  { file: '3868887555744116823.mp4', dur: 10.066667 },
  { file: '3876728106472339589.mp4', dur: 10.466667 },
];

const FADE_SEC = 0.6;
const WIDTH = 720;
const HEIGHT = 1280;
const FPS = 30;
const OUT_FILE = `travel-tomasporro-real-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.mp4`;

function runFFmpeg(argv: string[], cwd: string): { success: boolean; output: string } {
  console.log(`  ▶ ${argv.join(' ')}`);
  const result = spawnSync('ffmpeg', argv.slice(1), { cwd, encoding: 'utf8', maxBuffer: 50*1024*1024, timeout: 600000 });
  if (result.error) return { success: false, output: result.error.message };
  if (result.status !== 0) return { success: false, output: result.stderr || result.stdout || `Exit ${result.status}` };
  return { success: true, output: result.stdout };
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  UltraIa — Real Stories Travel Video for @tomassporro      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`📁 Input: ${CLEAN_CLIPS.length} clean clips (${CLEAN_CLIPS.reduce((a,c)=>a+c.dur,0).toFixed(1)}s total)`);
  console.log(`🎬 Output: ${OUT_DIR}/${OUT_FILE}\n`);

  // Step 1: Normalize all clips to 720x1280 30fps
  console.log('🔧 Normalizing clips...');
  const normClips: string[] = [];
  for (let i = 0; i < CLEAN_CLIPS.length; i++) {
    const clip = CLEAN_CLIPS[i];
    const out = `norm-${i}.mp4`;
    const argv = [
      'ffmpeg', '-y',
      '-i', `${CLIP_DIR}/${clip.file}`,
      '-vf', `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,fps=${FPS}`,
      '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
      '-t', clip.dur.toFixed(3),
      out
    ];
    const { success, output } = runFFmpeg(argv, CLIP_DIR);
    if (!success) {
      console.error(`  ❌ Failed: ${output}`);
      process.exit(1);
    }
    normClips.push(out);
    console.log(`  ✓ ${clip.file} (${clip.dur.toFixed(1)}s) → ${out}`);
  }

  // Step 2: Build xfade filter chain
  console.log('\n🔗 Building xfade chain...');
  const n = normClips.length;
  let fc = `[0:v][1:v]xfade=transition=fade:duration=${FADE_SEC}:offset=${Math.max(0, CLEAN_CLIPS[0].dur - FADE_SEC)}[v1]`;
  const inputs = normClips.slice(0, 2).flatMap(f => ['-i', f]);
  const labels = ['v1'];
  for (let i = 2; i < n; i++) {
    inputs.push('-i', normClips[i]);
    const offset = CLEAN_CLIPS.slice(0, i).reduce((a, c) => a + c.dur, 0) - i * FADE_SEC;
    fc += `;[${labels[i-2]}][${i}:v]xfade=transition=fade:duration=${FADE_SEC}:offset=${Math.max(0, offset)}[v${i}]`;
    labels.push(`v${i}`);
  }
  const videoLabel = labels[labels.length - 1];

  // Audio: concat with crossfade (proper chaining - acrossfade has 1 output)
  let audioFc = '';
  for (let i = 1; i < n; i++) {
    if (i === 1) {
      audioFc += `[0:a][1:a]acrossfade=d=0.5[a1]`;
    } else {
      audioFc += `;[a${i-1}][${i}:a]acrossfade=d=0.5[a${i}]`;
    }
  }
  // The last label is the final output
  const lastAudioLabel = n === 1 ? '0:a' : `a${n-1}`;

  const totalDur = CLEAN_CLIPS.reduce((a, c) => a + c.dur, 0) - (n - 1) * FADE_SEC;

  // Step 3: Final render
  console.log(`\n🚀 Rendering final video (${totalDur.toFixed(1)}s)...`);
  const argv = [
    'ffmpeg', '-y',
    ...inputs,
    '-filter_complex', `${fc};${audioFc}`,
    '-map', `[${videoLabel}]`, '-map', `[${lastAudioLabel}]`,
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k',
    '-t', totalDur.toFixed(2),
    OUT_FILE
  ];
  const { success, output } = runFFmpeg(argv, CLIP_DIR);
  if (!success) {
    console.error(`\n❌ Render failed: ${output}`);
    process.exit(1);
  }

  // Step 4: Add outro credit
  console.log('\n🎬 Adding outro credit "@tomassporro"...');
  const creditOut = `credit-${OUT_FILE}`;
  const creditArgv = [
    'ffmpeg', '-y',
    '-i', OUT_FILE,
    '-vf', `drawtext=text='@tomassporro':fontfile='C\\:/Windows/Fonts/segoeui.ttf':fontsize=48:fontcolor=white@0.9:borderw=2:bordercolor=black@0.5:x=(w-text_w)/2:y=h-100:enable='between(t,${Math.max(0, totalDur-3)},${totalDur.toFixed(1)})':alpha='if(lt(t,${Math.max(0, totalDur-2)}), (t-${Math.max(0, totalDur-3)})/1, if(gt(t,${totalDur-1}), (${totalDur.toFixed(1)}-t)/1, 1))'`,
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k',
    creditOut
  ];
  const { success: creditOk, output: creditOutMsg } = runFFmpeg(creditArgv, CLIP_DIR);
  if (!creditOk) console.error(`  ⚠ Credit failed: ${creditOutMsg}`);

  // Move to output dir
  const finalSrc = creditOk ? `${CLIP_DIR}/${creditOut}` : `${CLIP_DIR}/${OUT_FILE}`;
  const fs = await import('node:fs');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.renameSync(finalSrc, `${OUT_DIR}/${OUT_FILE}`);

  const stats = fs.statSync(`${OUT_DIR}/${OUT_FILE}`);
  console.log(`\n✅ Video generated!`);
  console.log(`📁 ${OUT_DIR}/${OUT_FILE} (${(stats.size/1024/1024).toFixed(1)} MB)`);
  console.log(`⏱️  Duration: ${totalDur.toFixed(1)}s @ ${WIDTH}x${HEIGHT} ${FPS}fps`);
  console.log(`🎬 Professional travel video from REAL @tomassporro stories (12 clean clips, xfade transitions, @tomassporro credit)`);
}

main().catch(e => { console.error('💥', e); process.exit(1); });