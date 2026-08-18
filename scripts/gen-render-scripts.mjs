import { readFileSync, writeFileSync } from 'fs';

const durations = ['30s', '60s', '2min', '30min'];

durations.forEach(dur => {
  const renderPlan = JSON.parse(readFileSync(`resultTask/travel/render-${dur}.json`, 'utf-8'));
  const vfx = JSON.parse(readFileSync('resultTask/travel/vfx-overlays.json', 'utf-8'))[dur];
  const music = JSON.parse(readFileSync('resultTask/travel/music-manifest.json', 'utf-8')).videos[dur];
  
  // Build render.sh from renderPlan
  let sh = '#!/bin/bash\n';
  sh += '# Auto-generated render script for travel-' + dur + '.mp4\n';
  sh += '# Generated: ' + new Date().toISOString() + '\n\n';
  sh += 'set -e  # Exit on error\n\n';
  
  // Create temp directory
  sh += 'TMPDIR=$(mktemp -d)\n';
  sh += 'cd "$TMPDIR"\n\n';
  
  // Copy source clips (user needs to place them)
  sh += '# TODO: Copy source clips to $TMPDIR/\n';
  sh += '# cp /path/to/VideoTask&Memory/historyTravelTP/*.mp4 .\n\n';
  
  // Step 1: Ken Burns clips from stills (if using travel render)
  renderPlan.argv.forEach((argv, i) => {
    if (i < renderPlan.argv.length - 1) {
      // Ken Burns steps
      sh += '# Step ' + (i+1) + ': ' + renderPlan.pasos[i] + '\n';
      sh += argv.join(' ') + '\n\n';
    }
  });
  
  // Final ffmpeg step (with audio, VFX overlays, color grade)
  const finalArgv = renderPlan.argv[renderPlan.argv.length - 1];
  sh += '# Final render: ' + renderPlan.pasos[renderPlan.pasos.length - 1] + '\n';
  
  // Add VFX overlay filters if any
  if (vfx && vfx.length > 0) {
    sh += '# VFX Overlays: ' + vfx.map(v => v.kind).join(', ') + '\n';
    // Note: Actual VFX would need to be rendered as separate videos and overlaid
    sh += '# This is a placeholder for the overlay filtergraph\n';
  }
  
  // Add color grade
  const grade = 'warm-cinematic'; // default
  sh += '# Color grade: ' + grade + '\n';
  
  sh += finalArgv.join(' ') + '\n\n';
  
  sh += '# Copy result to output\n';
  sh += 'cp "' + renderPlan.manifest.outFile + '" /path/to/output/\n';
  sh += 'echo "Done: ' + renderPlan.manifest.outFile + '"\n';
  sh += 'echo "Duration: ' + renderPlan.manifest.duracionSeg + 's"\n';
  sh += 'echo "Scenes: ' + renderPlan.manifest.escenas + '"\n';
  
  writeFileSync('scripts/render-travel-' + dur + '.sh', sh);
  console.log('Generated render-travel-' + dur + '.sh');
});

console.log('All render scripts generated');