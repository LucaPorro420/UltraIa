// chat-memory.ts — ChatSessionMemory: memoria de chat persistente + grafo (graphity).
//
// Pedido del usuario: "una codificacion para guardar en memoria el chat y no perder
// consistencia en el cambio de modo e modelo" y "usa graphity como memoria extendible".
//
// Diseno:
//  - GRAPHITY: cada sesion deriva un grafo de entidades/hechos de la conversacion
//    (formato KnowledgeGraph de kgraph.ts, keyless y deterministico, sin LLM). El grafo es la
//    "memoria extendible": persiste en disco y puede volcarse a las herramientas de grafo.
//  - CONSISTENCIA ENTRE MODELOS/MODOS: `getContextBlock()` produce un bloque de texto compacto
//    (resumen extractivo + entidades clave + ventana de turnos recientes) que se inyecta como
//    system context al cambiar de modelo o modo. Asi el nuevo modelo retoma el hilo sin perder
//    intencion. El bloque es deterministico (misma sesion => mismo bloque).
//  - PERSISTENCIA: session + grafo se guardan atomicamente en `.ultraia/chat-sessions/`.

import { writeFileSync, renameSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { KnowledgeGraph, KNode, KEdge } from '../tools/kgraph';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatTurn {
  role: ChatRole;
  content: string;
  at: string;
}

export interface ChatContextBlock {
  sessionId: string;
  summary: string;
  recentTurns: ChatTurn[];
  graphNodes: number;
  graphEdges: number;
  /** Texto listo para inyectar como system context al cambiar de modelo/modo. */
  block: string;
}

const ENTITY_STOP = new Set([
  'El', 'La', 'Los', 'Las', 'Un', 'Una', 'Unos', 'Unas', 'Yo', 'Tu', 'El', 'Ella', 'Nosotros',
  'The', 'A', 'An', 'This', 'That', 'I', 'You', 'He', 'She', 'We', 'They', 'It', 'In', 'On',
  'De', 'Del', 'Por', 'Para', 'Con', 'Y', 'O', 'But', 'If', 'When', 'Then', 'So', 'Qué', 'Cómo',
  'Ultraia', 'Ok', 'Sí', 'No', 'Yes', 'No',
]);

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** Extrae entidades candidatas de un texto: frases entre comillas + palabras Capitalizadas. */
export function extractEntities(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const quoted = text.match(/"([^"]{2,60})"/g) || [];
  for (const q of quoted) {
    const t = q.slice(1, -1).trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  const words = text.split(/[^\p{L}\p{N}]+/u);
  for (const w of words) {
    if (!w) continue;
    const clean = w.replace(/^[`*_]+|[`*_]+$/g, '');
    if (clean.length < 3) continue;
    if (/^[A-ZÀ-Ý][a-zà-ÿ]/u.test(clean) && !ENTITY_STOP.has(clean)) {
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(clean);
      }
    }
  }
  return out.slice(0, 40);
}

export interface ChatMemoryOptions {
  sessionId?: string;
  rootDir?: string;
  maxTurnsWindow?: number;
}

export class ChatSessionMemory {
  readonly sessionId: string;
  private turns: ChatTurn[] = [];
  private graph: KnowledgeGraph = { nodes: [], edges: [] };
  private rootDir: string;
  private maxTurnsWindow: number;

  constructor(opts: ChatMemoryOptions = {}) {
    this.sessionId = opts.sessionId || `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.rootDir = opts.rootDir || ChatSessionMemory.defaultRoot();
    this.maxTurnsWindow = opts.maxTurnsWindow ?? 6;
  }

  static defaultRoot(): string {
    return join(process.cwd(), '.ultraia', 'chat-sessions');
  }

  addTurn(role: ChatRole, content: string, at?: string): void {
    this.turns.push({ role, content, at: at || new Date().toISOString() });
  }

  getTurns(): ChatTurn[] {
    return [...this.turns];
  }

  /** (Re)construye el grafo de entidades de la conversacion (deterministico). */
  buildGraph(): KnowledgeGraph {
    const nodes = new Map<string, KNode>();
    const edgeMap = new Map<string, KEdge>();
    for (const turn of this.turns) {
      const ents = extractEntities(turn.content);
      for (const e of ents) {
        const id = `n:${slug(e)}`;
        if (!nodes.has(id)) nodes.set(id, { id, label: e, type: 'concept', source: 'chat' });
      }
      for (let i = 0; i < ents.length; i++) {
        for (let j = i + 1; j < ents.length; j++) {
          const a = `n:${slug(ents[i])}`;
          const b = `n:${slug(ents[j])}`;
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          const ex = edgeMap.get(key);
          if (ex) ex.weight += 1;
          else edgeMap.set(key, { source: a, target: b, kind: 'EXTRACTED', label: 'co-ocurre', weight: 1 });
        }
      }
    }
    const graph: KnowledgeGraph = { nodes: [...nodes.values()], edges: [...edgeMap.values()] };
    for (const e of graph.edges) {
      const a = nodes.get(e.source);
      const b = nodes.get(e.target);
      if (a) a.degree = (a.degree || 0) + 1;
      if (b) b.degree = (b.degree || 0) + 1;
    }
    this.graph = graph;
    return graph;
  }

  /** Resumen extractivo: primer turno del usuario como tema + entidades mas conectadas. */
  summarize(): string {
    const firstUser = this.turns.find((t) => t.role === 'user');
    const topic = firstUser ? firstUser.content.slice(0, 120) : '(sin tema)';
    const g = this.buildGraph();
    const top = [...g.nodes]
      .sort((a, b) => (b.degree || 0) - (a.degree || 0))
      .slice(0, 6)
      .map((n) => n.label);
    return top.length ? `${topic} | Entidades: ${top.join(', ')}` : topic;
  }

  /** Bloque de contexto a inyectar al cambiar de modelo/modo (preserva consistencia). */
  getContextBlock(opts?: { maxRecent?: number }): ChatContextBlock {
    const maxRecent = opts?.maxRecent ?? this.maxTurnsWindow;
    const recent = this.turns.slice(-maxRecent);
    const summary = this.summarize();
    const g = this.buildGraph();
    const topEntities = [...g.nodes]
      .sort((a, b) => (b.degree || 0) - (a.degree || 0))
      .slice(0, 8)
      .map((n) => n.label);
    const lines = [
      `[CHAT MEMORY — sesión ${this.sessionId}]`,
      `Resumen: ${summary}`,
      topEntities.length ? `Entidades clave: ${topEntities.join(', ')}` : '',
      '--- Historial reciente ---',
      ...recent.map((t) => `${t.role}: ${t.content}`),
    ].filter(Boolean);
    return {
      sessionId: this.sessionId,
      summary,
      recentTurns: recent,
      graphNodes: g.nodes.length,
      graphEdges: g.edges.length,
      block: lines.join('\n'),
    };
  }

  toJSON(): object {
    return { sessionId: this.sessionId, turns: this.turns, graph: this.buildGraph() };
  }

  /** Guardado atomico (tmp + rename) de sesion + grafo. */
  save(): void {
    mkdirSync(this.rootDir, { recursive: true });
    const tmp = join(this.rootDir, `${this.sessionId}.json.tmp`);
    const final = join(this.rootDir, `${this.sessionId}.json`);
    writeFileSync(tmp, JSON.stringify(this.toJSON(), null, 2), 'utf8');
    renameSync(tmp, final);
  }

  static load(sessionId: string, opts?: { rootDir?: string }): ChatSessionMemory {
    const root = opts?.rootDir ?? ChatSessionMemory.defaultRoot();
    const file = join(root, `${sessionId}.json`);
    if (!existsSync(file)) throw new Error(`ChatSessionMemory: sesión no encontrada: ${sessionId}`);
    const raw = JSON.parse(readFileSync(file, 'utf8')) as {
      sessionId: string;
      turns: ChatTurn[];
      graph?: KnowledgeGraph;
    };
    const mem = new ChatSessionMemory({ sessionId: raw.sessionId, rootDir: root });
    mem.turns = raw.turns || [];
    mem.graph = raw.graph || { nodes: [], edges: [] };
    return mem;
  }

  static exists(sessionId: string, opts?: { rootDir?: string }): boolean {
    const root = opts?.rootDir ?? ChatSessionMemory.defaultRoot();
    return existsSync(join(root, `${sessionId}.json`));
  }
}
