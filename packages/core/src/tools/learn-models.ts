// learn-models.ts — capability `learnModels`
// Modelos de aprendizaje programado (deterministas, keyless): integran "pensamientos",
// comprimen la memoria al crecer, calculan diferencias entre conjuntos de pensamientos y
// derivan modelos avanzados de meta-razonamiento para resolver errores.
// Patrón: fundamentos-programacion (determinismo por hash; sin red, sin estado global).

export type ThoughtKind = 'observation' | 'hypothesis' | 'error' | 'resolution' | 'learning';

export interface Thought {
  id: string;
  text: string;
  kind: ThoughtKind;
  tags: string[];
  importance: number; // 0..1
  createdAt: string; // yyyy-mm-dd; '' = sin fecha
}

export type ModelKind = 'associative' | 'causal' | 'contrastive' | 'compressive';

export interface LearningModel {
  id: string;
  name: string;
  kind: ModelKind;
  thoughts: Thought[];
  capacity: number;
  compressedCount: number;
}

export interface ThoughtDiff {
  added: Thought[];
  removed: Thought[];
  common: Thought[];
  tagDelta: { added: string[]; removed: string[] };
}

export interface Resolution {
  errorId: string;
  strategy: string;
  confidence: number; // 0..1
  sourceModelId: string | null;
}

const DEFAULT_CAPACITY: Record<ModelKind, number> = {
  associative: 16,
  causal: 16,
  contrastive: 24,
  compressive: 32,
};

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return ('00000000' + h.toString(16)).slice(-8);
}

export function hashThought(kind: string, text: string, tags: string[]): string {
  const tagKey = [...tags].sort().join(',');
  return djb2(`${kind}|${text}|${tagKey}`);
}

export function makeThought(input: {
  text: string;
  kind: ThoughtKind;
  tags?: string[];
  importance?: number;
  createdAt?: string;
}): Thought {
  const tags = (input.tags ?? []).map((t) => String(t).toLowerCase()).sort();
  const importance = Math.max(0, Math.min(1, input.importance ?? 0.5));
  return {
    id: hashThought(input.kind, input.text, tags),
    text: input.text,
    kind: input.kind,
    tags,
    importance,
    createdAt: input.createdAt ?? '',
  };
}

export function createModel(kind: ModelKind, opts?: { name?: string; capacity?: number }): LearningModel {
  const name = opts?.name ?? `model-${kind}`;
  const capacity = opts?.capacity ?? DEFAULT_CAPACITY[kind];
  return {
    id: `model-${kind}-${djb2(name)}`,
    name,
    kind,
    thoughts: [],
    capacity,
    compressedCount: 0,
  };
}

/** Agrega un pensamiento; deduplica por id (queda el de mayor importancia) y
 *  comprime automáticamente si se supera la capacidad del modelo. */
export function addThought(model: LearningModel, thought: Thought): LearningModel {
  const idx = model.thoughts.findIndex((t) => t.id === thought.id);
  let thoughts = model.thoughts.slice();
  if (idx >= 0) {
    thoughts[idx] = thought.importance >= thoughts[idx].importance ? thought : thoughts[idx];
  } else {
    thoughts.push(thought);
  }
  const next: LearningModel = { ...model, thoughts };
  if (next.thoughts.length > next.capacity) return compressModel(next);
  return next;
}

export function integrateThoughts(model: LearningModel, thoughts: Thought[]): LearningModel {
  return thoughts.reduce((m, t) => addThought(m, t), model);
}

/** Compresión determinista: ordena por importancia desc y colapsa duplicados
 *  cercanos (mismo kind + primer tag), conservando las `capacity` mejores. */
export function compressModel(model: LearningModel): LearningModel {
  if (model.thoughts.length <= model.capacity) {
    return { ...model, compressedCount: model.compressedCount };
  }
  const sorted = model.thoughts
    .slice()
    .sort((a, b) => b.importance - a.importance || (a.id < b.id ? -1 : 1));
  const seen = new Set<string>();
  const kept: Thought[] = [];
  for (const t of sorted) {
    const key = `${t.kind}:${t.tags[0] ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(t);
    if (kept.length >= model.capacity) break;
  }
  return { ...model, thoughts: kept, compressedCount: model.compressedCount + 1 };
}

export function contrastThoughts(a: Thought[], b: Thought[]): ThoughtDiff {
  const aIds = new Set(a.map((t) => t.id));
  const bIds = new Set(b.map((t) => t.id));
  const added = b.filter((t) => !aIds.has(t.id));
  const removed = a.filter((t) => !bIds.has(t.id));
  const common = a.filter((t) => bIds.has(t.id));
  const aTags = new Set(a.flatMap((t) => t.tags));
  const bTags = new Set(b.flatMap((t) => t.tags));
  return {
    added,
    removed,
    common,
    tagDelta: {
      added: [...bTags].filter((t) => !aTags.has(t)),
      removed: [...aTags].filter((t) => !bTags.has(t)),
    },
  };
}

function tagOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setB = new Set(b);
  const inter = a.filter((t) => setB.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

/** Para cada error, elige el modelo con mayor solapamiento de tags y deriva
 *  una estrategia de resolución (meta-razonamiento). */
export function resolveErrors(errors: Thought[], models: LearningModel[]): Resolution[] {
  return errors.map((err) => {
    let best: LearningModel | null = null;
    let bestScore = 0;
    for (const m of models) {
      const score =
        m.thoughts.reduce((acc, t) => acc + tagOverlap(err.tags, t.tags), 0) /
        Math.max(1, m.thoughts.length);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    if (!best || bestScore === 0) {
      return { errorId: err.id, strategy: 'no_matching_model', confidence: 0, sourceModelId: null };
    }
    const anchor = best.thoughts.slice().sort((x, y) => y.importance - x.importance)[0];
    return {
      errorId: err.id,
      strategy: `aplicar '${anchor.text}' (modelo ${best.name}) sobre tags [${err.tags.join(', ')}]`,
      confidence: Math.max(0, Math.min(1, bestScore)),
      sourceModelId: best.id,
    };
  });
}

/** Crea un modelo avanzado de meta-razonamiento: integra los contrastes y las
 *  resoluciones de los modelos base como pensamientos de aprendizaje/resolución. */
export function spawnAdvancedModel(base: LearningModel[], opts?: { name?: string }): LearningModel {
  const name = opts?.name ?? 'advanced-meta';
  const advanced = createModel('contrastive', { name, capacity: 64 });
  const learned: Thought[] = [];
  for (const m of base) {
    const diff = contrastThoughts([], m.thoughts);
    for (const t of diff.added) {
      learned.push(
        makeThought({
          text: `meta: ${t.kind} en ${m.name} -> ${t.text}`,
          kind: 'learning',
          tags: ['meta', ...t.tags],
          importance: Math.min(1, 0.4 + t.importance * 0.4),
        }),
      );
    }
  }
  const resolutions = resolveErrors(
    base.flatMap((m) => m.thoughts.filter((t) => t.kind === 'error')),
    base,
  );
  for (const r of resolutions) {
    learned.push(
      makeThought({
        text: `resolucion: ${r.strategy} (conf ${r.confidence.toFixed(2)})`,
        kind: 'resolution',
        tags: ['meta', 'resolution'],
        importance: r.confidence,
      }),
    );
  }
  return integrateThoughts(advanced, learned);
}

export const learnModels = {
  createModel,
  makeThought,
  addThought,
  integrateThoughts,
  compressModel,
  contrastThoughts,
  resolveErrors,
  spawnAdvancedModel,
  hashThought,
};
