/**
 * Getting from one star to another.
 *
 * The ship can accelerate very hard, so it spends almost the whole trip at
 * cruising speed. What sets that speed is the gas: swept gas pushes back as
 * (gamma^2 - 1), so in gas of density n the thrust balances the drag at
 *
 *     gamma = sqrt(1 + P / n),     P = REACH * thrust[g] * hull grade.
 *
 * Thin gas is fast, dense gas is slow, and a better engine or hull raises
 * the limit everywhere. The route is cut into short segments, each flown at
 * its own limit. Two clocks come out: years aboard and years outside.
 *
 * Simplifications, small for the trips flown here: the ship changes speed
 * instantly between segments, and the shield is charged as if the whole
 * route were flown at cruise.
 */
import { G, TUNE } from './config.ts';
import type { Galaxy } from './galaxy.ts';

export interface DriveSpec {
  /** Full thrust, in g. */
  thrust: number;
  /** Hull grade: 1 for the ship as launched. */
  hull: number;
}

export interface Leg {
  dist: number;
  /** Years aboard and years outside. */
  ship: number;
  galaxy: number;
  /** Fuel used, in years of full-thrust burning. */
  fuel: number;
  /** Shield needed, in percent of a full shield. */
  shield: number;
  /** Highest Lorentz factor reached. */
  gamma: number;
  /** Thinnest, typical and thickest gas on the way. */
  gasMin: number;
  gasMean: number;
  gasMax: number;
}

/** Top speed (as a Lorentz factor) in gas of density n at a given thrust. */
export function cruiseGamma(drive: DriveSpec, thrustFraction: number, n: number): number {
  const reach = TUNE.REACH * drive.thrust * thrustFraction * drive.hull;
  return Math.sqrt(1 + reach / n);
}

/** Plan a straight flight between two points at a fraction of full thrust. */
export function planLeg(
  galaxy: Galaxy,
  from: { x: number; y: number },
  to: { x: number; y: number },
  drive: DriveSpec,
  thrustFraction: number,
): Leg {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const a = drive.thrust * thrustFraction * G; // ly / yr^2
  const steps = Math.min(600, Math.max(8, Math.ceil(dist / 1.5)));
  const seg = dist / steps;
  // Too short a hop never reaches the gas limit: flip at the midpoint instead.
  const gammaCap = 1 + (a * dist) / 2;

  let ship = 0;
  let galaxyYears = 0;
  let column = 0;
  let gasMin = Infinity;
  let gasMax = 0;
  let gasSum = 0;
  let gammaPeak = 1;
  let first = { gamma: 1, u: 0 };
  let last = first;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const n = galaxy.gas(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    const gamma = Math.min(cruiseGamma(drive, thrustFraction, n), gammaCap);
    const u = Math.sqrt(gamma * gamma - 1); // gamma * v
    ship += seg / u;
    galaxyYears += (seg * gamma) / u;
    column += n * seg * (gamma - 1);
    gasMin = Math.min(gasMin, n);
    gasMax = Math.max(gasMax, n);
    gasSum += n;
    gammaPeak = Math.max(gammaPeak, gamma);
    if (i === 0) first = { gamma, u };
    last = { gamma, u };
  }
  // The loop above counted the whole route at cruise. At each end the ship
  // is really spinning up or down at constant proper acceleration, covering
  // (gamma - 1) / a light-years while it does. Swap those stretches in.
  for (const end of [first, last]) {
    const stretch = (end.gamma - 1) / a;
    ship += Math.asinh(end.u) / a - stretch / end.u;
    galaxyYears += end.u / a - (stretch * end.gamma) / end.u;
  }

  return {
    dist,
    ship,
    galaxy: galaxyYears,
    // The engine holds its thrust against the drag the whole way, so fuel
    // goes by time under burn. A better hull deflects most of what it meets.
    fuel: thrustFraction * ship,
    shield: (TUNE.ABLATION * column) / (drive.hull * drive.hull),
    gamma: gammaPeak,
    gasMin,
    gasMean: gasSum / steps,
    gasMax,
  };
}
