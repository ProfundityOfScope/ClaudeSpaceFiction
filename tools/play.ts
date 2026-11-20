/**
 * Play in a terminal, or run a script of commands.
 *
 *   node tools/play.ts                      interactive
 *   node tools/play.ts sweep ops "stay 30"  run these commands and exit
 *   node tools/play.ts --seed 7 sweep       a different galaxy
 */
import { createInterface } from 'node:readline';
import { Game, type Out } from '../src/core/game.ts';
import { DEMO } from '../src/core/config.ts';

const args = process.argv.slice(2);
let seed = DEMO.seed;
const seedAt = args.indexOf('--seed');
if (seedAt >= 0) seed = Number(args.splice(seedAt, 2)[1]);

/** Wrap running text to a terminal width; fixed-width blocks are left alone. */
function wrap(text: string, width = 72): string {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && line.length + word.length + 1 > width) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out.join('\n');
}

export function show(items: Out[]): string {
  return items.map((o) => (o.k === 'pre' ? o.s : wrap(o.s))).join('\n');
}

const game = Game.fresh(seed);
console.log(show(game.intro()));

function statusLine(): string {
  const s = game.status();
  return `[aboard ${s.aboard} | outside ${s.outside} | fuel ${Math.round(s.fuel)}% shield ${Math.round(s.shield)}% hull ${Math.round(s.hull)}% | hold ${Math.round(s.materials)} | archive ${s.archive}]`;
}

if (args.length) {
  for (const command of args) console.log(`\n${show(game.exec(command))}`);
  console.log(`\n${statusLine()}`);
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => rl.question(`\n${statusLine()}\n(${game.chips().join(' | ')})\n> `, (line) => {
    if (line.trim() === 'quit') return rl.close();
    console.log(show(game.exec(line).slice(1)));
    prompt();
  });
  prompt();
}
