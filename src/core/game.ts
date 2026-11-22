/**
 * The game: one line of input in, a list of output lines back.
 *
 * `Game` knows nothing about screens. The web page and the headless tools
 * both drive it through `exec`, `status` and `chips`.
 */
import { CIV, DAYS, DEMO, REFITS, TUNE, refitCost, type GalaxyConfig, type RefitTrack } from './config.ts';
import { Galaxy, type Seen, type SysRef } from './galaxy.ts';
import { STARS, bodyLabel, bodyRef, generateSystem, renderFeature, starLine, type Body, type Discovery, type StarKind, type StarSystem } from './system.ts';
import { FEATURES, FEATURE_BY_ID, RARITY_WORD, type FeatureDef } from './features.ts';
import { Cultures, HEARING, frontier, isLiving, type Culture, type Phase, type Presence, type Site } from './civs.ts';
import { relicFrom, relicLabel, ruinHint, ruinText, settledText } from './cultures.ts';
import { drawPolygon, paddedHull, type Point } from './hull.ts';
import { cruiseGamma, planLeg, type Leg } from './travel.ts';
import { GUIDE, fill, speak } from './mind.ts';
import { K, Stream, mix, strHash } from './rng.ts';
import { MIND_NAMES } from './words.ts';
import { capital, clock, gauge, lpad, ly, pad, span, spanWords } from './format.ts';
import { SAVE_VERSION, freshMemory, freshState, level, type Assignment, type Memory, type Op, type SiteNote, type State } from './state.ts';

/** echo: the player's own line. pre: fixed-width block. mind: the ship speaking. */
export type OutKind = 'echo' | 'text' | 'pre' | 'mind' | 'head' | 'dim' | 'good' | 'alert' | 'map';
export interface Out {
  k: OutKind;
  s: string;
  /** For a map: the numbers behind it, so a page can draw a picture. `s` is the same map in characters. */
  map?: MapData;
}

/** How far out a chart looks. Each zoom is the one before, four times wider. */
export type Zoom = 'close' | 'mid' | 'far';

/** A small square picture of the sky. */
export interface MapData {
  /** Cells along each side, and light-years from the centre to each edge. */
  size: number;
  radius: number;
  zoom: Zoom;
  /**
   * Gas in each cell, row by row from the top: one character per cell, from
   * '0' (void) to 'z' (the thickest cloud), on a logarithmic scale.
   */
  gas: string;
  stars: MapStar[];
  /** Space somebody holds, one character per cell like `gas`: '0' outside, '1' inside, '2' on its edge. Absent where nobody we know of holds anything. */
  held?: string;
  /** Half the width, in cells, of the next zoom in: drawn as a faint box, so the views can be related. */
  inner?: number;
}

export interface MapStar {
  /** Cell coordinates, from the top left. */
  x: number;
  y: number;
  /** Colour family, by kind of star. */
  tone: 'warm' | 'gold' | 'white' | 'cold';
  /** 1 for ordinary stars, 2 for bright ones, 3 for the rare giants and remnants. */
  size: 1 | 2 | 3;
  /** Its number in the list under the map, if it has one. */
  n?: number;
  visited?: boolean;
  odd?: boolean;
  /** Somebody is broadcasting from there. */
  signal?: boolean;
}

const MAP_SIZE = 96;
const ZOOM_STEP = 4;

/** A star to put on a map: numbered if it is in the list underneath. */
interface Pin {
  seen: Seen;
  n?: number;
  odd?: boolean;
  signal?: boolean;
}

/** Round a map's radius up to a figure that reads well in a caption. */
function roundUp(ly: number): number {
  return [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32, 40, 50, 64, 80, 100].find((r) => r >= ly) ?? Math.ceil(ly / 50) * 50;
}

/** Gas density as one of 36 shades: a character from '0' to 'z', evenly spaced in the logarithm from 0.01 to 100 atoms per cm^3. */
function gasShade(n: number): string {
  const t = (Math.log10(Math.max(n, 1e-6)) + 2) / 4;
  return Math.round(35 * Math.min(1, Math.max(0, t))).toString(36);
}
const TONE: Record<StarKind, MapStar['tone']> = {
  M: 'warm', K: 'warm', BD: 'warm', RG: 'warm', RSG: 'warm',
  G: 'gold', F: 'gold', SG: 'gold',
  A: 'white', B: 'white', O: 'white', WR: 'white',
  WD: 'cold', PSR: 'cold', BH: 'cold', MAG: 'cold',
};

export interface Status {
  mind: string;
  system: string;
  aboard: string;
  outside: string;
  fuel: number;
  shield: number;
  hull: number;
  materials: number;
  hold: number;
  archive: number;
}

/** How a culture's phase reads in a sentence: "they are ...". */
const PHASE_WORD: Record<Phase, string> = {
  founding: 'newly risen',
  rising: 'rising',
  height: 'at their height',
  decline: 'in decline',
  ruins: 'gone',
  'old ruins': 'long gone',
};

/** A length of time, rounded the way one talks about the dead: "about 1,400 years". */
function roughly(years: number): string {
  const digits = Math.max(0, Math.floor(Math.log10(Math.max(1, years))) - 1);
  const unit = 10 ** digits;
  return `about ${(Math.max(1, Math.round(years / unit)) * unit).toLocaleString('en-US')} years`;
}

/** Something a deep scan can be pointed at: an oddity the survey flagged, or a ruin. */
interface ScanTarget {
  body: number;
  days: number;
  feature?: FeatureDef;
  site?: Site;
}

const PLUS = ['', '', '+', '++'];
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const ordinal = (n: number) => ORDINALS[n] ?? `${n}th`;
const RICH = ['none', 'thin', 'fair', 'rich'];
const ALIASES: Record<string, string> = {
  l: 'look', sw: 'sweep', o: 'ops', s: 'stay', wait: 'stay', c: 'chart', sc: 'scope', p: 'plot',
  b: 'burn', go: 'burn', a: 'ask', st: 'ship', status: 'ship', j: 'log', journal: 'log', h: 'help', '?': 'help',
  cut: 'ice', stop: 'recall', idle: 'recall', codex: 'finds', upgrades: 'refits', fix: 'repair',
  map: 'look', system: 'look', sys: 'look', jump: 'burn', nav: 'chart', crews: 'ops', crew: 'ops', work: 'ops',
  far: 'gas', wide: 'gas', lanes: 'gas',
};
const VERBS = [
  'look', 'sweep', 'ops', 'scoop', 'ice', 'mine', 'survey', 'scan', 'repair', 'recall', 'stay', 'chart', 'gas',
  'scope', 'plot', 'burn', 'drift', 'ask', 'ship', 'refits', 'refit', 'log', 'finds', 'name', 'help',
];

/** How many single-letter edits turn one word into another. */
function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next.push(Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    row = next;
  }
  return row[b.length];
}

/** Gas density as a map character, thinnest first. */
const gasLevel = (n: number) => (n >= 10 ? 4 : n >= 1.2 ? 3 : n >= 0.2 ? 2 : n >= 0.03 ? 1 : 0);
const shade = (n: number) => ' .:%#'[gasLevel(n)];

export class Game {
  readonly galaxy: Galaxy;
  readonly cultures: Cultures;
  state: State;
  private systems = new Map<string, StarSystem>();
  private out: Out[] = [];
  /** The last command, so the suggestion chips can follow the conversation. */
  private lastVerb = '';
  private lastZoom: Zoom = 'mid';

  constructor(state: State, cfg: GalaxyConfig = DEMO) {
    this.galaxy = new Galaxy({ ...cfg, seed: state.seed });
    this.cultures = new Cultures(this.galaxy, (ref) => this.systemAt(ref));
    this.state = state;
  }

  static fresh(seed: number = DEMO.seed, cfg: GalaxyConfig = DEMO): Game {
    const galaxy = new Galaxy({ ...cfg, seed });
    return new Game(freshState(galaxy, seed), cfg);
  }

  static load(text: string, cfg: GalaxyConfig = DEMO): Game {
    const state = JSON.parse(text) as State;
    if (typeof state.v === 'number' && state.v < SAVE_VERSION) throw new Error('a save from an older version');
    if (state.v !== SAVE_VERSION || typeof state.seed !== 'number' || !state.ship || !state.mem) throw new Error('not a save from this game');
    const game = new Game(state, cfg);
    if (!game.galaxy.ref(state.at)) throw new Error('save points at a system that does not exist');
    return game;
  }

  save(): string {
    return JSON.stringify(this.state);
  }

  // ---- small accessors ----------------------------------------------------

  private systemAt(ref: SysRef): StarSystem {
    let sys = this.systems.get(ref.id);
    if (!sys) {
      sys = generateSystem(this.galaxy, ref);
      if (this.systems.size > 12000) this.systems.clear();
      this.systems.set(ref.id, sys);
    }
    return sys;
  }

  private system(id: string): StarSystem {
    const hit = this.systems.get(id);
    if (hit) return hit;
    const ref = this.galaxy.ref(id);
    if (!ref) throw new Error(`unknown system ${id}`);
    return this.systemAt(ref);
  }

  /** Who is at a system right now. Defaults to the one we are in. */
  people(id: string = this.state.at): Presence {
    return this.cultures.presence(this.system(id), this.state.tGal);
  }

  /** What the light from a system shows of anyone living there, if their radio carries this far. */
  private heard(seen: Seen): Site | null {
    return seen.dist <= HEARING ? this.cultures.heard(this.systemAt(seen.ref), this.state.tGal, seen.dist) : null;
  }

  get here(): StarSystem {
    return this.system(this.state.at);
  }

  private get mem(): Memory {
    return this.state.mem[this.state.at];
  }

  private nameOf(id: string): string {
    return this.state.mem[id]?.name ?? this.system(id).name;
  }

  private get tag(): string {
    return MIND_NAMES[this.state.mind.name].tag;
  }

  private get tank(): number {
    return level(this.state, 'tanks');
  }

  /** The Wrights throttle the drive when the hull is badly damaged. */
  private get throttled(): boolean {
    return this.state.ship.hull < TUNE.HULL_THROTTLE;
  }

  private get drive() {
    return { thrust: level(this.state, 'engine') * (this.throttled ? TUNE.THROTTLE : 1), hull: level(this.state, 'hull') };
  }

  private get fuelPct(): number {
    return (100 * this.state.ship.fuel) / this.tank;
  }

  // ---- output -------------------------------------------------------------

  private text(s: string) {
    this.out.push({ k: 'text', s });
  }
  private pre(lines: string[]) {
    this.out.push({ k: 'pre', s: lines.join('\n') });
  }
  private dim(s: string) {
    this.out.push({ k: 'dim', s });
  }
  private good(s: string) {
    this.out.push({ k: 'good', s });
  }
  private mindSays(s: string) {
    this.out.push({ k: 'mind', s: `${this.tag}: ${s}` });
  }
  /** Have the Mind say a line from a pool, if the pool exists. */
  private say(pool: string, vars: Record<string, string | number> = {}) {
    const line = speak(this.state.mind, this.state.seed, pool, vars);
    if (line) this.mindSays(line);
  }
  /** Say something from a pool only once per game. */
  private sayOnce(key: string, pool: string, vars: Record<string, string | number> = {}) {
    if (this.state.mind.said.includes(key)) return;
    this.state.mind.said.push(key);
    this.say(pool, vars);
  }
  private note(text: string) {
    this.state.journal.push({ g: this.state.tGal, text });
    if (this.state.journal.length > 300) this.state.journal.splice(0, 100);
  }

  // ---- the front door -----------------------------------------------------

  /** Opening lines for a new game. */
  intro(): Out[] {
    this.out = [];
    const sys = this.here;
    const where = sys.ref.cluster ? `in the ${sys.ref.cluster.name} cluster` : `in the ${this.galaxy.sector(sys.ref.x, sys.ref.y)}`;
    this.out.push({ k: 'head', s: MIND_NAMES[this.state.mind.name].name.toUpperCase() });
    this.dim('a worldship, and the Mind that runs it');
    this.mindSays('Navigator. You asked to be woken when there was something to decide.');
    this.mindSays(
      `We are in orbit at ${sys.name}, ${where}. Tanks at ${Math.round(this.fuelPct)}%. The drive is the one we were launched with, which is to say modest.`,
    );
    this.mindSays('The stars are close together here. I suggest we learn the neighbourhood before we try anything long.');
    if (this.state.guide !== undefined) this.mindSays(GUIDE.start);
    this.dim('Type a command or tap one below: "sweep" to begin. "help" lists them all.');
    return this.out;
  }

  exec(input: string): Out[] {
    this.out = [];
    const line = input.trim();
    if (!line) return this.out;
    this.out.push({ k: 'echo', s: `> ${line}` });
    const [first, ...rest] = line.split(/\s+/);
    const verb = ALIASES[first.toLowerCase()] ?? first.toLowerCase();
    const arg = rest.join(' ');
    switch (verb) {
      case 'look': this.look(); break;
      case 'sweep': this.sweep(); break;
      case 'ops': this.ops(); break;
      case 'scoop': case 'ice': case 'mine': case 'survey': case 'scan': case 'repair':
        this.assign(verb, arg); break;
      case 'recall': this.recall(arg); break;
      case 'stay': this.stay(arg); break;
      case 'chart': this.chart(arg); break;
      case 'gas': this.chart('far'); break;
      case 'scope': this.scope(arg); break;
      case 'plot': this.plot(arg); break;
      case 'burn': this.burn(arg); break;
      case 'drift': this.drift(); break;
      case 'ask': this.ask(); break;
      case 'ship': this.ship(); break;
      case 'refits': this.refits(); break;
      case 'refit': this.refit(arg); break;
      case 'log': this.log(); break;
      case 'finds': this.finds(); break;
      case 'name': this.rename(arg); break;
      case 'help': this.help(); break;
      default: {
        const near = VERBS.map((v) => ({ v, d: editDistance(verb, v) })).sort((a, b) => a.d - b.d)[0];
        const guess = near.d <= 2 && near.d < verb.length ? ` Did you mean "${near.v}"?` : '';
        this.text(`"${first}" is not something I know how to do.${guess} "help" lists what is.`);
      }
    }
    this.lastVerb = verb;
    this.guide(verb);
    return this.out;
  }

  /**
   * The first visit of a new voyage: the Mind explains each step once, as the
   * navigator reaches it, and then stops for good. Driven by what has
   * actually happened, so steps taken out of order are simply skipped.
   */
  private guide(verb: string) {
    const s = this.state;
    if (s.guide === undefined) return;
    if (s.stats.jumps > 0) {
      this.mindSays(GUIDE.done);
      s.guide = undefined;
    } else if (s.guide === 0 && this.mem.swept) {
      const giant = this.here.bodies.filter((b) => b.fuel > 0).sort((a, b) => b.fuel - a.fuel)[0];
      if (giant) {
        this.mindSays(fill(GUIDE.swept, { where: capital(bodyRef(this.here, giant.n)) }));
        this.dim(fill(GUIDE.sweptHint, { n: giant.n }));
      } else {
        this.mindSays(GUIDE.sweptBare);
        this.dim(GUIDE.sweptBareHint);
      }
      s.guide = 1;
    } else if (s.guide === 1 && s.crews.some((c) => c !== null)) {
      this.mindSays(GUIDE.working);
      this.dim(GUIDE.workingHint);
      s.guide = 2;
    } else if (s.guide === 2 && verb === 'stay' && s.tShip > 0) {
      this.mindSays(GUIDE.stayed);
      this.dim(GUIDE.stayedHint);
      s.guide = 3;
    } else if (s.guide <= 3 && (verb === 'chart' || verb === 'gas') && s.chart.length) {
      this.mindSays(GUIDE.charted);
      this.dim(GUIDE.chartedHint);
      s.guide = 4;
    }
  }

  status(): Status {
    const s = this.state;
    return {
      mind: MIND_NAMES[s.mind.name].name,
      system: this.nameOf(s.at),
      aboard: clock(s.tShip),
      outside: clock(s.tGal),
      fuel: this.fuelPct,
      shield: s.ship.shield,
      hull: s.ship.hull,
      materials: s.ship.materials,
      hold: level(s, 'hold'),
      archive: s.ship.archive,
    };
  }

  /** Commands worth offering as one-tap buttons right now. */
  chips(): string[] {
    const s = this.state;
    if (!this.mem.swept) return ['sweep', 'chart', 'ship', 'ask', 'help'];
    if ((this.lastVerb === 'chart' || this.lastVerb === 'gas') && s.chart.length) {
      const others = (['chart close', 'chart', 'chart far'] as const).filter((_, i) => i !== ['close', 'mid', 'far'].indexOf(this.lastZoom));
      return [...s.chart.slice(0, 5).map((_, i) => `plot ${i + 1}`), 'scope 1', ...others, 'look'];
    }
    if ((this.lastVerb === 'plot' || this.lastVerb === 'scope') && s.plot) return ['burn', 'burn eco', 'chart', 'look'];
    const chips: string[] = [];
    if (s.crews.some((c) => c === null)) {
      for (const job of this.suggestions()) if (chips.length < 3) chips.push(job);
    }
    if (s.crews.some((c) => c !== null)) chips.push('stay', 'stay 30');
    const refitReady = (Object.keys(REFITS) as RefitTrack[]).some((t) => this.refitState(t) === 'ready');
    if (refitReady && s.crews.some((c) => c === null)) chips.push('refits');
    // The same five always close the row, so they are where the thumb expects them.
    chips.push('look', 'ops', 'chart', 'ship', 'ask');
    // While the walkthrough is pointing at the chart, put it first.
    if (s.guide === 3) return ['chart', ...chips.filter((c) => c !== 'chart')];
    return chips;
  }

  // ---- looking at the system ---------------------------------------------

  /** Has the survey characterised this body yet? */
  private charted(n: number): boolean {
    const found = this.here.discoveries.slice(0, this.mem.found);
    return found.some((d) => d.type === 'body' && d.body === n);
  }

  /** Deep finds the survey has hinted at and nobody has scanned yet. */
  private hints(): Discovery[] {
    return this.here.discoveries
      .slice(0, this.mem.found)
      .filter((d) => d.feature?.hint && !this.mem.scanned.includes(d.feature.id));
  }

  /** Bodies that are somebody's living home. We take nothing from those. */
  private homes(): Set<number> {
    return new Set(this.people().sites.filter((x) => x.alive && x.kind === 'home').map((x) => x.body));
  }

  /** Ruins here that nobody has read yet. They only show once the system has been swept. */
  private ruins(): Site[] {
    if (!this.mem.swept) return [];
    return this.people().sites.filter((x) => !x.alive && !this.mem.sites.includes(x.culture.id));
  }

  /** Everything here that a deep scan could be pointed at. */
  private scanTargets(): ScanTarget[] {
    const out: ScanTarget[] = this.hints().map((d) => ({ body: d.body, days: TUNE.SCAN_DAYS[d.feature!.rarity], feature: d.feature }));
    for (const site of this.ruins()) out.push({ body: site.body, days: site.kind === 'home' ? CIV.DIG_HOME : CIV.DIG_OUTPOST, site });
    return out;
  }

  private workWords(b: Body): string {
    if (b.kind === 'star') return STARS[this.here.star].wind ? 'wind' : '-';
    const mark = (r: number) => (this.charted(b.n) ? PLUS[r] : '?');
    const parts: string[] = [];
    if (b.fuel) parts.push(`fuel${mark(b.fuel)}`);
    if (b.ice) parts.push(`ice${mark(b.ice)}`);
    if (b.ore) parts.push(`ore${mark(b.ore)}`);
    while (parts.join(' ').length > 12) parts.pop();
    return parts.join(' ') || '-';
  }

  private systemTable(): string[] {
    const sys = this.here;
    const hinted = new Set(this.scanTargets().map((t) => t.body));
    const lived = new Set(this.people().sites.filter((x) => x.alive).map((x) => x.body));
    const glyph: Record<string, string> = {
      star: '*', scorched: '.', rocky: 'o', desert: 'o', ocean: 'o', ice: 'o', dwarf: '.',
      gas: 'O', icegiant: 'O', belt: ':::', comets: "' ' '",
    };
    // A strip of the system, bodies in order outward, with their numbers underneath.
    let strip = ' ';
    let index = ' ';
    for (const b of sys.bodies) {
      const g = glyph[b.kind];
      const cell = Math.max(g.length + 2, 4);
      strip += pad(g, cell);
      index += pad(b.n === 0 ? '' : String(b.n), cell);
    }
    const lines = [strip.trimEnd(), index.trimEnd(), '', ' #  body                  au  work'];
    for (const b of sys.bodies) {
      const au = b.n === 0 ? '-' : b.au < 1 ? b.au.toFixed(2) : b.au < 10 ? b.au.toFixed(1) : String(Math.round(b.au));
      const mark = hinted.has(b.n) ? '!' : lived.has(b.n) ? '^' : ' ';
      lines.push(`${lpad(String(b.n), 2)}${mark} ${pad(bodyLabel(b), 19)}${lpad(au, 5)}  ${this.workWords(b)}`);
    }
    return lines;
  }

  /** The full description the first time we meet a kind of star, a shorter line after that. */
  private starText(sys: StarSystem): string {
    const info = STARS[sys.star];
    if (!this.state.seen[`star:${sys.star}`]) return info.text;
    return info.again[strHash(sys.ref.id) % info.again.length];
  }

  private heading() {
    const sys = this.here;
    const place = sys.ref.cluster ? `${sys.ref.cluster.name} cluster` : this.galaxy.sector(sys.ref.x, sys.ref.y);
    const feh = `${sys.feh >= 0 ? '+' : '-'}${Math.abs(sys.feh).toFixed(2)}`;
    this.out.push({ k: 'head', s: `${this.nameOf(sys.ref.id).toUpperCase()} · ${starLine(sys)}` });
    this.dim(`${place} · gas ${Galaxy.gasWord(this.galaxy.gas(sys.ref.x, sys.ref.y))} · [Fe/H] ${feh}`);
    const who = this.whoLine();
    if (who) this.dim(who);
  }

  /** One line on who is here now, for the heading. */
  private whoLine(): string | null {
    const { sites, claims } = this.people();
    const parts: string[] = [];
    const here = new Set<string>();
    for (const site of sites) {
      if (!site.alive) continue;
      here.add(site.culture.id);
      parts.push(site.kind === 'home' ? `home of ${site.culture.title}, ${PHASE_WORD[site.phase]}` : `an outpost of ${site.culture.title}`);
    }
    for (const c of claims) if (!here.has(c.id)) parts.push(`inside the space of ${c.title}`);
    return parts.length ? capital(parts.join(' · ')) : null;
  }

  // ---- other people ------------------------------------------------------

  /** Add a culture to those we know of. True if this is the first we have known of them in this way. */
  private learn(c: Culture, how: 'met' | 'ruins'): boolean {
    const s = this.state;
    const known = s.met[c.id];
    if (!known) {
      s.met[c.id] = { title: c.title, home: c.home.id, t: s.tGal, how };
      return true;
    }
    if (how === 'met' && known.how === 'ruins') {
      known.how = 'met';
      return true;
    }
    return false;
  }

  /** Describe a living site, and take note of its people if they are new to us. */
  private meet(site: Site, back: boolean) {
    const s = this.state;
    const sys = this.here;
    const c = site.culture;
    const n = strHash(c.id + sys.ref.id);
    const kind = sys.bodies[site.body].kind;
    const where = capital(bodyRef(sys, site.body));
    const since = back ? ' They were not here when we last came.' : '';
    if (site.kind === 'home') {
      const extent = frontier(c, s.tGal);
      const holds = extent >= 1 ? ` Their space runs ${ly(extent)} light-years out from here.` : '';
      this.text(`${where}: ${settledText(kind, true, n)}. Somebody is home: ${c.title}, ${PHASE_WORD[site.phase]}.${holds}${since}`);
    } else {
      const d = Math.hypot(c.home.x - sys.ref.x, c.home.y - sys.ref.y);
      this.text(`${where}: ${settledText(kind, false, n)}. An outpost of ${c.title}, whose home is ${this.nameOf(c.home.id)}, ${ly(d)} light-years off.${since}`);
    }
    // The same world can raise the same people again under another name.
    const kin = Object.entries(s.met).find(([id, m]) => id !== c.id && m.home === c.home.id)?.[1];
    if (!this.learn(c, 'met')) return;
    const first = !s.mind.said.includes('civ_first');
    this.text(kin ? `The same people we know as ${kin.title}, under a newer name.` : c.sketch);
    const credit = CIV.MEET_ARCHIVE * (c.reach ? 2 : 1) * (first ? 2 : 1);
    s.ship.archive += credit;
    this.good(`${capital(c.title)}: a people new to the Archive. (+${credit})`);
    this.note(`Met ${c.title} at ${this.nameOf(sys.ref.id)}.`);
    if (first) {
      this.sayOnce('civ_first', 'civ_first');
      this.dim('For now they can only be watched. Dealing with them comes in a later build.');
    } else {
      this.say(kin ? 'civ_same' : back ? 'civ_new' : site.kind === 'outpost' ? 'civ_outpost' : 'civ_arrive');
    }
  }

  /** Point out a ruin the sweep has picked up. Whose it was takes a deep scan. */
  private noticeRuin(site: Site) {
    const s = this.state;
    const sys = this.here;
    const hint = ruinHint(sys.bodies[site.body].kind, strHash(site.culture.id + sys.ref.id));
    this.out.push({ k: 'alert', s: renderFeature(sys, site.body, hint, site.culture.id) });
    this.dim(`"scan ${site.body}" would say whose it was, in about ${site.kind === 'home' ? CIV.DIG_HOME : CIV.DIG_OUTPOST} days.`);
    if (s.visit.ruins) return;
    s.visit.ruins = true;
    // The Mind remarks on the first ruin ever, and on about half of those after.
    if (!s.mind.said.includes('ruin_first')) this.sayOnce('ruin_first', 'civ_ruins');
    else if (s.stats.systems % 2 === 0) this.say('civ_ruins');
  }

  /**
   * Take stock of who is here: say what has become of those we knew, greet
   * anyone new, and point out ruins once the system has been swept. What we
   * see is remembered, so that the next visit can tell the difference.
   *
   * `when` is the occasion: arriving, the first sweep, or the end of a stay
   * during which something changed.
   */
  private takeNote(when: 'arrive' | 'sweep' | 'stay') {
    const s = this.state;
    const sys = this.here;
    const mem = this.mem;
    const now = this.people();
    const before = mem.seen;
    const back = when === 'arrive' && mem.visits > 1;
    const name = this.nameOf(sys.ref.id);
    if (when !== 'sweep') {
      let weathered = false;
      for (const note of before) {
        const site = now.sites.find((x) => x.culture.id === note.id);
        const title = s.met[note.id]?.title;
        if (!isLiving(note.phase)) {
          weathered ||= !site;
        } else if (!title) {
          continue;
        } else if (!site) {
          this.out.push({ k: 'alert', s: `Nothing is left of ${title}. Not a wall, not a signal.` });
          this.note(`${capital(title)} were gone from ${name} when we came back.`);
          this.say('civ_gone');
        } else if (!site.alive) {
          this.out.push({
            k: 'alert',
            s: `${capital(title)} are gone. What they built still stands on ${bodyRef(sys, site.body)}, empty for ${roughly(s.tGal - site.since)}.`,
          });
          this.note(when === 'stay' ? `${capital(title)} ended at ${name} while we were in orbit.` : `${capital(title)} were gone from ${name} when we came back.`);
          this.say('civ_gone');
        } else if (site.phase !== note.phase) {
          this.text(`${capital(title)} were ${PHASE_WORD[note.phase]} when we ${when === 'stay' ? 'arrived' : 'were last here'}. They are ${PHASE_WORD[site.phase]} now.`);
        } else if (when === 'arrive') {
          this.text(`${capital(title)} are still here, ${PHASE_WORD[site.phase]}.`);
        }
      }
      if (weathered) this.dim('The ruins we logged here have weathered away to nothing.');
    }
    const notes: SiteNote[] = [];
    for (const site of now.sites) {
      const known = before.find((note) => note.id === site.culture.id);
      if (site.alive) {
        if (!known) this.meet(site, back);
      } else if (!known) {
        // Ruins nobody has pointed out yet: only a swept system shows them.
        if (!mem.swept) continue;
        if (!mem.sites.includes(site.culture.id)) this.noticeRuin(site);
      }
      notes.push({ id: site.culture.id, phase: site.phase });
    }
    mem.seen = notes;
  }

  // ---- looking, continued -------------------------------------------------

  private look() {
    const sys = this.here;
    this.heading();
    if (!this.mem.swept) {
      this.text(`${this.starText(sys)} Nothing else here has been looked at yet.`);
      return;
    }
    this.pre(this.systemTable());
    const k = sys.discoveries.length;
    const lived = this.people().sites.some((x) => x.alive);
    const legend = [`survey ${k ? Math.round((100 * this.mem.found) / k) : 100}%`, '! marks something worth a deep scan'];
    if (lived) legend.push('^ somebody lives there');
    if (k || lived || this.scanTargets().length) this.dim(legend.join(' · '));
  }

  private sweep() {
    const sys = this.here;
    const s = this.state;
    if (this.mem.swept) {
      this.look();
      return;
    }
    this.mem.swept = true;
    this.heading();
    if (!s.visit.starShown) this.text(this.starText(sys));
    s.visit.starShown = true;
    this.pre(this.systemTable());
    let credit = 2;
    const key = `star:${sys.star}`;
    if (!s.seen[key]) {
      credit += 4;
      this.good(`First ${STARS[sys.star].name} in the Archive.`);
    }
    s.seen[key] = (s.seen[key] ?? 0) + 1;
    s.ship.archive += credit;
    const bodies = sys.bodies.length - 1;
    this.dim(`${bodies === 0 ? 'No bodies' : bodies === 1 ? 'One body' : `${bodies} bodies`} resolved. Archive +${credit}. A survey would say what they are worth.`);
    this.takeNote('sweep');

    const has = (f: (b: Body) => boolean) => sys.bodies.some(f);
    if (sys.anomaly) this.say('sweep_anomaly');
    else if (bodies === 0) this.say('sweep_empty');
    else if (sys.giants === 0) this.say('sweep_nogiant');
    else if (has((b) => b.ice > 0) && has((b) => b.ore > 1) && bodies >= 5) this.say('sweep_rich');
    this.sayOnce(`star_${sys.star}`, `star_${sys.star}`);
  }

  // ---- crews and work -----------------------------------------------------

  /** Days of survey effort at which the k-th discovery (1-based) turns up. */
  private surveyDay(k: number): number {
    const total = this.here.discoveries.length;
    const tau = TUNE.SURVEY_A + TUNE.SURVEY_B * total;
    return -tau * Math.log(1 - (k - 0.5) / total);
  }

  private describe(a: Assignment): string {
    const sys = this.here;
    const s = this.state;
    const eta = (days: number) => (isFinite(days) ? `${Math.max(1, Math.ceil(days))} d` : 'never');
    switch (a.op) {
      case 'scoop': {
        const rate = this.scoopRate(sys.bodies[a.body]);
        return `scoop ${bodyRef(sys, a.body)}: full in ${eta((100 - this.fuelPct) / rate)}`;
      }
      case 'ice':
        return `ice from ${bodyRef(sys, a.body)}: whole in ${eta((100 - s.ship.shield) / TUNE.ICE[sys.bodies[a.body].ice])}`;
      case 'mine':
        return `mine ${bodyRef(sys, a.body)}: ${TUNE.ORE[sys.bodies[a.body].ore]} a day`;
      case 'survey': {
        const next = this.mem.found < sys.discoveries.length ? this.surveyDay(this.mem.found + 1) - this.mem.effort : Infinity;
        return `survey: next find in about ${eta(next)}`;
      }
      case 'scan':
        return `deep scan of ${bodyRef(sys, a.body)}: ${eta((a.need ?? 0) - a.days)} left`;
      case 'repair':
        return `repairs: hull ${Math.round(s.ship.hull)}%`;
      case 'refit':
        return `refit ${a.track}: ${eta((a.need ?? 0) - a.days)} left`;
    }
  }

  private scoopRate(b: Body): number {
    return b.kind === 'star' ? TUNE.WIND : TUNE.SCOOP[b.fuel];
  }

  /** Jobs a free crew could usefully take, most pressing first. */
  private suggestions(): string[] {
    const sys = this.here;
    const s = this.state;
    if (!this.mem.swept) return [];
    const busy = (op: Op, body = -1) => s.crews.some((c) => c && c.op === op && (body < 0 || c.body === body));
    const homes = this.homes();
    const best = (key: 'fuel' | 'ice' | 'ore') =>
      sys.bodies.filter((b) => b[key] > 0 && !homes.has(b.n)).sort((a, b) => b[key] - a[key])[0];
    const jobs: string[] = [];
    const giant = best('fuel');
    if (this.fuelPct < 90 && !busy('scoop')) {
      if (giant) jobs.push(`scoop ${giant.n}`);
      else if (STARS[sys.star].wind && this.fuelPct < 40) jobs.push('scoop 0');
    }
    const ice = best('ice');
    if (ice && s.ship.shield < 90 && !busy('ice')) jobs.push(`ice ${ice.n}`);
    for (const body of new Set(this.scanTargets().map((t) => t.body))) if (!busy('scan', body)) jobs.push(`scan ${body}`);
    if (this.mem.found < sys.discoveries.length && !busy('survey')) jobs.push('survey');
    if (s.ship.hull < 85 && s.ship.materials >= 5 && !busy('repair')) jobs.push('repair');
    const ore = best('ore');
    if (ore && s.ship.materials < level(s, 'hold') - 5 && !busy('mine')) jobs.push(`mine ${ore.n}`);
    return jobs;
  }

  private ops() {
    const sys = this.here;
    const s = this.state;
    if (!this.mem.swept) {
      this.text('Nothing here has been looked at yet. Sweep first.');
      return;
    }
    const lines: string[] = [];
    s.crews.forEach((c, i) => lines.push(` crew ${i + 1}  ${c ? this.describe(c) : 'idle'}`));
    lines.push('', ' work here');
    const open = sys.bodies.filter((b) => !this.homes().has(b.n));
    for (const b of open) {
      const rate = this.scoopRate(b);
      if (b.kind === 'star' ? STARS[sys.star].wind : b.fuel > 0) {
        lines.push(`  ${pad(`scoop ${b.n}`, 9)} fuel +${rate}%/day${b.kind === 'star' ? ' (wind)' : ''}`);
      }
    }
    for (const b of open) if (b.ice) lines.push(`  ${pad(`ice ${b.n}`, 9)} shield +${TUNE.ICE[b.ice]}%/day`);
    for (const b of open) if (b.ore) lines.push(`  ${pad(`mine ${b.n}`, 9)} materials +${TUNE.ORE[b.ore]}/day`);
    const total = sys.discoveries.length;
    if (total) lines.push(`  ${pad('survey', 9)} ${Math.round((100 * this.mem.found) / total)}% done`);
    for (const t of this.scanTargets()) {
      lines.push(`  ${pad(`scan ${t.body}`, 9)} ${t.site ? 'ruins' : 'oddity'}, ~${t.days} days`);
    }
    if (s.ship.hull < 99.5) lines.push(`  ${pad('repair', 9)} hull ${Math.round(s.ship.hull)}%, ${TUNE.REPAIR_COST} mat per %`);
    this.pre(lines);
    this.dim('Assign with the command shown. "recall 1" frees a crew. "stay" lets the days run.');
  }

  private assign(op: Op, arg: string) {
    const sys = this.here;
    const s = this.state;
    if (!this.mem.swept) {
      this.text('Nothing here has been looked at yet. Sweep first.');
      return;
    }
    const free = s.crews.findIndex((c) => c === null);
    if (free < 0) {
      this.text(`${s.crews.length === 2 ? 'Both' : 'All'} crews are busy. Recall one first ("recall 1").`);
      return;
    }
    let body = -1;
    const job: Assignment = { op, body: -1, days: 0 };
    if (op === 'scoop' || op === 'ice' || op === 'mine' || op === 'scan') {
      body = Number(arg);
      const b = sys.bodies[body];
      if (arg === '' || !Number.isInteger(body) || !b) {
        this.text(`Which body? For example "${op} ${op === 'scoop' ? sys.bodies.find((x) => x.fuel)?.n ?? 0 : 1}".`);
        return;
      }
      if (s.crews.some((c) => c && c.op === op && c.body === body)) {
        this.text('A crew is already on that.');
        return;
      }
      const ref = bodyRef(sys, body);
      if (op !== 'scan' && this.homes().has(body)) {
        this.text(`${capital(ref)} is somebody's home. We take nothing from it.`);
        return;
      }
      if (op === 'scoop' && !(b.kind === 'star' ? STARS[sys.star].wind : b.fuel > 0)) {
        this.text(`There is nothing to scoop at ${ref}.`);
        return;
      }
      if (op === 'ice' && !b.ice) {
        this.text(`No ice worth cutting at ${ref}.`);
        return;
      }
      if (op === 'mine' && !b.ore) {
        this.text(`Nothing worth mining at ${ref}.`);
        return;
      }
      if (op === 'scan') {
        const target = this.scanTargets().find((t) => t.body === body);
        if (!target) {
          this.text(`Nothing at ${ref} asks for a deep scan. The survey flags what does.`);
          return;
        }
        if (target.site) job.site = target.site.culture.id;
        else job.feature = target.feature!.id;
        job.need = target.days;
      }
      job.body = body;
    }
    if (op === 'survey' && this.mem.found >= sys.discoveries.length) {
      this.text('The survey has nothing left to find here.');
      return;
    }
    if (op === 'repair') {
      if (s.ship.hull >= 99.5) {
        this.text('The hull is sound.');
        return;
      }
      if (s.ship.materials < 1) {
        this.text('The Wrights have nothing to mend with. Mine something first.');
        return;
      }
    }
    s.crews[free] = job;
    this.text(`Crew ${free + 1}: ${this.describe(job)}.`);
  }

  private recall(arg: string) {
    const s = this.state;
    if (arg === '' || arg === 'all') {
      s.crews = s.crews.map((c) => (c?.op === 'refit' ? c : null));
      this.text('Crews recalled.');
      return;
    }
    const i = Number(arg) - 1;
    const crew = s.crews[i];
    if (!Number.isInteger(i) || crew === undefined) {
      this.text(`There is no crew ${arg}.`);
      return;
    }
    if (crew?.op === 'refit') {
      this.text('That crew is mid-refit with the ship in pieces. They will finish.');
      return;
    }
    s.crews[i] = null;
    this.text(`Crew ${i + 1} recalled.`);
  }

  /** Log one survey discovery; returns true if it is rare enough to stop for. */
  private reveal(d: Discovery, day: number, charted: string[]): boolean {
    const sys = this.here;
    const s = this.state;
    const stamp = `Day ${day}. `;
    if (d.type === 'body') {
      const b = sys.bodies[d.body];
      const worth: string[] = [];
      if (b.fuel) worth.push(`fuel ${RICH[b.fuel]}`);
      if (b.ice) worth.push(`ice ${RICH[b.ice]}`);
      if (b.ore) worth.push(`ore ${RICH[b.ore]}`);
      s.ship.archive += TUNE.ARCHIVE_BODY;
      charted.push(`${bodyRef(sys, d.body)} (${worth.join(', ') || 'nothing to work'})`);
      return false;
    }
    const def = d.feature!;
    const before = s.seen[def.id] ?? 0;
    const base = TUNE.ARCHIVE[def.rarity];
    if (def.hint) {
      const credit = Math.max(1, Math.round(base * TUNE.HINT_SHARE));
      s.ship.archive += credit;
      this.out.push({ k: 'alert', s: `${stamp}${renderFeature(sys, d.body, def.hint, def.id)} (+${credit})` });
      this.dim(`"scan ${d.body}" would settle it, in about ${TUNE.SCAN_DAYS[def.rarity]} days.`);
      if (!s.visit.hinted) {
        s.visit.hinted = true;
        this.say('find_hint');
      }
      return true;
    }
    const credit = Math.max(1, Math.round(before === 0 ? base * TUNE.FIRST_BONUS : base / Math.sqrt(before + 1)));
    s.seen[def.id] = before + 1;
    s.ship.archive += credit;
    s.stats.finds++;
    if (before === 0 || def.rarity === 3) {
      this.text(`${stamp}${renderFeature(sys, d.body, def.text, def.id)} (+${credit}${before === 0 ? ', first logged' : ''})`);
    } else if (def.rarity === 2) {
      this.text(`${stamp}${capital(def.title)} again, at ${bodyRef(sys, d.body)}. The ${ordinal(before + 1)} in the Archive. (+${credit})`);
    } else {
      this.text(`${stamp}${capital(def.title)} again, at ${bodyRef(sys, d.body)}. (+${credit})`);
    }
    if (def.rarity >= 2) {
      this.note(`${capital(def.title)} at ${this.nameOf(sys.ref.id)}.`);
      if (before === 0 || def.rarity === 3) this.say(def.rarity === 3 ? 'find_exceptional' : 'find_rare');
      return true;
    }
    return false;
  }

  private finishScan(a: Assignment, day: number) {
    const sys = this.here;
    const s = this.state;
    const def = FEATURE_BY_ID[a.feature!];
    const before = s.seen[def.id] ?? 0;
    const share = TUNE.ARCHIVE[def.rarity] * (1 - TUNE.HINT_SHARE);
    const credit = Math.round(before === 0 ? share * TUNE.FIRST_BONUS : share);
    s.seen[def.id] = before + 1;
    s.ship.archive += credit;
    s.stats.finds++;
    this.mem.scanned.push(def.id);
    const again = before > 0 && def.rarity < 3;
    this.good(
      again
        ? `Day ${day}. Deep scan complete. ${capital(def.title)}, at ${bodyRef(sys, a.body)}. The ${ordinal(before + 1)} such place in the Archive.`
        : `Day ${day}. Deep scan complete. ${renderFeature(sys, a.body, def.text, def.id)}`,
    );
    this.dim(`${capital(RARITY_WORD[def.rarity])} find. Archive +${credit}${before === 0 ? ', first of its kind' : ''}.`);
    // Now and then there is something small enough to bring away.
    const relic = def.relic && mix(s.seed, K.RELIC, strHash(sys.ref.id), strHash(def.id)) / 4294967296 < def.relic.chance ? def.relic : null;
    if (relic) {
      s.ship.relics.push({ what: relic.what, kind: relic.kind, of: '', t: s.tGal });
      this.good(`The Wrights have brought ${relic.what} aboard.`);
    }
    if (!again) this.say(relic ? 'relic' : def.rarity === 3 ? 'find_exceptional' : 'find_rare');
    this.note(`${capital(def.title)} at ${this.nameOf(sys.ref.id)}.`);
  }

  /** A crew has finished reading a ruin: whose it was, what it adds to the Archive, and now and then something to carry away. */
  private finishRuin(a: Assignment, day: number) {
    const s = this.state;
    const sys = this.here;
    const id = a.site!;
    this.mem.sites.push(id);
    const c = this.cultures.byId(id);
    if (!c) return;
    const site = this.people().sites.find((x) => x.culture.id === id);
    const home = c.home.id === sys.ref.id;
    const old = site ? site.phase === 'old ruins' : true;
    const key = strHash(c.id + sys.ref.id);
    const before = s.seen.ruin ?? 0;
    const fresh = this.learn(c, 'ruins');
    const worth = CIV.RUIN_ARCHIVE[home ? 'home' : 'outpost'] * (old ? CIV.RUIN_OLD : 1) * (fresh ? 1 : 0.6) * (before === 0 ? TUNE.FIRST_BONUS : 1);
    const credit = Math.max(1, Math.round(worth));
    s.seen.ruin = before + 1;
    s.ship.archive += credit;
    s.stats.finds++;
    const found = renderFeature(sys, a.body, fill(ruinText(sys.bodies[a.body].kind, home, key), { who: c.name }), c.id);
    this.good(`Day ${day}. Deep scan complete. ${found}${site ? ` Empty for ${roughly(s.tGal - site.since)}.` : ''}`);
    if (fresh) this.text(`By their own account: ${c.sketch}`);
    this.dim(`${old ? 'Old ruins' : 'Ruins'} of ${c.title}${home ? ', on their home world' : ''}. Archive +${credit}${before === 0 ? ', the first ruin read' : ''}.`);
    this.note(`Read the ruins of ${c.title} at ${this.nameOf(sys.ref.id)}.`);
    // The same ruin always holds the same thing, or nothing; old ones have less left.
    const roll = mix(s.seed, K.RELIC, strHash(c.id), strHash(sys.ref.id)) / 4294967296;
    if (roll < CIV.RELIC[home ? 'home' : 'outpost'] * (old ? CIV.RUIN_OLD : 1)) {
      const relic = relicFrom(c.genes, new Stream(s.seed, K.RELIC, strHash(c.id), strHash(sys.ref.id), 1));
      s.ship.relics.push({ ...relic, of: c.name, t: s.tGal });
      this.good(`The Wrights have brought something out of it: ${relic.what}.`);
      this.note(`Took ${relic.what} from the ruins at ${this.nameOf(sys.ref.id)}.`);
      this.say('relic');
    } else if (fresh) {
      this.say('ruin_read');
    }
  }

  private stay(arg: string) {
    const s = this.state;
    const sys = this.here;
    let days = 0;
    let auto = false;
    if (arg === '') {
      auto = true;
      days = 400;
    } else {
      const m = /^(\d+(?:\.\d+)?)\s*([a-z]*)$/i.exec(arg);
      if (!m) {
        this.text('How long? For example "stay 30", "stay 6w", "stay 3m" or "stay 1y".');
        return;
      }
      const unit = m[2].toLowerCase();
      const scale = unit.startsWith('y') ? DAYS : unit.startsWith('m') ? 30.4 : unit.startsWith('w') ? 7 : 1;
      days = Math.min(3653, Math.max(1, Math.round(Number(m[1]) * scale)));
    }
    if (auto && s.crews.every((c) => c === null)) {
      this.text('No crew is working, so nothing would change but the date. Give a number of days to wait anyway.');
      return;
    }

    const before = { fuel: this.fuelPct, shield: s.ship.shield, hull: s.ship.hull, materials: s.ship.materials, archive: s.ship.archive };
    const hold = level(s, 'hold');
    const charted: string[] = [];
    let idle = 0;
    let worked = false;
    let passed = 0;
    let stop = false;
    // Day stamps count from arrival, so a long visit reads as one continuous log.
    const day0 = Math.round((s.tShip - s.visit.arrived) * DAYS);
    for (let n = 1; n <= days && !stop; n++) {
      passed = n;
      const day = day0 + n;
      for (let i = 0; i < s.crews.length; i++) {
        const a = s.crews[i];
        if (!a) {
          idle++;
          continue;
        }
        const done = (why: string) => {
          s.crews[i] = null;
          this.text(`Day ${day}. Crew ${i + 1}: ${why}`);
          if (auto) stop = true;
        };
        a.days++;
        worked = true;
        switch (a.op) {
          case 'scoop':
            s.ship.fuel = Math.min(this.tank, s.ship.fuel + (this.scoopRate(sys.bodies[a.body]) / 100) * this.tank);
            if (s.ship.fuel >= this.tank) done('tanks full.');
            break;
          case 'ice':
            s.ship.shield = Math.min(100, s.ship.shield + TUNE.ICE[sys.bodies[a.body].ice]);
            if (s.ship.shield >= 100) done('shield whole.');
            break;
          case 'mine':
            s.ship.materials = Math.min(hold, s.ship.materials + TUNE.ORE[sys.bodies[a.body].ore]);
            if (s.ship.materials >= hold) done('the hold is full.');
            break;
          case 'survey': {
            this.mem.effort++;
            const total = sys.discoveries.length;
            while (this.mem.found < total && this.mem.effort >= this.surveyDay(this.mem.found + 1)) {
              const rare = this.reveal(sys.discoveries[this.mem.found++], day, charted);
              if (rare && auto) stop = true;
            }
            if (this.mem.found >= total) {
              s.ship.archive += 5;
              done('survey complete. System fully charted. (+5)');
              if (s.stats.systems % 3 === 0) this.say('survey_done');
            } else if (!s.visit.slow && this.mem.found / total > 0.7) {
              s.visit.slow = true;
              if (s.stats.systems % 3 === 1) this.say('survey_slow');
            }
            break;
          }
          case 'scan':
            if (a.days >= (a.need ?? 0)) {
              if (a.site) this.finishRuin(a, day);
              else this.finishScan(a, day);
              s.crews[i] = null;
              if (auto) stop = true;
            }
            break;
          case 'repair': {
            const step = Math.min(TUNE.REPAIR_RATE, 100 - s.ship.hull, s.ship.materials / TUNE.REPAIR_COST);
            s.ship.hull += step;
            s.ship.materials -= step * TUNE.REPAIR_COST;
            if (s.ship.hull >= 99.99) done('hull sound.');
            else if (s.ship.materials < 0.01) done('out of materials; repairs stop.');
            break;
          }
          case 'refit':
            if (a.days >= (a.need ?? 0)) {
              const track = a.track!;
              s.ship.levels[track]++;
              if (track === 'crews') s.crews.push(null);
              const info = REFITS[track];
              this.good(`Day ${day}. Refit complete: ${info.label.toLowerCase()} now ${level(s, track)}${info.unit ? ` ${info.unit}` : ''}.`);
              this.note(`Refit at ${this.nameOf(s.at)}: ${info.label.toLowerCase()} ${level(s, track)}.`);
              if (track === 'tanks') this.dim(`Bigger tanks, the same fuel: the gauge now reads ${Math.round(this.fuelPct)}%.`);
              this.say('refit_done');
              s.crews[i] = null;
              if (auto) stop = true;
            }
            break;
        }
      }
      s.tShip += 1 / DAYS;
      s.tGal += 1 / DAYS;
      s.ship.hull = Math.max(TUNE.HULL_FLOOR, s.ship.hull - TUNE.AGE_WEAR / DAYS);
    }

    if (charted.length) this.text(`Charted: ${charted.join('; ')}.`);
    // Other people keep their own time. If the stay was long enough for them to change, say so.
    const living = this.people().sites.filter((x) => x.alive);
    const noted = this.mem.seen.filter((x) => isLiving(x.phase));
    if (living.length !== noted.length || living.some((x) => !noted.some((n) => n.id === x.culture.id && n.phase === x.phase))) this.takeNote('stay');
    const parts: string[] = [`${passed} ${passed === 1 ? 'day passes' : 'days pass'}.`];
    const change = (label: string, a: number, b: number, unit: string) => {
      if (Math.round(a) !== Math.round(b)) parts.push(`${label} ${Math.round(a)} > ${Math.round(b)}${unit}.`);
    };
    change('Fuel', before.fuel, this.fuelPct, '%');
    change('Shield', before.shield, s.ship.shield, '%');
    change('Hull', before.hull, s.ship.hull, '%');
    change('Hold', before.materials, s.ship.materials, '');
    if (s.ship.archive > before.archive) parts.push(`Archive +${s.ship.archive - before.archive}.`);
    this.dim(parts.join(' '));

    if (worked && !s.visit.idle && idle >= 60 && s.stats.systems % 5 === 2) {
      s.visit.idle = true;
      this.say('idle', { days: idle });
    }
    if (!s.visit.provisioned && this.fuelPct >= 99.5 && s.ship.shield >= 99.5) {
      s.visit.provisioned = true;
      if (s.stats.systems % 2 === 1) this.say('provisioned');
    }
    const here = s.tShip - s.visit.arrived;
    if (!s.visit.long && here > 1.5) {
      s.visit.long = true;
      this.say('long_stay', { stay: spanWords(here) });
    }
    this.milestones();
  }

  // ---- the chart and travel ----------------------------------------------

  /**
   * The numbers behind a map: gas in a square grid around the ship, the stars
   * that fall inside it, and any space somebody holds. The page
   * draws these; a terminal shows the character map instead.
   */
  private picture(zoom: Zoom, radius: number, stars: Pin[]): MapData {
    const here = this.here.ref;
    const size = MAP_SIZE;
    let gas = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const x = here.x + (((c + 0.5) / size) * 2 - 1) * radius;
        const y = here.y + (1 - ((r + 0.5) / size) * 2) * radius;
        gas += gasShade(this.galaxy.gas(x, y));
      }
    }
    const placed: MapStar[] = [];
    for (const { seen, n, odd, signal } of stars) {
      const dx = (seen.ref.x - here.x) / radius;
      const dy = (seen.ref.y - here.y) / radius;
      if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) continue;
      placed.push({
        x: Math.floor(((dx + 1) / 2) * size),
        y: Math.floor(((1 - dy) / 2) * size),
        tone: TONE[this.system(seen.ref.id).star],
        size: seen.ref.stratum >= 3 ? 3 : seen.ref.stratum === 2 ? 2 : 1,
        n,
        visited: this.state.mem[seen.ref.id] ? true : undefined,
        odd: odd || undefined,
        signal: signal || undefined,
      });
    }
    return {
      size,
      radius,
      zoom,
      gas,
      stars: placed,
      held: this.heldSpace(radius),
      inner: zoom === 'close' ? undefined : size / 2 / ZOOM_STEP,
    };
  }

  /**
   * The space other people hold, for a map `radius` ly across: for each
   * spreading culture, the convex hull of the systems it has something living
   * in, with a little margin. One character per cell: '0' outside, '1' inside,
   * '2' on the edge. We only know this for cultures we have met, or whose
   * home we can hear, and only as the light shows it.
   */
  private heldSpace(radius: number): string | undefined {
    const s = this.state;
    const here = this.here.ref;
    const size = MAP_SIZE;
    const perLy = size / (2 * radius);
    const known = new Map<string, Culture>();
    for (const id of Object.keys(s.met)) {
      const c = id.startsWith('R') ? this.cultures.byId(id) : null;
      if (c) known.set(id, c);
    }
    for (const { site } of this.cultures.signals(here.x, here.y, s.tGal, HEARING)) {
      if (site.kind === 'home' && site.culture.reach) known.set(site.culture.id, site.culture);
    }
    const grid = new Uint8Array(size * size);
    for (const c of known.values()) {
      // The hull is set by their outermost systems, wherever those are, so look at everything they could hold. Skip those too far off to reach the map at all.
      const reach = c.reach!.radius;
      if (Math.hypot(c.home.x - here.x, c.home.y - here.y) - reach > radius * Math.SQRT2 + 3) continue;
      const points: Point[] = [];
      for (const { ref } of this.galaxy.within(c.home.x, c.home.y, reach)) {
        const light = Math.hypot(ref.x - here.x, ref.y - here.y);
        if (!this.cultures.holds(c, this.systemAt(ref), s.tGal - light)) continue;
        // In cells, from the top left.
        points.push({ x: ((ref.x - here.x) / radius + 1) * (size / 2), y: (1 - (ref.y - here.y) / radius) * (size / 2) });
      }
      // A margin of a light-year and a half, and never so little that a single system vanishes on a wide map.
      if (points.length) drawPolygon(paddedHull(points, Math.max(1.5 * perLy, 1.5)), size, grid);
    }
    return grid.some((v) => v > 0) ? Array.from(grid).join('') : undefined;
  }

  /** The same map in characters, for a terminal: 41 columns by 13 rows. */
  private sketch(zoom: Zoom, radius: number, stars: Pin[]): string {
    const here = this.here.ref;
    const cols = 41;
    const rows = 13;
    const grid: string[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < cols; c++) {
        // A character is much taller than it is wide, so look at three points down it and keep the thickest.
        let n = 0;
        for (const dr of [-0.33, 0, 0.33]) n = Math.max(n, this.galaxy.gas(here.x + ((c - 20) / 20) * radius, here.y + ((6 - r + dr) / 6) * radius));
        // Up close, thin gas is left blank so that a dot can mean a star.
        row.push(zoom === 'far' ? shade(n) : n >= 10 ? '%' : n >= 1.2 ? ':' : ' ');
      }
      grid.push(row);
    }
    const put = (seen: Seen, ch: string) => {
      const c = 20 + Math.round(((seen.ref.x - here.x) / radius) * 20);
      const r = 6 - Math.round(((seen.ref.y - here.y) / radius) * 6);
      if (r >= 0 && r < rows && c >= 0 && c < cols && (ch !== '.' || ' :%'.includes(grid[r][c]))) grid[r][c] = ch;
    };
    for (const pin of stars) if (!pin.n && (pin.signal || zoom === 'close')) put(pin.seen, pin.signal ? '^' : '.');
    for (const pin of stars) if (pin.n) put(pin.seen, pin.n <= 9 ? String(pin.n) : '*');
    grid[6][20] = '@';
    const key = zoom === 'far' ? 'gas: blank void, . thin, : moderate, % dense, # cloud' : 'map: : dense gas, % cloud';
    return [...grid.map((row) => row.join('').trimEnd()), `${key} · @ us · edge at ${ly(radius)} ly`].join('\n');
  }

  /**
   * The sky around the ship, at one of three zooms that nest inside each
   * other: `close` is the nearest stars, the plain chart is what stands out in
   * a view four times wider, and `far` is the bright stars to steer by in a
   * view four times wider again. Each lists what it numbers, and "plot" works
   * on whichever list was shown last.
   */
  private chart(arg: string) {
    const s = this.state;
    const here = this.here.ref;
    const word = arg.trim().toLowerCase();
    const zoom: Zoom | null =
      word === '' ? 'mid' : /^(c|close|near|in)$/.test(word) ? 'close' : /^(f|far|wide|out)$/.test(word) ? 'far' : /^(m|mid)$/.test(word) ? 'mid' : null;
    if (!zoom) {
      this.text('Which chart? "chart close" for the nearest stars, "chart" for what stands out nearby, "chart far" for the wider sky.');
      return;
    }
    const optics = level(s, 'optics');
    const strata = this.galaxy.cfg.strata;
    const seen = this.galaxy.near(here.x, here.y, optics).filter((x) => x.ref.id !== here.id);
    if (!seen.length) {
      this.text('Nothing in range of the telescopes. That should not happen inside the disc.');
      return;
    }
    // The close view is sized to hold the nearest nine; the others are that, four and sixteen times over.
    const base = roundUp(1.15 * seen[Math.min(8, seen.length - 1)].dist);
    const radius = base * (zoom === 'close' ? 1 : zoom === 'mid' ? ZOOM_STEP : ZOOM_STEP * ZOOM_STEP);
    const inner = zoom === 'far' ? base * ZOOM_STEP : base;
    const within = (x: Seen, half: number) => Math.abs(x.ref.x - here.x) < half && Math.abs(x.ref.y - here.y) < half;
    const inView = (x: Seen) => within(x, radius);
    // Outside the dotted box, that is: not already the business of the next zoom in.
    const beyond = (x: Seen) => inView(x) && !within(x, inner);
    const nearRange = strata[0].sight * optics;
    // Oddities can be made out from about twice as far as planets can; ruins only from as far as planets.
    const oddRange = 2 * nearRange;
    const flagged = (x: Seen) => (x.dist <= oddRange && this.unresolvedAnomaly(x.ref.id)) || this.ruinsSeen(x, nearRange);
    // Radio carries further than a dim star can be seen, so some voices come from stars the telescopes cannot pick out.
    const voices = this.cultures.signals(here.x, here.y, s.tGal, HEARING).map((v) => v.seen);
    const loud = new Set(voices.map((v) => v.ref.id));
    const known = [...seen, ...voices.filter((v) => !seen.some((x) => x.ref.id === v.ref.id))].sort((a, b) => a.dist - b.dist);

    const listed: Seen[] = [];
    const add = (x: Seen | undefined) => {
      if (x && !listed.some((y) => y.ref.id === x.ref.id)) listed.push(x);
    };
    if (zoom === 'close') {
      seen.slice(0, 9).forEach(add);
    } else if (zoom === 'mid') {
      // What stands out: voices, things worth a deep scan, bright stars. Then the nearest yellow and white stars, to fill the list.
      known.filter((x) => inView(x) && (loud.has(x.ref.id) || flagged(x) || x.ref.stratum >= 2)).slice(0, 12).forEach(add);
      const fresh = seen.filter((x) => beyond(x) && !s.mem[x.ref.id]);
      for (const x of fresh.filter((y) => y.ref.stratum === 1)) if (listed.length < 9) add(x);
      for (const x of fresh) if (listed.length < 9) add(x);
    } else {
      // Only what lies outside the plain chart is numbered: nearer things are its business, and would pile up on the ship.
      seen.filter((x) => beyond(x) && x.ref.stratum >= 2).slice(0, 9).forEach(add);
      known.filter((x) => beyond(x) && loud.has(x.ref.id)).slice(0, 3).forEach(add);
      // One of the rare giants or remnants, however far, to steer by.
      add(seen.find((x) => x.ref.stratum === 3 && !within(x, inner)));
      for (const x of seen.filter((y) => beyond(y) && y.ref.stratum === 1)) if (listed.length < 9) add(x);
    }
    listed.sort((a, b) => a.dist - b.dist);
    s.chart = listed.map((x) => x.ref.id);
    this.lastZoom = zoom;

    // On the far chart the middle is left clear, apart from voices: the plain chart shows what is in there.
    const pins: Pin[] = known
      .filter((x) => !listed.includes(x) && (zoom !== 'far' || !within(x, inner) || loud.has(x.ref.id)))
      .map((x): Pin => ({ seen: x, signal: loud.has(x.ref.id), odd: zoom !== 'far' && flagged(x) }))
      .concat(listed.map((x, i) => ({ seen: x, n: i + 1, signal: loud.has(x.ref.id), odd: flagged(x) })));
    this.out.push({ k: 'map', s: this.sketch(zoom, radius, pins), map: this.picture(zoom, radius, pins) });

    if (listed.length) {
      const lines = [' #  system           ly g star  sees'];
      listed.forEach((x, i) => {
        const sys = this.system(x.ref.id);
        const visited = s.mem[x.ref.id];
        let sees = '?';
        if (visited?.swept || x.dist <= nearRange) sees = `${'O'.repeat(Math.min(3, sys.giants)) || '-'} ${'~'.repeat(sys.dust) || '-'}`;
        const marks = `${flagged(x) ? '!' : ' '}${loud.has(x.ref.id) ? '^' : ' '}`;
        // One character for the gas on the way there, in the map's own shading. A cloud anywhere on the line counts.
        const leg = planLeg(this.galaxy, here, x.ref, this.drive, 1);
        const way = leg.gasMax >= 10 ? '#' : shade(leg.gasMean).replace(' ', '_');
        lines.push(
          `${lpad(String(i + 1), 2)}${visited ? '*' : ' '} ${pad(this.nameOf(x.ref.id), 14)}${lpad(ly(x.dist), 5)} ${way} ${pad(STARS[sys.star].code, 5)} ${pad(sees, 7)} ${marks}`.trimEnd(),
        );
      });
      this.pre(lines);
      this.dim('g: gas on the way (_ void, . thin, : moderate, % dense, # a cloud across it)');
      this.dim('sees: O giants, ~ belts and comets · ! worth a deep scan · ^ a signal · * been there');
    }
    this.dim(
      zoom === 'close'
        ? `The nearest stars${listed.length ? '' : ': none in range'}. "chart" and "chart far" look further out.`
        : zoom === 'mid'
          ? `What stands out within ${ly(radius)} light-years${listed.length ? '' : ': nothing'}. "chart close" lists the nearest stars; "chart far" shows the wider sky.`
          : `The bright stars to steer by${listed.length ? '' : `: none within ${ly(radius)} light-years`}. "chart" and "chart close" look nearer.`,
    );

    const voice = listed.findIndex((x) => loud.has(x.ref.id));
    if (voice >= 0) this.sayOnce('signal_first', 'signal_first', { n: voice + 1, light: spanWords(listed[voice].dist) });
    const fancy = listed.findIndex((x) => this.system(x.ref.id).star === s.mind.fancy && !s.mem[x.ref.id]);
    if (fancy >= 0 && !s.mind.said.includes(`fancy:${listed[fancy].ref.id}`)) {
      s.mind.said.push(`fancy:${listed[fancy].ref.id}`);
      this.say('fancy_seen', { kind: STARS[s.mind.fancy].name, dist: `${ly(listed[fancy].dist)} light-years`, n: fancy + 1 });
    }
  }

  /** Ruins nobody has read, at a system close enough for the telescopes to pick them out. */
  private ruinsSeen(x: Seen, range: number): boolean {
    if (x.dist > range) return false;
    const read = this.state.mem[x.ref.id]?.sites ?? [];
    return this.cultures.presence(this.systemAt(x.ref), this.state.tGal).sites.some((site) => !site.alive && !read.includes(site.culture.id));
  }

  /** A system with something odd in it that we have not yet resolved. */
  private unresolvedAnomaly(id: string): boolean {
    const sys = this.system(id);
    if (!sys.anomaly) return false;
    const mem = this.state.mem[id];
    if (!mem) return true;
    return sys.discoveries.some((d, i) => d.feature && d.feature.rarity >= 2 && (i >= mem.found || (d.feature.hint !== undefined && !mem.scanned.includes(d.feature.id))));
  }

  private target(arg: string): StarSystem | null {
    const s = this.state;
    if (!s.chart.length) {
      this.text('Pull up the chart first.');
      return null;
    }
    const i = Number(arg) - 1;
    if (arg === '' || !Number.isInteger(i) || !s.chart[i]) {
      this.text(`Which one? Give a number from the chart, 1 to ${s.chart.length}.`);
      return null;
    }
    return this.system(s.chart[i]);
  }

  private scope(arg: string) {
    const sys = this.target(arg);
    if (!sys) return;
    const s = this.state;
    const here = this.here.ref;
    const dist = Math.hypot(sys.ref.x - here.x, sys.ref.y - here.y);
    const optics = level(s, 'optics');
    const strata = this.galaxy.cfg.strata;
    const mem = s.mem[sys.ref.id];
    const parts = [`${this.nameOf(sys.ref.id)}: ${starLine(sys)}, ${ly(dist)} light-years off. ${STARS[sys.star].text}`];
    if (mem?.swept || dist <= strata[0].sight * optics) {
      const giants = sys.giants === 0 ? 'No giants' : sys.giants === 1 ? 'One giant' : `${sys.giants} giants`;
      const dust = ['no dust to speak of', 'a little dust', 'a fair infrared excess, so belts or comets', 'a strong infrared excess: belts, comets or both'][sys.dust];
      parts.push(`${giants}, and ${dust}.`);
    } else {
      parts.push('Too far to say what orbits it.');
    }
    if (dist <= 2 * strata[0].sight * optics && this.unresolvedAnomaly(sys.ref.id)) {
      parts.push("And something in its light that I can't account for from here.");
    }
    if (this.ruinsSeen({ ref: sys.ref, dist }, strata[0].sight * optics)) {
      parts.push('There are straight lines on one of its worlds, where geology makes none. Somebody built there, and is not there now.');
    }
    const voice = this.heard({ ref: sys.ref, dist });
    if (voice) {
      const who = s.met[voice.culture.id] ? `That is ${voice.culture.title}` : 'Nobody we know';
      parts.push(`There is radio from there, structured and ${spanWords(dist)} old. ${who}. Whether they are still there is another matter.`);
    }
    const leg = planLeg(this.galaxy, here, sys.ref, this.drive, 1);
    parts.push(`The way there lies through ${Galaxy.gasWord(leg.gasMean)} gas${leg.gasMax >= 10 && leg.gasMean < 10 ? ', with a cloud across it' : ''}.`);
    if (mem) {
      const then = mem.seen.filter((x) => isLiving(x.phase) && s.met[x.id]).map((x) => s.met[x.id].title);
      parts.push(`We were there ${spanWords(s.tGal - mem.last)} ago${then.length ? `; ${then.join(' and ')} lived there then` : ''}.`);
    }
    this.text(parts.join(' '));
    s.plot = sys.ref.id;
    this.dim(`"plot ${arg}" for the cost of going.`);
  }

  /** What a leg would cost and leave us with. */
  private cost(leg: Leg) {
    const s = this.state;
    const breach = Math.max(0, leg.shield - s.ship.shield) * TUNE.BREACH;
    const hullLoss = TUNE.JUMP_WEAR + breach + TUNE.TRANSIT_WEAR * leg.ship;
    return {
      fuelPct: (100 * leg.fuel) / this.tank,
      fuelAfter: this.fuelPct - (100 * leg.fuel) / this.tank,
      shieldAfter: Math.max(0, s.ship.shield - leg.shield),
      hullAfter: s.ship.hull - hullLoss,
      breach,
      hullLoss,
    };
  }

  private plot(arg: string) {
    const sys = this.target(arg);
    if (!sys) return;
    const s = this.state;
    const here = this.here.ref;
    s.plot = sys.ref.id;
    const hard = planLeg(this.galaxy, here, sys.ref, this.drive, 1);
    const eco = planLeg(this.galaxy, here, sys.ref, this.drive, TUNE.ECO);
    const ch = this.cost(hard);
    const ce = this.cost(eco);
    const time = (label: string, leg: Leg) => ` ${pad(label, 9)}${lpad(span(leg.ship), 8)}${lpad(span(leg.galaxy), 10)}`;
    const after = (label: string, c: ReturnType<Game['cost']>) =>
      c.fuelAfter < 0
        ? ` ${pad(label, 9)}  not enough fuel`
        : ` ${pad(label, 9)}${lpad(`${Math.round(c.fuelAfter)}%`, 6)}${lpad(`${Math.round(c.shieldAfter)}%`, 8)}${lpad(`${Math.max(0, Math.round(c.hullAfter))}%`, 7)}`;
    this.pre([
      ` to ${this.nameOf(sys.ref.id)} · ${ly(hard.dist)} ly · gas ${Galaxy.gasWord(hard.gasMean)}`,
      '',
      '            aboard   outside',
      time('hard', hard),
      time('eco', eco),
      '',
      ' arriving   fuel  shield   hull',
      after('hard', ch),
      after('eco', ce),
    ]);

    const vars = { fuel: Math.max(0, Math.round(ch.fuelAfter)), hull: Math.round(ch.breach), ship: spanWords(hard.ship), outside: spanWords(hard.galaxy), gas: Galaxy.gasWord(hard.gasMean) };
    // The Mind speaks up when there is something to flag. Otherwise it comments on the first plot of a visit and then keeps quiet.
    const quiet = (s.visit.plots ?? 0) > 0;
    s.visit.plots = (s.visit.plots ?? 0) + 1;
    if (ch.fuelAfter < 0) this.say(ce.fuelAfter < 0 ? 'plot_nothing' : 'plot_nofuel');
    else if (ch.breach >= 2) this.say('plot_shield', vars);
    else if (hard.gasMax >= 10) this.say('plot_cloud');
    else if (ch.fuelAfter < 15) this.say('plot_tight', vars);
    else if (hard.ship > 5) this.say('plot_long', vars);
    else if (!quiet) this.say(hard.gasMean < 0.2 ? 'plot_thin' : 'plot_ok', vars);
    this.dim('"burn" goes at full thrust. "burn eco" is gentler: far less fuel, about twice the time, harder on the hull.');
  }

  private burn(arg: string) {
    const s = this.state;
    if (!s.plot || s.plot === s.at) {
      this.text('No course is plotted. "chart", then "plot" a number.');
      return;
    }
    if (s.crews.some((c) => c?.op === 'refit')) {
      this.text('The Wrights have the ship in pieces. Not until the refit is done.');
      return;
    }
    const eco = arg.toLowerCase().startsWith('e');
    const from = this.here;
    const to = this.system(s.plot);
    const leg = planLeg(this.galaxy, from.ref, to.ref, this.drive, eco ? TUNE.ECO : 1);
    const c = this.cost(leg);
    if (c.fuelAfter < 0) {
      this.text(`Not enough fuel: that burn needs ${Math.round(c.fuelPct)}% of a tank and we have ${Math.round(this.fuelPct)}%.${eco ? ' If nothing nearer will do, "drift" is the last resort.' : ' Try "burn eco".'}`);
      return;
    }
    if (s.ship.hull - c.hullLoss < TUNE.HULL_FLOOR) {
      s.mind.refused = (s.mind.refused ?? 0) + 1;
      this.say(s.mind.refused > 1 ? 'refuse_again' : 'refuse');
      return;
    }

    // The Mind objects, formally, to burns it expects to hurt.
    const lowFuel = c.fuelAfter < 6 && to.giants === 0;
    if (c.breach >= 3 || lowFuel) {
      s.mind.overruled++;
      // It words the objection differently the more often it has had to make it.
      const n = s.mind.overruled;
      this.say((s.mind.streak ?? 0) >= 4 ? 'dissent_weary' : n >= 3 ? 'dissent_again' : 'dissent', { n, last: n - 1 });
      s.mind.dissent = { where: this.nameOf(s.at), reason: c.breach >= 3 ? 'shield' : 'fuel', hull: s.ship.hull };
      this.note(`${MIND_NAMES[s.mind.name].name} dissented from the burn out of ${this.nameOf(s.at)}.`);
    }
    // It also notices how we leave places.
    const total = from.discoveries.length;
    if (total >= 3 && this.mem.found / total < 0.25) {
      s.mind.early++;
      if (s.mind.early % 5 === 0) this.say('leave_early_habit', { n: s.mind.early });
      else if (s.mind.early % 2 === 1) this.say('leave_early');
    } else if (total > 0 && this.mem.found >= total) {
      s.mind.thorough++;
      if (s.mind.thorough % 4 === 1) this.say('leave_thorough');
    }

    s.ship.fuel -= leg.fuel;
    s.ship.shield = c.shieldAfter;
    s.ship.hull -= c.hullLoss;
    s.tShip += leg.ship;
    s.tGal += leg.galaxy;
    s.stats.jumps++;
    s.stats.ly += leg.dist;
    this.arrive(to, leg, c.breach);
  }

  /** No fuel and nowhere to get any: fall to the nearest plotted star the slow way. */
  private drift() {
    const s = this.state;
    if (!s.plot || s.plot === s.at) {
      this.text('Drift where? "chart", then "plot" a number.');
      return;
    }
    const from = this.here;
    const to = this.system(s.plot);
    const eco = planLeg(this.galaxy, from.ref, to.ref, this.drive, TUNE.ECO);
    const canScoop = from.bodies.some((b) => b.fuel > 0) || STARS[from.star].wind;
    if (this.cost(eco).fuelAfter >= 0 || canScoop) {
      this.mindSays('Drifting is what is left when there are no plans. We still have plans: there is fuel to be had here, or enough in the tanks.');
      return;
    }
    const years = eco.dist / TUNE.DRIFT_SPEED;
    s.tShip += years;
    s.tGal += years;
    s.ship.hull = Math.max(TUNE.HULL_FLOOR, s.ship.hull - 12);
    s.ship.shield = Math.max(0, s.ship.shield - 20);
    s.stats.jumps++;
    s.stats.ly += eco.dist;
    this.mindSays(`Then we fall. ${spanWords(years)}, the slow way, with the drive cold. I will wake you when there is a star.`);
    this.note(`Drifted from ${this.nameOf(s.at)} with dry tanks.`);
    this.arrive(to, { ...eco, ship: years, galaxy: years }, 0);
  }

  private arrive(sys: StarSystem, leg: Leg, breach: number) {
    const s = this.state;
    const fromName = this.nameOf(s.at);
    s.at = sys.ref.id;
    s.plot = undefined;
    s.chart = [];
    s.crews = s.crews.map(() => null);
    s.visit = { arrived: s.tShip, provisioned: false, slow: false, long: false, hinted: false, idle: false, starShown: true, lastAdvice: '', plots: 0 };
    const known = s.mem[sys.ref.id];
    const gap = known ? s.tGal - known.last : 0;
    if (known) {
      known.visits++;
      known.last = s.tGal;
    } else {
      s.mem[sys.ref.id] = freshMemory(s.tGal);
      s.stats.systems++;
    }
    this.note(`${fromName} to ${this.nameOf(sys.ref.id)}, ${ly(leg.dist)} ly.`);

    this.dim(`— ${span(leg.ship)} aboard · ${span(leg.galaxy)} outside · ${ly(leg.dist)} ly —`);
    this.heading();
    if (!known) this.text(this.starText(sys));
    if (breach >= 0.5) this.out.push({ k: 'alert', s: `The shield gave out on the way. Hull down ${Math.round(breach)} points.` });

    // Other people come first. If the Mind has something to say about them, it skips its usual remark.
    const spoken = this.out.filter((o) => o.k === 'mind').length;
    this.takeNote('arrive');
    if (this.out.filter((o) => o.k === 'mind').length === spoken) {
      const { sites, claims } = this.people();
      if (claims.length && !sites.some((x) => x.alive) && s.stats.systems % 2 === 0) this.say('civ_claim');
      else if (known) this.say('revisit', { sys: this.nameOf(sys.ref.id), gap: spanWords(gap) });
      else this.say('arrive', { light: spanWords(leg.dist), outside: spanWords(leg.galaxy) });
    }

    const d = s.mind.dissent;
    if (d) {
      const lost = Math.round(d.hull - s.ship.hull);
      const right = d.reason === 'shield' ? lost >= 3 : this.fuelPct < 6 && sys.giants === 0;
      // Count how many times running it has been right, or wrong, and let that colour the remark.
      const before = s.mind.streak ?? 0;
      s.mind.streak = right ? Math.max(1, before + 1) : Math.min(-1, before - 1);
      const run = Math.abs(s.mind.streak);
      const pool = right ? (run >= 2 ? 'reckon_right_streak' : 'reckon_right') : run >= 2 ? 'reckon_wrong_streak' : 'reckon_wrong';
      this.say(pool, { where: d.where, hull: lost, n: run });
      s.mind.dissent = undefined;
    }
    if (this.throttled) {
      this.out.push({ k: 'alert', s: `The Wrights have throttled the drive to ${Math.round(TUNE.THROTTLE * 100)}% until the hull is back above ${TUNE.HULL_THROTTLE}%.` });
    }
    if (!known && sys.star === s.mind.fancy) this.say('fancy_thanks');
    if (s.ship.hull < 50) this.say('warn_hull', { hull: Math.round(s.ship.hull) });
    else if (this.fuelPct < 25) this.say('warn_fuel', { fuel: Math.round(this.fuelPct) });
    else if (s.ship.shield < 25) this.say('warn_shield', { shield: Math.round(s.ship.shield) });
    this.milestones();
  }

  private milestones() {
    const s = this.state;
    const vars = { aboard: spanWords(s.tShip), outside: spanWords(s.tGal), home: s.home };
    for (const [key, years] of [['g100', 100], ['g1000', 1000], ['g10000', 1e4], ['g100000', 1e5]] as const) {
      if (s.tGal >= years) this.sayOnce(key, `milestone_${key}`, vars);
    }
    for (const [key, years] of [['s10', 10], ['s50', 50], ['s200', 200]] as const) {
      if (s.tShip >= years) this.sayOnce(key, `milestone_${key}`, vars);
    }
  }

  // ---- talking to the ship -----------------------------------------------

  /** What the Mind would do next, if anything stands out. */
  private advice(): string | null {
    const s = this.state;
    const sys = this.here;
    if (!this.mem.swept) return "We've done nothing here but park. A sweep costs an hour.";
    const free = s.crews.filter((c) => c === null).length;
    const jobs = this.suggestions();
    if (free > 0 && jobs.length) {
      const [verb, n] = jobs[0].split(' ');
      const where = n === undefined ? '' : bodyRef(sys, Number(n));
      switch (verb) {
        case 'scoop': return `I'd put a crew on ${where} for fuel. We're at ${Math.round(this.fuelPct)}%.`;
        case 'ice': return `The shield wants ice, and ${where} has it. We're at ${Math.round(s.ship.shield)}%.`;
        case 'scan':
          return this.scanTargets().find((t) => t.body === Number(n))?.site
            ? `Somebody built at ${where}. A deep scan would tell us who.`
            : `${capital(where)} still has that oddity. A deep scan would settle it.`;
        case 'survey': return `The survey is ${Math.round((100 * this.mem.found) / sys.discoveries.length)}% done. There's more here; it comes slower as we go.`;
        case 'repair': return `The Wrights could mend while we sit. Hull is at ${Math.round(s.ship.hull)}% and we have the stock.`;
        case 'mine': return `There's ore at ${where} and room in the hold. Refits and repairs both eat it.`;
      }
    }
    const ready = (Object.keys(REFITS) as RefitTrack[]).find((t) => this.refitState(t) === 'ready');
    if (ready && free > 0) return `The Wrights could do a refit here: ${REFITS[ready].label.toLowerCase()}. We have the knowledge and the stock.`;
    if (free === 0) return 'Everything useful is in hand. Days are all it needs now.';
    if (this.mem.found >= sys.discoveries.length && this.fuelPct > 85) return "We've had what this place offers. I'd look at the chart.";
    return null;
  }

  private ask() {
    const s = this.state;
    const advice = this.advice();
    if (advice && advice !== s.visit.lastAdvice) {
      s.visit.lastAdvice = advice;
      this.mindSays(advice);
      return;
    }
    this.say('chatter', {
      ly: Math.round(s.stats.ly).toLocaleString('en-US'),
      systems: s.stats.systems,
      finds: s.stats.finds,
      aboard: spanWords(s.tShip),
      outside: spanWords(s.tGal),
    });
  }

  private ship() {
    const s = this.state;
    const here = this.here.ref;
    const n = this.galaxy.gas(here.x, here.y);
    const hold = level(s, 'hold');
    const lines = [
      ` ${MIND_NAMES[s.mind.name].name.toUpperCase()}`,
      ` aboard ${clock(s.tShip)} · outside ${clock(s.tGal)}`,
      '',
      ` fuel    ${gauge(this.fuelPct / 100)} ${lpad(String(Math.round(this.fuelPct)), 3)}%`,
      ` shield  ${gauge(s.ship.shield / 100)} ${lpad(String(Math.round(s.ship.shield)), 3)}%`,
      ` hull    ${gauge(s.ship.hull / 100)} ${lpad(String(Math.round(s.ship.hull)), 3)}%`,
      ` hold    ${gauge(s.ship.materials / hold)} ${Math.round(s.ship.materials)}/${hold}`,
      ` archive ${s.ship.archive}`,
      '',
      ` engine ${level(s, 'engine')} g${this.throttled ? ' (throttled)' : ''} · hull grade ${level(s, 'hull')}`,
      ` tanks ${level(s, 'tanks')} burn-yr · optics x${level(s, 'optics')}`,
      ` crews ${s.crews.length}`,
      ` cruise here: gamma ${cruiseGamma(this.drive, 1, n).toFixed(1)} in ${Galaxy.gasWord(n)} gas`,
      ` ${s.stats.systems} systems · ${s.stats.jumps} jumps · ${Math.round(s.stats.ly)} ly`,
    ];
    this.pre(lines);
    if (s.ship.relics.length) this.text(`In the hold, under lock: ${s.ship.relics.map(relicLabel).join('; ')}.`);
  }

  private refitState(track: RefitTrack): 'max' | 'ready' | 'archive' | 'materials' | 'busy' {
    const s = this.state;
    const lv = s.ship.levels[track];
    if (lv >= REFITS[track].levels.length - 1) return 'max';
    if (s.crews.some((c) => c?.op === 'refit' && c.track === track)) return 'busy';
    const cost = refitCost(track, lv);
    if (s.ship.archive < cost.archive) return 'archive';
    if (s.ship.materials < cost.materials) return 'materials';
    return 'ready';
  }

  private refits() {
    const s = this.state;
    const lines = [' refit    now > next   needs'];
    for (const track of Object.keys(REFITS) as RefitTrack[]) {
      const info = REFITS[track];
      const lv = s.ship.levels[track];
      const state = this.refitState(track);
      if (state === 'max') {
        lines.push(` ${pad(track, 8)} ${info.levels[lv]}  (as good as it gets)`);
        continue;
      }
      const cost = refitCost(track, lv);
      const flag = state === 'ready' ? 'READY' : state === 'busy' ? 'in yard' : state === 'archive' ? `archive ${cost.archive}` : `${cost.materials} mat`;
      lines.push(` ${pad(track, 8)} ${pad(`${info.levels[lv]} > ${info.levels[lv + 1]}`, 12)} ${flag}`);
      if (state === 'ready') lines.push(`          costs ${cost.materials} mat, ${cost.days} days`);
    }
    lines.push('', ` archive ${s.ship.archive} · materials ${Math.round(s.ship.materials)}`);
    this.pre(lines);
    this.dim('Knowledge in the Archive unlocks a refit; materials and a crew\'s time pay for it. "refit engine" starts one.');
  }

  private refit(arg: string) {
    const s = this.state;
    const track = arg.toLowerCase() as RefitTrack;
    if (!(track in REFITS)) {
      this.text(`Refit what? One of: ${Object.keys(REFITS).join(', ')}.`);
      return;
    }
    const state = this.refitState(track);
    const cost = refitCost(track, s.ship.levels[track]);
    if (state === 'max') return this.text('That is already as good as the Wrights can make it.');
    if (state === 'busy') return this.text('That refit is already in the yard.');
    if (state === 'archive') return this.text(`The Wrights don't know how yet. That needs ${cost.archive} in the Archive; we have ${s.ship.archive}.`);
    if (state === 'materials') return this.text(`That needs ${cost.materials} materials; we have ${Math.round(s.ship.materials)}.`);
    const free = s.crews.findIndex((c) => c === null);
    if (free < 0) return this.text('No crew is free to do it. Recall one first.');
    s.ship.materials -= cost.materials;
    s.crews[free] = { op: 'refit', body: -1, days: 0, need: cost.days, track };
    this.text(`Crew ${free + 1} to the yard: ${REFITS[track].label.toLowerCase()} refit, ${cost.days} days. We cannot burn until it is done.`);
    this.say('refit_start', { days: cost.days });
  }

  private log() {
    const entries = this.state.journal.slice(-14);
    this.pre(entries.map((e) => `${lpad(clock(e.g), 9)}  ${e.text}`));
    this.dim('Dates are years outside since you were woken.');
  }

  private finds() {
    const s = this.state;
    const lines: string[] = [];
    for (const category of ['geology', 'dynamics', 'stellar', 'life', 'artefact'] as const) {
      const all = FEATURES.filter((f) => f.category === category);
      const got = all.filter((f) => s.seen[f.id]);
      lines.push(` ${pad(category, 9)} ${got.length} of ${all.length}`);
      for (const f of got) lines.push(`   ${f.title}${s.seen[f.id] > 1 ? ` x${s.seen[f.id]}` : ''}`);
    }
    const stars = (Object.keys(STARS) as (keyof typeof STARS)[]).filter((k) => s.seen[`star:${k}`]);
    lines.push(` ${pad('stars', 9)} ${stars.length} of ${Object.keys(STARS).length} kinds`);
    const peoples = Object.values(s.met);
    lines.push(` ${pad('peoples', 9)} ${peoples.length} known · ${s.seen.ruin ?? 0} ruins read`);
    for (const m of peoples.slice(-12)) {
      lines.push(`   ${pad(m.title.replace(/^the /, ''), 21)} ${pad(m.how, 5)} ${lpad(clock(m.t), 9)}`);
    }
    this.pre(lines);
    if (peoples.length) this.dim('Peoples: how we know them, and the year outside when we first did.');
  }

  private rename(arg: string) {
    const name = arg.trim().replace(/[^\w' -]/g, '').slice(0, 16);
    if (!name) {
      this.text('Name it what? For example "name Halfway".');
      return;
    }
    const old = this.nameOf(this.state.at);
    this.mem.name = name;
    this.note(`Named ${old} "${name}".`);
    this.text(`${old} is ${name} in our charts from now on.`);
  }

  private help() {
    this.pre([
      ' the loop: sweep, put crews to work, stay;',
      ' then chart, plot and burn',
      '',
      ' here',
      '  sweep       first look at this system',
      '  look        the system table again (map)',
      '  ops         crews and the work on offer',
      '  scoop N     fuel from a giant (0 = star)',
      '  ice N       rebuild the shield',
      '  mine N      materials for the hold',
      '  survey      chart the system, slowly',
      '  scan N      deep scan: oddity or ruin',
      '  repair      mend the hull with materials',
      '  recall N    free a crew',
      '  stay [30]   let days pass (d w m y)',
      ' away',
      '  chart       what stands out nearby',
      '  chart close the nearest stars',
      '  chart far   the wider sky',
      '  scope N     what the telescope sees',
      '  plot N      what going there costs',
      '  burn        go, at full thrust',
      '  burn eco    go gently: frugal and slow',
      ' the ship',
      '  ask         what the Mind thinks',
      '  ship        condition and clocks',
      '  refits      upgrades, and "refit X"',
      '  log, finds  journal and catalogue',
      '  name X      name this system',
    ]);
  }
}
