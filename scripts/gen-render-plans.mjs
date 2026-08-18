import { buildTravelRender } from '../packages/core/src/tools/travel.ts';
import { readFileSync, writeFileSync } from 'fs';

const plans = [
  JSON.parse(readFileSync('resultTask/travel/plan-30s.json', 'utf-8')),
  JSON.parse(readFileSync('resultTask/travel/plan-60s.json', 'utf-8')),
  JSON.parse(readFileSync('resultTask/travel/plan-2min.json', 'utf-8')),
  JSON.parse(readFileSync('resultTask/travel/plan-30min.json', 'utf-8')),
];

plans.forEach((plan, idx) => {
  const durations = ['30s', '60s', '2min', '30min'];
  const renderPlan = buildTravelRender(plan, {
    width: 720,
    height: 1280,
    fps: 25,
    fadeSec: 0.6,
    outFile: `travel-${durations[idx]}.mp4`,
  });
  
  writeFileSync(`resultTask/travel/render-${durations[idx]}.json`, JSON.stringify(renderPlan, null, 2));
  console.log(`${durations[idx]}: ${renderPlan.argv.length} ffmpeg steps, total ${renderPlan.manifest.duracionSeg}s`);
});