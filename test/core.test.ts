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
import { convexHull, drawPolygon, insidePolygon, paddedHull } from '../src/core/hull.ts';

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
  const commands = ['sweep', 'ops', 'survey', 'stay 60', 'look', 'chart close', 'plot 1', 'plot 9', 'chart far', 'plot 1', 'ship', 'refits', 'log', 'finds', 'help', 'chart', 'chart sideways'];
  // Then on through a few systems the chart picks out, so inhabited ones and ruins are covered too.
  for (let hop = 0; hop < 6; hop++) commands.push('chart', `plot ${1 + (hop % 3)}`, 'burn', 'sweep', 'survey', 'stay 60', 'mine 1 40', 'mine 2', 'look', 'ops', 'chart close', 'chart far', 'gas', 'finds', 'ship');
  for (const c of commands) {
    for (const out of g.exec(c)) {
      if (out.k !== 'pre' && out.k !== 'map') continue;
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

test('a save from an older version is refused, and says why', () => {
  const old = JSON.parse(Game.fresh().save());
  old.v = 1;
  assert.throws(() => Game.load(JSON.stringify(old)), /older version/);
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
    // Take the farthest thing on the chart that the tanks allow: far enough, with no shield, to cost hull.
    g.exec('chart');
    for (let n = g.state.chart.length; n >= 1; n--) {
      const from = g.state.at;
      for (const o of [...g.exec(`plot ${n}`), ...g.exec('burn')]) if (o.k === 'mind') heard.add(o.s);
      if (g.state.at !== from) break;
    }
  }
  assert.ok(g.state.mind.overruled >= 3, 'six burns with no shield draw several dissents');
  assert.ok(Math.abs(g.state.mind.streak ?? 0) >= 2, 'and it keeps a running tally of the outcomes');
  assert.ok([...heard].some((line) => /Dissent number|for the record|same as the last|with the others|Number \d/.test(line)));
});

test('every chart carries a map for the page to draw, and the same map in characters', () => {
  const g = Game.fresh();
  g.exec('sweep');
  for (const command of ['chart close', 'chart', 'chart far', 'gas']) {
    const item = g.exec(command).find((o) => o.k === 'map');
    assert.ok(item?.map, `${command} emits a map`);
    const { size, gas, stars, radius, held, inner } = item.map;
    assert.ok(radius > 0);
    assert.equal(gas.length, size * size);
    assert.match(gas, /^[0-9a-z]+$/, 'gas is one of 36 shades in every cell');
    for (const star of stars) assert.ok(star.x >= 0 && star.x < size && star.y >= 0 && star.y < size);
    const numbers = stars.filter((star) => star.n).map((star) => star.n);
    assert.ok(numbers.length > 0, 'some stars are numbered');
    assert.equal(new Set(numbers).size, numbers.length, 'and no number is used twice');
    if (held !== undefined) assert.match(held, new RegExp(`^[012]{${size * size}}$`));
    assert.equal(inner, command === 'chart close' ? undefined : size / 8, 'wider charts box the next one in');
    assert.ok(item.s.includes('@'), 'the character map is still there for a terminal');
  }
});

test('the three charts nest, and each lists what suits its scale', () => {
  const g = Game.fresh();
  g.exec('sweep');
  const view = (command: string) => {
    const out = g.exec(command);
    const rows = (out.find((o) => o.k === 'pre')?.s ?? '').split('\n').slice(1);
    return { map: out.find((o) => o.k === 'map')!.map!, ids: [...g.state.chart], dists: rows.map((r) => parseFloat(r.slice(18, 23))) };
  };
  const close = view('chart close');
  const mid = view('chart');
  const far = view('gas');
  assert.equal(mid.map.radius, 4 * close.map.radius);
  assert.equal(far.map.radius, 16 * close.map.radius);
  assert.deepEqual([close.map.zoom, mid.map.zoom, far.map.zoom], ['close', 'mid', 'far']);
  // Close: simply the nearest nine.
  const nearest = galaxy.near(start.x, start.y).filter((x) => x.dist > 0).slice(0, 9).map((x) => x.ref.id);
  assert.deepEqual(close.ids, nearest);
  for (const v of [close, mid, far]) {
    assert.ok(v.ids.length > 0 && v.ids.length <= 13);
    assert.deepEqual(v.dists, [...v.dists].sort((a, b) => a - b), 'nearest first');
  }
  // Far: nothing numbered inside the plain chart's frame.
  for (const id of far.ids) {
    const ref = galaxy.ref(id)!;
    assert.ok(Math.max(Math.abs(ref.x - start.x), Math.abs(ref.y - start.y)) >= mid.map.radius, `${id} lies outside the plain chart`);
  }
  // "plot" works on whichever list was shown last.
  g.exec('chart close');
  g.exec('plot 1');
  assert.equal(g.state.plot, close.ids[0]);
  g.exec('chart');
  g.exec('plot 1');
  assert.equal(g.state.plot, mid.ids[0]);
  assert.match(g.exec('chart sideways').map((o) => o.s).join(' '), /Which chart\?/);
});

test('a convex hull keeps the outermost points, and draws as an edge with an inside', () => {
  const square = [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 8 }, { x: 2, y: 8 }];
  const hull = convexHull([...square, { x: 5, y: 5 }, { x: 3, y: 6 }, { x: 8, y: 5 }]);
  assert.equal(hull.length, 4, 'points inside and along an edge are dropped');
  for (const corner of square) assert.ok(hull.some((p) => p.x === corner.x && p.y === corner.y));
  assert.ok(insidePolygon(hull, 5, 5) && !insidePolygon(hull, 9, 5));
  assert.equal(convexHull([{ x: 1, y: 1 }]).length, 1);
  // With a margin, every original point is strictly inside.
  const padded = paddedHull(square, 1);
  for (const corner of square) assert.ok(insidePolygon(padded, corner.x, corner.y));
  const grid = new Uint8Array(12 * 12);
  drawPolygon(padded, 12, grid);
  assert.equal(grid[5 * 12 + 5], 1, 'the middle is inside');
  assert.equal(grid[0], 0, 'the far corner is outside');
  assert.ok(grid.includes(2), 'and there is an edge');
  // A shape that runs off the grid is drawn where it can be and nowhere else.
  const off = new Uint8Array(12 * 12);
  drawPolygon([{ x: -20, y: -20 }, { x: 6, y: -20 }, { x: 6, y: 40 }, { x: -20, y: 40 }], 12, off);
  assert.equal(off[5 * 12 + 2], 1);
  assert.equal(off[5 * 12 + 9], 0);
});

test('plot says what is there and what it costs, and takes a name as well as a number', () => {
  const g = Game.fresh();
  g.exec('sweep');
  g.exec('chart');
  const [first, second] = g.state.chart;
  const byNumber = g.exec('plot 1');
  assert.equal(g.state.plot, first);
  assert.match(said(byNumber), /light-years off/, 'what the telescope sees');
  assert.match(said(byNumber), /arriving +fuel +shield +hull/, 'and what the trip costs');
  assert.deepEqual(g.exec('scope 1').slice(1), g.exec('plot 1').slice(1), '"scope" is the same command now');
  // By name, whole or in part, whatever chart was last on screen.
  const name = generateSystem(galaxy, galaxy.ref(second)!).name;
  g.exec('chart far');
  g.exec(`plot ${name.toLowerCase()}`);
  assert.equal(g.state.plot, second);
  assert.match(said(g.exec('plot ember')), /stars in sight match "ember"/);
  assert.match(said(g.exec('plot zzzz')), /No star in sight is called "zzzz"/);
  // A name needs no chart at all.
  const cold = Game.fresh();
  cold.exec(`plot ${name}`);
  assert.equal(cold.state.plot, second);
  assert.match(said(cold.exec('plot 1')), /Pull up the chart first/);
});

test('each chart says which of its stars the tanks can reach', () => {
  const g = Game.fresh();
  g.exec('sweep');
  assert.match(said(g.exec('chart close')), /On these tanks a hard burn reaches all of them\./);
  g.state.ship.fuel = 0.12;
  const thin = said(g.exec('chart'));
  assert.match(thin, /On these tanks: /);
  assert.match(thin, /out of reach|only economy reaches/);
  g.state.ship.fuel = 0;
  assert.match(said(g.exec('chart far')), /none of them is in reach, even on economy/);
});

test('look shows the crews and where they are; ship includes the refits', () => {
  const g = Game.fresh();
  g.exec('sweep');
  const giant = g.here.bodies.find((b) => b.fuel > 0)!;
  g.exec(`scoop ${giant.n}`);
  g.exec('survey');
  const look = g.exec('look').find((o) => o.k === 'pre')!.s.split('\n');
  assert.ok(look.some((l) => l.startsWith(' crew 1  scoop')), 'crew 1 is listed with its job');
  assert.ok(look.some((l) => l.startsWith(' crew 2  survey')));
  // The tag sits under the body the crew is working.
  const numbers = look[1];
  const tags = look[2];
  assert.equal(tags.indexOf('c1'), numbers.indexOf(String(giant.n)), 'c1 is under the giant');
  const ship = said(g.exec('ship'));
  assert.match(ship, /refit +now > next +needs/);
  assert.match(ship, /engine +20 > 32/);
  assert.deepEqual(g.exec('refits').slice(1), g.exec('ship').slice(1), '"refits" is the same command now');
});
