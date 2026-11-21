/**
 * Everything that has to be saved.
 *
 * The galaxy itself is never saved: it is regenerated from the seed. A save
 * holds the ship, the two clocks, and what the navigator has seen and done.
 */
import { K, Stream } from './rng.ts';
import { REFITS, type RefitTrack } from './config.ts';
import type { Galaxy, SysRef } from './galaxy.ts';
import { generateSystem } from './system.ts';
import { FANCIES, type MindState } from './mind.ts';
import { MIND_NAMES } from './words.ts';

export type Op = 'scoop' | 'ice' | 'mine' | 'survey' | 'scan' | 'repair' | 'refit';

/** What one crew is doing. */
export interface Assignment {
  op: Op;
  /** Body number, where the job has one. */
  body: number;
  /** Days worked so far, and days needed for jobs with a fixed length. */
  days: number;
  need?: number;
  /** For a deep scan: which feature. For a refit: which track. */
  feature?: string;
  track?: RefitTrack;
}

/** What we remember about a system we have been to. */
export interface Memory {
  /** The navigator's own name for it, if any. */
  name?: string;
  /** Galaxy-clock year of the first and latest visit. */
  first: number;
  last: number;
  visits: number;
  swept: boolean;
  /** Crew-days of survey so far, and how many discoveries that has produced. */
  effort: number;
  found: number;
  /** Deep finds already resolved (feature ids). */
  scanned: string[];
}

export interface State {
  v: 1;
  seed: number;
  ship: {
    /** Fuel in years of full-thrust burning. */
    fuel: number;
    /** Shield and hull in percent. */
    shield: number;
    hull: number;
    materials: number;
    archive: number;
    levels: Record<RefitTrack, number>;
    relics: string[];
  };
  /** Years since the navigator was woken: aboard, and outside. */
  tShip: number;
  tGal: number;
  /** Id of the system we are in orbit at. */
  at: string;
  crews: (Assignment | null)[];
  /** Things that reset on each arrival. */
  visit: {
    arrived: number;
    provisioned: boolean;
    slow: boolean;
    long: boolean;
    hinted: boolean;
    idle: boolean;
    /** The star has already been described this visit. */
    starShown: boolean;
    lastAdvice: string;
    /** Courses plotted this visit; the Mind only comments on the first unremarkable one. */
    plots?: number;
  };
  mem: Record<string, Memory>;
  /** How many times each kind of feature has been logged; also star kinds, as "star:M". */
  seen: Record<string, number>;
  journal: { g: number; text: string }[];
  mind: MindState;
  /** Ids from the last chart, so "plot 3" means something. */
  chart: string[];
  plot?: string;
  stats: { jumps: number; ly: number; systems: number; finds: number };
  /** Name of the system where the navigator woke. */
  home: string;
  /** Step of the first-visit walkthrough. Absent once it is over, and in saves from before it existed. */
  guide?: number;
}

export function level(state: State, track: RefitTrack): number {
  return REFITS[track].levels[state.ship.levels[track]];
}

/**
 * Where the game begins: an old, gas-poor cluster about one scale length
 * out, at a small star with a giant to scoop and ice to cut.
 */
export function findStart(galaxy: Galaxy): SysRef {
  const { cfg } = galaxy;
  const rng = new Stream(cfg.seed, K.START);
  const turn = rng.next() * 2 * Math.PI;
  let fallback: SysRef | null = null;
  for (let k = 0; k < 600; k++) {
    const angle = turn + k * 2.39996; // golden angle: spreads the tries around the disc
    const r = cfg.scaleLength * (0.9 + 0.6 * ((k * 0.618) % 1));
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    for (const { cluster, ccx, ccy, i } of galaxy.clustersIn(x, y, x, y)) {
      if (!cluster.old || cluster.members < 60 || cluster.members > 220) continue;
      if (galaxy.gas(cluster.x, cluster.y) > 0.5) continue;
      const members = [...galaxy.clusterMembers(ccx, ccy, i, 0), ...galaxy.clusterMembers(ccx, ccy, i, 1)];
      members.sort((a, b) => Math.hypot(a.x - cluster.x, a.y - cluster.y) - Math.hypot(b.x - cluster.x, b.y - cluster.y));
      for (const ref of members) {
        const sys = generateSystem(galaxy, ref);
        fallback ??= ref;
        const ice = sys.bodies.some((b) => b.ice > 0);
        const ore = sys.bodies.some((b) => b.ore > 0);
        if (sys.giants > 0 && ice && ore && (sys.star === 'K' || sys.star === 'G' || sys.star === 'M')) return ref;
      }
    }
  }
  if (!fallback) throw new Error('no starting system found; is the galaxy empty?');
  return fallback;
}

export function freshState(galaxy: Galaxy, seed: number): State {
  const start = findStart(galaxy);
  const sys = generateSystem(galaxy, start);
  const rng = new Stream(seed, K.MIND, 0xabc);
  const mind: MindState = {
    name: rng.int(MIND_NAMES.length),
    fancy: rng.pick(FANCIES),
    used: {},
    n: 0,
    said: [],
    early: 0,
    thorough: 0,
    overruled: 0,
  };
  const levels = { engine: 0, hull: 0, tanks: 0, optics: 0, crews: 0, hold: 0 };
  return {
    v: 1,
    seed,
    ship: { fuel: 0.7 * REFITS.tanks.levels[0], shield: 78, hull: 93, materials: 40, archive: 0, levels, relics: [] },
    tShip: 0,
    tGal: 0,
    at: start.id,
    crews: [null, null],
    visit: { arrived: 0, provisioned: false, slow: false, long: false, hinted: false, idle: false, starShown: false, lastAdvice: '' },
    mem: { [start.id]: { first: 0, last: 0, visits: 1, swept: false, effort: 0, found: 0, scanned: [] } },
    seen: {},
    journal: [{ g: 0, text: `Woken at ${sys.name}.` }],
    mind,
    chart: [],
    stats: { jumps: 0, ly: 0, systems: 1, finds: 0 },
    home: sys.name,
    guide: 0,
  };
}
