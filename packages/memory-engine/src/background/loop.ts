/**
 * Background Loop: Autonomía
 * - Corre cada 15 minutos sin intervención del usuario
 * - Analiza memoria, detecta mejoras, genera sugerencias
 * - NO aplica cambios (solo propone)
 */

import { PrismaClient } from '@prisma/client'
import { MemoryClient } from '../api/memory-client'
import { DecayManager } from '../decay/decay-manager'
import { MemoryStore } from '../storage/memory-store'

export interface BackgroundLoopConfig {
  interval?: number // ms (default: 15 min)
  workspaceId: string
  autoApply?: boolean // Si false (recomendado): solo propone
}

export class BackgroundLoop {
  private config: BackgroundLoopConfig
  private memory: MemoryClient
  private decay: DecayManager
  private store: MemoryStore
  private prisma: PrismaClient
  private running = false

  constructor(config: BackgroundLoopConfig) {
    this.config = { interval: 15 * 60 * 1000, autoApply: false, ...config }
    this.memory = new MemoryClient()
    this.store = new MemoryStore()
    this.decay = new DecayManager(this.store)
    this.prisma = new PrismaClient()
  }

  /**
   * Iniciar el loop en background
   */
  start(): void {
    if (this.running) return

    this.running = true
    console.log(`[BackgroundLoop] Started for workspace ${this.config.workspaceId}`)

    this.runCycle()
    setInterval(() => this.runCycle(), this.config.interval)
  }

  /**
   * Detener el loop
   */
  stop(): void {
    this.running = false
    console.log(`[BackgroundLoop] Stopped for workspace ${this.config.workspaceId}`)
  }

  /**
   * Un ciclo completo de análisis
   */
  private async runCycle(): Promise<void> {
    try {
      console.log(`[BackgroundLoop] Cycle started at ${new Date().toISOString()}`)

      // 1. Actualizar decay scores
      await this.decay.refreshAllDecayScores(this.config.workspaceId)

      // 2. Detectar errores frecuentes
      const frequentErrors = await this.detectFrequentErrors()

      // 3. Detectar patrones de éxito
      const successPatterns = await this.detectSuccessPatterns()

      // 4. Proponer mejoras
      await this.generateSuggestions(frequentErrors, successPatterns)

      // 5. Archivar entrías olvidadas
      const archived = await this.decay.archiveForgettenEntries(this.config.workspaceId)

      console.log(
        `[BackgroundLoop] Cycle complete: ${frequentErrors.length} errors, ` +
          `${successPatterns.length} patterns, ${archived} archived`
      )
    } catch (error) {
      console.error('[BackgroundLoop] Error during cycle:', error)
    }
  }

  /**
   * Detectar errores frecuentes
   */
  private async detectFrequentErrors(): Promise<any[]> {
    // Query: errores en los últimos 7 días
    const entries = await this.store.list({
      workspaceId: this.config.workspaceId,
      type: 'error',
      limit: 1000,
    })

    // Agrupar por tipo de error
    const grouped: Record<string, number> = {}
    for (const e of entries) {
      const content = JSON.parse(e.content)
      const key = `${content.errorType || 'unknown'}`
      grouped[key] = (grouped[key] || 0) + 1
    }

    // Retornar los que ocurren >2 veces
    return Object.entries(grouped)
      .filter(([, count]) => count > 2)
      .map(([type, count]) => ({ type, count }))
  }

  /**
   * Detectar patrones de éxito
   */
  private async detectSuccessPatterns(): Promise<any[]> {
    // Query: resultados exitosos
    const entries = await this.store.list({
      workspaceId: this.config.workspaceId,
      type: 'result',
      limit: 500,
    })

    // Analizar patrones comunes
    const patterns: Record<string, number> = {}
    for (const e of entries) {
      const metadata = JSON.parse(e.metadata)
      if (metadata.tags?.includes('high_quality')) {
        const category = e.category
        patterns[category] = (patterns[category] || 0) + 1
      }
    }

    return Object.entries(patterns)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  /**
   * Generar sugerencias automáticas
   */
  private async generateSuggestions(frequentErrors: any[], successPatterns: any[]): Promise<void> {
    const suggestions: any[] = []

    // Sugerencia 1: Corregir errores frecuentes
    for (const error of frequentErrors) {
      suggestions.push({
        type: 'error_fix',
        title: `Fix recurring error: ${error.type}`,
        description: `This error occurred ${error.count} times recently. Consider reviewing error handling.`,
        confidence: Math.min(0.95, 0.5 + error.count * 0.1),
      })
    }

    // Sugerencia 2: Aprovechar patrones de éxito
    for (const pattern of successPatterns) {
      suggestions.push({
        type: 'pattern_detected',
        title: `Success pattern detected in ${pattern.category}`,
        description: `High-quality results in ${pattern.category}. Consider replicating this approach.`,
        confidence: Math.min(0.9, 0.7 + pattern.count * 0.05),
      })
    }

    // Guardar sugerencias en DB
    for (const suggestion of suggestions) {
      await this.prisma.autoSuggestion.create({
        data: {
          workspaceId: this.config.workspaceId,
          type: suggestion.type,
          title: suggestion.title,
          description: suggestion.description,
          suggestedAction: suggestion.suggestedAction || '',
          confidence: suggestion.confidence,
          sourceData: JSON.stringify(suggestion),
        },
      })
    }

    console.log(`[BackgroundLoop] Generated ${suggestions.length} suggestions`)
  }

  async cleanup(): Promise<void> {
    await this.memory.disconnect()
    await this.store.disconnect()
    await this.prisma.$disconnect()
  }
}

/**
 * Función pública para iniciar el loop
 */
export async function startBackgroundLoop(config: BackgroundLoopConfig): Promise<BackgroundLoop> {
  const loop = new BackgroundLoop(config)
  loop.start()
  return loop
}
