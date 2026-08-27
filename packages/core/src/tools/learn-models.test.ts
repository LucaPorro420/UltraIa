import { describe, it, expect } from 'vitest';
import {
  createModel,
  makeThought,
  addThought,
  integrateThoughts,
  compressModel,
  contrastThoughts,
  resolveErrors,
  spawnAdvancedModel,
  hashThought,
  type Thought,
  type LearningModel,
} from './learn-models';

describe('learnModels / hashing & construction', () => {
  it('hashThought es determinista', () => {
    const a = hashThought('error', 'x', ['db', 'auth']);
    const b = hashThought('error', 'x', ['auth', 'db']);
    expect(a).toBe(b);
  });

  it('makeThought normaliza tags e importancia', () => {
    const t = makeThought({ text: 'falla login', kind: 'error', tags: ['Auth', 'DB'], importance: 2 });
    expect(t.tags).toEqual(['auth', 'db']);
    expect(t.importance).toBe(1);
    expect(t.id).toBe(hashThought('error', 'falla login', ['auth', 'db']));
  });
});

describe('learnModels / modelos y compresión', () => {
  it('createModel usa capacidad por defecto según kind', () => {
    expect(createModel('associative').capacity).toBe(16);
    expect(createModel('compressive').capacity).toBe(32);
    expect(createModel('causal', { capacity: 3 }).capacity).toBe(3);
  });

  it('addThought deduplica por id conservando mayor importancia', () => {
    const m0 = createModel('associative', { capacity: 100 });
    const t = makeThought({ text: 'a', kind: 'observation', importance: 0.2 });
    const t2 = makeThought({ text: 'a', kind: 'observation', importance: 0.9 });
    const m1 = addThought(m0, t);
    const m2 = addThought(m1, t2);
    expect(m2.thoughts.length).toBe(1);
    expect(m2.thoughts[0].importance).toBe(0.9);
  });

  it('addThought comprime automáticamente al superar capacidad', () => {
    let m = createModel('causal', { capacity: 2 });
    // 3 pensamientos distintos con importancias crecientes
    m = addThought(m, makeThought({ text: 'low', kind: 'observation', importance: 0.1 }));
    m = addThought(m, makeThought({ text: 'mid', kind: 'observation', importance: 0.5 }));
    m = addThought(m, makeThought({ text: 'high', kind: 'hypothesis', importance: 0.9 }));
    expect(m.compressedCount).toBe(1);
    expect(m.thoughts.length).toBeLessThanOrEqual(2);
    // conserva el de mayor importancia
    expect(m.thoughts.some((t) => t.text === 'high')).toBe(true);
  });

  it('integrateThoughts agrega múltiples', () => {
    const m = integrateThoughts(createModel('contrastive', { capacity: 50 }), [
      makeThought({ text: 'p1', kind: 'learning', importance: 0.3 }),
      makeThought({ text: 'p2', kind: 'learning', importance: 0.6 }),
    ]);
    expect(m.thoughts.length).toBe(2);
  });

  it('compressModel es idempotente bajo capacidad', () => {
    const m = createModel('compressive', { capacity: 32 });
    expect(compressModel(m).compressedCount).toBe(0);
  });
});

describe('learnModels / contraste y resolución', () => {
  it('contrastThoughts calcula added/removed/common/tagDelta', () => {
    const a: Thought[] = [
      makeThought({ text: 'x', kind: 'observation', tags: ['db'] }),
      makeThought({ text: 'y', kind: 'hypothesis', tags: ['auth'] }),
    ];
    const b: Thought[] = [
      makeThought({ text: 'y', kind: 'hypothesis', tags: ['auth'] }),
      makeThought({ text: 'z', kind: 'learning', tags: ['ui'] }),
    ];
    const d = contrastThoughts(a, b);
    expect(d.common.length).toBe(1);
    expect(d.added.map((t) => t.text)).toEqual(['z']);
    expect(d.removed.map((t) => t.text)).toEqual(['x']);
    expect(d.tagDelta.added).toContain('ui');
    expect(d.tagDelta.removed).toContain('db');
  });

  it('resolveErrors elige el modelo con mayor solapamiento', () => {
    const dbModel: LearningModel = integrateThoughts(createModel('causal', { name: 'db', capacity: 50 }), [
      makeThought({ text: 'reintentar conexión', kind: 'resolution', tags: ['db', 'timeout'] }),
      makeThought({ text: 'cache de consulta', kind: 'learning', tags: ['db'] }),
    ]);
    const uiModel = integrateThoughts(createModel('associative', { name: 'ui', capacity: 50 }), [
      makeThought({ text: 'animar botón', kind: 'learning', tags: ['ui'] }),
    ]);
    const errors = [makeThought({ text: 'db cayó', kind: 'error', tags: ['db', 'timeout'] })];
    const res = resolveErrors(errors, [dbModel, uiModel]);
    expect(res[0].sourceModelId).toBe(dbModel.id);
    expect(res[0].confidence).toBeGreaterThan(0);
    expect(res[0].strategy).toContain('reintentar conexión');
  });

  it('resolveErrors reporta no_matching_model sin solapamiento', () => {
    const uiModel = createModel('associative', { name: 'ui', capacity: 50 });
    const errors = [makeThought({ text: 'boom', kind: 'error', tags: ['network'] })];
    const res = resolveErrors(errors, [uiModel]);
    expect(res[0].strategy).toBe('no_matching_model');
    expect(res[0].confidence).toBe(0);
  });
});

describe('learnModels / modelo avanzado (meta-razonamiento)', () => {
  it('spawnAdvancedModel integra contrastes y resoluciones', () => {
    const m = integrateThoughts(createModel('causal', { name: 'db', capacity: 50 }), [
      makeThought({ text: 'reintentar conexión', kind: 'resolution', tags: ['db', 'timeout'] }),
      makeThought({ text: 'db cayó', kind: 'error', tags: ['db', 'timeout'] }),
      makeThought({ text: 'cache de consulta', kind: 'learning', tags: ['db'] }),
    ]);
    const adv = spawnAdvancedModel([m]);
    expect(adv.kind).toBe('contrastive');
    expect(adv.thoughts.some((t) => t.kind === 'learning' && t.tags.includes('meta'))).toBe(true);
    expect(adv.thoughts.some((t) => t.kind === 'resolution')).toBe(true);
  });
});
