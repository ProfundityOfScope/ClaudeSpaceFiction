/**
 * A bot that plays the game, to check pacing and repetition without a human.
 *
 *   node tools/bot.ts                 150 jumps, summary only
 *   node tools/bot.ts --jumps 500
 *   node tools/bot.ts --seed 7 --transcript > flight.txt
 *
 * The bot is a plain, patient navigator: it provisions, surveys most of each
 * system, takes refits when offered, and prefers unvisited stars and oddities.
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
const refitLog: string[] = [];
let stuck = '';

for (let j = 0; j < jumps && !stuck; j++) {
  const arrived = game.state.tShip;
  run('sweep');
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

  // Choose where to go: oddities first, then the nearest unvisited star we can afford.
  const chart = run('chart');
  const rows = (chart.find((o) => o.k === 'pre')?.s ?? '').split('\n').filter((r) => /^ ?\d+[ *] /.test(r));
  const options = rows.map((r) => ({ n: Number(r.slice(0, 2)), visited: r[2] === '*', odd: r.trimEnd().endsWith('!') }));
  const order = [...options.filter((o) => o.odd && !o.visited), ...options.filter((o) => !o.visited && !o.odd), ...options.filter((o) => o.visited)];
  let gone = false;
  // First pass wants a comfortable arrival; the second takes any trip the tanks allow.
  for (const strict of [true, false]) {
    for (const choice of order.slice(0, 8)) {
      if (gone) break;
      const plot = run(`plot ${choice.n}`).find((o) => o.k === 'pre')?.s ?? '';
      const hard = /arrive hard: fuel (\d+)% shield (\d+)%/.exec(plot);
      const eco = /arrive eco:  fuel (\d+)% shield (\d+)%/.exec(plot);
      let mode = '';
      if (strict) mode = hard && Number(hard[1]) >= 20 && Number(hard[2]) >= 10 ? 'burn' : eco && Number(eco[1]) >= 12 && Number(eco[2]) >= 5 ? 'burn eco' : '';
      else mode = eco ? 'burn eco' : hard ? 'burn' : '';
      if (!mode) continue;
      const before = game.state.at;
      run(mode);
      gone = game.state.at !== before;
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
  `mean stay ${(mean(stays) * 12).toFixed(1)} months · mean hop ${(s.stats.ly / Math.max(1, s.stats.jumps)).toFixed(1)} ly`,
  `archive ${s.ship.archive} · finds ${s.stats.finds} · relics ${s.ship.relics.length}`,
  `ship: fuel ${Math.round(game.status().fuel)}% shield ${Math.round(s.ship.shield)}% hull ${Math.round(s.ship.hull)}% hold ${Math.round(s.ship.materials)}`,
  `levels: ${Object.entries(s.ship.levels).map(([k, v]) => `${k} ${v}`).join(', ')}`,
  `refits: ${refitLog.join('; ') || 'none'}`,
  `mind: ${mindLines} lines (${(mindLines / Math.max(1, s.stats.jumps)).toFixed(1)} per jump), dissents ${s.mind.overruled}, early ${s.mind.early}, thorough ${s.mind.thorough}`,
  `distinct sentences ${counts.size}, repeated ${repeated.length}`,
  'most repeated:',
  ...repeated.slice(0, 12).map(([text, n]) => `  ${String(n).padStart(4)}x  ${text.slice(0, 96)}`),
  stuck ? `\n!! ${stuck}` : '',
];
console.log(report.join('\n'));
