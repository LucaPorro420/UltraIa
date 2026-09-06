/** Capability `learning_search` — Búsqueda offline en corpus de aprendizaje UltraIa.
 *
 * Wrapper TypeScript para el script Python `learning/scripts/search_learning.py`
 * que busca en learning/sources/, learning/truth/, learning/responses/ y
 * learning/memory/ultraia_memory.zip sin dependencia de red.
 *
 * Uso: tool `learning_search` con acciones `search` / `stats` / `source`
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..', '..');
const SEARCH_SCRIPT = resolve(ROOT, 'learning', 'scripts', 'search_learning.py');

export type LearningSearchAction = 'search' | 'stats' | 'source';
export type LearningSearchTarget = 'all' | 'sources' | 'truth' | 'responses' | 'memory';

export interface LearningSearchInput {
  action: LearningSearchAction;
  query?: string;
  target?: LearningSearchTarget;
  source?: string; // para action='source'
}

export interface LearningSearchResult {
  ok: boolean;
  action: LearningSearchAction;
  query?: string;
  target?: LearningSearchTarget;
  source?: string;
  results?: LearningSearchHit[];
  stats?: LearningStats;
  error?: string;
}

export interface LearningSearchHit {
  file: string;
  type: 'source' | 'truth' | 'responses' | 'memory';
  matches: number;
  contexts?: Array<{
    position: number;
    context: string;
    match_text: string;
  }>;
  cases?: any[];
}

export interface LearningStats {
  total_source_files: number;
  total_lines: number;
  source_files: string[];
  truth_files: number;
  truth_cases: number;
  memory_bundle: string;
  memory_files_in_bundle: number;
}

/**
 * Ejecuta el script Python search_learning.py y parsea la salida JSON.
 * El script imprime resultados en formato legible, pero para integración
 * añadimos modo --json (a implementar en el script Python).
 */
export async function runLearningSearch(input: LearningSearchInput): Promise<LearningSearchResult> {
  return new Promise((resolve) => {
    const args = ['-u', SEARCH_SCRIPT]; // -u = unbuffered stdout

    if (input.action === 'stats') {
      args.push('--stats');
    } else if (input.action === 'source') {
      if (!input.source) {
        resolve({ ok: false, action: 'source', error: 'source parameter required' });
        return;
      }
      args.push('--source', input.source);
      if (input.query) args.push(input.query);
    } else { // 'search'
      if (!input.query) {
        resolve({ ok: false, action: 'search', error: 'query parameter required' });
        return;
      }
      args.push(input.query);
      if (input.target && input.target !== 'all') {
        args.unshift('--target', input.target); // insert after script path
      }
    }

    const child = spawn('python', args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf-8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf-8'); });

    child.on('close', (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          action: input.action,
          error: `Script exited with code ${code}: ${stderr || stdout}`,
        });
        return;
      }

      // Parse output - currently the script prints human-readable format
      // For now, return structured data based on what we can parse
      // TODO: add --json flag to search_learning.py for proper structured output
      const results = parseSearchOutput(stdout, input.action);
      resolve({ ok: true, action: input.action, query: input.query, target: input.target, source: input.source, results, stats: parseStatsOutput(stdout) });
    });

    child.on('error', (err) => {
      resolve({ ok: false, action: input.action, error: `Spawn failed: ${err.message}` });
    });
  });
}

/** Parse human-readable search output to structured hits */
export function parseSearchOutput(output: string, action: LearningSearchAction): LearningSearchHit[] {
  const hits: LearningSearchHit[] = [];
  const lines = output.split('\n');

  let currentHit: Partial<LearningSearchHit> | null = null;
  let currentContexts: LearningSearchHit['contexts'] = [];

  for (const line of lines) {
    // Match result header: [1] SOURCE: sources\libros-programacion-gratis.md
    const headerMatch = line.match(/^\[\d+\]\s+(SOURCE|TRUTH|MEMORY):\s+(.+)$/);
    if (headerMatch) {
      if (currentHit) {
        if (currentContexts.length) currentHit.contexts = currentContexts;
        hits.push(currentHit as LearningSearchHit);
      }
      currentHit = {
        file: headerMatch[2].trim(),
        type: headerMatch[1].toLowerCase() as LearningSearchHit['type'],
        matches: 0,
      };
      currentContexts = [];
      continue;
    }

    // Match "Matches: N"
    const matchesMatch = line.match(/^\s+Matches:\s+(\d+)$/);
    if (matchesMatch && currentHit) {
      currentHit.matches = parseInt(matchesMatch[1], 10);
      continue;
    }

    // Match context lines: "      1. ...context..."
    const contextMatch = line.match(/^\s+\d+\.\s+(.+)$/);
    if (contextMatch && currentHit) {
      currentContexts.push({
        position: 0,
        context: contextMatch[1].trim(),
        match_text: '',
      });
      continue;
    }

    // Match "Cases: [...]" for truth
    const casesMatch = line.match(/^\s+Cases:\s+(.+)$/);
    if (casesMatch && currentHit) {
      try {
        currentHit.cases = JSON.parse(casesMatch[1]);
      } catch {
        currentHit.cases = [casesMatch[1].trim()];
      }
      continue;
    }
  }

  if (currentHit) {
    if (currentContexts.length) currentHit.contexts = currentContexts;
    hits.push(currentHit as LearningSearchHit);
  }

  return hits;
}

/** Parse stats output */
export function parseStatsOutput(output: string): LearningStats | undefined {
  if (!output.includes('Total source files:')) return undefined;

  const lines = output.split('\n');
  const stats: Partial<LearningStats> = { source_files: [] };

  for (const line of lines) {
    const sourceMatch = line.match(/Total source files:\s+(\d+)/);
    if (sourceMatch) stats.total_source_files = parseInt(sourceMatch[1], 10);

    const linesMatch = line.match(/Total lines:\s+(\d+)/);
    if (linesMatch) stats.total_lines = parseInt(linesMatch[1], 10);

    const truthFilesMatch = line.match(/Truth files:\s+(\d+)/);
    if (truthFilesMatch) stats.truth_files = parseInt(truthFilesMatch[1], 10);

    const truthCasesMatch = line.match(/Truth cases:\s+(\d+)/);
    if (truthCasesMatch) stats.truth_cases = parseInt(truthCasesMatch[1], 10);

    const memMatch = line.match(/Memory bundle:\s+(.+)/);
    if (memMatch) stats.memory_bundle = memMatch[1].trim();

    const memFilesMatch = line.match(/Files in bundle:\s+(\d+)/);
    if (memFilesMatch) stats.memory_files_in_bundle = parseInt(memFilesMatch[1], 10);

    const fileLineMatch = line.match(/^\s+-\s+(.+)\s+\((\d+)\s+lines?\)$/);
    if (fileLineMatch) {
      stats.source_files!.push(`${fileLineMatch[1].trim()} (${fileLineMatch[2]} lines)`);
    }
  }

  return stats as LearningStats;
}

/** Tool descriptor for llm.ts registration */
export const learningSearchToolDescriptor = {
  name: 'learning_search',
  description: 'Búsqueda offline en corpus de aprendizaje UltraIa (sources/, truth/, responses/, memory/). Acciones: search (query + target opcional), stats (--stats), source (--source slug + query opcional). Sin red, keyless, determinista.',
  parameters: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['search', 'stats', 'source'], description: 'Acción a ejecutar' },
      query: { type: 'string', description: 'Término de búsqueda (requerido para search/source)' },
      target: { type: 'string', enum: ['all', 'sources', 'truth', 'responses', 'memory'], description: 'Dónde buscar (default: all)' },
      source: { type: 'string', description: 'Slug del archivo source (ej: fundamentos-programacion) para action=source' },
    },
    required: ['action'],
  },
};

/** Namespace export for tools/index.ts */
export const learningSearch = {
  runLearningSearch,
  parseSearchOutput,
  parseStatsOutput,
  learningSearchToolDescriptor,
};