import { writeFileSync } from 'fs';
import { readFileSync } from 'fs';

const plans = [
  JSON.parse(readFileSync('resultTask/travel/plan-30s.json', 'utf-8')),
  JSON.parse(readFileSync('resultTask/travel/plan-60s.json', 'utf-8')),
  JSON.parse(readFileSync('resultTask/travel/plan-2min.json', 'utf-8')),
  JSON.parse(readFileSync('resultTask/travel/plan-30min.json', 'utf-8')),
];

const durations = ['30s', '60s', '2min', '30min'];

const musicManifest = {
  generatedAt: new Date().toISOString(),
  videos: {},
};

plans.forEach((plan, idx) => {
  const dur = durations[idx];
  // Search Tunetank for style-appropriate music (single-word queries)
  const searchQueries = {
    'nature soundscape ambient': 'ambient',
    'epic orchestral percussion': 'epic',
    'world folk strings': 'folk',
    'ambient acoustic piano': 'piano',
  };
  const query = searchQueries[plan.musicaSugerida] || 'ambient';
  
  musicManifest.videos[dur] = {
    planSlug: plan.slug,
    estilo: plan.estilo,
    suggestedStyle: plan.musicaSugerida,
    tunetankQuery: query,
    fallback: 'composeMusic procedural',
    durationSec: plan.duracionSeg,
    // For 30min video, we need looping music
    loopCount: dur === '30min' ? 30 : 1, // 30 loops of ~60s each
    volume: 0.25, // ducked under narration
  };
});

writeFileSync('resultTask/travel/music-manifest.json', JSON.stringify(musicManifest, null, 2));
console.log('Music manifest generated');