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
import { Cultures, type Phase } from './civs.ts';
import type { Relic } from './cultures.ts';

export type Op = 'scoop' | 'ice' | 'mine' | 'survey' | 'scan' | 'repair' | 'refit';

/** What one crew is doing. */
export interface Assignment {
  op: Op;
  /** Body number, where the job has one. */
  body: number;
  /** Days worked so far, and days needed for jobs with a fixed length. */
  days: number;
  need?: number;
  /** For a deep scan: which feature, or whose ruin (a culture's id). For a refit: which track. */
  feature?: string;
  site?: string;
  track?: RefitTrack;
}

/** One line of what we saw of a culture at a system, so a return can tell what has changed. */
export interface SiteNote {
  /** The culture's id. */
  id: string;
  phase: Phase;
}

/** A culture we know of. */
export interface Met {
  /** "the Ilmar Concord" */
  title: string;
  /** Their home system. The same people may turn up later under another name. */
  home: string;
  /** Year outside when we first knew of them, and whether we met them living or read them from ruins. */
  t: number;
  how: 'met' | 'ruins';
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
  /** Ruins already read (culture ids). */
  sites: string[];
  /** Who was here, and in what state, when we last looked. */
  seen: SiteNote[];
}

export function freshMemory(year: number): Memory {
  return { first: year, last: year, visits: 1, swept: false, effort: 0, found: 0, scanned: [], sites: [], seen: [] };
}

/** Raised whenever an old save can no longer be read. Older voyages start afresh. */
export const SAVE_VERSION = 2;

export interface State {
  v: typeof SAVE_VERSION;
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
    /** Things carried in the hold that are worth more than their weight. */
    relics: Relic[];
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
    /** A ruin has already been remarked on this visit. */
    ruins?: boolean;
  };
  mem: Record<string, Memory>;
  /** Cultures we know of, by id. */
  met: Record<string, Met>;
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
 * out, at a small star with a giant to scoop and ice to cut. The system
 * itself is empty, so the first visit is a quiet one, but somebody is living
 * within reach of the first few hops.
 */
export function findStart(galaxy: Galaxy, cultures: Cultures = new Cultures(galaxy)): SysRef {
  const { cfg } = galaxy;
  const rng = new Stream(cfg.seed, K.START);
  const turn = rng.next() * 2 * Math.PI;
  let fallback: SysRef | null = null;
  let lonely: SysRef | null = null;
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
        const sys = cultures.system(ref);
        fallback ??= ref;
        const ice = sys.bodies.some((b) => b.ice > 0);
        const ore = sys.bodies.some((b) => b.ore > 0);
        if (!(sys.giants > 0 && ice && ore && (sys.star === 'K' || sys.star === 'G' || sys.star === 'M'))) continue;
        const here = cultures.presence(sys, 0);
        if (here.sites.length || here.claims.length) continue;
        lonely ??= ref;
        // Somebody alive within the first chart's range, and somebody's ruins too.
        const near = galaxy.within(ref.x, ref.y, cfg.strata[0].sight).filter((s) => s.dist > 0);
        const sites = near.flatMap((s) => cultures.presence(cultures.system(s.ref), 0).sites);
        if (sites.some((s) => s.alive) && sites.some((s) => !s.alive)) return ref;
      }
    }
    // A good enough start in the first few clusters beats a perfect one found far round the disc.
    if (lonely && k > 40) return lonely;
  }
  const found = lonely ?? fallback;
  if (!found) throw new Error('no starting system found; is the galaxy empty?');
  return found;
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
    v: SAVE_VERSION,
    seed,
    ship: { fuel: 0.7 * REFITS.tanks.levels[0], shield: 78, hull: 93, materials: 40, archive: 0, levels, relics: [] },
    tShip: 0,
    tGal: 0,
    at: start.id,
    crews: [null, null],
    visit: { arrived: 0, provisioned: false, slow: false, long: false, hinted: false, idle: false, starShown: false, lastAdvice: '' },
    mem: { [start.id]: freshMemory(0) },
    met: {},
    seen: {},
    journal: [{ g: 0, text: `Woken at ${sys.name}.` }],
    mind,
    chart: [],
    stats: { jumps: 0, ly: 0, systems: 1, finds: 0 },
    home: sys.name,
    guide: 0,
  };
}
