import { describe, expect, it } from 'vitest';
import {
  GameError,
  buildGameManifest,
  detectGenre,
  gameTool,
  generateGame,
  mulberry32,
  normalizeGenre,
  validateGameSpec,
  type GeneratedGame,
} from './game';

const NOW = () => '2026-08-17T12:00:00.000Z';

describe('game: detección y normalización de género', () => {
  it('detectGenre por keywords de la idea', () => {
    expect(detectGenre('un pingüino que salta témpanos')).toBe('runner');
    expect(detectGenre('esquivar asteroides en el espacio')).toBe('dodge');
    expect(detectGenre('toca los círculos lo más rápido posible')).toBe('clicker');
    expect(detectGenre('laberinto del minotauro')).toBe('maze');
    expect(detectGenre('quiz de historia universal')).toBe('quiz');
    expect(detectGenre('pong clásico con paletas')).toBe('pong');
  });

  it('detectGenre fallback a runner sin keywords', () => {
    expect(detectGenre('una experiencia zen')).toBe('runner');
    expect(detectGenre('')).toBe('runner');
  });

  it('normalizeGenre acepta formas y alias', () => {
    expect(normalizeGenre('runner')).toBe('runner');
    expect(normalizeGenre('  DODGE ')).toBe('dodge');
    expect(normalizeGenre('platformer')).toBe('runner');
    expect(normalizeGenre('survival')).toBe('dodge');
    expect(normalizeGenre('arcade')).toBe('runner');
    expect(normalizeGenre('maze')).toBe('maze');
    expect(normalizeGenre('shooter')).toBe('dodge');
    expect(normalizeGenre('inexistente')).toBeNull();
  });

  it('mulberry32 es determinista y en rango [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = a();
    expect(first).toBe(b());
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(mulberry32(7)()).not.toBe(first);
  });
});

describe('game: validación de spec', () => {
  it('rechaza idea vacía y larga', () => {
    expect(validateGameSpec({ idea: '' }).ok).toBe(false);
    expect(validateGameSpec({ idea: 'x'.repeat(401) }).ok).toBe(false);
  });

  it('rechaza género y dificultad inválidos', () => {
    const v = validateGameSpec({ idea: 'juego', genre: 'rpg' as never });
    expect(v.ok).toBe(false);
    const d = validateGameSpec({ idea: 'juego', difficulty: 'imposible' as never });
    expect(d.ok).toBe(false);
  });

  it('rellena defaults: título, seed determinista y dificultad normal', () => {
    const v = validateGameSpec({ idea: 'esquivar asteroides' });
    expect(v.ok).toBe(true);
    expect(v.genre).toBe('dodge');
    expect(v.title).toBe('Dodge Game');
    expect(v.difficulty).toBe('normal');
    const v2 = validateGameSpec({ idea: 'esquivar asteroides' });
    expect(v.seed).toBe(v2.seed);
  });

  it('valida quizQuestions personalizadas', () => {
    const ok = validateGameSpec({ idea: 'quiz', genre: 'quiz', quizQuestions: [{ q: '¿?', options: ['a', 'b'], answer: 1 }] });
    expect(ok.ok).toBe(true);
    const bad = validateGameSpec({ idea: 'quiz', genre: 'quiz', quizQuestions: [{ q: '', options: ['a'], answer: 3 }] });
    expect(bad.ok).toBe(false);
    const many = validateGameSpec({ idea: 'quiz', genre: 'quiz', quizQuestions: Array.from({ length: 13 }, () => ({ q: 'q', options: ['a', 'b'], answer: 0 })) });
    expect(many.ok).toBe(false);
  });
});

describe('game: generación', () => {
  it('genera HTML autocontenido con a11y y sin recursos externos', () => {
    const g = generateGame({ idea: 'esquivar asteroides', title: 'Asteroides' });
    expect(g.genre).toBe('dodge');
    expect(g.html).toContain('<!DOCTYPE html>');
    expect(g.html).toContain('role="application"');
    expect(g.html).toContain('aria-label');
    expect(g.html).toContain('prefers-reduced-motion');
    expect(g.html).toContain('requestAnimationFrame');
    expect(g.html).not.toMatch(/<script\s+src=/);
    expect(g.html).not.toMatch(/https?:\/\//);
    expect(g.html).not.toMatch(/<link\s/);
  });

  it('es determinista: mismo spec + seed → mismo HTML', () => {
    const spec = { idea: 'laberinto del minotauro', genre: 'maze' as const, seed: 123 as number };
    const a = generateGame(spec);
    const b = generateGame(spec);
    expect(a.html).toBe(b.html);
    expect(a.seed).toBe(123);
  });

  it('distintos seeds producen laberintos distintos', () => {
    const a = generateGame({ idea: 'laberinto', genre: 'maze' as const, seed: 1 });
    const b = generateGame({ idea: 'laberinto', genre: 'maze' as const, seed: 2 });
    expect(a.html).not.toBe(b.html);
  });

  it('cada género incluye su mecánica', () => {
    const runner = generateGame({ idea: 'runner' });
    expect(runner.html).toContain('Espacio');
    expect(runner.html).toContain('jumpV');

    const dodge = generateGame({ idea: 'dodge' });
    expect(dodge.html).toContain('ArrowLeft');
    expect(dodge.html).toContain('lives');

    const clicker = generateGame({ idea: 'clicker' });
    expect(clicker.html).toContain('COMBO');

    const pong = generateGame({ idea: 'pong' });
    expect(pong.html).toContain('ArrowUp');
    expect(pong.html).toContain('22d3ee');

    const maze = generateGame({ idea: 'maze' });
    expect(maze.html).toContain('GRID=');

    const quiz = generateGame({ idea: 'quiz' });
    expect(quiz.html).toContain('Acertadas');
  });

  it('quiz usa preguntas personalizadas', () => {
    const g = generateGame({
      idea: 'quiz',
      genre: 'quiz',
      quizQuestions: [
        { q: '¿Capital de Francia?', options: ['París', 'Londres', 'Madrid'], answer: 0 },
        { q: '¿2+2?', options: ['3', '4', '5'], answer: 1 },
      ],
    });
    expect(g.html).toContain('Capital de Francia');
    expect(g.html).toContain('total=2');
    expect(g.html).toContain('París');
  });

  it('dificultad hard ajusta velocidad', () => {
    const g = generateGame({ idea: 'runner', difficulty: 'hard' });
    expect(g.difficulty).toBe('hard');
    expect(g.html).toContain('1.45');
    expect(g.rules.join(' ')).toContain('velocidad 1.45');
  });

  it('maneja títulos con caracteres especiales', () => {
    const g = generateGame({ idea: 'clicker', title: 'Clic <b>& "raro"' });
    expect(g.html).toContain('Clic');
    expect(g.html.length).toBeGreaterThan(500);
  });

  it('respeta el límite de tamaño', () => {
    for (const genre of ['runner', 'dodge', 'clicker', 'pong', 'maze', 'quiz'] as const) {
      const g = generateGame({ idea: genre, genre });
      expect(g.sizeBytes).toBeLessThanOrEqual(128 * 1024);
    }
  });

  it('lanza GameError con spec inválida', () => {
    expect(() => generateGame({ idea: '' })).toThrow(GameError);
    expect(() => generateGame({ idea: 'quiz', genre: 'quiz', quizQuestions: [{ q: 'x', options: ['a'], answer: 0 }] })).toThrow(GameError);
  });

  it('devuelve controles e instrucciones para la UI', () => {
    const g = generateGame({ idea: 'pong' });
    expect(g.controls.length).toBeGreaterThan(0);
    expect(g.instructions.length).toBeGreaterThan(0);
    expect(g.rules).toContain('a11y: role="application" + aria-label + teclado + touch + prefers-reduced-motion');
  });
});

describe('game: manifiesto y tool', () => {
  it('buildGameManifest refleja el juego', () => {
    const g = generateGame({ idea: 'runner' });
    const m = buildGameManifest(g, NOW);
    expect(m.title).toBe(g.title);
    expect(m.genre).toBe('runner');
    expect(m.seed).toBe(g.seed);
    expect(m.sizeBytes).toBe(g.sizeBytes);
    expect(m.generatedAt).toBe('2026-08-17T12:00:00.000Z');
    expect(m.engine).toBe('ultraia-game-v1');
  });

  it('gameTool expone schema para llm.ts (safeParse)', () => {
    expect(gameTool.name).toBe('game_generate');
    expect(gameTool.description).toContain('HTML5');
    const ok = gameTool.inputSchema.safeParse({ idea: 'esquivar asteroides', genre: 'maze', difficulty: 'hard', seed: 42 });
    expect(ok.success).toBe(true);
    const minimal = gameTool.inputSchema.safeParse({ idea: 'correr' });
    expect(minimal.success).toBe(true);
    const badGenre = gameTool.inputSchema.safeParse({ idea: 'x', genre: 'rpg' });
    expect(badGenre.success).toBe(false);
    const badQuiz = gameTool.inputSchema.safeParse({ idea: 'quiz', quizQuestions: [{ q: 'q', options: ['a'], answer: 2 }] });
    expect(badQuiz.success).toBe(false);
    const parsed = ok.success ? ok.data : null;
    expect(parsed?.genre).toBe('maze');
    expect(parsed?.seed).toBe(42);
  });

  it('GeneratedGame shape completo', () => {
    const g: GeneratedGame = generateGame({ idea: 'clicker', seed: 7 });
    expect(typeof g.html).toBe('string');
    expect(g.title.length).toBeGreaterThan(0);
    expect(g.sizeBytes).toBe(new TextEncoder().encode(g.html).byteLength);
    expect(Array.isArray(g.controls)).toBe(true);
  });
});