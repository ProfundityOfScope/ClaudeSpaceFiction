/**
 * A census of who is out there, to tune how often the navigator meets someone.
 *
 *   node tools/census.ts
 *   node tools/census.ts --seed 7
 *
 * Counts cultures, outposts and ruins in the starting cluster and in the
 * field around it, at several dates, and says how far the nearest neighbours
 * are. The numbers to steer by: about 1 field system in 100 inhabited, and a
 * starting cluster with several cultures in it.
 */
import { CIV, DEMO } from '../src/core/config.ts';
import { Galaxy, type SysRef } from '../src/core/galaxy.ts';
import { Cultures, frontier, type Culture } from '../src/core/civs.ts';
import { findStart } from '../src/core/state.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const seed = option('seed', DEMO.seed);
const galaxy = new Galaxy({ ...DEMO, seed });
const cultures = new Cultures(galaxy);
const start = findStart(galaxy);
const pct = (n: number, of: number) => (of ? `${((100 * n) / of).toFixed(2)}%` : '-');
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);

function tally(refs: SysRef[], year: number) {
  const t = { systems: refs.length, home: 0, outpost: 0, anyone: 0, claimed: 0, homeRuin: 0, outpostRuin: 0, anyRuin: 0 };
  const tempers: Record<string, number> = {};
  const phases: Record<string, number> = {};
  for (const ref of refs) {
    const p = cultures.presence(cultures.system(ref), year);
    const alive = p.sites.filter((s) => s.alive);
    const dead = p.sites.filter((s) => !s.alive);
    if (alive.some((s) => s.kind === 'home')) t.home++;
    if (alive.some((s) => s.kind === 'outpost')) t.outpost++;
    if (alive.length) t.anyone++;
    if (p.claims.length) t.claimed++;
    if (dead.some((s) => s.kind === 'home')) t.homeRuin++;
    if (dead.some((s) => s.kind === 'outpost')) t.outpostRuin++;
    if (dead.length) t.anyRuin++;
    for (const s of alive) {
      if (s.kind !== 'home') continue;
      tempers[s.culture.temper] = (tempers[s.culture.temper] ?? 0) + 1;
      phases[s.phase] = (phases[s.phase] ?? 0) + 1;
    }
  }
  return { ...t, tempers, phases };
}

function row(label: string, t: ReturnType<typeof tally>) {
  const cell = (n: number) => `${String(n).padStart(5)} ${pct(n, t.systems).padStart(7)}`;
  console.log(`${label.padEnd(12)}${String(t.systems).padStart(7)} ${cell(t.home)} ${cell(t.outpost)} ${cell(t.anyone)} ${cell(t.claimed)} ${cell(t.anyRuin)}`);
}
const header = () => console.log(`${''.padEnd(12)}${'systems'.padStart(7)} ${'homes'.padStart(13)} ${'outposts'.padStart(13)} ${'inhabited'.padStart(13)} ${'claimed'.padStart(13)} ${'ruins'.padStart(13)}`);

const startSys = cultures.system(start);
console.log(`seed ${seed} · start ${startSys.name} at (${start.x.toFixed(0)}, ${start.y.toFixed(0)})`);

// ---- the starting cluster ----
const cluster = galaxy.within(start.x, start.y, 120).map((s) => s.ref).filter((r) => r.cluster === start.cluster);
console.log(`\nthe starting cluster: ${start.cluster?.name}, ${cluster.length} systems, sigma ${start.cluster?.sigma.toFixed(1)} ly`);
header();
for (const year of [0, 100, 500, 2000, 8000, 30000]) row(`year ${year}`, tally(cluster, year));

// ---- the field around it ----
const field = galaxy.within(start.x, start.y, 260).map((s) => s.ref).filter((r) => !r.cluster);
console.log(`\nfield systems within 260 ly of the start`);
header();
let last = tally(field, 0);
for (const year of [0, 500, 2000, 8000, 30000]) row(`year ${year}`, (last = tally(field, year)));
console.log(`  at year 30000: tempers ${JSON.stringify(last.tempers)}`);
console.log(`                 phases  ${JSON.stringify(last.phases)}`);

// ---- elsewhere in the disc ----
console.log(`\nfield systems elsewhere, year 0 (radius of the patch chosen to hold a few thousand systems)`);
header();
for (const f of [0.15, 0.5, 1.5, 2.5]) {
  const r = f * DEMO.scaleLength;
  const angle = Math.atan2(start.y, start.x) + 1;
  const patch = galaxy.within(r * Math.cos(angle), r * Math.sin(angle), f < 1 ? 120 : 220).map((s) => s.ref).filter((x) => !x.cluster);
  row(`r = ${Math.round(r)} ly`, tally(patch, 0));
}

// ---- neighbours of the start ----
console.log(`\nfrom the start, living cultures (homes and outposts) within:`);
for (const year of [0, 500, 2000]) {
  const near = galaxy.within(start.x, start.y, 100).filter((s) => s.dist > 0);
  const lived = near.filter((s) => cultures.presence(cultures.system(s.ref), year).sites.some((x) => x.alive));
  const ruined = near.filter((s) => cultures.presence(cultures.system(s.ref), year).sites.some((x) => !x.alive));
  const within = (list: typeof near, d: number) => list.filter((s) => s.dist <= d).length;
  const heard = cultures.signals(start.x, start.y, year, 80).length;
  console.log(
    `  year ${String(year).padEnd(5)} 10 ly: ${within(lived, 10)} of ${within(near, 10)} · 25 ly: ${within(lived, 25)} of ${within(near, 25)} · 100 ly: ${within(lived, 100)} of ${near.length}` +
      ` · ruins within 10/25 ly: ${within(ruined, 10)}/${within(ruined, 25)} · signals heard: ${heard}`,
  );
}

// ---- how far to the nearest neighbour, from field systems ----
const sample = field.filter((_, i) => i % 40 === 0).slice(0, 150);
const nearest: number[] = [];
const nearestRuin: number[] = [];
for (const ref of sample) {
  const around = galaxy.within(ref.x, ref.y, 80).filter((s) => s.dist > 0);
  const a = around.find((s) => cultures.presence(cultures.system(s.ref), 0).sites.some((x) => x.alive));
  const b = around.find((s) => cultures.presence(cultures.system(s.ref), 0).sites.some((x) => !x.alive));
  nearest.push(a ? a.dist : 80);
  nearestRuin.push(b ? b.dist : 80);
}
console.log(`\nfrom ${sample.length} field systems: median distance to the nearest living culture ${median(nearest).toFixed(1)} ly, to the nearest ruin ${median(nearestRuin).toFixed(1)} ly`);

// ---- cultures that spread ----
const cc = DEMO.coarse;
const reaches: Culture[] = [];
const cx = Math.floor(start.x / cc);
const cy = Math.floor(start.y / cc);
const span = 4;
for (const era of [0, -1, -2]) {
  for (let i = cx - span; i <= cx + span; i++) for (let j = cy - span; j <= cy + span; j++) reaches.push(...cultures.reachesIn(i, j, era));
}
const cells = (2 * span + 1) ** 2;
const living = reaches.filter((c) => c.born <= 0 && c.born + c.life > 0);
const radii = living.map((c) => frontier(c, 0)).filter((r) => r > 0);
const peaks = reaches.map((c) => Math.min(c.reach!.radius, c.reach!.speed * 0.6 * c.life));
console.log(`\nspreading cultures in ${cells} coarse cells round the start: ${reaches.length} seeded over three eras, ${living.length} alive at year 0 (${(living.length / cells).toFixed(2)} per cell)`);
console.log(`  radius held now: median ${median(radii).toFixed(1)} ly, largest ${Math.max(0, ...radii).toFixed(0)} ly · greatest extent ever: median ${median(peaks).toFixed(1)} ly, largest ${Math.max(0, ...peaks).toFixed(0)} ly`);
for (const c of living.sort((a, b) => frontier(b, 0) - frontier(a, 0)).slice(0, 6)) {
  const d = Math.hypot(c.home.x - start.x, c.home.y - start.y);
  console.log(`  ${c.title.padEnd(26)} ${c.temper.padEnd(10)} holds ${frontier(c, 0).toFixed(0).padStart(3)} ly · ${Math.round(-c.born)} yr old of ${Math.round(c.life)} · ${d.toFixed(0)} ly from the start`);
}

// ---- turnover ----
const alive0 = field.filter((ref) => cultures.presence(cultures.system(ref), 0).sites.some((s) => s.alive && s.kind === 'home'));
console.log(`\nturnover: of ${alive0.length} field homes alive at year 0, still the same culture after`);
for (const years of [50, 200, 500, 1000, 3000]) {
  const same = alive0.filter((ref) => {
    const sys = cultures.system(ref);
    const then = cultures.presence(sys, 0).sites.find((s) => s.alive && s.kind === 'home')!;
    return cultures.presence(sys, years).sites.some((s) => s.alive && s.culture.id === then.culture.id);
  }).length;
  console.log(`  ${String(years).padStart(5)} yr: ${pct(same, alive0.length)}`);
}
console.log(`\n(era ${CIV.ERA} yr · world rate ${CIV.WORLD_RATE} · old cluster x${CIV.OLD_CLUSTER} · one spreading culture per ${CIV.REACH_PER} systems per era)`);
