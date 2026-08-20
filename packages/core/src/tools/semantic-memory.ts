// -----------------------------------------------------------------------------
// semantic-memory.ts - capability `semantic_memory`
// -----------------------------------------------------------------------------
// Port ORIGINAL de los PRINCIPIOS de la memoria vectorial del diseno SACD/NASA
// (fuente: learning/sources/sacd-nasa.md, diseno pegado por el usuario 20/08/2026).
// Sin codigo copiado: re-diseno en el estilo del dominio puro de UltraIa
// (determinista, sin red, sin LLM, sin deps nuevas).
// - El diseno propone Qdrant/Chroma para "memoria semantica y experiencial".
//   Aqui: indice esparcido por hash de n-gramas + similitud de coseno (djb2),
//   suficiente para recuperacion semantica top-k sobre corpus de verdad
//   (learning/truth/*.json) sin instalar infraestructura.
// - El diseno guarda "Problema -> Solucion -> Resultado -> Leccion" sin verificar;
//   aqui el corpus son VERDADES verificadas aparte (learning/truth/ + verify.py).
// Fuente: learning/sources/sacd-nasa.md; analisis: docs/RAZONAMIENTO-SACD.md.
// -----------------------------------------------------------------------------

/** Bolsa de hashes -> peso (vector esparcido del texto). */
export type HashBag = Map<number, number>;

/** Stopwords es/en para tokenizacion (determinista, fija). */
export const STOPWORDS: ReadonlySet<string> = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'o', 'u', 'a', 'al',
  'en', 'con', 'por', 'para', 'que', 'es', 'son', 'se', 'su', 'sus', 'como', 'cuando', 'donde',
  'mas', 'menos', 'muy', 'entre', 'sobre', 'desde', 'hasta', 'sin', 'pero', 'si', 'no', 'ya',
  'the', 'and', 'of', 'to', 'in', 'is', 'are', 'a', 'an', 'on', 'for', 'with', 'from', 'by',
  'at', 'be', 'or', 'as', 'it', 'this', 'that', 'was', 'were', 'will', 'can', 'use', 'using',
]);

/** Hash djb2 (32-bit sin signo) - estable entre ejecuciones y procesos. */
export function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Tokeniza: minusculas, separa por no-alfanumerico (soporta acentos es), sin stopwords, >=2 chars. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9áéíóúüñ]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/**
 * Embedding esparcido: tokens con peso 1 + bigramas consecutivos con peso 0.5.
 * Los bigramas capturan orden local ("area circulo" != "circulo area") sin
 * dimensiones fijas: el coseno solo necesita el bag compartido.
 */
export function embedText(text: string): HashBag {
  const tokens = tokenize(text);
  const bag: HashBag = new Map();
  for (const t of tokens) {
    const h = hashStr(t);
    bag.set(h, (bag.get(h) ?? 0) + 1);
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    const h = hashStr(tokens[i] + ' ' + tokens[i + 1]);
    bag.set(h, (bag.get(h) ?? 0) + 0.5);
  }
  return bag;
}

/** Similitud de coseno entre dos bags; 0 si alguno esta vacio. */
export function cosineSimilarity(a: HashBag, b: HashBag): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const w of a.values()) na += w * w;
  for (const w of b.values()) nb += w * w;
  const small = a.size <= b.size ? a : b;
  const big = a.size <= b.size ? b : a;
  for (const [h, w] of small) {
    const other = big.get(h);
    if (other !== undefined) dot += w * other;
  }
  return dot / Math.sqrt(na * nb);
}

/** Caso normalizado de un archivo de verdad (learning/truth/*.json). */
export type TruthDoc = {
  id: string;
  /** Prompt / consulta del caso (el texto buscable). */
  texto: string;
  /** Respuesta verificada (stringificada; numeros -> String, objetos -> JSON). */
  respuesta: string;
  /** Tipo de comparacion ('exact' | 'approx' | ...), vacio si ausente. */
  tipo: string;
  /** Fuente (nombre del archivo de verdad sin .json). */
  fuente: string;
};

/** Forma lenient de un archivo de verdad (acepta extra keys y tipos variados). */
export type TruthFileLike = {
  id?: string;
  source?: string;
  cases?: Array<Record<string, unknown>>;
};

function stringifyAnswer(a: unknown): string {
  if (typeof a === 'string') return a;
  if (typeof a === 'number' || typeof a === 'boolean') return String(a);
  if (a === null || a === undefined) return '';
  return JSON.stringify(a);
}

/**
 * Convierte archivos de verdad (lenient) en TruthDoc[].
 * id del doc = `<fuente>_<caseId>` (unicidad por archivo).
 */
export function loadTruthCorpus(files: TruthFileLike[]): TruthDoc[] {
  const docs: TruthDoc[] = [];
  for (const file of files) {
    const fuente = file.source ?? file.id ?? 'fuente';
    for (const c of file.cases ?? []) {
      const caseId = typeof c.id === 'string' || typeof c.id === 'number' ? String(c.id) : `case_${docs.length}`;
      const prompt = typeof c.prompt === 'string' ? c.prompt : JSON.stringify(c.prompt ?? '');
      docs.push({
        id: `${fuente}_${caseId}`,
        texto: prompt,
        respuesta: stringifyAnswer(c.answer),
        tipo: typeof c.type === 'string' ? c.type : '',
        fuente,
      });
    }
  }
  return docs;
}

/** Resultado de una busqueda semantica. */
export type SemanticMemoryHit = {
  id: string;
  texto: string;
  respuesta: string;
  /** Similitud coseno 0-1 (3 decimales). */
  score: number;
};

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * Busqueda semantica top-k sobre un corpus (puro, sin estado):
 * embeds la query y puntua cada doc contra texto+respuesta.
 * Empates por id asc (determinista). Docs sin terminos compartidos -> score 0.
 */
export function searchTruth(docs: TruthDoc[], query: string, k = 5): SemanticMemoryHit[] {
  const bag = embedText(query);
  const scored = docs.map((doc) => ({
    doc,
    score: cosineSimilarity(bag, embedText(doc.texto + ' ' + doc.respuesta)),
  }));
  scored.sort((a, b) => b.score - a.score || (a.doc.id < b.doc.id ? -1 : 1));
  return scored.slice(0, k).map(({ doc, score }) => ({
    id: doc.id,
    texto: doc.texto,
    respuesta: doc.respuesta,
    score: round3(score),
  }));
}

/** Estadisticas del corpus: total, fuentes unicas (ordenadas), tipos por conteo. */
export function corpusStats(docs: TruthDoc[]): { total: number; fuentes: string[]; tipos: Record<string, number> } {
  const fuentes = [...new Set(docs.map((d) => d.fuente))].sort();
  const tipos: Record<string, number> = {};
  for (const d of docs) tipos[d.tipo || 'sin_tipo'] = (tipos[d.tipo || 'sin_tipo'] ?? 0) + 1;
  return { total: docs.length, fuentes, tipos };
}

/**
 * Indice incremental (add/remove/query) para cuando el corpus crece:
 * guarda el bag de cada doc para no re-embeddar en cada query.
 */
export class SemanticMemoryIndex {
  private docs = new Map<string, { doc: TruthDoc; bag: HashBag }>();

  add(doc: TruthDoc): void {
    this.docs.set(doc.id, { doc, bag: embedText(doc.texto + ' ' + doc.respuesta) });
  }

  remove(id: string): boolean {
    return this.docs.delete(id);
  }

  query(query: string, k = 5): SemanticMemoryHit[] {
    const bag = embedText(query);
    const scored: Array<{ doc: TruthDoc; score: number }> = [];
    for (const { doc, bag: db } of this.docs.values()) {
      scored.push({ doc, score: cosineSimilarity(bag, db) });
    }
    scored.sort((a, b) => b.score - a.score || (a.doc.id < b.doc.id ? -1 : 1));
    return scored.slice(0, k).map(({ doc, score }) => ({
      id: doc.id,
      texto: doc.texto,
      respuesta: doc.respuesta,
      score: round3(score),
    }));
  }

  get size(): number {
    return this.docs.size;
  }

  ids(): string[] {
    return [...this.docs.keys()].sort();
  }
}

// ------------------------------------------------------------------- carga fs

/**
 * Carga TODOS los learning/truth/*.json de un directorio (fail-soft: un archivo
 * ilegible se salta, no tumba el resto). Usa node:* - solo corre en runtime node
 * (la tool en llm.ts ya corre server-side; el dominio puro no depende de esto).
 */
export async function loadTruthFromDir(dir: string): Promise<TruthDoc[]> {
  const { readdir, readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
  const files: TruthFileLike[] = [];
  for (const n of names) {
    try {
      const parsed = JSON.parse(await readFile(join(dir, n), 'utf8')) as { cases?: Array<Record<string, unknown>> };
      files.push({ source: n.replace(/\.json$/, ''), cases: parsed.cases });
    } catch {
      // fail-soft: archivo corrupto/ilegible se omite
    }
  }
  return loadTruthCorpus(files);
}

export const semanticMemory = { hashStr, tokenize, embedText, cosineSimilarity, loadTruthCorpus, searchTruth, corpusStats, SemanticMemoryIndex, loadTruthFromDir, loadTruthAuto };

/** Candidatos de ruta a learning/truth segun el cwd del runtime (web: apps/web; core: packages/core). */
const TRUTH_PATH_CANDIDATES = ['learning/truth', '../../learning/truth', '../../../learning/truth'];

/**
 * Carga el corpus de verdad probando candidatos de ruta (fail-soft).
 * Devuelve { docs, desde } para que la tool reporte de donde leyo.
 */
export async function loadTruthAuto(): Promise<{ docs: TruthDoc[]; desde: string }> {
  for (const dir of TRUTH_PATH_CANDIDATES) {
    const docs = await loadTruthFromDir(dir);
    if (docs.length > 0) return { docs, desde: dir };
  }
  return { docs: [], desde: 'ninguno' };
}