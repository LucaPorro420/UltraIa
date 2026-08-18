import { planTravelVideo } from '../packages/core/src/tools/travel.ts';

const plan30 = planTravelVideo('Patagonia', { idioma: 'es', estilo: 'naturaleza', duracionSeg: 30, escenas: 4 });
const plan60 = planTravelVideo('Islandia', { idioma: 'es', estilo: 'aventura', duracionSeg: 60, escenas: 7 });
const plan120 = planTravelVideo('Marruecos', { idioma: 'es', estilo: 'cultura', duracionSeg: 120, escenas: 10 });
const plan1800 = planTravelVideo('Bali', { idioma: 'es', estilo: 'relax', duracionSeg: 1800, escenas: 20 });

console.log('=== 30s Plan ===');
console.log(JSON.stringify(plan30, null, 2));
console.log('=== 60s Plan ===');
console.log(JSON.stringify(plan60, null, 2));
console.log('=== 2min Plan ===');
console.log(JSON.stringify(plan120, null, 2));
console.log('=== 30min Plan ===');
console.log(JSON.stringify(plan1800, null, 2));

// Save to files
import { writeFileSync } from 'fs';
writeFileSync('resultTask/travel/plan-30s.json', JSON.stringify(plan30, null, 2));
writeFileSync('resultTask/travel/plan-60s.json', JSON.stringify(plan60, null, 2));
writeFileSync('resultTask/travel/plan-2min.json', JSON.stringify(plan120, null, 2));
writeFileSync('resultTask/travel/plan-30min.json', JSON.stringify(plan1800, null, 2));