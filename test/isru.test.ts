import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO, ISRU, MATERIALS, MEMORY, REFITS, refitCost, type Material, type RefitTrack } from '../src/core/config.ts';
import { Galaxy, type SysRef } from '../src/core/galaxy.ts';
import { STARS, generateSystem, type Body, type Seam, type StarSystem } from '../src/core/system.ts';
import { Cultures } from '../src/core/civs.ts';
import { Game } from '../src/core/game.ts';
import { findStart } from '../src/core/state.ts';

const galaxy = new Galaxy(DEMO);
const cultures = new Cultures(galaxy);
const start = findStart(galaxy, cultures);
const near = galaxy.within(start.x, start.y, 150).filter((s) => s.dist > 0);
const systems = near.map((s) => cultures.system(s.ref));
const said = (out: { s: string }[]) => out.map((o) => o.s).join('\n');
const quiet = (sys: StarSystem) => cultures.presence(sys, 0).sites.length === 0;

/** The parts of the game a test needs to reach that a player does not. */
interface Inside {
  seamRate(b: Body, seam: Seam): number;
  freshRate(b: Body, seam: Seam): number;
}
const inside = (g: Game) => g as unknown as Inside;

/** Put the ship at a system by the ordinary route, with the survey already done. */
function visit(g: Game, ref: SysRef) {
  Object.assign(g.state.ship, { fuel: 1e6, shield: 100, hull: 100 });
  const levels = { ...g.state.ship.levels };
  Object.assign(g.state.ship.levels, { engine: 10, hull: 10 });
  g.state.chart = [ref.id];
  g.exec('plot 1');
  g.exec('burn');
  assert.equal(g.state.at, ref.id);
  g.state.ship.levels = levels;
  Object.assign(g.state.ship, { fuel: 3, shield: 100, hull: 100 });
  g.state.mem[ref.id].found = g.here.discoveries.length;
}

test('seams are part of what a system is, and each material comes from its own kind of place', () => {
  const again = new Galaxy(DEMO);
  let seams = 0;
  for (const sys of systems.slice(0, 400)) {
    assert.deepEqual(generateSystem(again, again.ref(sys.ref.id)!).bodies, sys.bodies);
    for (const b of sys.bodies) {
      for (const seam of b.seams) {
        seams++;
        assert.ok(MATERIALS.includes(seam.material) && seam.grade >= 1 && seam.grade <= 3);
        const [lo, hi] = ISRU.SIZE[seam.material];
        assert.ok(seam.size >= lo && seam.size <= hi);
        if (seam.material === 'isotopes') assert.ok(b.kind === 'gas' || b.kind === 'icegiant', `isotopes on a ${b.kind}`);
        if (seam.material === 'volatiles') assert.ok(['comets', 'ice', 'dwarf', 'ocean', 'belt'].includes(b.kind));
        if (seam.material === 'heavy') assert.ok(STARS[sys.star].remnant || sys.feh > 0.3, `heavy elements round a ${sys.star}`);
      }
      assert.equal(new Set(b.seams.map((x) => x.material)).size, b.seams.length, 'one seam of each material at most');
    }
  }
  assert.ok(seams > 800);
  const share = (test: (sys: StarSystem) => boolean) => systems.filter(test).length / systems.length;
  const has = (m: Material) => (sys: StarSystem) => sys.bodies.some((b) => b.seams.some((x) => x.material === m));
  assert.ok(share(has('metals')) > 0.8, 'metals are nearly everywhere');
  assert.ok(share(has('carbon')) > 0.2 && share(has('carbon')) < 0.6, 'carbon in some places');
  assert.ok(share(has('heavy')) < 0.08, 'heavy elements are rare');
  const hot = share((sys) => sys.bodies.some((b) => b.hot));
  assert.ok(hot > 0.03 && hot < 0.2, `${(100 * hot).toFixed(1)}% of systems have hot work: not common, not unheard of`);
});

test('a body has to be charted before it can be mined, and a material can be asked for by name', () => {
  const g = Game.fresh();
  const b = g.here.bodies.find((x) => x.seams.length > 1)!;
  assert.match(said(g.exec(`mine ${b.n}`)), /have not said what .* holds yet/);
  g.state.mem[g.state.at].found = g.here.discoveries.length;
  const second = b.seams[1].material;
  assert.match(said(g.exec(`mine ${b.n} ${second.slice(0, 3)}`)), /Crew 1: mine/);
  assert.equal(g.state.crews[0]?.material, second);
  assert.match(said(g.exec(`mine ${b.n} ${second}`)), /already on that/);
  assert.match(said(g.exec(`mine ${b.n} unobtainium`)), /No "unobtainium" at/);
  const before = g.state.ship.hold[second];
  g.exec('stay 20');
  assert.ok(g.state.ship.hold[second] > before, 'the hold gains that material and no other');
  for (const m of MATERIALS) if (m !== second) assert.ok(g.state.ship.hold[m] <= (m === 'metals' ? 30 : m === 'volatiles' ? 10 : 0));
});

test('one hold for everything: mining stops when it is full, and dumping makes room', () => {
  const g = Game.fresh();
  g.state.mem[g.state.at].found = g.here.discoveries.length;
  const b = g.here.bodies.find((x) => x.seams.length > 0)!;
  g.state.ship.hold.metals = 138;
  g.exec(`mine ${b.n}`);
  assert.match(said(g.exec('stay 60')), /the hold is full/);
  const total = MATERIALS.reduce((sum, m) => sum + g.state.ship.hold[m], 0);
  assert.ok(Math.abs(total - REFITS.hold.levels[0]) < 0.01);
  assert.match(said(g.exec(`mine ${b.n}`)), /The hold is full/);
  assert.match(said(g.exec('dump metals 50')), /50 of metals over the side/);
  assert.ok(g.state.ship.hold.metals < 100);
  assert.match(said(g.exec('dump')), /Dump what\?/);
  assert.match(said(g.exec('dump heavy')), /no heavy elements in the hold/);
});

test('a seam thins as it is worked, never to nothing, and stays as thin as it was left', () => {
  const g = Game.fresh();
  const target = near.find((s) => quiet(cultures.system(s.ref)) && cultures.system(s.ref).bodies.some((b) => !b.hot && b.seams.some((x) => x.material === 'metals' && x.grade >= 2)))!;
  visit(g, target.ref);
  const b = g.here.bodies.find((x) => !x.hot && x.seams.some((s) => s.material === 'metals' && s.grade >= 2))!;
  const seam = b.seams.find((x) => x.material === 'metals')!;
  const fresh = inside(g).freshRate(b, seam);
  assert.equal(inside(g).seamRate(b, seam), fresh, 'untouched, it gives its full rate');
  g.state.ship.levels.hold = 5;
  g.exec(`mine ${b.n} metals`);
  const first = said(g.exec('stay 400'));
  const early = inside(g).seamRate(b, seam);
  assert.ok(early < fresh && early > 0.5 * fresh, `after a year it is thinner but far from spent: ${(early / fresh).toFixed(2)} of fresh`);
  for (let i = 0; i < 8; i++) {
    g.state.ship.hold.metals = 0;
    if (!g.state.crews.some((c) => c?.op === 'mine')) g.exec(`mine ${b.n} metals`);
    g.exec('stay 3000');
  }
  const late = inside(g).seamRate(b, seam);
  assert.ok(late < ISRU.THIN * fresh && late >= ISRU.FLOOR * fresh, `worked for decades it is thin, with a floor: ${(late / fresh).toFixed(2)}`);
  assert.ok(first.length > 0);
  // It is remembered: through a save, and through going away and coming back.
  assert.equal(inside(Game.load(g.save())).seamRate(b, seam), late);
  visit(g, start);
  visit(g, target.ref);
  assert.ok(Math.abs(inside(g).seamRate(b, seam) / late - 1) < 1e-3, 'a lifetime away is nothing to a seam');
});

test('what was taken from a seam comes back over a very long time, and is then forgotten', () => {
  const g = Game.fresh();
  const target = near.find((s) => quiet(cultures.system(s.ref)) && cultures.system(s.ref).bodies.some((b) => !b.hot && b.seams.some((x) => x.material === 'metals' && x.grade >= 2)))!;
  const sys = cultures.system(target.ref);
  // A year from which nobody is at the system for a good while, so that only our own digging is being measured.
  const emptyFrom = (from: number) => {
    let year = from;
    while ([0, 100, 200, 300, 400, 500].some((later) => cultures.presence(sys, year + later).sites.length)) year += 500;
    return year;
  };
  visit(g, target.ref);
  const b = g.here.bodies.find((x) => !x.hot && x.seams.some((s) => s.material === 'metals' && s.grade >= 2))!;
  const seam = b.seams.find((x) => x.material === 'metals')!;
  const fresh = inside(g).freshRate(b, seam);
  const key = `${b.n}:metals`;
  g.state.ship.levels.hold = 5;
  for (let i = 0; i < 4; i++) {
    g.state.ship.hold.metals = 0;
    if (!g.state.crews.some((c) => c?.op === 'mine')) g.exec(`mine ${b.n} metals`);
    g.exec('stay 3000');
  }
  const taken = g.state.mem[target.ref.id].taken[key];
  const thin = inside(g).seamRate(b, seam);
  assert.ok(taken > 100 && thin < 0.9 * fresh, `worked for decades: ${taken.toFixed(0)} taken, ${(thin / fresh).toFixed(2)} of fresh`);

  // Two half-lives on, a quarter of it still counts, and the seam gives more than it did.
  visit(g, start);
  g.state.tGal = emptyFrom(g.state.tGal + 2 * ISRU.RECOVER);
  const waited = g.state.tGal;
  visit(g, target.ref);
  assert.equal(g.people().sites.length, 0);
  const left = g.state.mem[target.ref.id].taken[key];
  const expected = Math.pow(0.5, (g.state.tGal - waited + 2 * ISRU.RECOVER) / ISRU.RECOVER);
  assert.ok(Math.abs(left / taken - expected) < 0.02 && left / taken < 0.3, `${(left / taken).toFixed(3)} of it left`);
  const better = inside(g).seamRate(b, seam);
  assert.ok(better > thin && better < fresh, `${(thin / fresh).toFixed(2)} of fresh, then ${(better / fresh).toFixed(2)}`);

  // Long enough, and there is nothing left to remember, whether or not we ever go back.
  visit(g, start);
  g.state.tGal += 40 * ISRU.RECOVER;
  g.state.stats.jumps = MEMORY.TIDY - 1;
  visit(g, near.find((s) => s.ref.id !== target.ref.id)!.ref);
  assert.deepEqual(g.state.mem[target.ref.id].taken, {});
  assert.equal('taken' in JSON.parse(g.save()).mem[target.ref.id], false, 'and the save no longer carries it');
  g.state.tGal = emptyFrom(g.state.tGal);
  visit(g, target.ref);
  assert.equal(g.people().sites.length, 0);
  assert.equal(inside(g).seamRate(b, seam), fresh, 'the seam is as it was before anyone came');
});

test('people who live in a system have already thinned its seams', () => {
  const lived = near.find((s) => {
    const sys = cultures.system(s.ref);
    return cultures.presence(sys, 60).sites.some((x) => x.alive && x.kind === 'home' && (x.phase === 'height' || x.phase === 'decline')) && sys.bodies.some((b) => b.seams.length > 0);
  })!;
  const g = Game.fresh();
  visit(g, lived.ref);
  let seams = 0;
  for (const b of g.here.bodies) {
    for (const seam of b.seams) {
      seams++;
      const ratio = inside(g).seamRate(b, seam) / inside(g).freshRate(b, seam);
      assert.ok(ratio < 0.95 && ratio >= ISRU.FLOOR, `${seam.material} at body ${b.n}: ${ratio.toFixed(2)} of fresh`);
    }
  }
  assert.ok(seams > 0);
  assert.match(said(g.exec('ops')), /worked this system/);
});

test('hot work costs the ship, the Mind says so, and it calls a halt before it costs too much', () => {
  const hot = near.find((s) => quiet(cultures.system(s.ref)) && cultures.system(s.ref).bodies.some((b) => b.hot === 'heat' && b.seams.length > 0))!;
  const g = Game.fresh();
  visit(g, hot.ref);
  const b = g.here.bodies.find((x) => x.hot === 'heat' && x.seams.length > 0)!;
  assert.match(said(g.exec('look')), /hot/);
  assert.match(said(g.exec(`mine ${b.n}`)), /costs? us|takes .* a day from us|It costs/);
  g.exec('stay 50');
  assert.ok(Math.abs(100 - g.state.ship.hull - 50 * ISRU.HEAT) < 0.2, `fifty days cost about ${50 * ISRU.HEAT}% of hull: ${(100 - g.state.ship.hull).toFixed(2)}`);
  g.state.ship.hull = ISRU.HOT_RECALL + 0.1;
  assert.match(said(g.exec('stay 20')), /I have pulled crew 1 off/);
  assert.equal(g.state.crews[0], null);
});

test('refits are built from particular materials, common ones first and heavy elements last', () => {
  for (const track of Object.keys(REFITS) as RefitTrack[]) {
    assert.equal(refitCost(track, 0).needs.heavy ?? 0, 0, `${track}: nothing rare for the first level`);
    for (let lv = 0; lv < REFITS[track].levels.length - 1; lv++) {
      const total = Object.values(refitCost(track, lv).needs).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(total - 90 * 1.35 ** lv) < 3, `${track} ${lv}: the shares add up`);
    }
  }
  assert.ok((refitCost('engine', 6).needs.heavy ?? 0) > 0 && (refitCost('optics', 3).needs.heavy ?? 0) > 0);
  const g = Game.fresh();
  g.state.ship.archive = 1000;
  g.state.ship.hold.metals = 40;
  assert.match(said(g.exec('refit engine')), /We are short 54 isotopes/);
  assert.match(said(g.exec('ship')), /engine +20 > 32 +short 54 iso/);
  g.state.ship.hold.isotopes = 60;
  assert.match(said(g.exec('refit engine')), /to the yard/);
  assert.equal(g.state.ship.hold.isotopes, 6);
  assert.equal(g.state.ship.hold.metals, 4);
});

test('repairs use metals, and nothing else will do', () => {
  const g = Game.fresh();
  g.state.ship.hull = 60;
  g.state.ship.hold = { volatiles: 100, metals: 0, carbon: 0, isotopes: 0, heavy: 0 };
  assert.match(said(g.exec('repair')), /no metal to mend with/);
  g.state.ship.hold.metals = 15;
  g.exec('repair');
  g.exec('stay 60');
  assert.ok(g.state.ship.hold.metals < 0.01 && g.state.ship.hull > 74 && g.state.ship.hull < 75.5, `fifteen metals mend fifteen points: ${g.state.ship.hull.toFixed(1)}`);
});
