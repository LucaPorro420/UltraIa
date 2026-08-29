/**
 * mem0-client.ts — Memoria persistente de usuario vía Mem0 API.
 *
 * Patrón fail-soft: si Mem0 no está configurado o falla, el sistema funciona igual.
 * Ciclo: search → inyectar contexto → generate → store.
 */

export interface Mem0Memory {
  id: string;
  memory: string;
  score: number;
}

type MemoryClientType = {
  search: (query: string, opts: { filters: Record<string, string> }) => Promise<{ results?: Array<{ id: string; memory: string; score?: number }> }>;
  add: (messages: Array<{ role: string; content: string }>, opts: { user_id: string }) => Promise<void>;
  get_all: (opts: { filters: Record<string, string> }) => Promise<{ results?: Array<{ id: string; memory: string }> }>;
  delete: (id: string) => Promise<void>;
  delete_all: (opts: { filters: Record<string, string> }) => Promise<void>;
};

let clientInstance: MemoryClientType | null = null;

/**
 * Obtiene el cliente Mem0 (lazy init).
 * Retorna null si MEM0_API_KEY no está configurado.
 */
function getClient(): MemoryClientType | null {
  if (clientInstance) return clientInstance;

  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) return null;

  try {
    // Dynamic import para no romper builds sin mem0ai instalado
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('mem0ai');
    const Client = mod.default ?? mod.MemoryClient ?? mod;
    clientInstance = new Client({ apiKey }) as MemoryClientType;
    return clientInstance;
  } catch {
    return null;
  }
}

/**
 * Busca memorias relevantes para un usuario.
 * Retorna [] si Mem0 no está disponible o hay error.
 */
export async function searchMemories(userId: string, query: string): Promise<Mem0Memory[]> {
  const c = getClient();
  if (!c) return [];
  try {
    const results = await c.search(query, { filters: { user_id: userId } });
    return (results.results ?? []).map(m => ({
      id: m.id,
      memory: m.memory,
      score: m.score ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Almacena una interacción en la memoria del usuario.
 */
export async function storeMemory(
  userId: string,
  messages: Array<{ role: string; content: string }>,
): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.add(messages, { user_id: userId });
  } catch {
    // Fail-soft
  }
}

/**
 * Obtiene todas las memorias de un usuario.
 */
export async function getAllMemories(userId: string): Promise<Mem0Memory[]> {
  const c = getClient();
  if (!c) return [];
  try {
    const results = await c.get_all({ filters: { user_id: userId } });
    return (results.results ?? []).map(m => ({
      id: m.id,
      memory: m.memory,
      score: 1,
    }));
  } catch {
    return [];
  }
}

/**
 * Elimina una memoria específica.
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.delete(memoryId);
  } catch {
    // Fail-soft
  }
}

/**
 * Elimina todas las memorias de un usuario.
 */
export async function deleteAllMemories(userId: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.delete_all({ filters: { user_id: userId } });
  } catch {
    // Fail-soft
  }
}

/**
 * Verifica si Mem0 está configurado y disponible.
 */
export function isMem0Available(): boolean {
  return getClient() !== null;
}
