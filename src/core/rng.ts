/**
 * Integer hashing.
 *
 * Every fact about the galaxy is a pure function of the world seed and a few
 * integers (which cell, which star, which purpose). Nothing is stored and
 * nothing is stepped forward: ask the same question twice, get the same answer.
 *
 * Each purpose gets its own key (see K below) so that adding a new random
 * draw somewhere never re-rolls an unrelated one.
 */

/** Substream keys: one per purpose. Append only; never renumber. */
export const K = {
  COUNT: 1,
  PLACE: 2,
  STAR: 3,
  BODIES: 4,
  NAME: 5,
  CLUSTER: 6,
  GAS: 7,
  FEATURE: 8,
  SURVEY: 9,
  MIND: 10,
  SECTOR: 11,
  NOISE: 12,
  START: 13,
} as const;

function fmix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash any number of integers into one unsigned 32-bit integer. */
export function mix(...keys: number[]): number {
  let h = 0x9e3779b9;
  for (const k of keys) h = fmix(h ^ Math.imul((k | 0) + 0x7f4a7c15, 0x9e3779b1));
  return h >>> 0;
}

/** Hash a string (FNV-1a), for turning an id into a hash key. */
export function strHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small deterministic random stream (mulberry32), seeded by hashed keys. */
export class Stream {
  private s: number;

  constructor(...keys: number[]) {
    this.s = mix(...keys);
  }

  /** Uniform in [0, 1). */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[this.int(list.length)];
  }

  /** Pick a key from a table of relative weights. */
  weighted<T extends string>(table: Partial<Record<T, number>>): T {
    const entries = Object.entries(table) as [T, number][];
    let total = 0;
    for (const [, w] of entries) total += w;
    let x = this.next() * total;
    for (const [key, w] of entries) {
      x -= w;
      if (x < 0) return key;
    }
    return entries[entries.length - 1][0];
  }

  /** Standard normal (Box-Muller). */
  normal(): number {
    const u = Math.max(this.next(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.next());
  }

  /** Poisson-distributed count with the given mean. */
  poisson(mean: number): number {
    if (mean <= 0) return 0;
    if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * this.normal()));
    const limit = Math.exp(-mean);
    let n = 0;
    let p = this.next();
    while (p > limit) {
      n++;
      p *= this.next();
    }
    return n;
  }
}
