/**
 * Deterministic PRNG (Mulberry32) — reproducible across platforms.
 * No Math.random() used anywhere in media-synthesis.
 */
export class PRNG {
  private state: number;
  constructor(seed: number = Date.now()) {
    this.state = seed >>> 0;
  }

  /** Returns uint32 in [0, 2^32-1] */
  next(): number {
    this.state += 0x6D2B79F5;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0);
  }

  /** Returns float in [0, 1) */
  nextFloat(): number {
    return this.next() / 0x100000000;
  }

  /** Returns float in [min, max) */
  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min);
  }

  /** Returns int in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  /** Returns boolean with probability p */
  nextBool(p: number = 0.5): boolean {
    return this.nextFloat() < p;
  }

  /** Chooses random element from array */
  choose<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /** Shuffles array in place (Fisher-Yates) */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Creates independent child PRNG */
  fork(): PRNG {
    return new PRNG(this.next());
  }

  /** Gets current state for serialization */
  getState(): number {
    return this.state;
  }

  /** Sets state directly */
  setState(state: number): void {
    this.state = state >>> 0;
  }
}

/** Global default PRNG (seeded from crypto if available, else Date.now) */
export const globalPRNG = ((): PRNG => {
  try {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return new PRNG(arr[0]);
  } catch {
    return new PRNG(Date.now());
  }
})();

/** Hash function for deterministic seeding from strings */
export function hashString(str: string, seed: number = 0): number {
  let h = seed ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5BD1E995);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 0x5BD1E995);
  return (h >>> 0);
}

/** Creates PRNG from string seed */
export function prngFromString(str: string, baseSeed: number = 0): PRNG {
  return new PRNG(hashString(str, baseSeed));
}