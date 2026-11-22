import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CIV, DEMO } from '../src/core/config.ts';
import { Galaxy, type SysRef } from '../src/core/galaxy.ts';
import { Cultures, frontier, isLiving, phaseOf, type Culture, type Phase } from '../src/core/civs.ts';
import { Game } from '../src/core/game.ts';
import { findStart } from '../src/core/state.ts';

const galaxy = new Galaxy(DEMO);
const cultures = new Cultures(galaxy);
const start = findStart(galaxy, cultures);
const around = (radius: number) => galaxy.within(start.x, start.y, radius).map((s) => s.ref);
const YEARS = [-20000, -3000, 0, 150, 1234, 8000, 50000];
const said = (out: { s: string }[]) => out.map((o) => o.s).join('\n');

/** Every culture with a site near the start at one of the sample years. */
function sample(): Culture[] {
  const found = new Map<string, Culture>();
  for (const ref of around(40)) {
    for (const year of YEARS) for (const site of cultures.presence(cultures.system(ref), year).sites) found.set(site.culture.id, site.culture);
  }
  return [...found.values()];
}

test('who is home is a pure function of the seed, the place and the year', () => {
  const again = new Cultures(new Galaxy(DEMO));
  for (const ref of around(15)) {
    for (const year of YEARS) {
      assert.deepEqual(again.presence(again.system(again.galaxy.ref(ref.id)!), year), cultures.presence(cultures.system(ref), year));
    }
  }
  // Asking about another year in between changes nothing.
  const first = cultures.presence(cultures.system(start), 500);
  cultures.presence(cultures.system(start), 90000);
  assert.deepEqual(cultures.presence(cultures.system(start), 500), first);
});

test('a culture can be found again from its id', () => {
  const some = sample();
  assert.ok(some.length > 10, `${some.length} cultures near the start`);
  for (const c of some) assert.deepEqual(cultures.byId(c.id), c);
  assert.equal(cultures.byId('W0:nonsense'), null);
  assert.equal(cultures.byId('nonsense'), null);
});

test('a culture rises, declines, leaves ruins, and then leaves nothing', () => {
  const order: (Phase | null)[] = [null, 'founding', 'rising', 'height', 'decline', 'ruins', 'old ruins', null];
  for (const c of sample()) {
    let at = 0;
    for (let i = -5; i <= 205; i++) {
      const phase = phaseOf(c, c.born + (i / 200) * (c.life + c.ruin));
      while (order[at] !== phase && at < order.length - 1) at++;
      assert.equal(order[at], phase, `${c.title} went back to ${phase}`);
    }
    assert.equal(at, order.length - 1, `${c.title} ends with nothing left`);
    assert.ok(c.life >= CIV.LIFE_MIN && c.ruin <= CIV.RUIN_MAX);
    assert.ok(c.born + c.life + c.ruin - c.born < 2 * CIV.ERA, 'and all of it fits in two eras');
  }
});

test('one world never has two living cultures of its own at once', () => {
  for (const ref of around(60)) {
    const sys = cultures.system(ref);
    for (const year of YEARS) {
      const homes = cultures.presence(sys, year).sites.filter((s) => s.alive && s.kind === 'home');
      assert.ok(homes.length <= 1, `${sys.name} in year ${year}: ${homes.map((s) => s.culture.title).join(' and ')}`);
    }
  }
});

test('cultures that spread hold a bounded space, and their outposts lie inside it', () => {
  const cc = DEMO.coarse;
  const reaches: Culture[] = [];
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) for (const era of [-1, 0]) reaches.push(...cultures.reachesIn(Math.floor(start.x / cc) + i, Math.floor(start.y / cc) + j, era));
  assert.ok(reaches.length > 50, `${reaches.length} spreading cultures round the start`);
  let outposts = 0;
  for (const c of reaches.slice(0, 80)) {
    assert.ok(c.reach && c.reach.radius <= CIV.REACH_CAP);
    for (const f of [0.1, 0.3, 0.6, 0.9]) {
      const year = c.born + f * c.life;
      const held = frontier(c, year);
      assert.ok(held >= 0 && held <= c.reach.radius);
      if (held < 1) continue;
      for (const { ref, dist } of galaxy.within(c.home.x, c.home.y, Math.min(held + 3, 40))) {
        const here = cultures.presence(cultures.system(ref), year);
        const site = here.sites.find((s) => s.culture.id === c.id && s.alive);
        if (ref.id === c.home.id) assert.equal(site?.kind, 'home');
        else if (site) {
          outposts++;
          assert.ok(dist <= held + 1e-6, `${c.title} holds ${ref.id} at ${dist.toFixed(1)} ly, beyond its ${held.toFixed(1)}`);
          assert.ok(here.claims.includes(c));
        }
      }
    }
  }
  assert.ok(outposts > 20, `${outposts} outposts seen`);
});

test('about one field system in a hundred is inhabited, and the starting cluster is busier', () => {
  const field = around(200).filter((r) => !r.cluster);
  const cluster = around(120).filter((r) => r.cluster === start.cluster);
  const count = (refs: SysRef[], year: number, alive: boolean) =>
    refs.filter((ref) => cultures.presence(cultures.system(ref), year).sites.some((s) => s.alive === alive && s.kind === 'home')).length;
  for (const year of [0, 3000, 20000]) {
    const share = count(field, year, true) / field.length;
    assert.ok(share > 0.005 && share < 0.02, `${(100 * share).toFixed(2)}% of ${field.length} field systems inhabited in year ${year}`);
    const ruined = count(field, year, false) / field.length;
    assert.ok(ruined > share * 0.8 && ruined < share * 3, `ruins follow from the living: ${(100 * ruined).toFixed(2)}%`);
    assert.ok(count(cluster, year, true) / cluster.length > 2 * share, 'the cluster is busier than the field');
  }
});

test('the voyage starts somewhere empty, with neighbours', () => {
  const here = cultures.presence(cultures.system(start), 0);
  assert.equal(here.sites.length + here.claims.length, 0);
  const near = galaxy.within(start.x, start.y, DEMO.strata[0].sight).filter((s) => s.dist > 0);
  const sites = near.flatMap((s) => cultures.presence(cultures.system(s.ref), 0).sites);
  assert.ok(sites.some((s) => s.alive), 'somebody is alive within the first chart');
  assert.ok(sites.some((s) => !s.alive), 'and somebody has left ruins');
});

/** Put the ship in orbit at a system by the ordinary route: plot it and burn. */
function fly(g: Game, id: string) {
  g.state.ship.fuel = 1e6;
  g.state.ship.shield = 100;
  g.state.ship.hull = 100;
  g.state.chart = [id];
  g.exec('plot 1');
  const out = g.exec('burn');
  assert.equal(g.state.at, id);
  return out;
}

const nearby = galaxy.within(start.x, start.y, 15).filter((s) => s.dist > 0);
const sitesAt = (ref: SysRef, year: number) => cultures.presence(cultures.system(ref), year).sites;

test('arriving where somebody lives: they are named, noted and left their home', () => {
  const g = Game.fresh();
  const target = nearby.find((s) => sitesAt(s.ref, 10).some((x) => x.alive && x.kind === 'home'))!;
  const out = fly(g, target.ref.id);
  const site = g.people().sites.find((x) => x.alive)!;
  assert.match(said(out), /Somebody is home/);
  assert.ok(said(out).includes(site.culture.title));
  assert.equal(g.state.met[site.culture.id]?.how, 'met');
  assert.ok(g.state.ship.archive >= CIV.MEET_ARCHIVE);
  g.exec('sweep');
  assert.match(said(g.exec('look')), new RegExp(`${site.body}\\^`));
  assert.match(said(g.exec(`mine ${site.body}`)), /somebody's home/);
  assert.match(said(g.exec(`ice ${site.body}`)), /somebody's home/);
  // Coming back later says how they are, and does not introduce them twice.
  const back = fly(g, start.id);
  assert.doesNotMatch(said(back), /Somebody is home/);
  const again = said(fly(g, target.ref.id));
  assert.match(again, /still here|when we were last here/);
  assert.doesNotMatch(again, /new to the Archive/);
});

test('coming back after they have ended: ruins, and later nothing at all', () => {
  const g = Game.fresh();
  const target = nearby.find((s) => sitesAt(s.ref, 10).some((x) => x.alive && x.kind === 'home'))!;
  fly(g, target.ref.id);
  g.exec('sweep');
  const c = g.people().sites.find((x) => x.alive)!.culture;
  fly(g, start.id);
  g.state.tGal = c.born + c.life + 50;
  const ruined = said(fly(g, target.ref.id));
  assert.match(ruined, /are gone\. What they built still stands/);
  assert.ok(g.exec('ops').some((o) => o.s.includes('ruins')), 'their ruins can be read');
  fly(g, start.id);
  g.state.tGal = c.born + c.life + c.ruin + 9000;
  assert.match(said(fly(g, target.ref.id)), /weathered away|Nothing is left/);
});

test('a stay long enough for the neighbours to change says so, once', () => {
  const g = Game.fresh();
  const target = nearby.find((s) => sitesAt(s.ref, 10).some((x) => x.alive && x.kind === 'home'))!;
  fly(g, target.ref.id);
  const c = g.people().sites.find((x) => x.alive)!.culture;
  assert.doesNotMatch(said(g.exec('stay 5')), /when we arrived/);
  // Skip to the eve of their decline, then let a few days run.
  g.state.tGal = c.born + 0.75 * c.life - 0.01;
  assert.match(said(g.exec('stay 10')), /when we arrived\. They are in decline now/);
  assert.doesNotMatch(said(g.exec('stay 10')), /when we arrived/);
  assert.match(said(g.exec('scope 1')), /Pull up the chart/);
});

test('reading a ruin: whose it was, credit, and it is not offered twice', () => {
  const g = Game.fresh();
  const target = nearby.find((s) => {
    const sites = sitesAt(s.ref, 30);
    return sites.length > 0 && sites.every((x) => !x.alive);
  })!;
  fly(g, target.ref.id);
  assert.doesNotMatch(said(g.exec('look')), /deep scan/, 'nothing shows before the sweep');
  const swept = said(g.exec('sweep'));
  assert.match(swept, /would say whose it was/);
  const site = g.people().sites.find((x) => !x.alive)!;
  const before = g.state.ship.archive;
  assert.match(said(g.exec(`scan ${site.body}`)), /deep scan/);
  const done = said(g.exec('stay 200'));
  assert.ok(done.includes(site.culture.name), 'the scan names them');
  assert.ok(g.state.ship.archive > before);
  assert.equal(g.state.met[site.culture.id]?.how, 'ruins');
  assert.ok(g.state.mem[g.state.at].sites.includes(site.culture.id));
  if (g.people().sites.filter((x) => !x.alive).length === 1) assert.match(said(g.exec(`scan ${site.body}`)), /Nothing at/);
  for (const relic of g.state.ship.relics) assert.ok(relic.what && relic.kind);
  // The whole thing survives a save.
  assert.equal(Game.load(g.save()).save(), g.save());
});

test('a signal on the chart is what the light shows', () => {
  const g = Game.fresh();
  g.exec('sweep');
  const rows = g.exec('chart').find((o) => o.k === 'pre')!.s.split('\n');
  const loud = rows.filter((r) => r.endsWith('^'));
  assert.ok(loud.length > 0, 'the first chart shows a signal');
  for (const row of loud) {
    const sys = cultures.system(galaxy.ref(g.state.chart[parseInt(row) - 1])!);
    const dist = Math.hypot(sys.ref.x - start.x, sys.ref.y - start.y);
    assert.ok(cultures.presence(sys, -dist).sites.some((x) => isLiving(x.phase)), `${sys.name} was inhabited when the light left`);
  }
  assert.ok(g.exec('gas').find((o) => o.k === 'map')!.map!.stars.some((star) => star.signal), 'and the wide map marks signals');
});

test('unread ruins near enough to resolve are flagged on the chart, until they are read', () => {
  const g = Game.fresh();
  g.exec('sweep');
  const rows = g.exec('chart').find((o) => o.k === 'pre')!.s.split('\n').slice(1);
  const ruined = g.state.chart.filter((id) => sitesAt(galaxy.ref(id)!, 0).some((x) => !x.alive));
  assert.ok(ruined.length > 0, 'the first chart lists somewhere with ruins');
  for (const id of ruined) assert.match(rows[g.state.chart.indexOf(id)], /!\^?$/);
  // Read one, come away, and its flag is gone.
  const id = ruined[0];
  fly(g, id);
  g.exec('sweep');
  for (const site of g.people().sites.filter((x) => !x.alive)) {
    g.exec(`scan ${site.body}`);
    g.exec('stay 200');
  }
  fly(g, start.id);
  g.exec('chart');
  const row = g.exec('chart').find((o) => o.k === 'pre')!.s.split('\n').slice(1)[g.state.chart.indexOf(id)];
  if (row) assert.doesNotMatch(row, /!\^?$/);
});

test('space somebody holds is drawn as a hull round their systems, once we know of them', () => {
  const cc = DEMO.coarse;
  let reach: Culture | null = null;
  for (let i = -3; i <= 3 && !reach; i++) {
    for (let j = -3; j <= 3 && !reach; j++) {
      for (const era of [0, -1, -2]) {
        reach ??= cultures.reachesIn(Math.floor(start.x / cc) + i, Math.floor(start.y / cc) + j, era).find((c) => frontier(c, 500) > 10 && frontier(c, 0) > 10) ?? null;
      }
    }
  }
  assert.ok(reach, 'a spreading culture within a few hundred light-years');
  const g = Game.fresh();
  g.exec('sweep');
  assert.equal(g.exec('chart').find((o) => o.k === 'map')!.map!.held, undefined, 'nothing is drawn where nobody is known');
  g.state.ship.levels.engine = 10;
  g.state.ship.levels.hull = 10;
  const inside = galaxy.within(reach.home.x, reach.home.y, 5).find((s) => s.dist > 0)!;
  fly(g, inside.ref.id);
  assert.match(said(g.exec('chart')), /inside the space of .*nearest edge is [\d.]+ ly to the (north|south|east|west)|The space of .* begins/, 'and the chart says so in words');
  for (const command of ['chart close', 'chart', 'chart far']) {
    const map = g.exec(command).find((o) => o.k === 'map')!.map!;
    assert.ok(map.held, `${command}: their home can be heard from here, so their space is drawn`);
    const cell = (ref: SysRef) => {
      const c = Math.floor(((ref.x - inside.ref.x) / map.radius + 1) * (map.size / 2));
      const r = Math.floor((1 - (ref.y - inside.ref.y) / map.radius) * (map.size / 2));
      return c >= 0 && r >= 0 && c < map.size && r < map.size ? map.held![r * map.size + c] : null;
    };
    // Every system of theirs that is on the map lies inside the shape, and the shape is not the whole sky.
    let theirs = 0;
    for (const { ref, dist } of galaxy.within(inside.ref.x, inside.ref.y, map.radius)) {
      if (!cultures.holds(reach, cultures.system(ref), g.state.tGal - dist)) continue;
      const at = cell(ref);
      if (at === null) continue;
      theirs++;
      assert.notEqual(at, '0', `${command}: ${ref.id} is theirs and lies inside`);
    }
    assert.ok(theirs > 0);
    if (command === 'chart far') assert.ok(map.held.includes('0') && map.held.includes('1') && map.held.includes('2'), 'outside, inside and edge all show');
  }
});
