/**
 * Memory Client API
 * Interface pública para guardar/buscar memoria desde el web IDE y agentes
 */

import { MemoryStore, MemoryEntryInput } from '../storage/memory-store'
import { MemorySearch, SearchResult } from '../search/memory-search'
import { DecayManager } from '../decay/decay-manager'
import { AutoIndexer } from '../indexing/auto-indexer'

export class MemoryClient {
  private store: MemoryStore
  private search: MemorySearch
  private decay: DecayManager
  private indexer: AutoIndexer

  constructor() {
    this.store = new MemoryStore()
    this.search = new MemorySearch(this.store)
    this.decay = new DecayManager(this.store)
    this.indexer = new AutoIndexer(this.store)
  }

  /**
   * Guardar resultado de ejecución
   */
  async saveResult(
    workspaceId: string,
    category: string,
    prompt: string,
    result: any,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.indexer.indexEntry({
      workspaceId,
      type: 'result',
      category,
      title: `${category}: ${prompt.substring(0, 50)}...`,
      content: JSON.stringify(result),
      tags: [category, 'result'],
      metadata: {
        prompt,
        resultType: typeof result,
        ...metadata,
      },
    })
  }

  /**
   * Guardar error
   */
  async saveError(
    workspaceId: string,
    category: string,
    error: Error,
    context?: any
  ): Promise<string> {
    return this.indexer.indexEntry({
      workspaceId,
      type: 'error',
      category,
      title: `Error en ${category}: ${error.message}`,
      content: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
      }),
      tags: [category, 'error'],
      metadata: {
        errorType: error.constructor.name,
      },
    })
  }

  /**
   * Guardar lección aprendida
   */
  async saveLearning(
    workspaceId: string,
    category: string,
    lesson: string,
    evidence?: string
  ): Promise<string> {
    return this.indexer.indexEntry({
      workspaceId,
      type: 'learning',
      category,
      title: `Aprendizaje: ${lesson.substring(0, 50)}...`,
      content: lesson,
      tags: [category, 'learning'],
      metadata: {
        evidence,
      },
    })
  }

  /**
   * Buscar memoria
   */
  async search(workspaceId: string, query: string, limit = 10): Promise<SearchResult[]> {
    return this.search.searchByText(workspaceId, query, limit)
  }

  /**
   * Buscar por categoría (IDE)
   */
  async searchByCategory(workspaceId: string, category: string, limit = 20): Promise<SearchResult[]> {
    return this.search.searchByCategory(workspaceId, category, limit)
  }

  /**
   * Buscar por tags
   */
  async searchByTags(workspaceId: string, tags: string[], limit = 10): Promise<SearchResult[]> {
    return this.search.searchByTags(workspaceId, tags, limit)
  }

  /**
   * Top entries para una categoría
   */
  async getTopEntries(workspaceId: string, category?: string, limit = 5): Promise<SearchResult[]> {
    return this.search.topEntries(workspaceId, category, limit)
  }

  async disconnect(): Promise<void> {
    await this.store.disconnect()
  }
}

// Singleton global
let client: MemoryClient | null = null

export function getMemoryClient(): MemoryClient {
  if (!client) {
    client = new MemoryClient()
  }
  return client
}
