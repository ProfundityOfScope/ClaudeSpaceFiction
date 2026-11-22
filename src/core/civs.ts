/**
 * Who lives where, and when.
 *
 * Like the galaxy, nothing here is stored and nothing is stepped forward.
 * Whether somebody is home at a system in a given year is a pure function of
 * (seed, system, year). Two kinds of culture are seeded:
 *
 *   worlds    a culture of one system, rolled per system and per era
 *   reaches   the few that spread, rolled per coarse cell and per era; each
 *             has a home system and a frontier that grows, holds and falls back
 *
 * Every system and every coarse cell counts its eras from its own offset, so
 * the galaxy as a whole has no calendar: somewhere, somebody is always rising.
 *
 * A culture is born, lasts its span and ends. What it built stays for a while
 * as ruins and then is gone as well. Nothing here lasts forever.
 */
import { CIV } from './config.ts';
import { K, Stream, mix, strHash } from './rng.ts';
import type { Galaxy, Seen, SysRef } from './galaxy.ts';
import { generateSystem, type BodyKind, type StarKind, type StarSystem } from './system.ts';
import { cultureName, polityWord, speciesSketch, temperOf, type Genes, type Temper } from './cultures.ts';

export type Phase = 'founding' | 'rising' | 'height' | 'decline' | 'ruins' | 'old ruins';

export const isLiving = (phase: Phase) => phase !== 'ruins' && phase !== 'old ruins';

export interface Culture {
  /** Enough to find it again: "W3:F0.12.-4.1" or "R3:2.-5.0". */
  id: string;
  /** The people: "Ilmar". */
  name: string;
  /** How a sentence refers to them: "the Ilmar", "the Ilmar Concord". */
  title: string;
  genes: Genes;
  temper: Temper;
  /** A few sentences on what they are. The same people can found more than one culture. */
  sketch: string;
  home: SysRef;
  homeBody: number;
  /** Year it begins, and how long it lasts. */
  born: number;
  life: number;
  /** How long its home ruins last after that. */
  ruin: number;
  /** Only for cultures that spread: the furthest they would ever hold, and how fast the frontier moves. */
  reach?: { radius: number; speed: number };
}

/** Something a culture has, or had, on one body of a system. */
export interface Site {
  culture: Culture;
  body: number;
  kind: 'home' | 'outpost';
  phase: Phase;
  alive: boolean;
  /** Year it was founded if alive, or abandoned if not. */
  since: number;
}

export interface Presence {
  /** Living sites first, then ruins, most recent first. */
  sites: Site[];
  /** Living cultures whose space this system lies inside. */
  claims: Culture[];
}

/** How likely each kind of world, and each kind of star, is to raise a people. */
const CRADLE_BODY: Partial<Record<BodyKind, number>> = { ocean: 1, rocky: 0.5, desert: 0.4, ice: 0.3 };
const CRADLE_STAR: Partial<Record<StarKind, number>> = { G: 1, K: 1, F: 0.8, M: 0.6, SG: 0.4, A: 0.15, BD: 0.1 };
const GAS_MOONS = 4;

/** Where an outpost would be put, by relative preference. */
const OUTPOST_BODY: Record<BodyKind, number> = {
  star: 0, belt: 3, dwarf: 3, gas: 2, icegiant: 2, ice: 2, rocky: 2, desert: 2, ocean: 2, scorched: 1, comets: 1,
};

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const unit = (...keys: number[]) => mix(...keys) / 4294967296;

/** The body a people could have arisen on, and how suitable it is (0 to 1). */
export function cradle(sys: StarSystem): { body: number; suit: number } | null {
  const star = CRADLE_STAR[sys.star] ?? 0;
  if (!star) return null;
  let body = -1;
  let best = 0;
  for (const b of sys.bodies) {
    const w = b.kind === 'gas' ? (b.moons >= GAS_MOONS ? 0.2 : 0) : (CRADLE_BODY[b.kind] ?? 0);
    if (w > best) {
      best = w;
      body = b.n;
    }
  }
  return body < 0 ? null : { body, suit: best * star };
}

/** How long something lasts as a ruin, given how long it stood. */
function ruinSpan(stood: number): number {
  return clamp(CIV.RUIN * stood, CIV.RUIN_MIN, CIV.RUIN_MAX);
}

/** A culture's phase at home in a given year; null before it begins and once its ruins are gone. */
export function phaseOf(c: Culture, year: number): Phase | null {
  const age = year - c.born;
  if (age < 0) return null;
  const f = age / c.life;
  if (f < 0.1) return 'founding';
  if (f < 0.4) return 'rising';
  if (f < 0.75) return 'height';
  if (f < 1) return 'decline';
  const gone = (age - c.life) / c.ruin;
  return gone < 0.4 ? 'ruins' : gone < 1 ? 'old ruins' : null;
}

/** The radius a spreading culture holds in a given year: out from home, steady, then falling back. */
export function frontier(c: Culture, year: number): number {
  if (!c.reach) return 0;
  const start = c.born + 0.15 * c.life;
  const turn = c.born + 0.75 * c.life;
  const end = c.born + c.life;
  if (year < start || year >= end) return 0;
  const peak = Math.min(c.reach.radius, c.reach.speed * (turn - start));
  if (year < turn) return Math.min(peak, c.reach.speed * (year - start));
  return peak * (1 - (0.75 * (year - turn)) / (end - turn));
}

/** The years between which a spreading culture holds a place `d` ly from its home, if it ever does. */
function tenure(c: Culture, d: number): [number, number] | null {
  if (!c.reach) return null;
  const start = c.born + 0.15 * c.life;
  const turn = c.born + 0.75 * c.life;
  const end = c.born + c.life;
  const peak = Math.min(c.reach.radius, c.reach.speed * (turn - start));
  if (d > peak) return null;
  const share = d / peak;
  return [start + d / c.reach.speed, share <= 0.25 ? end : turn + ((1 - share) / 0.75) * (end - turn)];
}

/** How far away a living site can be heard, ly. */
export function loudness(site: Site): number {
  if (!site.alive) return 0;
  const { culture } = site;
  const base =
    site.kind === 'home'
      ? CIV.LOUD[site.phase as keyof typeof CIV.LOUD] * (culture.reach ? CIV.LOUD_REACH : 1)
      : CIV.LOUD_OUTPOST;
  return base * (culture.genes.open < 0.3 ? CIV.LOUD_CLOSED : 1);
}

const CACHE_LIMIT = 20000;

export class Cultures {
  readonly galaxy: Galaxy;
  private readonly seed: number;
  private readonly lookup: (ref: SysRef) => StarSystem;
  private reachCache = new Map<string, Culture[]>();
  private worldCache = new Map<string, Culture | null>();

  /** `lookup` lets a caller share its own cache of generated systems. */
  constructor(galaxy: Galaxy, lookup?: (ref: SysRef) => StarSystem) {
    this.galaxy = galaxy;
    this.seed = galaxy.cfg.seed;
    const own = new Map<string, StarSystem>();
    this.lookup =
      lookup ??
      ((ref) => {
        let sys = own.get(ref.id);
        if (!sys) {
          if (own.size > CACHE_LIMIT) own.clear();
          own.set(ref.id, (sys = generateSystem(galaxy, ref)));
        }
        return sys;
      });
  }

  system(ref: SysRef): StarSystem {
    return this.lookup(ref);
  }

  private identity(id: string, home: StarSystem, body: number, born: number, life: number, reach?: Culture['reach']): Culture {
    const rng = new Stream(this.seed, K.CULTURE, strHash(id));
    const name = cultureName(rng);
    const genes: Genes = { open: rng.next(), bold: rng.next(), bound: reach ? rng.range(0.4, 1) : rng.next() };
    const temper = temperOf(genes);
    // The people belong to the world, not to the era: a later culture there is the same kind of creature.
    const sketch = speciesSketch(home.bodies[body].kind, new Stream(this.seed, K.SPECIES, strHash(home.ref.id)));
    const title = reach ? `the ${name} ${polityWord(temper, rng)}` : `the ${name}`;
    return { id, name, title, genes, temper, sketch, home: home.ref, homeBody: body, born, life, ruin: ruinSpan(life), reach };
  }

  // ---- cultures that spread ---------------------------------------------

  /** The spreading cultures that arise in one coarse cell in one era. */
  reachesIn(ccx: number, ccy: number, era: number): Culture[] {
    const key = `${ccx},${ccy},${era}`;
    const hit = this.reachCache.get(key);
    if (hit) return hit;
    const { galaxy, seed } = this;
    const cc = galaxy.cfg.coarse;
    const mx = (ccx + 0.5) * cc;
    const my = (ccy + 0.5) * cc;
    const out: Culture[] = [];
    const begins = era * CIV.ERA + this.cellOffset(ccx, ccy);
    const count = new Stream(seed, K.REACH, ccx, ccy, era).poisson((galaxy.density(mx, my) * cc * cc) / CIV.REACH_PER);
    for (let i = 0; i < count; i++) {
      const rng = new Stream(seed, K.REACH, ccx, ccy, era, i + 1);
      let x = (ccx + rng.next()) * cc;
      let y = (ccy + rng.next()) * cc;
      // Some begin in a cluster, where there are neighbours to spread to.
      const clusters = galaxy.clustersIn(mx, my, mx, my);
      if (clusters.length && rng.chance(0.3)) {
        const { cluster } = rng.pick(clusters);
        x = cluster.x + 0.7 * cluster.sigma * rng.normal();
        y = cluster.y + 0.7 * cluster.sigma * rng.normal();
      }
      const life = clamp(CIV.REACH_LIFE * Math.exp(CIV.REACH_LIFE_SPREAD * rng.normal()), CIV.REACH_LIFE_MIN, CIV.REACH_LIFE_MAX);
      const born = begins + rng.next() * (CIV.ERA - life);
      const radius = Math.min(CIV.REACH_CAP, CIV.REACH_RADIUS * Math.exp(CIV.REACH_SPREAD * rng.normal()));
      const speed = rng.range(CIV.REACH_SPEED[0], CIV.REACH_SPEED[1]);
      // Home is the nearest world that could have raised somebody, and that nobody else is using at the time.
      for (const { ref } of galaxy.within(x, y, 15)) {
        if (ref.stratum > 1 || out.some((c) => c.home.id === ref.id)) continue;
        const sys = this.system(ref);
        const host = cradle(sys);
        if (!host || this.worldsDuring(sys, born, born + life).length) continue;
        out.push(this.identity(`R${era}:${ccx}.${ccy}.${i}`, sys, host.body, born, life, { radius, speed }));
        break;
      }
    }
    if (this.reachCache.size > CACHE_LIMIT) this.reachCache.clear();
    this.reachCache.set(key, out);
    return out;
  }

  /**
   * Spreading cultures that could matter at a point in a given year: those of
   * its coarse cell and the eight around it, from each cell's current era and
   * the one before (ruins never outlast the era after their makers').
   */
  private reachesNear(x: number, y: number, year: number): Culture[] {
    const cc = this.galaxy.cfg.coarse;
    const cx = Math.floor(x / cc);
    const cy = Math.floor(y / cc);
    const out: Culture[] = [];
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cy - 1; j <= cy + 1; j++) {
        const era = Math.floor((year - this.cellOffset(i, j)) / CIV.ERA);
        for (const c of this.reachesIn(i, j, era)) out.push(c);
        for (const c of this.reachesIn(i, j, era - 1)) out.push(c);
      }
    }
    return out;
  }

  /** Where in its own era-count a coarse cell, or a system, stands at year 0. */
  private cellOffset(ccx: number, ccy: number): number {
    return unit(this.seed, K.REACH, ccx, ccy) * CIV.ERA;
  }

  private systemOffset(sys: StarSystem): number {
    return unit(this.seed, K.WORLD, strHash(sys.ref.id)) * CIV.ERA;
  }

  // ---- cultures of one world --------------------------------------------

  /** The culture a system raises in one of its eras, if it raises one. */
  worldIn(sys: StarSystem, era: number): Culture | null {
    const key = `${sys.ref.id}@${era}`;
    const hit = this.worldCache.get(key);
    if (hit !== undefined) return hit;
    let out: Culture | null = null;
    const host = cradle(sys);
    if (host) {
      const rng = new Stream(this.seed, K.WORLD, strHash(sys.ref.id), era);
      const setting = sys.ref.cluster ? (sys.ref.cluster.old ? CIV.OLD_CLUSTER : CIV.YOUNG_CLUSTER) : 1;
      if (rng.chance(Math.min(0.95, CIV.WORLD_RATE * host.suit * setting))) {
        const life = clamp(CIV.LIFE * Math.exp(CIV.LIFE_SPREAD * rng.normal()), CIV.LIFE_MIN, CIV.LIFE_MAX);
        const born = era * CIV.ERA + this.systemOffset(sys) + rng.next() * (CIV.ERA - life);
        out = this.identity(`W${era}:${sys.ref.id}`, sys, host.body, born, life);
      }
    }
    if (this.worldCache.size > CACHE_LIMIT) this.worldCache.clear();
    this.worldCache.set(key, out);
    return out;
  }

  /** The system's own cultures of the era a year falls in, and of the era before. */
  private worldsAt(sys: StarSystem, year: number): Culture[] {
    const era = Math.floor((year - this.systemOffset(sys)) / CIV.ERA);
    const out: Culture[] = [];
    for (const e of [era, era - 1]) {
      const c = this.worldIn(sys, e);
      if (c) out.push(c);
    }
    return out;
  }

  /** The system's own cultures alive at any time between two years. */
  private worldsDuring(sys: StarSystem, from: number, to: number): Culture[] {
    const seen = new Set<Culture>();
    for (const year of [from, to]) {
      for (const c of this.worldsAt(sys, year)) if (c.born < to && c.born + c.life > from) seen.add(c);
    }
    return [...seen];
  }

  // ---- questions ----------------------------------------------------------

  /** The body a spreading culture would put an outpost on here, or -1 if it holds nothing here. */
  private outpostBody(c: Culture, sys: StarSystem): number {
    const h = strHash(sys.ref.id);
    const k = strHash(c.id);
    if (unit(this.seed, K.HOLD, k, h) >= CIV.HOLD) return -1;
    let total = 0;
    for (const b of sys.bodies) total += OUTPOST_BODY[b.kind];
    if (!total) return -1;
    let x = unit(this.seed, K.HOLD, k, h, 1) * total;
    for (const b of sys.bodies) {
      x -= OUTPOST_BODY[b.kind];
      if (x < 0) return b.n;
    }
    return -1;
  }

  /** Who is at a system in a given year: the living, what the dead left, and whose space it is. */
  presence(sys: StarSystem, year: number): Presence {
    const { x, y, id } = sys.ref;
    const sites: Site[] = [];
    const claims: Culture[] = [];
    const home = (c: Culture) => {
      const phase = phaseOf(c, year);
      if (!phase) return;
      const alive = isLiving(phase);
      sites.push({ culture: c, body: c.homeBody, kind: 'home', phase, alive, since: alive ? c.born : c.born + c.life });
    };
    for (const world of this.worldsAt(sys, year)) home(world);
    for (const c of this.reachesNear(x, y, year)) {
      if (c.home.id === id) {
        home(c);
        continue;
      }
      const d = Math.hypot(c.home.x - x, c.home.y - y);
      if (d > c.reach!.radius) continue;
      if (d <= frontier(c, year)) claims.push(c);
      const held = tenure(c, d);
      if (!held || year < held[0]) continue;
      const body = this.outpostBody(c, sys);
      if (body < 0) continue;
      if (year < held[1]) {
        sites.push({ culture: c, body, kind: 'outpost', phase: phaseOf(c, year)!, alive: true, since: held[0] });
        continue;
      }
      const gone = (year - held[1]) / (CIV.RUIN_OUTPOST * ruinSpan(held[1] - held[0]));
      if (gone < 1) sites.push({ culture: c, body, kind: 'outpost', phase: gone < 0.4 ? 'ruins' : 'old ruins', alive: false, since: held[1] });
    }
    sites.sort((a, b) => Number(b.alive) - Number(a.alive) || (a.alive ? Number(b.kind === 'home') - Number(a.kind === 'home') : b.since - a.since));
    return { sites, claims };
  }

  /**
   * What the light shows from `dist` ly away: the loudest living site whose
   * radio carries that far. The light is `dist` years old, so this is who was
   * there when it left.
   */
  heard(sys: StarSystem, year: number, dist: number): Site | null {
    let best: Site | null = null;
    let reach = 0;
    for (const site of this.presence(sys, year - dist).sites) {
      const loud = loudness(site);
      if (loud >= dist && loud > reach) {
        best = site;
        reach = loud;
      }
    }
    return best;
  }

  /** Every signal that can be heard from a point, nearest first. */
  signals(x: number, y: number, year: number, range: number): { seen: Seen; site: Site }[] {
    const out: { seen: Seen; site: Site }[] = [];
    for (const seen of this.galaxy.within(x, y, range)) {
      if (seen.dist === 0) continue;
      const site = this.heard(this.system(seen.ref), year, seen.dist);
      if (site) out.push({ seen, site });
    }
    return out;
  }

  /** Find a culture again from its id. */
  byId(id: string): Culture | null {
    const m = /^([WR])(-?\d+):(.+)$/.exec(id);
    if (!m) return null;
    const era = Number(m[2]);
    if (m[1] === 'W') {
      const ref = this.galaxy.ref(m[3]);
      return ref ? this.worldIn(this.system(ref), era) : null;
    }
    const [ccx, ccy] = m[3].split('.').map(Number);
    if (!Number.isInteger(ccx) || !Number.isInteger(ccy)) return null;
    return this.reachesIn(ccx, ccy, era).find((c) => c.id === id) ?? null;
  }
}

/** The furthest any signal carries, ly: no need to listen beyond it. */
export const HEARING = CIV.LOUD.height * CIV.LOUD_REACH;
