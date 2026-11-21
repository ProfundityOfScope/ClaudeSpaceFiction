import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO, REFITS } from '../src/core/config.ts';
import { Galaxy } from '../src/core/galaxy.ts';
import { generateSystem } from '../src/core/system.ts';
import { cruiseGamma, planLeg } from '../src/core/travel.ts';
import { Game } from '../src/core/game.ts';
import { findStart } from '../src/core/state.ts';
import { WIDTH } from '../src/core/format.ts';
import { FEATURES } from '../src/core/features.ts';
import { LINES } from '../src/core/mind.ts';

const galaxy = new Galaxy(DEMO);
const start = findStart(galaxy);

test('a system is a pure function of the seed and its id', () => {
  const again = new Galaxy(DEMO);
  for (const { ref } of galaxy.near(start.x, start.y).slice(0, 40)) {
    const found = again.ref(ref.id);
    assert.ok(found, `ref ${ref.id} resolves`);
    assert.equal(found.x, ref.x);
    assert.equal(found.y, ref.y);
    assert.deepEqual(generateSystem(again, found), generateSystem(galaxy, ref));
  }
});

test('a different seed is a different galaxy', () => {
  const other = new Galaxy({ ...DEMO, seed: DEMO.seed + 1 });
  assert.notEqual(findStart(other).id + findStart(other).x, start.id + start.x);
});

test('the number of field systems matches the density it was drawn from', () => {
  // Count the dimmest tier in a 480 ly square well inside the disc.
  const cell = DEMO.strata[0].cell;
  let counted = 0;
  let expected = 0;
  for (let cx = 150; cx < 210; cx++) {
    for (let cy = 20; cy < 80; cy++) {
      counted += galaxy.fieldCell(0, cx, cy).length;
      expected += galaxy.density((cx + 0.5) * cell, (cy + 0.5) * cell) * DEMO.strata[0].fraction * cell * cell;
    }
  }
  assert.ok(Math.abs(counted - expected) < 5 * Math.sqrt(expected), `${counted} counted, ${expected.toFixed(0)} expected`);
});

test('bad ids are refused rather than invented', () => {
  assert.equal(galaxy.ref('F0.1.1.99999'), null);
  assert.equal(galaxy.ref('nonsense'), null);
  assert.equal(galaxy.ref('F9.0.0.0'), null);
});

test('travel: gas sets the speed, and the two clocks behave', () => {
  const drive = { thrust: 20, hull: 1 };
  assert.ok(cruiseGamma(drive, 1, 0.01) > cruiseGamma(drive, 1, 1), 'thin gas is faster');
  assert.ok(cruiseGamma({ thrust: 200, hull: 4 }, 1, 1) > cruiseGamma(drive, 1, 1), 'better ship is faster');
  const target = galaxy.near(start.x, start.y).find((s) => s.dist > 4)!;
  const hard = planLeg(galaxy, start, target.ref, drive, 1);
  const eco = planLeg(galaxy, start, target.ref, drive, 0.25);
  assert.ok(hard.galaxy >= hard.dist, 'nothing outruns light');
  assert.ok(hard.ship < hard.galaxy, 'less time passes aboard');
  assert.ok(eco.ship > hard.ship && eco.fuel < hard.fuel && eco.shield < hard.shield, 'economy is slower and cheaper');
  assert.ok(eco.fuel < hard.fuel / 4, 'and much cheaper in fuel, because burn rate goes as thrust squared');
  const better = planLeg(galaxy, start, target.ref, { thrust: 20, hull: 4 }, 1);
  assert.ok(better.shield < hard.shield / 4, 'a better hull loses far less ice');
});

test('a voyage survives saving and loading', () => {
  const a = Game.fresh();
  for (const c of ['sweep', 'survey', 'scoop 1', 'stay 40', 'chart', 'plot 1', 'burn', 'sweep']) a.exec(c);
  const b = Game.load(a.save());
  assert.deepEqual(b.status(), a.status());
  assert.deepEqual(b.exec('look'), a.exec('look'));
  assert.deepEqual(b.exec('stay 20'), a.exec('stay 20'));
  assert.throws(() => Game.load('{"v":2}'));
});

test('surveying finds everything, and work fills what it should', () => {
  const g = Game.fresh();
  g.exec('sweep');
  const total = g.here.discoveries.length;
  assert.ok(total > 0);
  g.exec('survey');
  g.exec('stay 3y');
  assert.equal(g.state.mem[g.state.at].found, total, 'three years is enough to chart the start system');
  const giant = g.here.bodies.find((b) => b.fuel > 0)!;
  g.exec(`scoop ${giant.n}`);
  g.exec('stay 200');
  assert.ok(g.status().fuel > 99);
});

test('fixed-width blocks fit a phone', () => {
  const g = Game.fresh();
  const commands = ['sweep', 'ops', 'survey', 'stay 60', 'look', 'chart', 'plot 1', 'plot 9', 'gas', 'plot 1', 'ship', 'refits', 'log', 'finds', 'help', 'burn', 'sweep', 'chart'];
  for (const c of commands) {
    for (const out of g.exec(c)) {
      if (out.k !== 'pre') continue;
      for (const line of out.s.split('\n')) assert.ok(line.length <= WIDTH, `"${c}" printed a ${line.length}-column line: ${line}`);
    }
  }
});

test('the written material is well formed', () => {
  const ids = new Set(FEATURES.map((f) => f.id));
  assert.equal(ids.size, FEATURES.length, 'feature ids are unique');
  for (const f of FEATURES) assert.ok(f.on.length > 0 && f.text.length > 20, f.id);
  for (const [pool, lines] of Object.entries(LINES)) assert.ok(lines.length > 0, pool);
  for (const track of Object.values(REFITS)) {
    for (let i = 1; i < track.levels.length; i++) assert.ok(track.levels[i] > track.levels[i - 1]);
  }
});

const said = (out: { s: string }[]) => out.map((o) => o.s).join('\n');

test('a new voyage is walked through its first visit, once', () => {
  const g = Game.fresh();
  assert.match(said(g.intro()), /First, a sweep/);
  assert.match(said(g.exec('sweep')), /Try "scoop \d+" and "survey"/);
  assert.match(said(g.exec('survey')), /let the days run/);
  assert.match(said(g.exec('stay 5')), /That is the rhythm/);
  assert.match(said(g.exec('chart')), /Pick one/);
  g.exec('plot 1');
  assert.match(said(g.exec('burn')), /I will stop explaining/);
  assert.equal(g.state.guide, undefined);
  // The next system gets no walkthrough.
  assert.doesNotMatch(said(g.exec('sweep')), /Try "scoop/);
});

test('a save from before the walkthrough loads and is not walked through', () => {
  const g = Game.fresh();
  const old = JSON.parse(g.save());
  delete old.guide;
  delete old.visit.plots;
  const loaded = Game.load(JSON.stringify(old));
  assert.doesNotMatch(said(loaded.exec('sweep')), /Try "scoop/);
  assert.ok(loaded.exec('chart').length > 0);
  assert.ok(loaded.exec('plot 1').length > 0);
});

test('other names and near misses for commands', () => {
  const g = Game.fresh();
  g.exec('sweep');
  assert.deepEqual(g.exec('map').slice(1), g.exec('look').slice(1));
  assert.match(said(g.exec('sweap')), /Did you mean "sweep"\?/);
  assert.doesNotMatch(said(g.exec('xyzzy')), /Did you mean/);
});

test('the Mind words a repeated objection differently, and remembers how they turned out', () => {
  const g = Game.fresh();
  g.state.guide = undefined;
  g.state.ship.shield = 0;
  const heard = new Set<string>();
  for (let i = 0; i < 6; i++) {
    g.state.ship.hull = 90;
    g.state.ship.fuel = 6;
    g.exec('chart');
    g.exec('gas');
    for (const o of [...g.exec('plot 1'), ...g.exec('burn')]) if (o.k === 'mind') heard.add(o.s);
  }
  assert.ok(g.state.mind.overruled >= 3, 'six burns with no shield draw several dissents');
  assert.ok(Math.abs(g.state.mind.streak ?? 0) >= 2, 'and it keeps a running tally of the outcomes');
  assert.ok([...heard].some((line) => /Dissent number|for the record|same as the last|with the others|Number \d/.test(line)));
});

test('chart and gas carry a map for the page to draw, and the same map in characters', () => {
  const g = Game.fresh();
  g.exec('sweep');
  for (const command of ['chart', 'gas']) {
    const item = g.exec(command).find((o) => o.k === 'map');
    assert.ok(item?.map, `${command} emits a map`);
    const { size, gas, stars, radius } = item.map;
    assert.ok(radius > 0);
    assert.equal(gas.length, size * size);
    assert.match(gas, /^[0-4]+$/);
    for (const star of stars) assert.ok(star.x >= 0 && star.x < size && star.y >= 0 && star.y < size);
    const numbers = stars.filter((star) => star.n).map((star) => star.n);
    assert.ok(numbers.length > 0, 'some stars are numbered');
    assert.equal(new Set(numbers).size, numbers.length, 'and no number is used twice');
    assert.ok(item.s.includes('@'), 'the character map is still there for a terminal');
  }
});
