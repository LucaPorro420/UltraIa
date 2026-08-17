/**
 * UltraIA Game — generador determinista de juegos HTML5 autocontenidos (prompt-to-game).
 *
 * Patrón de `diagram.ts`/`video-edit.ts`: dominio puro, keyless, sin dependencias externas.
 * Un prompt ("un juego de esquivar asteroides") se traduce a un HTML+CSS+JS inline, offline,
 * a11y (role="application", controles de teclado + touch, prefers-reduced-motion) y sin
 * recursos externos (`<script src>` prohibido, sprites = CSS/DOM + canvas procedural).
 *
 * El modelo de razonamiento (o el usuario) elige `genre` + `seed` + `tema`; este módulo
 * genera el juego. Determinista: mismo spec + seed → mismo HTML byte a byte.
 *
 * La capability `game` se registra en ai/llm.ts como tool `game_generate` (wiring diferido
 * hasta que el working tree de la sesión concurrente #25 esté commiteado — ver STATE.md
 * High Priority). Este módulo exporta `gameTool` (schema + description) listo para registrar.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type GameGenre = 'runner' | 'dodge' | 'clicker' | 'pong' | 'maze' | 'quiz';
export type GameDifficulty = 'easy' | 'normal' | 'hard';

export interface QuizQuestion {
  q: string;
  options: string[];
  /** Índice de la respuesta correcta. */
  answer: number;
}

export interface GameSpec {
  /** Idea en lenguaje natural (p.ej. "un pingüino que salta témpanos"). */
  idea: string;
  genre?: GameGenre;
  title?: string;
  seed?: number;
  difficulty?: GameDifficulty;
  /** Solo para género quiz: preguntas personalizadas. */
  quizQuestions?: QuizQuestion[];
}

export interface GeneratedGame {
  title: string;
  genre: GameGenre;
  seed: number;
  difficulty: GameDifficulty;
  /** HTML autocontenido (doctype + head + body + script inline). */
  html: string;
  /** Bytes del HTML (UTF-8). */
  sizeBytes: number;
  /** Controles documentados (para el manifiesto y la UI). */
  controls: string[];
  instructions: string[];
  /** Reglas de la generación (audit trail). */
  rules: string[];
}

export interface GameManifest {
  title: string;
  genre: GameGenre;
  seed: number;
  difficulty: GameDifficulty;
  sizeBytes: number;
  generatedAt: string;
  engine: 'ultraia-game-v1';
}

const GENRES: readonly GameGenre[] = ['runner', 'dodge', 'clicker', 'pong', 'maze', 'quiz'];

const GENRE_KEYWORDS: Readonly<Record<GameGenre, readonly string[]>> = Object.freeze({
  runner: ['correr', 'runner', 'saltar', 'jump', 'run', 'salta', 'esquivar obstáculos', 'obstaculo', 'obstáculo', 'témpano', 'penguin', 'pinguino', 'pingüino', 'dino'],
  dodge: ['esquivar', 'dodge', 'esquiva', 'asteroide', 'asteroids', 'lluvia', 'rain', 'caen', 'caer', 'balas', 'enemigos caen'],
  clicker: ['click', 'clic', 'toca', 'tap', 'clicker', 'rapidez', 'reflejos', 'combo', 'targets', 'blancos'],
  pong: ['pong', 'ping pong', 'paddle', 'paleta', 'raqueta', 'tenis', 'pelota rebota'],
  maze: ['laberinto', 'maze', 'labyrinth', 'escapar', 'salida', 'caminos', 'laberint'],
  quiz: ['quiz', 'pregunta', 'trivia', 'test', 'examen', 'questions', 'respuestas', 'trivial'],
});

const DIFFICULTY_PARAMS: Readonly<Record<GameDifficulty, { speed: number; spawn: number }>> = Object.freeze({
  easy: { speed: 0.55, spawn: 0.7 },
  normal: { speed: 1, spawn: 1 },
  hard: { speed: 1.45, spawn: 1.35 },
});

export const MAX_GAME_HTML_BYTES = 128 * 1024;

export class GameError extends Error {
  constructor(
    public readonly code: 'BAD_GENRE' | 'BAD_SPEC' | 'TOO_BIG' | 'BAD_QUIZ',
    message: string,
  ) {
    super(message);
    this.name = 'GameError';
  }
}

/* ------------------------------------------------------------------ */
/* Detección y validación (puras)                                      */
/* ------------------------------------------------------------------ */

/** Detecta el género por palabras clave de la idea (fallback: runner). */
export function detectGenre(idea: string): GameGenre {
  const haystack = idea.toLowerCase();
  let best: GameGenre = 'runner';
  let bestHits = 0;
  for (const genre of GENRES) {
    const hits = GENRE_KEYWORDS[genre].filter((k) => haystack.includes(k)).length;
    if (hits > bestHits) {
      best = genre;
      bestHits = hits;
    }
  }
  return best;
}

/** Normaliza un género de entrada (tolera mayúsculas/acentos/spanglish). */
export function normalizeGenre(input: string): GameGenre | null {
  const cleaned = input.trim().toLowerCase().replace(/[^a-z]/g, '');
  const match = GENRES.find((g) => g === cleaned);
  if (match) return match;
  // alias: 'plataformas' → runner, 'survival' → dodge, 'arcade' → runner
  if (cleaned.includes('plataform') || cleaned === 'arcade' || cleaned === 'platformer') return 'runner';
  if (cleaned.includes('survival') || cleaned.includes('shooter') || cleaned === 'shmup') return 'dodge';
  return null;
}

export interface GameValidation {
  ok: boolean;
  errors: string[];
  genre: GameGenre;
  title: string;
  seed: number;
  difficulty: GameDifficulty;
}

/** Valida y normaliza un spec; rellena defaults deterministas. */
export function validateGameSpec(spec: GameSpec): GameValidation {
  const errors: string[] = [];
  const idea = spec.idea?.trim() ?? '';
  if (!idea) errors.push('idea vacía');
  if (idea.length > 400) errors.push('idea demasiado larga (máx 400)');

  const genre = spec.genre ?? detectGenre(idea);
  if (genre && !GENRES.includes(genre)) errors.push(`género inválido: ${String(genre)}`);

  const title = (spec.title?.trim() || `${genre[0]?.toUpperCase()}${genre.slice(1)} Game`).slice(0, 60);
  if (!title) errors.push('título vacío');

  const seed = Number.isFinite(spec.seed) ? Math.trunc(spec.seed!) : hashString(idea);
  const difficulty = spec.difficulty ?? 'normal';
  if (!DIFFICULTY_PARAMS[difficulty]) errors.push(`dificultad inválida: ${String(difficulty)}`);

  if (genre === 'quiz' && spec.quizQuestions) {
    if (spec.quizQuestions.length < 1 || spec.quizQuestions.length > 12)
      errors.push('quiz: 1-12 preguntas');
    for (const q of spec.quizQuestions) {
      if (!q.q || q.options.length < 2 || q.answer < 0 || q.answer >= q.options.length)
        errors.push(`quiz: pregunta inválida (${q.q?.slice(0, 30) || 'vacía'})`);
    }
  }

  return { ok: errors.length === 0, errors, genre, title, seed, difficulty };
}

/** PRNG determinista (mulberry32) — para el maze y el clicker. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Generación                                                          */
/* ------------------------------------------------------------------ */

const SHELL = (title: string, controls: string[], instructions: string[]): string =>
  [
    '<!DOCTYPE html>',
    '<html lang="es">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title} — UltraIa</title>`,
    '<style>',
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{background:#08080a;color:#e4e4e7;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:16px;gap:12px}',
    'h1{font-size:20px;letter-spacing:.5px}',
    '#wrap{position:relative;width:min(96vw,560px);border:1px solid #1f1f2a;border-radius:12px;overflow:hidden;background:#111115}',
    'canvas{display:block;width:100%;height:auto;touch-action:none;background:#0b0b0f}',
    '#score{position:absolute;top:10px;right:12px;font-size:13px;color:#8b5cf6;font-weight:600;font-variant-numeric:tabular-nums}',
    '#over{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(8,8,10,.82);backdrop-filter:blur(4px)}',
    '#over.show{display:flex}',
    '#over b{font-size:22px}',
    'button{cursor:pointer;border:1px solid #3f3f56;background:#1c1c24;color:#e4e4e7;border-radius:8px;padding:8px 18px;font-size:14px}',
    'button:hover{background:#26263a}',
    '#ctrl{font-size:12px;color:#71717a;display:flex;gap:14px;flex-wrap:wrap;justify-content:center;padding:0 8px 8px}',
    'kbd{border:1px solid #2e2e3a;border-bottom-width:2px;border-radius:4px;padding:1px 6px;font-family:ui-monospace,Consolas,monospace;font-size:11px;background:#111115}',
    '@media (prefers-reduced-motion: reduce){canvas{transition:none}}',
    '</style>',
    '</head>',
    '<body>',
    `<h1>${title}</h1>`,
    '<div id="wrap">',
    '<canvas id="c" width="480" height="320" role="application" aria-label="' + title + ' — juego UltraIa"></canvas>',
    '<div id="score">0</div>',
    '<div id="over"><b>Fin</b><span id="overScore"></span><button id="restart" type="button">Jugar de nuevo</button></div>',
    '</div>',
    '<div id="ctrl">' +
      controls.map((c) => `<span><kbd>${c}</kbd></span>`).join('') +
      instructions.map((i) => `<span>${i}</span>`).join('') +
      '</div>',
    '<script>',
  ].join('\n');

const SCRIPT_BASE = (title: string, difficulty: GameDifficulty, seed: number): string => {
  const p = DIFFICULTY_PARAMS[difficulty];
  return [
    '"use strict";',
    'var canvas=document.getElementById("c"),ctx=canvas.getContext("2d"),W=480,H=320;',
    'var scoreEl=document.getElementById("score"),overEl=document.getElementById("over"),overScore=document.getElementById("overScore");',
    'var score=0,playing=true,last=0,next=0;',
    `var DIFF=${JSON.stringify(p)},SEED=${seed};`,
    'function fmt(n){return String(Math.floor(n));}',
    'function showScore(){scoreEl.textContent=fmt(score);}',
    'function gameOver(){playing=false;overScore.textContent="Puntos: "+fmt(score);overEl.classList.add("show");}',
    'function restart(){score=0;playing=true;next=0;overEl.classList.remove("show");showScore();onRestart();}',
    'document.getElementById("restart").addEventListener("click",restart);',
    'function step(t){if(!playing){requestAnimationFrame(step);return;}if(!last){last=t;}var dt=Math.min((t-last)/1000,0.05);last=t;update(dt);draw();requestAnimationFrame(step);}',
    'requestAnimationFrame(step);',
  ].join('\n');
};

const GENRE_SCRIPTS: Readonly<Record<GameGenre, (seed: number, quiz?: QuizQuestion[]) => string>> = Object.freeze({
  runner: () =>
    [
      'var py=200,vy=0,g=1400,jumpV=-520,w=22,h=22,obs=[],spawnT=0,best=0;',
      'function onRestart(){py=200;vy=0;obs=[];spawnT=0;best=0;}',
      'function jump(){if(playing)vy=jumpV;}',
      'window.addEventListener("keydown",function(e){if(e.code==="Space"||e.code==="ArrowUp"){e.preventDefault();jump();}});',
      'canvas.addEventListener("pointerdown",jump);',
      'function update(dt){vy+=g*dt;py+=vy*dt;if(py>220){py=220;vy=0;}',
      'spawnT-=dt;if(spawnT<=0){obs.push({x:W+20,w:16+Math.random()*22});spawnT=DIFF.spawn*(0.9+Math.random()*0.5);}',
      'for(var i=obs.length-1;i>=0;i--){var o=obs[i];o.x-=(140+best*2)*DIFF.speed*dt;',
      'if(o.x+o.w<0){obs.splice(i,1);score+=1;best=Math.max(best,Math.floor(score/5));showScore();continue;}',
      'if(o.x<60+o.w&&o.x+o.w>60&&py+22>220-14&&py<220){gameOver();}}',
      'function draw(){ctx.fillStyle="#111115";ctx.fillRect(0,0,W,H);',
      'ctx.fillStyle="#1f1f2a";ctx.fillRect(0,236,W,84);ctx.strokeStyle="#3f3f56";ctx.strokeRect(0,236,W,84);',
      'ctx.fillStyle="#8b5cf6";ctx.fillRect(60,py,22,22);',
      'ctx.fillStyle="#ef4444";for(var i=0;i<obs.length;i++){ctx.fillRect(obs[i].x,216,obs[i].w,20);ctx.fillRect(obs[i].x,236,obs[i].w,4);}',
      'ctx.fillStyle="#71717a";ctx.font="12px monospace";ctx.fillText("BEST "+best,10,20);}',
    ].join('\n'),

  dodge: () =>
    [
      'var px=220,py=260,ps=260,es=[],spawnT=0,lives=3,invuln=0;',
      'function onRestart(){px=220;py=260;es=[];spawnT=0;lives=3;invuln=0;}',
      'var keys={};',
      'window.addEventListener("keydown",function(e){keys[e.code]=true;if(e.code.indexOf("Arrow")===0)e.preventDefault();});',
      'window.addEventListener("keyup",function(e){keys[e.code]=false;});',
      'function update(dt){if(keys.ArrowLeft||keys.KeyA)px-=ps*dt;if(keys.ArrowRight||keys.KeyD)px+=ps*dt;if(keys.ArrowUp||keys.KeyW)py-=ps*dt;if(keys.ArrowDown||keys.KeyS)py+=ps*dt;',
      'px=Math.max(14,Math.min(W-14,px));py=Math.max(14,Math.min(H-14,py));',
      'spawnT-=dt;if(spawnT<=0){es.push({x:Math.random()*(W-16)+8,y:-16,r:7+Math.random()*7,vx:(Math.random()-0.5)*60,vy:120+Math.random()*120});spawnT=DIFF.spawn*0.8;}',
      'for(var i=es.length-1;i>=0;i--){var e=es[i];e.x+=e.vx*dt;e.y+=e.vy*DIFF.speed*dt;if(e.y>H+20){es.splice(i,1);score+=1;showScore();continue;}',
      'if(invuln<=0){var dx=px-e.x,dy=py-e.y;if(dx*dx+dy*dy<(14+14)*(14+14)){lives-=1;invuln=1;if(lives<=0){gameOver();}else{es.splice(i,1);}}}}',
      'if(invuln>0)invuln-=dt;',
      'function draw(){ctx.fillStyle="#111115";ctx.fillRect(0,0,W,H);',
      'ctx.fillStyle="#8b5cf6";ctx.beginPath();ctx.arc(px,py,12,0,6.2832);ctx.fill();',
      'ctx.fillStyle="#ef4444";for(var i=0;i<es.length;i++){ctx.beginPath();ctx.arc(es[i].x,es[i].y,es[i].r,0,6.2832);ctx.fill();}',
      'ctx.fillStyle="#71717a";ctx.font="12px monospace";var h="";for(var j=0;j<lives;j++)h+="♥ ";ctx.fillText(h,10,20);}',
    ].join('\n'),

  clicker: (seed) =>
    [
      'var rnd=' + mulberry32.toString() + ';var R=rnd(' + seed + ');',
      'var targets=[],spawnT=0,combo=0;',
      'function onRestart(){targets=[];spawnT=0;combo=0;}',
      'function spawn(){var r=14+Math.floor(R()*14);targets.push({x:r+R()*(W-2*r),y:r+R()*(H-2*r),r:r,life:2.2});}',
      'canvas.addEventListener("pointerdown",function(e){if(!playing)return;var r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*(W/r.width),y=(e.clientY-r.top)*(H/r.height);',
      'for(var i=targets.length-1;i>=0;i--){var t=targets[i],dx=x-t.x,dy=y-t.y;if(dx*dx+dy*dy<t.r*t.r){combo+=1;score+=1*Math.min(combo,5);targets.splice(i,1);showScore();break;}}},false);',
      'function update(dt){spawnT-=dt;if(spawnT<=0){spawn();spawnT=DIFF.spawn*0.55;}',
      'for(var i=targets.length-1;i>=0;i--){var t=targets[i];t.life-=dt;if(t.life<=0){targets.splice(i,1);combo=0;}}',
      'function draw(){ctx.fillStyle="#111115";ctx.fillRect(0,0,W,H);',
      'for(var i=0;i<targets.length;i++){var t=targets[i],a=Math.max(0,t.life/2.2);ctx.globalAlpha=a;ctx.fillStyle="#8b5cf6";ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,6.2832);ctx.fill();ctx.fillStyle="#0b0b0f";ctx.beginPath();ctx.arc(t.x,t.y,t.r*0.55,0,6.2832);ctx.fill();}',
      'ctx.globalAlpha=1;ctx.fillStyle="#71717a";ctx.font="12px monospace";ctx.fillText("COMBO x"+Math.max(1,combo),10,20);}',
    ].join('\n'),

  pong: () =>
    [
      'var p1y=120,p2y=120,pw=10,ph=56,ball={x:240,y:160,vx:180,vy:120},speed=1;',
      'function onRestart(){p1y=120;p2y=120;ball={x:240,y:160,vx:180,vy:120};speed=1;}',
      'var keys={};',
      'window.addEventListener("keydown",function(e){keys[e.code]=true;if(e.code==="ArrowUp"||e.code==="ArrowDown")e.preventDefault();});',
      'window.addEventListener("keyup",function(e){keys[e.code]=false;});',
      'function update(dt){if(keys.ArrowUp)p1y-=260*dt;if(keys.ArrowDown)p1y+=260*dt;if(keys.KeyW)p2y-=260*dt;if(keys.KeyS)p2y+=260*dt;',
      'p1y=Math.max(0,Math.min(H-ph,p1y));p2y=Math.max(0,Math.min(H-ph,p2y));',
      'ball.x+=ball.vx*speed*dt;ball.y+=ball.vy*speed*dt;',
      'if(ball.y<0||ball.y>H){ball.vy*=-1;ball.y=Math.max(4,Math.min(H-4,ball.y));}',
      'if(ball.x<24&&ball.x>8&&ball.y>p1y-4&&ball.y<p1y+ph+4){ball.vx=Math.abs(ball.vx)+14;speed=Math.min(speed+0.02,1.6);score+=1;showScore();}',
      'if(ball.x>W-24&&ball.x<W-8&&ball.y>p2y-4&&ball.y<p2y+ph+4){ball.vx=-Math.abs(ball.vx)-14;speed=Math.min(speed+0.02,1.6);score+=1;showScore();}',
      'if(ball.x<0||ball.x>W){gameOver();}',
      'function draw(){ctx.fillStyle="#111115";ctx.fillRect(0,0,W,H);',
      'ctx.strokeStyle="#2e2e3a";ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);',
      'ctx.fillStyle="#8b5cf6";ctx.fillRect(8,p1y,pw,ph);ctx.fillStyle="#22d3ee";ctx.fillRect(W-18,p2y,pw,ph);',
      'ctx.fillStyle="#e4e4e7";ctx.beginPath();ctx.arc(ball.x,ball.y,7,0,6.2832);ctx.fill();}',
    ].join('\n'),

  maze: (seed) => {
    const COLS = 16;
    const ROWS = 12;
    const rand = mulberry32(seed);
    const cell = (): number => Math.floor(rand() * 4);
    const grid: string[] = [];
    for (let r = 0; r < ROWS; r++) {
      let row = '';
      for (let c = 0; c < COLS; c++) row += cell() === 0 ? '#' : ' ';
      grid.push(row);
    }
    grid[0] = 'S' + grid[0].slice(1);
    grid[ROWS - 1] = grid[ROWS - 1].slice(0, COLS - 1) + 'G';
    const layout = JSON.stringify(grid);
    return [
      'var GRID=' + layout + ',COLS=' + COLS + ',ROWS=' + ROWS + ';',
      'var CW=W/COLS,CH=H/ROWS,px=0,py=0;',
      'function onRestart(){px=0;py=0;}',
      'var keys={};',
      'window.addEventListener("keydown",function(e){keys[e.code]=true;if(e.code.indexOf("Arrow")===0)e.preventDefault();});',
      'window.addEventListener("keyup",function(e){keys[e.code]=false;});',
      'function update(dt){var dx=0,dy=0;if(keys.ArrowLeft||keys.KeyA)dx=-1;if(keys.ArrowRight||keys.KeyD)dx=1;if(keys.ArrowUp||keys.KeyW)dy=-1;if(keys.ArrowDown||keys.KeyS)dy=1;',
      'if(dx||dy){var nx=px+dx,ny=py+dy;if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS){var g=GRID[ny][nx];if(g!=="#"&&g!=="S"){px=nx;py=ny;if(g==="G"){score+=1;showScore();gameOver();}}}}',
      'function draw(){ctx.fillStyle="#111115";ctx.fillRect(0,0,W,H);',
      'for(var r=0;r<ROWS;r++){for(var c=0;c<COLS;c++){if(GRID[r][c]==="#"){ctx.fillStyle="#2a2a36";ctx.fillRect(c*CW,r*CH,CW,CH);}else{ctx.fillStyle="#17171c";ctx.fillRect(c*CW,r*CH,CW,CH);}}}',
      'ctx.fillStyle="#22d3ee";ctx.fillRect((COLS-1)*CW+2,(ROWS-1)*CH+2,CW-4,CH-4);',
      'ctx.fillStyle="#8b5cf6";ctx.beginPath();ctx.arc(px*CW+CW/2,py*CH+CH/2,10,0,6.2832);ctx.fill();}',
    ].join('\n');
  },

  quiz: (_seed, quiz) => {
    const qs = quiz && quiz.length > 0 ? quiz : DEFAULT_QUIZ;
    const payload = JSON.stringify(qs.map((q) => ({ q: q.q, o: q.options, a: q.answer })));
    return [
      'var QS=' + payload + ',qi=0,correct=0,total=' + qs.length + ';',
      'function onRestart(){qi=0;correct=0;}',
      'function draw(){ctx.fillStyle="#111115";ctx.fillRect(0,0,W,H);',
      'ctx.fillStyle="#e4e4e7";ctx.font="15px system-ui";ctx.fillText("Pregunta "+(qi+1)+"/"+total,10,26);',
      'wrapText(QS[qi].q,16,58,W-32);',
      'ctx.fillStyle="#8b5cf6";for(var i=0;i<QS[qi].o.length;i++){ctx.fillRect(16,96+i*46,W-32,36);ctx.fillStyle="#e4e4e7";ctx.font="14px system-ui";ctx.fillText((i+1)+". "+QS[qi].o[i],28,96+i*46+24);ctx.fillStyle="#8b5cf6";}',
      'ctx.fillStyle="#71717a";ctx.font="12px monospace";ctx.fillText("Acertadas: "+correct,10,H-14);}',
      'function wrapText(t,x,y,max){var words=t.split(" "),line="";ctx.font="15px system-ui";for(var i=0;i<words.length;i++){var test=line+words[i]+" ";if(ctx.measureText(test).width>max&&line){ctx.fillText(line,x,y);line=words[i]+" ";y+=20;}else{line=test;}}ctx.fillText(line,x,y);}',
      'function choose(i){if(QS[qi].a===i){correct+=1;score+=1;showScore();}qi+=1;if(qi>=total){gameOver();overScore.textContent="Acertadas: "+correct+"/"+total;}}',
      'window.addEventListener("keydown",function(e){if(/^[1-9]$/.test(e.key)){var n=parseInt(e.key,10);if(n>=1&&n<=QS[qi].o.length)choose(n-1);}if(e.code==="Space"){e.preventDefault();}});',
      'canvas.addEventListener("pointerdown",function(e){if(!playing)return;var r=canvas.getBoundingClientRect(),y=(e.clientY-r.top)*(H/r.height);var idx=Math.floor((y-96)/46);if(idx>=0&&idx<QS[qi].o.length)choose(idx);},false);',
    ].join('\n');
  },
});

const DEFAULT_QUIZ: QuizQuestion[] = [
  { q: '¿Qué color primario usa el tema Dark Obsidian de UltraIa?', options: ['#8b5cf6 (violeta)', '#ef4444 (rojo)', '#22d3ee (cian)'], answer: 0 },
  { q: '¿Qué significa PIVR en el loop de desarrollo?', options: ['Plan-Implementar-Verificar-Reiniciar', 'Programar-Inventar-Ver-Retroceder', 'Probar-Incluir-Verificar-Recibir'], answer: 0 },
  { q: '¿Cuál es el límite de subida del cloud local de UltraIa?', options: ['10 MiB', '100 MiB', '1 GiB'], answer: 1 },
  { q: '¿Qué formato genera la capability diagram?', options: ['PNG binario', 'HTML/SVG autocontenido', 'PDF'], answer: 1 },
];

const GENRE_CONTROLS: Readonly<Record<GameGenre, { keys: string[]; instructions: string[] }>> = Object.freeze({
  runner: { keys: ['Espacio', '↑', 'tocar'], instructions: ['Salta sobre los obstáculos', 'Cada obstáculo superado suma 1 punto'] },
  dodge: { keys: ['← → ↑ ↓', 'W A S D', 'tocar'], instructions: ['Esquiva los proyectiles', '3 vidas'] },
  clicker: { keys: ['clic / tocar'], instructions: ['Toca los círculos antes de que desaparezcan', 'Combo multiplica puntos'] },
  pong: { keys: ['↑ ↓ (izq)', 'W S (der)'], instructions: ['Rebota la pelota', 'Primero en fallar pierde'] },
  maze: { keys: ['← → ↑ ↓', 'W A S D'], instructions: ['Llega al cuadrado cian', 'Paredes en gris'] },
  quiz: { keys: ['1-9', 'clic / tocar'], instructions: ['Elige la respuesta correcta', 'Acertadas al final'] },
});

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

export interface GameGenerateOptions {
  now?: () => string;
}

/** Genera el juego completo (HTML autocontenido). Determinista por spec+seed. */
export function generateGame(spec: GameSpec, opts: GameGenerateOptions = {}): GeneratedGame {
  const v = validateGameSpec(spec);
  if (!v.ok) throw new GameError('BAD_SPEC', v.errors.join('; '));

  const quiz = spec.quizQuestions && spec.quizQuestions.length > 0 ? spec.quizQuestions : undefined;
  const script = GENRE_SCRIPTS[v.genre](v.seed, quiz);
  const ctrl = GENRE_CONTROLS[v.genre];

  const html = [
    SHELL(v.title, ctrl.keys, ctrl.instructions),
    SCRIPT_BASE(v.title, v.difficulty, v.seed),
    script,
    '</script>',
    '</body>',
    '</html>',
    '',
  ].join('\n');

  const sizeBytes = new TextEncoder().encode(html).byteLength;
  if (sizeBytes > MAX_GAME_HTML_BYTES) throw new GameError('TOO_BIG', `juego supera ${MAX_GAME_HTML_BYTES} bytes`);

  const rules = [
    'html autocontenido (css+js inline, sin recursos externos)',
    'a11y: role="application" + aria-label + teclado + touch + prefers-reduced-motion',
    `dificultad ${v.difficulty} (velocidad ${DIFFICULTY_PARAMS[v.difficulty].speed}, spawn ${DIFFICULTY_PARAMS[v.difficulty].spawn})`,
    `seed ${v.seed} (determinista)`,
  ];

  return {
    title: v.title,
    genre: v.genre,
    seed: v.seed,
    difficulty: v.difficulty,
    html,
    sizeBytes,
    controls: ctrl.keys,
    instructions: ctrl.instructions,
    rules,
  };
}

/** Manifiesto del juego (audit trail para publicación/archivo). */
export function buildGameManifest(game: GeneratedGame, now?: () => string): GameManifest {
  return {
    title: game.title,
    genre: game.genre,
    seed: game.seed,
    difficulty: game.difficulty,
    sizeBytes: game.sizeBytes,
    generatedAt: (now ?? (() => new Date().toISOString()))(),
    engine: 'ultraia-game-v1',
  };
}

/* ------------------------------------------------------------------ */
/* Herramienta de agente (wiring diferido a llm.ts)                    */
/* ------------------------------------------------------------------ */

export const gameTool = {
  name: 'game_generate',
  description:
    'UltraIA Game: generate a playable self-contained HTML5 game from a plain-language idea (prompt-to-game, keyless). Genres: runner, dodge, clicker, pong, maze, quiz. Deterministic (same idea+seed → same HTML), a11y (keyboard+touch, reduced-motion), zero external resources. Use to create playable prototypes, minigames or interactive content for the blog/gallery.',
  inputSchema: z.object({
    idea: z.string().min(1).max(400),
    genre: z.enum(GENRES as unknown as [GameGenre, ...GameGenre[]]).optional(),
    title: z.string().max(60).optional(),
    seed: z.number().int().optional(),
    difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
    quizQuestions: z
      .array(z.object({ q: z.string(), options: z.array(z.string()).min(2).max(6), answer: z.number().int().min(0) }))
      .max(12)
      .optional(),
  }),
} as const;

export const gameTools = { game_generate: gameTool } as const;