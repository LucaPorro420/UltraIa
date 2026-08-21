import { simulateBall } from './packages/core/src/tools/creativo.ts';
const r = simulateBall(
  { radius: 5, x: 100, y: 490, vy: 200, restitution: 0.7 },
  { gravity: 0, damping: 0, floorFriction: 0, width: 2000, height: 500, dt: 0.01, durationSec: 0.5, seed: 1 },
);
console.log('bounces:', r.bounces.length);
console.log('step1 y/vy:', r.steps[0]?.y, r.steps[0]?.vy);
console.log('step3 y   :', r.steps[2]?.y);
console.log('first bounce:', r.bounces[0]);
