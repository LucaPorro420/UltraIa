import { afterEach, describe, expect, it, vi } from 'vitest';
import { OmagOrchestrator } from './orchestrator';
import { addEntity, addEvent, createMediaField, findEntity, removeEntity } from './mediafield';
import { CausalCritic } from './critics';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('OmagOrchestrator', () => {
  it('runs idea → plan → media field → generation → critique and accepts', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/img.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));
    const orchestrator = new OmagOrchestrator();
    const result = await orchestrator.run({
      idea: 'Una mujer camina por una calle lluviosa. Una motocicleta pasa detrás de ella.',
      quality: 'fast',
      modalities: ['image', 'music'],
      maxIterations: 3,
    });
    expect(result.field.metadata.plan).toBeDefined();
    expect(result.field.environment.scene).toBeTruthy();
    expect(result.results.some((r) => r.metadata.modality === 'image')).toBe(true);
    expect(result.results.some((r) => r.metadata.modality === 'music')).toBe(true);
    expect(result.accepted).toBe(true);
    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(orchestrator.scenes.list().length).toBeGreaterThan(0);
    expect(orchestrator.styles.get()).toMatchObject({ visual: { style: 'cinematic' } });
  });

  it('the causal test: removing the motorcycle removes its effects (Test A)', async () => {
    const field = createMediaField();
    addEntity(field, { id: 'motorcycle_001', type: 'vehicle' });
    addEntity(field, { id: 'woman_001', type: 'character' });
    addEvent(field, {
      id: 'event_001',
      type: 'motorcycle_pass',
      start: 4.7,
      duration: 1.8,
      actors: ['motorcycle_001'],
      targets: ['woman_001'],
      effects: ['engine_sound', 'motion', 'doppler', 'shadow_change'],
    });
    field.relations.push({ source: 'motorcycle_001', relation: 'passing_near', target: 'woman_001' });

    const before = { entities: field.entities.length, events: field.events.length, relations: field.relations.length };
    removeEntity(field, 'motorcycle_001');
    expect(field.entities.length).toBe(before.entities - 1);
    expect(field.events.length).toBe(before.events - 1);
    expect(field.relations.length).toBe(before.relations - 1);
    expect(findEntity(field, 'woman_001')).toBeDefined();
  });

  it('rejects when the causal critic fails and never heals within maxIterations', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/img.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));

    class BrokenCausalCritic extends CausalCritic {
      critique() {
        return { score: 0.2, errors: [{ code: 'event_without_effects', message: 'no effects ever' }], recommendations: [] };
      }
    }

    const orchestrator = new OmagOrchestrator(undefined, [new BrokenCausalCritic()]);
    const result = await orchestrator.run({ idea: 'a car driving', quality: 'fast', modalities: ['image'], maxIterations: 2 });
    expect(result.accepted).toBe(false);
    expect(result.iterations).toBe(2);
    expect(orchestrator.errors.all().some((e) => e.errorType === 'critic_fusion')).toBe(true);
  });

  it('builds the world from a local plan without an LLM gateway', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/img.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));
    const orchestrator = new OmagOrchestrator();
    const result = await orchestrator.run({ idea: 'a desert city at golden hour', quality: 'balanced', modalities: ['image'], maxIterations: 2 });
    expect(result.field.environment.shots).toBeGreaterThanOrEqual(1);
    expect(result.accepted).toBe(true);
  });

  it('recalls verified memory for the idea and exposes it in result/working/metadata', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/img.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));
    const orchestrator = new OmagOrchestrator();
    const corpus = [
      {
        source: 'truth_lluvia',
        cases: [
          {
            id: 1,
            prompt: 'Una mujer camina por una calle lluviosa y una motocicleta pasa detrás de ella.',
            answer: 'usar lluvia lateral + reflejos en el asfalto',
            type: 'exact',
          },
          {
            id: 2,
            prompt: 'Un robot baila en un hangar espacial.',
            answer: 'usar neones fríos y humo de pista',
            type: 'exact',
          },
        ],
      },
    ];
    const result = await orchestrator.run({
      idea: 'Una mujer camina por una calle lluviosa. Una motocicleta pasa detrás de ella.',
      quality: 'fast',
      modalities: ['image'],
      maxIterations: 2,
      memory: { corpus, hits: 2 },
    });
    expect(result.memoryHits).toBeDefined();
    expect(result.memoryHits!.length).toBeGreaterThanOrEqual(1);
    expect(result.memoryHits![0].score).toBeGreaterThan(0);
    // El hit más relevante primero (orden por score desc).
    expect(result.memoryHits![0].id).toBe('truth_lluvia_1');
    // Memoria registrada en working y en el campo.
    expect(orchestrator.working.getHits().length).toBe(result.memoryHits!.length);
    expect(result.field.metadata.memory).toBeDefined();
    expect(Array.isArray(result.field.metadata.memory)).toBe(true);
  });

  it('runs without memory when request.memory is absent (retrocompatible)', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/img.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));
    const orchestrator = new OmagOrchestrator();
    const result = await orchestrator.run({ idea: 'a quiet lake at dawn', quality: 'fast', modalities: ['image'], maxIterations: 1 });
    expect(result.memoryHits).toBeUndefined();
    expect(orchestrator.working.getHits()).toEqual([]);
    expect(result.accepted).toBe(true);
  });

  it('returns empty hits when the corpus has no matching terms', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/img.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));
    const orchestrator = new OmagOrchestrator();
    const corpus = [
      {
        source: 'truth_lejano',
        cases: [{ id: 1, prompt: 'xylophone quantum entanglement meditation', answer: 'nada que ver', type: 'exact' }],
      },
    ];
    const result = await orchestrator.run({
      idea: 'a lighthouse on a stormy cliff',
      quality: 'fast',
      modalities: ['image'],
      maxIterations: 1,
      memory: { corpus, hits: 3 },
    });
    expect(result.memoryHits).toBeDefined();
    expect(result.memoryHits!.length).toBeGreaterThanOrEqual(1); // top-k devuelve lo mejor aunque score 0
    expect(result.memoryHits![0].score).toBe(0);
    expect(result.accepted).toBe(true);
  });
});