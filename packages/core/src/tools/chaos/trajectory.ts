// -----------------------------------------------------------------------------
// trajectory.ts - capability `chaos`
// -----------------------------------------------------------------------------
// Buffer circular para estelas de trayectorias (BufferGeometry manager).
// Float32Array pre-allocado, shift circular, opacity decay exponencial.
// -----------------------------------------------------------------------------

import type { TrailPoint, RK4Config } from './types';
import { CHAOS_LIMITS } from './constants';

/**
 * TrailBuffer - Gestor de buffer circular para puntos de estela.
 *
 * Almacena: x, y, z, alpha (opacidad), t (timestamp/frame)
 * Layout en Float32Array: [x0, y0, z0, a0, t0, x1, y1, z1, a1, t1, ...]
 * Stride = 5 floats por punto.
 */
export class TrailBuffer {
  private readonly capacity: number;
  private readonly stride = 5; // x, y, z, alpha, t
  private readonly buffer: Float32Array;
  private head = 0;           // Índice del próximo slot a escribir
  private count = 0;          // Puntos válidos actuales
  private frameCounter = 0;   // Contador de frames para timestamp

  constructor(maxPoints: number = CHAOS_LIMITS.maxTrailPoints) {
    this.capacity = maxPoints;
    this.buffer = new Float32Array(maxPoints * this.stride);
  }

  /** Capacidad máxima del buffer. */
  getCapacity(): number {
    return this.capacity;
  }

  /** Número actual de puntos válidos. */
  getCount(): number {
    return this.count;
  }

  /** Verifica si el buffer está lleno. */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /** Reinicia el buffer (mantiene capacidad). */
  clear(): void {
    this.head = 0;
    this.count = 0;
    this.frameCounter = 0;
  }

  /**
   * Añade un nuevo punto a la estela.
   * Opacidad inicial = 1.0, se decae en getBufferWithDecay().
   */
  push(x: number, y: number, z: number): void {
    const idx = this.head * this.stride;
    this.buffer[idx] = x;
    this.buffer[idx + 1] = y;
    this.buffer[idx + 2] = z;
    this.buffer[idx + 3] = 1.0;           // alpha inicial
    this.buffer[idx + 4] = this.frameCounter++; // timestamp

    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  /**
   * Añade punto con opacidad personalizada (útil para testing).
   */
  pushWithAlpha(x: number, y: number, z: number, alpha: number): void {
    const idx = this.head * this.stride;
    this.buffer[idx] = x;
    this.buffer[idx + 1] = y;
    this.buffer[idx + 2] = z;
    this.buffer[idx + 3] = alpha;
    this.buffer[idx + 4] = this.frameCounter++;

    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  /**
   * Devuelve una vista del buffer con decay de opacidad aplicado.
   * Los últimos `decayWindow` puntos tienen opacidad 1.0 → decayFactor^N.
   * Puntos más antiguos tienen opacidad 0.
   *
   * @returns Float32Array con [x, y, z, alpha] por punto (stride 4), solo puntos válidos
   */
  getBufferWithDecay(
    decayWindow: number = CHAOS_LIMITS.opacityDecayWindow,
    decayFactor: number = CHAOS_LIMITS.opacityDecayFactor
  ): Float32Array {
    const validCount = this.count;
    if (validCount === 0) return new Float32Array(0);

    const outStride = 4; // x, y, z, alpha (sin timestamp)
    const output = new Float32Array(validCount * outStride);

    // Índice del punto más antiguo en el buffer circular
    const oldestIdx = this.isFull() ? this.head : 0;

    for (let i = 0; i < validCount; i++) {
      const srcIdx = (oldestIdx + i) % this.capacity;
      const srcOffset = srcIdx * this.stride;
      const dstOffset = i * outStride;

      // Copiar x, y, z
      output[dstOffset] = this.buffer[srcOffset];
      output[dstOffset + 1] = this.buffer[srcOffset + 1];
      output[dstOffset + 2] = this.buffer[srcOffset + 2];

      // Calcular alpha con decay exponencial sobre los últimos `decayWindow` puntos
      const age = validCount - 1 - i; // 0 = más nuevo, validCount-1 = más antiguo
      if (age < decayWindow) {
        // Decay exponencial: 1.0 * decayFactor^age
        output[dstOffset + 3] = Math.pow(decayFactor, age);
      } else {
        // Fuera de ventana de decay → invisible
        output[dstOffset + 3] = 0;
      }
    }

    return output;
  }

  /**
   * Devuelve el buffer raw (stride 5: x,y,z,alpha,t) para inspección/debug.
   */
  getRawBuffer(): Float32Array {
    const validCount = this.count;
    if (validCount === 0) return new Float32Array(0);

    const output = new Float32Array(validCount * this.stride);
    const oldestIdx = this.isFull() ? this.head : 0;

    for (let i = 0; i < validCount; i++) {
      const srcIdx = (oldestIdx + i) % this.capacity;
      const srcOffset = srcIdx * this.stride;
      const dstOffset = i * this.stride;
      output.set(this.buffer.subarray(srcOffset, srcOffset + this.stride), dstOffset);
    }

    return output;
  }

  /**
   * Obtiene el último punto añadido (más reciente).
   */
  getLatest(): TrailPoint | null {
    if (this.count === 0) return null;
    const latestIdx = (this.head - 1 + this.capacity) % this.capacity;
    const offset = latestIdx * this.stride;
    return {
      x: this.buffer[offset],
      y: this.buffer[offset + 1],
      z: this.buffer[offset + 2],
      alpha: this.buffer[offset + 3],
      t: this.buffer[offset + 4],
    };
  }

  /**
   * Serializa el buffer a JSON (para debugging/persistencia).
   */
  toJSON(): TrailPoint[] {
    const validCount = this.count;
    const result: TrailPoint[] = [];
    const oldestIdx = this.isFull() ? this.head : 0;

    for (let i = 0; i < validCount; i++) {
      const srcIdx = (oldestIdx + i) % this.capacity;
      const offset = srcIdx * this.stride;
      result.push({
        x: this.buffer[offset],
        y: this.buffer[offset + 1],
        z: this.buffer[offset + 2],
        alpha: this.buffer[offset + 3],
        t: this.buffer[offset + 4],
      });
    }

    return result;
  }

  /**
   * Calcula estadísticas del buffer.
   */
  getStats(): { count: number; capacity: number; utilization: number; oldestFrame: number; newestFrame: number } {
    if (this.count === 0) {
      return { count: 0, capacity: this.capacity, utilization: 0, oldestFrame: 0, newestFrame: 0 };
    }
    const oldestIdx = this.isFull() ? this.head : 0;
    const oldestOffset = oldestIdx * this.stride + 4;
    const newestIdx = (this.head - 1 + this.capacity) % this.capacity;
    const newestOffset = newestIdx * this.stride + 4;

    return {
      count: this.count,
      capacity: this.capacity,
      utilization: this.count / this.capacity,
      oldestFrame: this.buffer[oldestOffset],
      newestFrame: this.buffer[newestOffset],
    };
  }
}

/**
 * Par de buffers para trayectoria primaria y secundaria.
 */
export class DualTrailBuffer {
  primary: TrailBuffer;
  secondary: TrailBuffer;

  constructor(maxPoints: number = CHAOS_LIMITS.maxTrailPoints) {
    this.primary = new TrailBuffer(maxPoints);
    this.secondary = new TrailBuffer(maxPoints);
  }

  clear(): void {
    this.primary.clear();
    this.secondary.clear();
  }

  pushPrimary(x: number, y: number, z: number): void {
    this.primary.push(x, y, z);
  }

  pushSecondary(x: number, y: number, z: number): void {
    this.secondary.push(x, y, z);
  }

  getPrimaryWithDecay(decayWindow?: number, decayFactor?: number): Float32Array {
    return this.primary.getBufferWithDecay(decayWindow, decayFactor);
  }

  getSecondaryWithDecay(decayWindow?: number, decayFactor?: number): Float32Array {
    return this.secondary.getBufferWithDecay(decayWindow, decayFactor);
  }

  getPrimaryCount(): number {
    return this.primary.getCount();
  }

  getSecondaryCount(): number {
    return this.secondary.getCount();
  }

  getLatestPrimary(): TrailPoint | null {
    return this.primary.getLatest();
  }

  getLatestSecondary(): TrailPoint | null {
    return this.secondary.getLatest();
  }
}

/**
 * Factory para crear DualTrailBuffer desde config RK4.
 */
export function createDualTrailBuffer(config: RK4Config): DualTrailBuffer {
  return new DualTrailBuffer(config.maxTrailPoints);
}