/** Chapter 1: the shape of the repository, and one command followed all the way through. */
import type { Chapter } from './types.ts';

export const chapter: Chapter = {
  number: 1,
  title: 'The shape of it',
  scenes: [
    {
      kind: 'title',
      kicker: 'A TOUR OF THE CODE',
      title: 'Lightspeed',
      sub: '1 · The shape of it',
      lines: [
        { text: 'This is a tour of the Lightspeed text prototype, for someone who knows Python better than TypeScript.' },
        { text: 'Chapter one: the shape of it.' },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'One idea', tone: 'dim', step: 0 },
        { text: 'The game is a function.', step: 1 },
        { text: 'exec("sweep")', tone: 'code', step: 2 },
        { text: '→ a list of lines', tone: 'mind', step: 2 },
      ],
      lines: [
        { text: 'The whole design rests on one idea.' },
        { text: 'The game is a function.' },
        { text: 'A line of text goes in. A list of lines comes out.' },
      ],
    },
    {
      kind: 'tree',
      heading: 'ClaudeSpaceFiction/',
      rows: [
        { text: 'src/', note: 'the game, and the page', step: 1 },
        { text: 'tools/', note: 'build, terminal player, bot', step: 1 },
        { text: 'test/', note: 'nine checks on the core', step: 1 },
        { text: 'docs/', note: 'the built page', step: 1 },
        { text: 'package.json', note: 'the commands', step: 2 },
        { text: 'tsconfig.json', note: 'how strict the type checker is', step: 2 },
      ],
      lines: [
        { text: 'Here is the repository.' },
        { text: 'Four folders matter: source, tools, tests and docs.' },
        { text: 'Two small files say how to run things, and how strict the type checker should be.' },
      ],
    },
    {
      kind: 'split',
      left: { label: 'src/web', sub: 'the page', step: 1 },
      right: { label: 'src/core', sub: 'the game', step: 1 },
      arrow: { text: 'imports', step: 2 },
      rule: { text: 'core never imports web', step: 2 },
      lines: [
        { text: 'Source is split in two.' },
        { text: 'Core is the game. Web is the page that shows it.' },
        { text: 'The page imports the game. The game never imports the page.' },
      ],
    },
    {
      kind: 'fan',
      callers: [
        { label: 'the page', sub: 'src/web/main.ts', step: 1 },
        { label: 'a terminal', sub: 'tools/play.ts', step: 2 },
        { label: 'a bot', sub: 'tools/bot.ts', step: 3 },
      ],
      target: { label: 'Game', sub: 'src/core/game.ts', step: 0 },
      lines: [
        { text: 'That one rule is why the same game runs in three places.' },
        { text: 'In your browser.' },
        { text: 'In a terminal.' },
        { text: 'And under a bot that flies hundreds of jumps in a second, to check the balance before you play.' },
      ],
    },
    {
      kind: 'tree',
      heading: 'src/core/',
      rows: [
        { text: 'config.ts', note: 'every number you might tune', step: 1 },
        { text: 'rng.ts', note: 'the dice: integer hashing', step: 2 },
        { text: 'galaxy.ts', note: 'where the stars are, how thick the gas', step: 3 },
        { text: 'system.ts', note: 'what is at a star', step: 3 },
        { text: 'features.ts', note: 'what a survey can find', step: 3 },
        { text: 'travel.ts', note: 'two clocks, fuel, shield', step: 4 },
        { text: 'mind.ts', note: 'what the ship says', step: 5 },
        { text: 'state.ts', note: 'what gets saved', step: 6 },
        { text: 'game.ts', note: 'the commands', step: 7 },
      ],
      lines: [
        { text: 'Inside core, the files stack up in layers.' },
        { text: 'Config holds every number you might want to tune.' },
        { text: 'rng is the dice.', say: 'R N G is the dice.' },
        { text: 'Galaxy, system and features say what exists.' },
        { text: 'Travel is the physics.' },
        { text: "Mind is the ship's voice." },
        { text: 'State is what gets saved.' },
        { text: 'And game ties them together as commands.' },
      ],
    },
    {
      kind: 'type',
      typed: 'sweep',
      step: 1,
      chips: ['sweep', 'chart', 'ship', 'ask', 'help'],
      lines: [
        { text: 'Now follow one command through all of that.' },
        { text: 'You type sweep, or tap the button.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/web/main.ts',
      from: 'function submit(line: string) {',
      count: 9,
      hl: [
        { step: 1, match: 'print(game.exec(text));' },
        { step: 2, match: 'write(slot(' },
      ],
      lines: [
        { text: 'In the page, a function called submit takes your text.' },
        { text: 'It hands the text to the game, and prints whatever comes back.' },
        { text: 'Then it saves. That is all the page does.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      pick: [
        'exec(input: string): Out[] {',
        'const [first, ...rest] = line.split',
        'switch (verb) {',
        "case 'look': this.look(); break;",
        "case 'sweep': this.sweep(); break;",
      ],
      hl: [
        { step: 1, match: 'const [first' },
        { step: 2, match: "case 'sweep'" },
      ],
      lines: [
        { text: 'Inside the game, one method receives every command.' },
        { text: 'It splits the line into a verb and an argument.' },
        { text: 'Then a switch sends it to the method with the same name.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      from: 'export interface Out {',
      count: 4,
      hl: [
        { step: 1, match: 'k: OutKind;' },
        { step: 1, match: 's: string;' },
      ],
      aside: {
        label: 'the same thing in Python',
        code: ['@dataclass', 'class Out:', "    k: str   # 'text', 'mind', 'pre' ...", '    s: str'],
        step: 2,
      },
      lines: [
        { text: 'Every method answers the same way: it pushes small objects onto a list.' },
        { text: 'Each one is a kind and a string.' },
        { text: 'In Python you would write a dataclass. In TypeScript it is an interface.' },
      ],
    },
    {
      kind: 'flow',
      nodes: [
        { label: 'state.at', sub: 'the address of the system we are in', step: 1 },
        { label: 'generateSystem(galaxy, ref)', sub: 'hash the seed and the address', step: 2 },
        { label: 'star · bodies · discoveries', sub: 'the same answer every time', step: 3 },
      ],
      lines: [
        { text: 'Sweep needs to know what is here, so it asks the galaxy.' },
        { text: 'All the save knows is an address.' },
        { text: 'The system is rebuilt from the seed and that address.' },
        { text: 'Nothing was stored, and it comes out the same every time.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/web/main.ts',
      pick: [
        'function print(items: Out[]) {',
        'for (const item of items) {',
        'el.className = `o ${item.k} fresh`;',
        'el.textContent = item.s;',
        'log.appendChild(el);',
      ],
      hl: [
        { step: 1, match: 'el.className' },
        { step: 1, match: 'el.textContent' },
      ],
      lines: [
        { text: 'The list travels back to the page.' },
        { text: 'Print makes one element per item, and the kind becomes its style.' },
        { text: 'That is the whole interface between the game and the screen.' },
      ],
    },
    {
      kind: 'console',
      commands: ['sweep'],
      lines: [{ text: 'And the result appears: the star, its bodies, and what each might be worth.' }],
    },
    {
      kind: 'code',
      file: 'src/core/state.ts',
      pick: ['export interface State {', 'tShip: number;', 'tGal: number;', 'at: string;', 'mem: Record<string, Memory>;'],
      hl: [
        { step: 1, match: 'tShip: number;' },
        { step: 1, match: 'tGal: number;' },
        { step: 1, match: 'at: string;' },
        { step: 1, match: 'mem: Record' },
      ],
      lines: [
        { text: 'One more piece. Everything worth keeping lives in one object, called state.' },
        { text: 'The ship, the two clocks, where we are, and what we remember.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      from: 'save(): string {',
      count: 3,
      hl: [{ step: 0, match: 'JSON.stringify' }],
      lines: [
        { text: 'Saving is one line: turn that object into text.' },
        { text: 'The galaxy is not in the save. It does not need to be. That is chapter three.' },
      ],
    },
    {
      kind: 'flow',
      nodes: [
        { label: 'src/**/*.ts', sub: 'what we edit', step: 0 },
        { label: 'npm run build', sub: 'bundle everything into one script', step: 1 },
        { label: 'docs/index.html', sub: 'one file: the whole game', step: 2 },
        { label: 'GitHub Pages', sub: 'the link you send people', step: 3 },
      ],
      lines: [
        { text: 'Last, the build. A browser cannot run TypeScript directly.' },
        { text: 'So a script bundles all of it into one file.' },
        { text: 'That file is the game.' },
        { text: 'GitHub Pages serves it, and that is the link you send people.' },
      ],
    },
    {
      kind: 'cmds',
      rows: [
        { cmd: 'npm run check', note: 'do the types agree?', step: 1 },
        { cmd: 'npm test', note: 'nine checks on the core', step: 2 },
        { cmd: 'npm run build', note: 'write the page', step: 3 },
        { cmd: 'npm run bot', note: 'fly it without a human', step: 4 },
      ],
      lines: [
        { text: 'Day to day, four commands cover it.' },
        { text: 'Check asks whether the types agree.' },
        { text: 'Test runs nine checks on the core.' },
        { text: 'Build writes the page.' },
        { text: 'And bot flies the game without a human.' },
      ],
    },
    {
      kind: 'title',
      kicker: 'NEXT',
      title: 'TypeScript',
      sub: '2 · for a Python person',
      lines: [{ text: 'Next: TypeScript, for a Python person.' }],
    },
  ],
};
