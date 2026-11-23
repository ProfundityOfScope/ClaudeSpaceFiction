/**
 * What is at a system: the star, its bodies, and what a survey would find.
 *
 * `generateSystem` is a pure function of the galaxy seed and the system's id.
 * Visiting a system twice, or after reloading a save, gives the same place.
 */
import { K, Stream, strHash } from './rng.ts';
import { ISRU, type Material } from './config.ts';
import type { Galaxy, SysRef } from './galaxy.ts';
import { FEATURES, type FeatureDef } from './features.ts';
import { brightName, catalogueCode } from './words.ts';

export type StarKind =
  | 'M' | 'K' | 'BD' // tier 0: dim and everywhere
  | 'G' | 'F' | 'WD' // tier 1
  | 'A' | 'B' | 'RG' | 'SG' // tier 2: bright
  | 'O' | 'RSG' | 'PSR' | 'BH' | 'WR' | 'MAG'; // tier 3: seen across the disc

export type BodyKind =
  | 'star' | 'scorched' | 'rocky' | 'desert' | 'ocean' | 'ice' | 'gas' | 'icegiant' | 'belt' | 'dwarf' | 'comets';

interface StarInfo {
  name: string;
  /** Short label for chart columns. */
  code: string;
  /** Luminosity in suns; sets where the warm zone and the snow line fall. */
  lum: number;
  /** Typical number of bodies. */
  bodies: number;
  /** Has a wind worth skimming for fuel. */
  wind: boolean;
  /** What is left after a star has died. */
  remnant: boolean;
  /** Said the first time we meet one. */
  text: string;
  /** Shorter lines for later meetings. */
  again: string[];
}

export const STARS: Record<StarKind, StarInfo> = {
  M: { name: 'red dwarf', code: 'M', lum: 0.02, bodies: 3.2, wind: true, remnant: false,
    text: 'A red dwarf, small and frugal. It will still be burning when the rest of the galaxy has gone dark.',
    again: ['Another red dwarf. The galaxy is mostly these.', 'A red dwarf, flaring a little.', 'Small, red and patient.', 'A red dwarf. Three stars in four are.', 'A dim red star, older than most of what we will ever see.', 'A red dwarf, cool enough to look at directly.'] },
  K: { name: 'orange dwarf', code: 'K', lum: 0.3, bodies: 4.0, wind: true, remnant: false,
    text: 'An orange dwarf: steady, unremarkable, good for another twenty billion years.',
    again: ['An orange dwarf, quiet and warm.', 'Another steady orange star.', 'An orange dwarf. Nothing wrong with it at all.', 'A K dwarf, in no hurry.'] },
  BD: { name: 'brown dwarf', code: 'BD', lum: 0.0005, bodies: 1.4, wind: false, remnant: false,
    text: 'A brown dwarf. It never lit. It has been cooling since the day it formed.',
    again: ['Another brown dwarf, glowing faintly in the infrared.', 'A failed star, the colour of a cooling stove.'] },
  G: { name: 'yellow dwarf', code: 'G', lum: 1, bodies: 4.6, wind: true, remnant: false,
    text: 'A yellow dwarf in its long middle age.',
    again: ['A yellow dwarf. The Commons always say these look like home.', 'A yellow star, halfway through its life.', 'Another yellow dwarf, bright and ordinary.'] },
  F: { name: 'yellow-white star', code: 'F', lum: 3, bodies: 4.2, wind: true, remnant: false,
    text: 'A yellow-white star, a little hotter and shorter-lived than the comfortable kind.',
    again: ['A yellow-white star, burning a little fast.', 'An F star, hot and clean.'] },
  WD: { name: 'white dwarf', code: 'WD', lum: 0.01, bodies: 1.6, wind: false, remnant: true,
    text: 'A white dwarf: the banked coal of a star that finished long ago.',
    again: ['A white dwarf, small as a planet and cooling.', "Another white dwarf. A star's ember."] },
  A: { name: 'white star', code: 'A', lum: 20, bodies: 3.0, wind: true, remnant: false,
    text: 'A white A star, young and spinning fast enough to bulge.',
    again: ['A white star, hot and young.', 'An A star, bright enough to steer by.'] },
  B: { name: 'blue-white star', code: 'B', lum: 500, bodies: 2.0, wind: true, remnant: false,
    text: 'A blue-white B star. Bright, brief, and hard on anything nearby.',
    again: ['A blue-white star, spending itself quickly.', 'A B star. Brief and brilliant.'] },
  RG: { name: 'red giant', code: 'giant', lum: 200, bodies: 2.6, wind: true, remnant: false,
    text: 'A red giant. It has swallowed its inner worlds and is working on the rest.',
    again: ['A red giant, bloated and dim-edged.', 'Another red giant, late in its day.'] },
  SG: { name: 'subgiant', code: 'subg', lum: 6, bodies: 3.5, wind: true, remnant: false,
    text: 'A subgiant, just leaving the main sequence. Its planets have a few hundred million years to make plans.',
    again: ['A subgiant, beginning to swell.', 'A star just past its prime.'] },
  O: { name: 'blue supergiant', code: 'O', lum: 1e5, bodies: 1.0, wind: true, remnant: false,
    text: 'A blue supergiant. It will not see ten million years.',
    again: ['Another blue supergiant, too bright to look at.', 'A blue supergiant. Enjoy it; it will not last.'] },
  RSG: { name: 'red supergiant', code: 'supg', lum: 5e4, bodies: 1.5, wind: true, remnant: false,
    text: 'A red supergiant, swollen past where its planets used to be. It is close to the end.',
    again: ['A red supergiant, vast and unsteady.', 'Another supergiant near its end.'] },
  PSR: { name: 'pulsar', code: 'psr', lum: 0.1, bodies: 0.8, wind: false, remnant: true,
    text: 'A pulsar. Twenty kilometres across, turning many times a second, sweeping two beams around the sky.',
    again: ['A pulsar, ticking.', 'Another pulsar. I have set my clocks by it.'] },
  BH: { name: 'black hole', code: 'BH', lum: 0.1, bodies: 0.8, wind: true, remnant: true,
    text: 'A black hole with a companion star it is taking apart. The disc is brighter than the star.',
    again: ['A black hole and the star it is eating.', 'Another black hole, lit by what falls in.'] },
  WR: { name: 'Wolf-Rayet star', code: 'WR', lum: 2e5, bodies: 0.6, wind: true, remnant: false,
    text: 'A Wolf-Rayet star, stripped to its core and blowing itself away at a thousand kilometres a second.',
    again: ['A Wolf-Rayet star, shedding itself.', 'Another stripped star, all wind.'] },
  MAG: { name: 'magnetar', code: 'mag', lum: 0.1, bodies: 0.5, wind: false, remnant: true,
    text: 'A magnetar. Its field would wipe a memory core from a thousand kilometres. We will keep our distance.',
    again: ['A magnetar. We keep well back.', 'Another magnetar. Shutters down.'] },
};

type Mix = Partial<Record<StarKind, number>>;
/** Star kinds per tier: in the field, in old clusters, in young clusters. */
const FIELD_MIX: Mix[] = [
  { M: 68, K: 25, BD: 7 },
  { G: 42, F: 23, WD: 35 },
  { A: 38, B: 10, RG: 40, SG: 12 },
  { O: 22, RSG: 26, PSR: 26, BH: 12, WR: 8, MAG: 6 },
];
const OLD_MIX: Mix[] = [
  { M: 70, K: 24, BD: 6 },
  { G: 34, F: 10, WD: 56 },
  { RG: 70, SG: 26, A: 4 },
  { PSR: 60, BH: 30, MAG: 10 },
];
const YOUNG_MIX: Mix[] = [
  { M: 64, K: 26, BD: 10 },
  { G: 50, F: 44, WD: 6 },
  { A: 60, B: 30, SG: 6, RG: 4 },
  { O: 40, RSG: 30, WR: 18, PSR: 8, MAG: 4 },
];

/** Something that can be mined from a body: a material, how rich it is, and how much comes easily. */
export interface Seam {
  material: Material;
  grade: 1 | 2 | 3;
  /** Units taken at which the seam is down to about a third of its first rate. */
  size: number;
}

export interface Body {
  /** 0 is the star; planets and belts count outward from 1. */
  n: number;
  kind: BodyKind;
  au: number;
  moons: number;
  rings: boolean;
  /** Richness 0..3 for scooping fuel and cutting ice for the shield. */
  fuel: number;
  ice: number;
  /** What can be mined here for the hold. */
  seams: Seam[];
  /** Work here costs the ship something: heat wears the hull, radiation the shield. */
  hot?: 'heat' | 'radiation';
}

export interface Discovery {
  /** Either "we now know this body properly" or a catalogued feature. */
  type: 'body' | 'feature';
  body: number;
  feature?: FeatureDef;
}

export interface StarSystem {
  ref: SysRef;
  name: string;
  star: StarKind;
  companion?: StarKind;
  /** Metallicity [Fe/H]: metal-rich stars have more rock and more giants. */
  feh: number;
  /** bodies[0] is the star. */
  bodies: Body[];
  /** Everything a survey can find, in the order it will be found. */
  discoveries: Discovery[];
  /** Number of giant planets, and a 0..3 measure of belts and comets. Both can be seen from a neighbouring system. */
  giants: number;
  dust: number;
  /** Something here is odd enough to notice from light-years away. */
  anomaly: boolean;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function pickStar(ref: SysRef, rng: Stream): StarKind {
  const mix = ref.cluster ? (ref.cluster.old ? OLD_MIX : YOUNG_MIX) : FIELD_MIX;
  return rng.weighted(mix[ref.stratum]);
}

function zoneTable(star: StarKind, au: number, warm: number, snow: number, giants: number): Partial<Record<BodyKind, number>> {
  if (STARS[star].remnant) return { belt: 35, scorched: 20, dwarf: 20, gas: 8, ice: 17 };
  if (au < 0.45 * warm) return { scorched: 70, rocky: 18, gas: 12 * giants };
  if (au < 1.7 * warm) return { rocky: 38, desert: 25, ocean: 14, gas: 10 * giants, belt: 13 };
  if (au < snow) return { rocky: 28, belt: 30, desert: 15, gas: 27 * giants };
  return { gas: 34 * giants, icegiant: 24, ice: 22, belt: 8, dwarf: 12 };
}

/** A body, and how rich its rock is in metal (0..3), which seeds its metal seam. Every draw here is in the order it always was, so bodies do not change. */
function makeBody(n: number, kind: BodyKind, au: number, feh: number, snow: number, rng: Stream): { body: Body; ore: number } {
  const b = { n, kind, au, moons: 0, rings: false, fuel: 0, ice: 0, ore: 0, seams: [] as Seam[] };
  switch (kind) {
    case 'gas':
      b.moons = Math.round(rng.range(0, 16));
      b.rings = rng.chance(0.35);
      b.fuel = rng.chance(0.75) ? 3 : 2;
      b.ice = b.rings || b.moons >= 4 ? 1 : 0;
      b.ore = b.moons >= 6 ? 1 : 0;
      break;
    case 'icegiant':
      b.moons = Math.round(rng.range(0, 9));
      b.rings = rng.chance(0.5);
      b.fuel = rng.chance(0.25) ? 1 : 2;
      b.ice = b.rings ? 2 : 1;
      break;
    case 'belt':
      b.ore = clamp(1 + Math.round(2.2 * feh + rng.range(-0.3, 1.5)), 1, 3);
      b.ice = au > snow ? 1 : 0;
      break;
    case 'comets':
      b.ice = clamp(1 + Math.round(rng.range(-0.2, 2.2)), 1, 3);
      break;
    case 'ice':
      b.ice = rng.chance(0.3) ? 3 : 2;
      b.ore = rng.chance(0.3) ? 1 : 0;
      b.moons = rng.int(3);
      break;
    case 'dwarf':
      b.ice = 1;
      b.ore = 1;
      break;
    case 'ocean':
      b.ice = 1;
      b.moons = rng.int(3);
      break;
    case 'rocky':
    case 'desert':
      b.ore = feh > 0.15 ? 2 : 1;
      b.moons = rng.int(3);
      break;
    case 'scorched':
      b.ore = rng.chance(0.4) ? 2 : 1;
      break;
  }
  const { ore, ...body } = b;
  return { body, ore };
}

/** What can be mined from a body, by the kind of body and the kind of star it circles. */
function seamsFor(b: Body, ore: number, star: StarKind, feh: number, snow: number, rng: Stream): Seam[] {
  const seams: Seam[] = [];
  const add = (material: Material, grade: number) => {
    if (grade < 1) return;
    const [lo, hi] = ISRU.SIZE[material];
    seams.push({ material, grade: clamp(Math.round(grade), 1, 3) as 1 | 2 | 3, size: Math.round(rng.range(lo, hi)) });
  };
  const fierce = star === 'PSR' || star === 'MAG' || star === 'BH';
  switch (b.kind) {
    case 'belt':
      add('metals', ore);
      // Beyond the snow line a belt keeps its ices and its carbon.
      if (rng.chance(b.au > snow ? 0.45 : 0.2)) add('carbon', rng.chance(0.3) ? 2 : 1);
      if (b.au > snow) add('volatiles', 1);
      break;
    case 'scorched':
      // Stripped toward its core: richer than ordinary rock, and richer still if it is close enough to be hot work.
      add('metals', b.hot ? ore + 1 : ore);
      break;
    case 'rocky':
    case 'desert':
      add('metals', ore);
      break;
    case 'ocean':
      add('volatiles', 2);
      break;
    case 'ice':
      add('volatiles', b.ice);
      if (ore) add('metals', 1);
      if (rng.chance(0.25)) add('carbon', 1);
      break;
    case 'dwarf':
      add('volatiles', 1);
      add('metals', 1);
      if (rng.chance(0.3)) add('carbon', 1);
      break;
    case 'comets':
      add('volatiles', b.ice);
      if (rng.chance(0.5)) add('carbon', rng.chance(0.3) ? 2 : 1);
      break;
    case 'gas':
      add('isotopes', rng.chance(0.3) ? 2 : 1);
      break;
    case 'icegiant':
      // A shallower well and a colder one: the better place for deuterium and helium-3.
      add('isotopes', rng.chance(0.5) ? 3 : 2);
      if (rng.chance(0.2)) add('carbon', 1);
      break;
    case 'star':
      // Old giant stars shed carbon dust; a black hole's disc and a pulsar's debris hold what the explosion made.
      if (star === 'RG') add('carbon', 1);
      if (star === 'RSG' || star === 'WR') add('carbon', 2);
      if (fierce) add('heavy', star === 'BH' ? 2 : rng.chance(0.4) ? 2 : 1);
      break;
  }
  if (b.kind === 'belt' || b.kind === 'scorched' || b.kind === 'dwarf') {
    if (fierce) add('heavy', rng.chance(0.5) ? 3 : 2);
    else if (star === 'WD' && rng.chance(0.35)) add('heavy', 1);
    else if (b.kind === 'belt' && feh > 0.3 && rng.chance(0.15)) add('heavy', 1);
  }
  return seams;
}

/** Whether working at a body costs the ship something. Not many do. */
function hotFor(b: Body, star: StarKind, warm: number): Body['hot'] {
  if (star === 'PSR' || star === 'MAG' || star === 'BH') return 'radiation';
  if (b.kind === 'star') return star === 'WR' ? 'radiation' : undefined;
  // Only the closest-in rock and giants: about one system in ten has such a body.
  if (b.kind === 'scorched' && b.au < 0.11 * warm) return 'heat';
  if (b.kind === 'gas' && b.au < 0.12 * warm) return 'heat';
  return undefined;
}

function featureFits(def: FeatureDef, body: Body, star: StarKind): boolean {
  if (!def.on.includes(body.kind)) return false;
  if (def.stars && !def.stars.includes(star)) return false;
  if (def.id === 'arcs' && !body.rings) return false;
  if (['tidal', 'retro', 'seamoon'].includes(def.id) && body.moons < 1) return false;
  if (def.id === 'subsurface' && body.kind === 'gas' && body.moons < 2) return false;
  return true;
}

/** Chance that a feature is common, uncommon, rare, exceptional. */
const TIER_CHANCE = [0.66, 0.285, 0.05, 0.005];

export function generateSystem(galaxy: Galaxy, ref: SysRef): StarSystem {
  const seed = galaxy.cfg.seed;
  const h = strHash(ref.id);

  // ---- the star ----
  const srng = new Stream(seed, K.STAR, h);
  const star = pickStar(ref, srng);
  const companion = srng.chance(0.3) ? srng.weighted<StarKind>({ M: 50, K: 18, WD: 18, BD: 14 }) : undefined;
  const r = Math.hypot(ref.x, ref.y);
  let feh = 0.25 - 0.9 * (r / galaxy.cfg.radius) + 0.12 * srng.normal();
  if (ref.cluster) feh += ref.cluster.old ? -0.15 : 0.1;
  feh = clamp(feh, -1.2, 0.5);

  // ---- bodies, counted outward ----
  const brng = new Stream(seed, K.BODIES, h);
  const info = STARS[star];
  const count = clamp(Math.round(info.bodies + 1.4 * brng.normal() + 1.5 * feh), 0, 8);
  const warm = Math.sqrt(info.lum);
  const snow = 2.7 * warm;
  // Giant planets follow metallicity: metal-rich stars have more of them.
  const giantBoost = star === 'BD' ? 0 : clamp(Math.pow(10, feh), 0.3, 2.5);
  const bodies: Body[] = [{ n: 0, kind: 'star', au: 0, moons: 0, rings: false, fuel: 0, ice: 0, seams: [] }];
  const ores = [0];
  const push = (made: { body: Body; ore: number }) => {
    bodies.push(made.body);
    ores.push(made.ore);
  };
  let au = warm * brng.range(0.08, 0.3);
  for (let i = 0; i < count; i++) {
    const kind = brng.weighted(zoneTable(star, au, warm, snow, giantBoost));
    push(makeBody(bodies.length, kind, au, feh, snow, brng));
    au *= brng.range(1.45, 2.4);
  }
  const haloChance = info.remnant ? 0.35 : info.lum > 100 ? 0.3 : 0.75;
  if (brng.chance(haloChance)) {
    push(makeBody(bodies.length, 'comets', Math.max(au * 4, snow * 15, 30), feh, snow, brng));
  }

  // ---- what can be mined, on its own stream so that nothing above shifts ----
  for (const b of bodies) {
    b.hot = hotFor(b, star, warm);
    b.seams = seamsFor(b, ores[b.n], star, feh, snow, new Stream(seed, K.SEAM, h, b.n));
  }

  // ---- features ----
  const frng = new Stream(seed, K.FEATURE, h);
  let anomaly = frng.chance(0.006);
  const found: { body: number; feature: FeatureDef }[] = [];
  const used = new Set<string>();
  const load = new Map<number, number>();
  const place = (minTier: number, maxTier: number): boolean => {
    for (let tier = maxTier; tier >= minTier; tier--) {
      const options: { def: FeatureDef; hosts: Body[] }[] = [];
      for (const def of FEATURES) {
        if (def.rarity !== tier || used.has(def.id)) continue;
        const hosts = bodies.filter((b) => featureFits(def, b, star) && (load.get(b.n) ?? 0) < 2);
        if (hosts.length) options.push({ def, hosts });
      }
      if (!options.length) continue;
      const { def, hosts } = frng.pick(options);
      const host = frng.pick(hosts);
      used.add(def.id);
      load.set(host.n, (load.get(host.n) ?? 0) + 1);
      found.push({ body: host.n, feature: def });
      return true;
    }
    return false;
  };
  const featureCount = frng.poisson(1.0 + 0.32 * count);
  for (let i = 0; i < featureCount; i++) {
    let roll = frng.next();
    let tier = 0;
    while (tier < 3 && roll >= TIER_CHANCE[tier]) roll -= TIER_CHANCE[tier++];
    place(0, tier);
  }
  if (anomaly && !found.some((x) => x.feature.rarity >= 2)) {
    anomaly = place(2, frng.chance(0.12) ? 3 : 2);
  }

  // ---- survey order: bodies first, rare things later, with some shuffle ----
  const orng = new Stream(seed, K.SURVEY, h);
  const keyed: { key: number; d: Discovery }[] = [];
  for (const b of bodies) if (b.n > 0) keyed.push({ key: 0.2 + orng.range(0, 1.3), d: { type: 'body', body: b.n } });
  for (const x of found) {
    keyed.push({ key: 1 + x.feature.rarity + orng.range(0, 1.3), d: { type: 'feature', body: x.body, feature: x.feature } });
  }
  keyed.sort((a, b) => a.key - b.key);

  // ---- name ----
  const nrng = new Stream(seed, K.NAME, h);
  let name: string;
  if (ref.stratum >= 2) name = brightName(nrng);
  else if (ref.cluster) name = `${ref.cluster.name} ${(ref.stratum === 1 ? 400 : 0) + ref.index + 1}`;
  else name = `${galaxy.sector(ref.x, ref.y).split(' ')[0]} ${catalogueCode(nrng)}`;

  const giants = bodies.filter((b) => b.kind === 'gas' || b.kind === 'icegiant').length;
  const dust = bodies.reduce((m, b) => (b.kind === 'belt' || b.kind === 'comets' ? Math.max(m, ores[b.n], b.ice) : m), 0);

  return { ref, name, star, companion, feh, bodies, discoveries: keyed.map((k) => k.d), giants, dust, anomaly };
}

// ---- words ---------------------------------------------------------------

const BODY_WORD: Record<BodyKind, string> = {
  star: 'the star',
  scorched: 'scorched rock',
  rocky: 'rocky world',
  desert: 'desert world',
  ocean: 'ocean world',
  ice: 'ice world',
  gas: 'gas giant',
  icegiant: 'ice giant',
  belt: 'asteroid belt',
  dwarf: 'dwarf planet',
  comets: 'comet halo',
};

/** "gas giant, 9 moons" */
export function bodyLabel(b: Body): string {
  let s = BODY_WORD[b.kind];
  if (b.rings) s += ', rings';
  else if ((b.kind === 'gas' || b.kind === 'icegiant') && b.moons >= 3) s += `, ${b.moons} moons`;
  return s;
}

/** How a sentence refers to a body: "giant 3", "world 2", "the belt". */
export function bodyRef(sys: StarSystem, n: number): string {
  const b = sys.bodies[n];
  if (!b || b.kind === 'star') return 'the star';
  if (b.kind === 'comets') return 'the halo';
  if (b.kind === 'belt') return sys.bodies.filter((x) => x.kind === 'belt').length > 1 ? `belt ${n}` : 'the belt';
  if (b.kind === 'gas' || b.kind === 'icegiant') return `giant ${n}`;
  return `world ${n}`;
}

/** Fill `{b}` and `{n}` in a feature's text for a particular body. */
export function renderFeature(sys: StarSystem, body: number, template: string, featureId: string): string {
  const where = bodyRef(sys, body);
  const n = 3 + (strHash(sys.ref.id + featureId) % 34);
  const text = template.replaceAll('{b}', where).replaceAll('{n}', String(n));
  // Capitalise a body reference that begins a sentence.
  return text.replace(/(^|\. )([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

/** "K orange dwarf with a red dwarf companion" */
export function starLine(sys: StarSystem): string {
  const s = STARS[sys.star].name;
  return sys.companion ? `${s} with a ${STARS[sys.companion].name} companion` : s;
}
