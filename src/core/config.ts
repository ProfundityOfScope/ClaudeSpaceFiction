/**
 * Every tunable number lives here.
 *
 * Units throughout: light-years, years, c = 1. Gas density is atoms per cm^3.
 * The galaxy is a flat disc. To make it bigger, raise `radius` and
 * `totalSystems`; nothing else needs to change, because systems are generated
 * per cell on demand and never enumerated.
 */

/** A brightness tier. Dim stars are common and only seen nearby; bright ones are rare and seen far. */
export interface Stratum {
  /** Share of all systems in this tier. */
  fraction: number;
  /** Grid cell size in ly. Bigger cells for rarer tiers keep counts per cell near one. */
  cell: number;
  /** How far away the ship's starting telescopes can pick these out, in ly. */
  sight: number;
}

export interface GalaxyConfig {
  seed: number;
  /** Disc radius, ly. */
  radius: number;
  /** Exponential scale length of the stellar disc, ly. */
  scaleLength: number;
  /** Total number of systems. This is the calibration; densities follow from it. */
  totalSystems: number;
  /** Share of systems that live in clusters. */
  clusterShare: number;
  /** Mean cluster membership. */
  clusterMean: number;
  /** Size of the coarse cells that hold clusters and gas shapes, ly. */
  coarse: number;
  /** Size of a named sector, ly. */
  sector: number;
  arms: number;
  /** Spiral pitch angle, degrees. */
  pitch: number;
  /** Arm contrast in the star counts (0 = none). */
  armContrast: number;
  /** Gas density scale, atoms per cm^3, before the radial fall-off. */
  gasScale: number;
  strata: Stratum[];
}

/** The demo galaxy: a dwarf spiral, small enough to cross in a long evening. */
export const DEMO: GalaxyConfig = {
  seed: 20261120,
  radius: 6000,
  scaleLength: 1700,
  totalSystems: 3_000_000,
  clusterShare: 0.08,
  clusterMean: 110,
  coarse: 256,
  sector: 512,
  arms: 2,
  pitch: 15,
  armContrast: 0.6,
  gasScale: 1.2,
  strata: [
    { fraction: 0.9, cell: 8, sight: 10 },
    { fraction: 0.085, cell: 32, sight: 40 },
    { fraction: 0.0135, cell: 128, sight: 250 },
    { fraction: 0.0015, cell: 512, sight: 1500 },
  ],
};

/** One standard gravity in ly/yr^2. */
export const G = 1.0323;
export const DAYS = 365.25;

/** Ship and travel tuning. */
export const TUNE = {
  /**
   * Drive reach. Swept gas pushes back harder the faster you go, so each
   * patch of gas has a top speed: gamma = sqrt(1 + P / n), where n is the gas
   * density and P = REACH * thrust[g] * hull. A better engine or a better
   * hull raises it; denser gas lowers it.
   */
  REACH: 0.4,
  /** Fraction of full thrust used by an economy burn. Fuel goes as thrust squared, so it is far cheaper. */
  ECO: 0.25,
  /** Shield lost per (atoms/cm^3 * ly * (gamma - 1)), divided by hull grade squared. */
  ABLATION: 2.6,
  /** Hull lost per point of shield that was needed and not there. */
  BREACH: 0.5,
  /** Hull wear from any jump, percent. */
  JUMP_WEAR: 0.3,
  /** Hull wear per year at rest, percent. */
  AGE_WEAR: 0.4,
  /** Hull wear per year under way, percent. This is what a slow, frugal burn costs. */
  TRANSIT_WEAR: 1.5,
  /** Below this hull condition the Wrights throttle the drive to this fraction of its thrust. */
  HULL_THROTTLE: 40,
  THROTTLE: 0.7,
  /** The drive will not light below this hull condition after the jump. */
  HULL_FLOOR: 5,
  /** Last-resort drift speed, as a fraction of c. */
  DRIFT_SPEED: 0.05,

  /** Fuel gathered per day by richness 1..3, percent of a full tank. */
  SCOOP: [0, 0.5, 1.0, 1.6],
  /** Fuel skimmed from a star's wind, percent of tank per day. */
  WIND: 0.25,
  /** Shield rebuilt per day by ice richness 1..3, percent. */
  ICE: [0, 0.35, 0.7, 1.1],
  /** Hull repaired per day, percent, and metals used per percent. */
  REPAIR_RATE: 0.35,
  REPAIR_COST: 1.0,
  /** With no metal at all the Wrights can still patch from scrap: at this share of the usual rate, and only up to this hull condition. It is what stops a wrecked ship being stranded. */
  SCRAP_RATE: 0.2,
  SCRAP_LIMIT: 30,

  /** Survey pacing: finds come at -tau * ln(1 - (k - 0.5) / K), tau = A + B * K days. */
  SURVEY_A: 14,
  SURVEY_B: 5,
  /** Days for a deep scan, by rarity of what is down there. */
  SCAN_DAYS: [30, 45, 90, 160],
  /** Archive credit by rarity, and for characterising one body. */
  ARCHIVE: [3, 8, 25, 80],
  ARCHIVE_BODY: 1,
  /** A hint is worth this share of the find; the scan pays the rest. */
  HINT_SHARE: 0.25,
  /** Bonus multiplier the first time a kind of thing is logged. */
  FIRST_BONUS: 1.5,
} as const;

/**
 * What can be taken out of a system and put in the hold.
 *
 * Each comes from a kind of place: volatiles from beyond the snow line, metals
 * from rock, carbon from carbon-rich bodies and the winds of old giant stars,
 * isotopes (deuterium, helium-3) from giant planets, and heavy elements from
 * the debris of dead stars.
 */
export const MATERIALS = ['volatiles', 'metals', 'carbon', 'isotopes', 'heavy'] as const;
export type Material = (typeof MATERIALS)[number];
export const MATERIAL: Record<Material, { short: string; name: string }> = {
  volatiles: { short: 'vol', name: 'volatiles' },
  metals: { short: 'met', name: 'metals' },
  carbon: { short: 'car', name: 'carbon' },
  isotopes: { short: 'iso', name: 'isotopes' },
  heavy: { short: 'hvy', name: 'heavy elements' },
};

/** Gathering materials in place. */
export const ISRU = {
  /** Units a day from a fresh seam of grade 1..3, before the kind of body is counted. */
  GRADE: [0, 0.5, 0.9, 1.4],
  /** How easily material comes off each kind of body: free fall is quick, a deep gravity well is slow. */
  WELL: { star: 0.3, belt: 1, comets: 0.9, dwarf: 0.8, icegiant: 0.75, scorched: 0.7, ice: 0.6, gas: 0.5, rocky: 0.45, desert: 0.45, ocean: 0.35 },
  /**
   * Seams thin out. A body cannot run dry at this scale, but its easy seam
   * can: the rate falls as exp(-taken / size) toward FLOOR of what it began
   * at. SIZE is the range a seam's size is drawn from, by material.
   */
  FLOOR: 0.15,
  SIZE: { volatiles: [1500, 3500], metals: [600, 1400], carbon: [350, 900], isotopes: [3000, 6000], heavy: [150, 450] },
  /** A seam is called thin once it gives less than this share of what it did fresh. */
  THIN: 0.6,
  /** Hot work, percent a day for each crew at it: heat wears the hull, radiation the shield. */
  HEAT: 0.06,
  RADIATION: 0.15,
  /** The Mind pulls crews off hot work when the hull falls to this. */
  HOT_RECALL: 45,
  /** How much of each seam a culture in the system has already had, in seam sizes, by its phase. An outpost has had half as much. */
  WORKED: { founding: 0.1, rising: 0.5, height: 1.0, decline: 1.3, ruins: 1.3, 'old ruins': 1.3 },
} as const;

/**
 * Who lives out there, and for how long. Times in years, distances in ly.
 *
 * Time is cut into eras. In each era a system can raise at most one culture,
 * and a culture's whole life fits inside its era, so two never overlap at one
 * world. What they leave lasts a while longer and then is gone too.
 */
export const CIV = {
  ERA: 8000,
  /** Chance per era that the best kind of world (an ocean world round a quiet star) raises a culture. */
  WORLD_RATE: 0.2,
  /** Old clusters have had the time, and are busy. Young ones have not. */
  OLD_CLUSTER: 6,
  YOUNG_CLUSTER: 0.3,
  /** How long a culture of one world lasts: median, log-normal spread, and limits. */
  LIFE: 1200,
  LIFE_SPREAD: 0.6,
  LIFE_MIN: 150,
  LIFE_MAX: 3200,
  /** Ruins outlast their makers by this multiple of the makers' own span, within limits. Outposts leave less. */
  RUIN: 1.5,
  RUIN_MIN: 400,
  RUIN_MAX: 4800,
  RUIN_OUTPOST: 0.6,

  /** A few cultures spread. One arises per this many field systems, per era. */
  REACH_PER: 4000,
  REACH_LIFE: 3000,
  REACH_LIFE_SPREAD: 0.5,
  REACH_LIFE_MIN: 800,
  REACH_LIFE_MAX: 6400,
  /** The furthest it would ever hold, ly: median, log-normal spread, and a hard cap. */
  REACH_RADIUS: 14,
  REACH_SPREAD: 0.8,
  REACH_CAP: 240,
  /** How fast its frontier moves, ly per year. */
  REACH_SPEED: [0.01, 0.08],
  /** Share of the systems inside it that carry an outpost. */
  HOLD: 0.5,

  /** How far a home world's radio carries, ly, by phase. Outposts are quieter; closed cultures quieter still. */
  LOUD: { founding: 4, rising: 20, height: 45, decline: 25 },
  LOUD_REACH: 1.6,
  LOUD_OUTPOST: 8,
  LOUD_CLOSED: 0.35,

  /** Days to read a ruin with a deep scan, and what it is worth to the Archive. */
  DIG_HOME: 70,
  DIG_OUTPOST: 40,
  RUIN_ARCHIVE: { home: 24, outpost: 10 },
  /** Old ruins have less left in them. */
  RUIN_OLD: 0.6,
  /** Chance that a ruin still holds something worth carrying away. Kept low: the chart flags nearby ruins, so a navigator can hunt them. */
  RELIC: { home: 0.12, outpost: 0.03 },
  /** Archive credit for meeting a living culture for the first time. */
  MEET_ARCHIVE: 8,
} as const;

/**
 * Refit tracks. Level 0 is the ship as launched.
 *
 * Engine: thrust in g. More thrust is more speed and less time under burn,
 * but faster gas is harder on the shield.
 * Hull: a grade. A better hull is faster through gas and loses far less ice.
 * Tanks: years of burning at full thrust that a full tank holds.
 */
/**
 * What each refit is built from, as shares, changing as the levels climb:
 * the early ones need what is common, the later ones carbon and isotopes, and
 * the last ones heavy elements, which only the debris of dead stars has.
 */
const RECIPES: Record<string, { from: number; mix: Partial<Record<Material, number>> }[]> = {
  engine: [{ from: 0, mix: { isotopes: 0.6, metals: 0.4 } }, { from: 3, mix: { isotopes: 0.6, metals: 0.3, heavy: 0.1 } }, { from: 6, mix: { isotopes: 0.6, metals: 0.2, heavy: 0.2 } }],
  hull: [{ from: 0, mix: { metals: 1 } }, { from: 2, mix: { metals: 0.6, carbon: 0.4 } }, { from: 6, mix: { metals: 0.3, carbon: 0.6, heavy: 0.1 } }],
  tanks: [{ from: 0, mix: { metals: 1 } }, { from: 2, mix: { metals: 0.6, isotopes: 0.4 } }, { from: 4, mix: { metals: 0.5, carbon: 0.5 } }],
  optics: [{ from: 0, mix: { metals: 0.5, carbon: 0.5 } }, { from: 2, mix: { metals: 0.25, carbon: 0.6, heavy: 0.15 } }],
  crews: [{ from: 0, mix: { volatiles: 0.6, metals: 0.4 } }, { from: 2, mix: { volatiles: 0.5, carbon: 0.5 } }],
  hold: [{ from: 0, mix: { metals: 1 } }, { from: 3, mix: { metals: 0.6, carbon: 0.4 } }],
};

export const REFITS = {
  engine: { label: 'Engine', unit: 'g', levels: [20, 32, 50, 80, 128, 200, 320, 500, 800, 1300, 2000], archive: 120 },
  hull: { label: 'Hull', unit: '', levels: [1, 1.6, 2.5, 4, 6.4, 10, 16, 25, 40, 64, 100], archive: 150 },
  tanks: { label: 'Tanks', unit: 'burn-yr', levels: [6, 8.5, 12, 17, 24, 34, 48], archive: 80 },
  optics: { label: 'Optics', unit: 'x', levels: [1, 1.5, 2.2, 3.3, 5], archive: 100 },
  crews: { label: 'Crews', unit: '', levels: [2, 3, 4, 5], archive: 220 },
  hold: { label: 'Hold', unit: '', levels: [150, 250, 400, 650, 1000, 1600], archive: 90 },
} as const;

export type RefitTrack = keyof typeof REFITS;

/** Cost of going from `level` to `level + 1` on a track. */
export function refitCost(track: RefitTrack, level: number) {
  const total = 90 * Math.pow(1.35, level);
  const recipe = RECIPES[track].filter((r) => r.from <= level).pop()!;
  const needs: Partial<Record<Material, number>> = {};
  for (const m of MATERIALS) if (recipe.mix[m]) needs[m] = Math.round(total * recipe.mix[m]!);
  return {
    /** Knowledge needed. The Archive is not spent, only consulted. */
    archive: Math.round(REFITS[track].archive * Math.pow(1.7, level)),
    /** Stock needed, by material. */
    needs,
    days: Math.round(45 * Math.pow(1.2, level)),
  };
}
