/**
 * The galaxy: where the systems are and how thick the gas is.
 *
 * Nothing here is stored. The disc is cut into square cells; a cell's
 * contents are hashed from (seed, cell), so asking for the same cell twice
 * gives the same systems. Four independent layers are stacked:
 *
 *   field stars   one grid per brightness tier (see Stratum in config.ts)
 *   clusters      a few per coarse cell, each generating its own members
 *   gas           a smooth disc with arms, plus dense clouds and empty bubbles
 *   sectors       named 512 ly squares, for orientation only
 *
 * Positions are fixed in a frame that turns with the disc; galactic rotation
 * is not modelled.
 */
import { K, Stream, mix } from './rng.ts';
import type { GalaxyConfig } from './config.ts';
import { noun, sectorName } from './words.ts';

export interface Cluster {
  x: number;
  y: number;
  /** Gaussian radius, ly. */
  sigma: number;
  members: number;
  /** Old clusters have swept their gas away; young ones still sit in it. */
  old: boolean;
  name: string;
}

/** A system's address: enough to find it again and generate the rest. */
export interface SysRef {
  id: string;
  x: number;
  y: number;
  stratum: number;
  cluster?: Cluster;
  /** Index among siblings, used for catalogue numbers. */
  index: number;
}

export interface Seen {
  ref: SysRef;
  dist: number;
}

interface Coarse {
  clusters: Cluster[];
  clouds: { x: number; y: number; r: number; peak: number }[];
  bubbles: { x: number; y: number; r: number }[];
  /** Cluster members, generated lazily: members[cluster][stratum]. */
  members: (SysRef[] | undefined)[][];
}

/** Share of a cluster's members in each tier. Young clusters still have their bright stars. */
const OLD_MIX = [0.86, 0.12, 0.019, 0.001];
const YOUNG_MIX = [0.84, 0.1, 0.05, 0.01];

const CACHE_LIMIT = 6000;

export class Galaxy {
  readonly cfg: GalaxyConfig;
  /** Field systems per ly^2 at the centre, before arms. */
  private readonly sigma0: number;
  private readonly tanPitch: number;
  private readonly armPhase: number;
  private fieldCache = new Map<string, SysRef[]>();
  private coarseCache = new Map<string, Coarse>();

  constructor(cfg: GalaxyConfig) {
    this.cfg = cfg;
    this.tanPitch = Math.tan((cfg.pitch * Math.PI) / 180);
    this.armPhase = (mix(cfg.seed, K.NOISE, 1) / 4294967296) * 2 * Math.PI;
    // The total is the calibration: integrate the radial profile once so the
    // expected number of field systems comes out right.
    const steps = 4000;
    const dr = cfg.radius / steps;
    let integral = 0;
    for (let i = 0; i < steps; i++) {
      const r = (i + 0.5) * dr;
      integral += 2 * Math.PI * r * Math.exp(-r / cfg.scaleLength) * this.taper(r) * dr;
    }
    this.sigma0 = (cfg.totalSystems * (1 - cfg.clusterShare)) / integral;
  }

  /** 1 through most of the disc, falling smoothly to 0 at the rim. */
  private taper(r: number): number {
    const R = this.cfg.radius;
    if (r >= R) return 0;
    if (r <= 0.76 * R) return 1;
    const t = (R - r) / (0.24 * R);
    return t * t * (3 - 2 * t);
  }

  /** 0 between arms, 1 on an arm's spine. */
  armShape(x: number, y: number): number {
    const r = Math.hypot(x, y);
    const R = this.cfg.radius;
    if (r < 0.08 * R) return 0.5;
    const theta = Math.atan2(y, x);
    const phase = this.cfg.arms * (theta - Math.log(r / (0.15 * R)) / this.tanPitch) + this.armPhase;
    return 0.5 + 0.5 * Math.cos(phase);
  }

  /** Field systems per ly^2 (all tiers together). */
  density(x: number, y: number): number {
    const r = Math.hypot(x, y);
    const arms = 1 + this.cfg.armContrast * (2 * this.armShape(x, y) - 1);
    return this.sigma0 * Math.exp(-r / this.cfg.scaleLength) * this.taper(r) * arms;
  }

  // ---- gas ---------------------------------------------------------------

  /** Smooth value noise in [0, 1), one lump per `scale` ly. */
  private noise(x: number, y: number, scale: number): number {
    const fx = x / scale;
    const fy = y / scale;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    let tx = fx - ix;
    let ty = fy - iy;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const at = (i: number, j: number) => mix(this.cfg.seed, K.NOISE, i, j) / 4294967296;
    const a = at(ix, iy);
    const b = at(ix + 1, iy);
    const c = at(ix, iy + 1);
    const d = at(ix + 1, iy + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  private gasBase(r: number): number {
    return this.cfg.gasScale * Math.exp(-r / (1.2 * this.cfg.scaleLength)) * this.taper(r);
  }

  /** Gas density in atoms per cm^3 at a point. */
  gas(x: number, y: number): number {
    const r = Math.hypot(x, y);
    const arm = this.armShape(x, y);
    let n = this.gasBase(r) * (0.35 + 1.3 * arm * arm) * (0.6 + this.noise(x, y, 40));
    let added = 0;
    const cc = this.cfg.coarse;
    const cx = Math.floor(x / cc);
    const cy = Math.floor(y / cc);
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cy - 1; j <= cy + 1; j++) {
        const cell = this.coarse(i, j);
        for (const b of cell.bubbles) {
          const q = Math.hypot(x - b.x, y - b.y) / b.r;
          if (q < 2) n *= 1 - 0.97 * Math.exp(-(q ** 4));
        }
        for (const c of cell.clusters) {
          const d = Math.hypot(x - c.x, y - c.y);
          if (c.old) {
            const q = d / (2.5 * c.sigma);
            if (q < 2) n *= 1 - 0.7 * Math.exp(-(q ** 4));
          } else if (d < 6 * c.sigma) {
            added += 12 * Math.exp(-(d * d) / (4 * c.sigma * c.sigma));
          }
        }
        for (const c of cell.clouds) {
          const d2 = (x - c.x) ** 2 + (y - c.y) ** 2;
          if (d2 < 9 * c.r * c.r) added += c.peak * Math.exp(-d2 / (c.r * c.r));
        }
      }
    }
    return Math.max(n + added, 0.003);
  }

  /** A word for a gas density, thinnest first. */
  static gasWord(n: number): string {
    if (n < 0.03) return 'void';
    if (n < 0.2) return 'thin';
    if (n < 1.2) return 'moderate';
    if (n < 10) return 'dense';
    return 'cloud';
  }

  // ---- coarse cells: clusters and gas shapes ----------------------------

  private coarse(ccx: number, ccy: number): Coarse {
    const key = `${ccx},${ccy}`;
    const hit = this.coarseCache.get(key);
    if (hit) return hit;
    const { cfg } = this;
    const cc = cfg.coarse;
    const mx = (ccx + 0.5) * cc;
    const my = (ccy + 0.5) * cc;
    const cell: Coarse = { clusters: [], clouds: [], bubbles: [], members: [] };

    const rng = new Stream(cfg.seed, K.CLUSTER, ccx, ccy);
    const expectedMembers = (this.density(mx, my) * cc * cc * cfg.clusterShare) / (1 - cfg.clusterShare);
    const count = rng.poisson(expectedMembers / cfg.clusterMean);
    for (let i = 0; i < count; i++) {
      const x = (ccx + rng.next()) * cc;
      const y = (ccy + rng.next()) * cc;
      const members = Math.round(Math.min(420, Math.max(25, cfg.clusterMean * Math.exp(0.6 * rng.normal() - 0.18))));
      const old = rng.chance(0.7);
      const packing = rng.range(0.05, 0.2); // members per ly^2 near the middle
      const sigma = Math.sqrt(members / (2 * Math.PI * packing));
      cell.clusters.push({ x, y, sigma, members, old, name: noun(new Stream(cfg.seed, K.NAME, ccx, ccy, i)) });
      cell.members.push([]);
    }

    const gas = new Stream(cfg.seed, K.GAS, ccx, ccy);
    const arm = this.armShape(mx, my);
    const richness = Math.min(1, 3 * this.gasBase(Math.hypot(mx, my)));
    const clouds = gas.poisson((0.5 + 2.5 * arm) * richness);
    for (let i = 0; i < clouds; i++) {
      cell.clouds.push({
        x: (ccx + gas.next()) * cc,
        y: (ccy + gas.next()) * cc,
        r: gas.range(5, 35),
        peak: 20 * Math.exp(gas.range(0, 3)),
      });
    }
    const bubbles = gas.poisson(0.6);
    for (let i = 0; i < bubbles; i++) {
      cell.bubbles.push({ x: (ccx + gas.next()) * cc, y: (ccy + gas.next()) * cc, r: gas.range(25, 110) });
    }

    if (this.coarseCache.size > CACHE_LIMIT) this.coarseCache.clear();
    this.coarseCache.set(key, cell);
    return cell;
  }

  /** Every cluster whose coarse cell touches the given box. */
  clustersIn(x0: number, y0: number, x1: number, y1: number): { cluster: Cluster; ccx: number; ccy: number; i: number }[] {
    const cc = this.cfg.coarse;
    const out = [];
    for (let i = Math.floor(x0 / cc); i <= Math.floor(x1 / cc); i++) {
      for (let j = Math.floor(y0 / cc); j <= Math.floor(y1 / cc); j++) {
        const cell = this.coarse(i, j);
        for (let k = 0; k < cell.clusters.length; k++) out.push({ cluster: cell.clusters[k], ccx: i, ccy: j, i: k });
      }
    }
    return out;
  }

  /** The members of one cluster in one brightness tier. */
  clusterMembers(ccx: number, ccy: number, ci: number, stratum: number): SysRef[] {
    const cell = this.coarse(ccx, ccy);
    const cached = cell.members[ci][stratum];
    if (cached) return cached;
    const c = cell.clusters[ci];
    const share = (c.old ? OLD_MIX : YOUNG_MIX)[stratum];
    const rng = new Stream(this.cfg.seed, K.PLACE, 1000 + stratum, ccx, ccy, ci);
    const count = rng.poisson(c.members * share);
    const out: SysRef[] = [];
    for (let k = 0; k < count; k++) {
      out.push({
        id: `C${ccx}.${ccy}.${ci}.${stratum}.${k}`,
        x: c.x + c.sigma * rng.normal(),
        y: c.y + c.sigma * rng.normal(),
        stratum,
        cluster: c,
        index: k,
      });
    }
    cell.members[ci][stratum] = out;
    return out;
  }

  // ---- field stars -------------------------------------------------------

  /** The field systems of one tier in one grid cell. */
  fieldCell(stratum: number, cx: number, cy: number): SysRef[] {
    const key = `${stratum},${cx},${cy}`;
    const hit = this.fieldCache.get(key);
    if (hit) return hit;
    const { cfg } = this;
    const { cell, fraction } = cfg.strata[stratum];
    const mean = this.density((cx + 0.5) * cell, (cy + 0.5) * cell) * fraction * cell * cell;
    const count = new Stream(cfg.seed, K.COUNT, stratum, cx, cy).poisson(mean);
    const place = new Stream(cfg.seed, K.PLACE, stratum, cx, cy);
    const out: SysRef[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        id: `F${stratum}.${cx}.${cy}.${i}`,
        x: (cx + place.next()) * cell,
        y: (cy + place.next()) * cell,
        stratum,
        index: i,
      });
    }
    if (this.fieldCache.size > CACHE_LIMIT) this.fieldCache.clear();
    this.fieldCache.set(key, out);
    return out;
  }

  // ---- queries -----------------------------------------------------------

  /**
   * Everything the telescopes can pick out from a point: each tier out to
   * its own range (times `optics`), nearest first.
   */
  near(x: number, y: number, optics = 1): Seen[] {
    const { strata } = this.cfg;
    const out: Seen[] = [];
    for (let s = 0; s < strata.length; s++) {
      const range = strata[s].sight * optics;
      const size = strata[s].cell;
      for (let cx = Math.floor((x - range) / size); cx <= Math.floor((x + range) / size); cx++) {
        for (let cy = Math.floor((y - range) / size); cy <= Math.floor((y + range) / size); cy++) {
          for (const ref of this.fieldCell(s, cx, cy)) {
            const dist = Math.hypot(ref.x - x, ref.y - y);
            if (dist <= range) out.push({ ref, dist });
          }
        }
      }
    }
    const far = strata[strata.length - 1].sight * optics + 100;
    for (const { cluster, ccx, ccy, i } of this.clustersIn(x - far, y - far, x + far, y + far)) {
      const toCentre = Math.hypot(cluster.x - x, cluster.y - y);
      for (let s = 0; s < strata.length; s++) {
        const range = strata[s].sight * optics;
        if (toCentre - 5 * cluster.sigma > range) continue;
        for (const ref of this.clusterMembers(ccx, ccy, i, s)) {
          const dist = Math.hypot(ref.x - x, ref.y - y);
          if (dist <= range) out.push({ ref, dist });
        }
      }
    }
    out.sort((a, b) => a.dist - b.dist);
    return out;
  }

  /** Find a system again from its id. */
  ref(id: string): SysRef | null {
    const parts = id.slice(1).split('.').map(Number);
    if (parts.some((p) => !Number.isInteger(p))) return null;
    if (id[0] === 'F' && parts.length === 4) {
      const [s, cx, cy, i] = parts;
      if (!this.cfg.strata[s]) return null;
      return this.fieldCell(s, cx, cy)[i] ?? null;
    }
    if (id[0] === 'C' && parts.length === 5) {
      const [ccx, ccy, ci, s, k] = parts;
      if (!this.cfg.strata[s] || !this.coarse(ccx, ccy).clusters[ci]) return null;
      return this.clusterMembers(ccx, ccy, ci, s)[k] ?? null;
    }
    return null;
  }

  /** The name of the sector a point lies in, e.g. "Tessel Drift". */
  sector(x: number, y: number): string {
    const s = this.cfg.sector;
    return sectorName(new Stream(this.cfg.seed, K.SECTOR, Math.floor(x / s), Math.floor(y / s)));
  }
}
