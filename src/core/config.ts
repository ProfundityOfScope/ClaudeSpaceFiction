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
  /** Materials mined per day by ore richness 1..3. */
  ORE: [0, 0.25, 0.55, 1.0],
  /** Hull repaired per day, percent, and materials used per percent. */
  REPAIR_RATE: 0.35,
  REPAIR_COST: 1.5,

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
 * Refit tracks. Level 0 is the ship as launched.
 *
 * Engine: thrust in g. More thrust is more speed and less time under burn,
 * but faster gas is harder on the shield.
 * Hull: a grade. A better hull is faster through gas and loses far less ice.
 * Tanks: years of burning at full thrust that a full tank holds.
 */
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
  return {
    /** Knowledge needed. The Archive is not spent, only consulted. */
    archive: Math.round(REFITS[track].archive * Math.pow(1.7, level)),
    materials: Math.round(90 * Math.pow(1.35, level)),
    days: Math.round(45 * Math.pow(1.2, level)),
  };
}
