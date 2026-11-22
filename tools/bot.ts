/**
 * A bot that plays the game, to check pacing and repetition without a human.
 *
 *   node tools/bot.ts                 150 jumps, summary only
 *   node tools/bot.ts --jumps 500
 *   node tools/bot.ts --seed 7 --transcript > flight.txt
 *   node tools/bot.ts --deaf            ignore signals, to see who turns up by chance
 *
 * The bot is a plain, patient navigator: it provisions, surveys most of each
 * system, takes refits when offered, and goes for whatever the chart picks out
 * (signals, oddities, ruins) before the nearest unvisited star. It also counts who it meets, which is the check on how busy the
 * galaxy feels from the inside.
 */
import { Game, type Out } from '../src/core/game.ts';
import { DEMO, REFITS, type RefitTrack } from '../src/core/config.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const jumps = option('jumps', 150);
const seed = option('seed', DEMO.seed);
const transcript = args.includes('--transcript');
const deaf = args.includes('--deaf');

const game = Game.fresh(seed);
const lines: Out[] = [];
const counts = new Map<string, number>();
let commands = 0;

function run(command: string): Out[] {
  const out = game.exec(command);
  commands++;
  for (const o of out) {
    lines.push(o);
    if (o.k === 'mind' || o.k === 'text' || o.k === 'good' || o.k === 'alert') {
      // Strip day stamps and numbers so the same sentence counts as the same sentence.
      const key = o.s.replace(/^Day \d+\. /, '').replace(/\d+(\.\d+)?/g, '#');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  if (transcript) console.log(out.map((o) => o.s).join('\n'));
  return out;
}

if (transcript) console.log(game.intro().map((o) => o.s).join('\n'));

const stays: number[] = [];
let ecoBurns = 0;
let longest = 0;
let lowestHull = 100;
const refitLog: string[] = [];
let stuck = '';
// Who was there on arrival, counted once per jump.
const met = { home: 0, outpost: 0, claimed: 0, ruins: 0, quiet: 0 };
const firstMeeting: string[] = [];

for (let j = 0; j < jumps && !stuck; j++) {
  const arrived = game.state.tShip;
  const here = game.people();
  const alive = here.sites.filter((x) => x.alive);
  if (alive.some((x) => x.kind === 'home')) met.home++;
  else if (alive.length) met.outpost++;
  else if (here.claims.length) met.claimed++;
  if (here.sites.some((x) => !x.alive)) met.ruins++;
  if (!here.sites.length && !here.claims.length) met.quiet++;
  if (alive.length && firstMeeting.length < 3) firstMeeting.push(`jump ${j}, aboard ${game.state.tShip.toFixed(1)} yr`);
  // Look at what is here, as a player would, then work it.
  run('system');
  // Work the system: keep crews busy until nothing useful is left, or a year has gone.
  for (let round = 0; round < 40; round++) {
    for (const track of Object.keys(REFITS) as RefitTrack[]) {
      const out = game.state.crews.includes(null) ? game.exec(`refit ${track}`) : [];
      if (out.some((o) => o.s.includes('to the yard'))) refitLog.push(`${track} at jump ${j}, aboard ${game.state.tShip.toFixed(1)} yr`);
    }
    const jobs = game.chips().filter((c) => /^(scoop|ice|mine|survey|scan|repair)/.test(c));
    for (const job of jobs) if (game.state.crews.includes(null)) run(job);
    if (game.state.crews.every((c) => c === null)) break;
    if (game.state.tShip - arrived > 1.2 && !game.state.crews.some((c) => c?.op === 'refit' || c?.op === 'scan')) break;
    run('stay');
  }
  run('recall');
  stays.push(game.state.tShip - arrived);

  // Choose where to go. Most jumps: whatever the chart picks out (signals, oddities, ruins), else the nearest
  // unvisited star. Every sixth jump: the farthest bright star on the far chart.
  const far = j % 6 === 5;
  let gone = false;
  // First pass wants a comfortable arrival; the second takes any trip the tanks allow.
  for (const strict of [true, false]) {
    for (const view of far ? ['chart far', 'chart close'] : ['chart', 'chart close']) {
      if (gone) break;
      const chart = run(view);
      const rows = (chart.find((o) => o.k === 'pre')?.s ?? '').split('\n').filter((r) => /^ ?\d+[ *] /.test(r));
      const options = rows.map((r) => ({ n: Number(r.slice(0, 2)), visited: r[2] === '*', odd: /!\^?$/.test(r), loud: r.endsWith('^') }));
      const fresh = options.filter((o) => !o.visited);
      const drawn = (o: { odd: boolean; loud: boolean }) => o.odd || (o.loud && !deaf);
      const order =
        view === 'chart far'
          ? [...fresh.filter((o) => !o.loud)].reverse()
          : view === 'chart'
            ? fresh.filter(drawn)
            : [...fresh, ...options.filter((o) => o.visited)];
      for (const choice of order.slice(0, 9)) {
        if (gone) break;
        const plot = run(`plot ${choice.n}`).find((o) => o.k === 'pre')?.s ?? '';
        const read = (label: string) => {
          const m = new RegExp(`^ ${label}\\s+(-?\\d+)%\\s+(-?\\d+)%\\s+(-?\\d+)%`, 'm').exec(plot);
          return m ? { fuel: Number(m[1]), shield: Number(m[2]), hull: Number(m[3]) } : null;
        };
        const hard = read('hard');
        const eco = read('eco');
        let mode = '';
        if (strict) {
          if (hard && hard.fuel >= 20 && hard.shield >= 10 && hard.hull >= 50) mode = 'burn';
          else if (eco && eco.fuel >= 10 && eco.shield >= 5 && eco.hull >= 50) mode = 'burn eco';
        } else {
          mode = eco ? 'burn eco' : hard ? 'burn' : '';
        }
        if (!mode) continue;
        const before = game.state.at;
        const lyBefore = game.state.stats.ly;
        run(mode);
        gone = game.state.at !== before;
        if (gone) {
          if (mode === 'burn eco') ecoBurns++;
          longest = Math.max(longest, game.state.stats.ly - lyBefore);
          lowestHull = Math.min(lowestHull, game.state.ship.hull);
        }
      }
    }
  }
  if (!gone) stuck = `stuck at jump ${j} (${game.status().system}): no affordable destination`;
}

const s = game.state;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const repeated = [...counts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
const mindLines = lines.filter((o) => o.k === 'mind').length;
const report = [
  '',
  '==== flight summary ====',
  `seed ${seed} · ${s.stats.jumps} jumps · ${commands} commands · ${s.stats.systems} systems · ${Math.round(s.stats.ly)} ly`,
  `aboard ${s.tShip.toFixed(1)} yr · outside ${s.tGal.toFixed(1)} yr`,
  `mean stay ${(mean(stays) * 12).toFixed(1)} months · mean hop ${(s.stats.ly / Math.max(1, s.stats.jumps)).toFixed(1)} ly · longest ${longest.toFixed(0)} ly`,
  `economy burns ${ecoBurns} of ${s.stats.jumps} · lowest hull on arrival ${Math.round(lowestHull)}%`,
  `archive ${s.ship.archive} · finds ${s.stats.finds} · relics ${s.ship.relics.length}`,
  `arrivals: somebody's home ${met.home} · an outpost ${met.outpost} · claimed space only ${met.claimed} · ruins ${met.ruins} · nobody and nothing ${met.quiet}`,
  `peoples known ${Object.keys(s.met).length} (${Object.values(s.met).filter((m) => m.how === 'met').length} met living) · ruins read ${s.seen.ruin ?? 0} · first meetings at ${firstMeeting.join('; ') || 'never'}`,
  `ship: fuel ${Math.round(game.status().fuel)}% shield ${Math.round(s.ship.shield)}% hull ${Math.round(s.ship.hull)}% hold ${Object.entries(s.ship.hold).map(([m, n]) => `${m} ${Math.round(n)}`).join(', ')}`,
  `levels: ${Object.entries(s.ship.levels).map(([k, v]) => `${k} ${v}`).join(', ')}`,
  `refits: ${refitLog.join('; ') || 'none'}`,
  `mind: ${mindLines} lines (${(mindLines / Math.max(1, s.stats.jumps)).toFixed(1)} per jump), dissents ${s.mind.overruled}, early ${s.mind.early}, thorough ${s.mind.thorough}`,
  `distinct sentences ${counts.size}, repeated ${repeated.length}`,
  'most repeated:',
  ...repeated.slice(0, 12).map(([text, n]) => `  ${String(n).padStart(4)}x  ${text.slice(0, 96)}`),
  stuck ? `\n!! ${stuck}` : '',
];
console.log(report.join('\n'));
