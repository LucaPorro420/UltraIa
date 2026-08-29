/**
 * request-queue.ts — Cola de prioridad para requests de IA.
 *
 * CRITICAL (chat humano) > HIGH (agentes) > NORMAL (batch) > LOW (background).
 * Deduplicación de requests idénticos para evitar trabajo redundante.
 */

export type Priority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

const PRIORITY_WEIGHT: Record<Priority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

interface QueuedRequest<T = unknown> {
  id: string;
  dedupKey: string;
  priority: Priority;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

export interface QueueStats {
  queueLength: number;
  running: number;
  maxConcurrent: number;
  deduplicated: number;
}

export class RequestQueue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueuedRequest<any>[] = [];
  private running = 0;
  private maxConcurrent: number;
  private dedupCount = 0;
  private inFlight = new Map<string, Promise<unknown>>();

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Encola un request con prioridad.
   * Si ya hay un request con el mismo dedupKey en vuelo, retorna su resultado.
   */
  async enqueue<T>(fn: () => Promise<T>, priority: Priority = 'NORMAL', dedupKey = ''): Promise<T> {
    const key = dedupKey || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Deduplicación: si ya hay un request idéntico en vuelo, esperar su resultado
    if (dedupKey && this.inFlight.has(dedupKey)) {
      this.dedupCount++;
      return this.inFlight.get(dedupKey) as Promise<T>;
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: key,
        dedupKey,
        priority,
        fn,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.queue.push(request);

      if (dedupKey) {
        const promise = this.processQueueItem(request);
        this.inFlight.set(dedupKey, promise);
        promise.finally(() => this.inFlight.delete(dedupKey));
      } else {
        this.processQueueItem(request);
      }
    });
  }

  private async processQueueItem<T>(request: QueuedRequest<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await new Promise(r => setTimeout(r, 50));
    }

    this.queue = this.queue.filter(r => r.id !== request.id);
    this.running++;

    try {
      const result = await request.fn();
      request.resolve(result);
      return result;
    } catch (error) {
      request.reject(error);
      throw error;
    } finally {
      this.running--;
      this.processNext();
    }
  }

  private processNext() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    this.queue.sort((a, b) => {
      const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      return pw !== 0 ? pw : a.timestamp - b.timestamp;
    });

    const next = this.queue[0];
    if (next) this.processQueueItem(next) as Promise<void>;
  }

  get stats(): QueueStats {
    return {
      queueLength: this.queue.length,
      running: this.running,
      maxConcurrent: this.maxConcurrent,
      deduplicated: this.dedupCount,
    };
  }

  clear() {
    this.queue = [];
  }
}

export const requestQueue = new RequestQueue();
