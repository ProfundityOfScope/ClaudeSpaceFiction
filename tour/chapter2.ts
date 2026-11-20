/** Chapter 2: TypeScript, taught from this code, for someone who already writes Python. */
import type { Chapter } from './types.ts';

export const chapter: Chapter = {
  number: 2,
  title: 'TypeScript for a Python person',
  scenes: [
    {
      kind: 'title',
      kicker: 'A TOUR OF THE CODE',
      title: 'TypeScript',
      sub: '2 · for a Python person',
      lines: [
        { text: 'Chapter two: TypeScript, for a Python person.' },
        { text: 'You already know most of it. This is the rest.' },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'What it is', tone: 'dim', step: 0 },
        { text: 'JavaScript', step: 1 },
        { text: '+ type annotations', tone: 'code', step: 2 },
        { text: 'checked, then erased', tone: 'mind', step: 3 },
      ],
      lines: [
        { text: 'First, what it is.' },
        { text: 'TypeScript is JavaScript.' },
        { text: 'Plus type annotations.' },
        { text: 'A checker reads the types, and then they are erased. What runs is plain JavaScript.' },
        { text: 'Think of Python type hints with mypy, except that everyone really does run the checker.', say: 'Think of Python type hints with my pie, except that everyone really does run the checker.', step: 3 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/system.ts',
      pick: ['export interface Body {', 'n: number;', 'kind: BodyKind;', 'au: number;', 'rings: boolean;'],
      hl: [{ step: 1, match: 'kind: BodyKind;' }],
      aside: {
        label: 'the same thing in Python',
        code: ['@dataclass', 'class Body:', '    n: int', '    kind: BodyKind', '    au: float', '    rings: bool'],
        step: 2,
      },
      lines: [
        { text: 'An interface describes the shape of an object: its fields, and the type of each.' },
        { text: 'A number, a boolean, a string, or another type you defined yourself.' },
        { text: 'It is a dataclass with no methods.', say: 'It is a data class with no methods.' },
        { text: 'And it is structural. Anything with these fields counts as a Body.', step: 2 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/system.ts',
      pick: ['export type StarKind =', "| 'M' | 'K' | 'BD'", "| 'G' | 'F' | 'WD'"],
      aside: {
        label: 'in Python',
        code: ["StarKind = Literal['M', 'K', 'BD', 'G', ...]"],
        step: 1,
      },
      lines: [
        { text: 'A type can also be a list of allowed strings.' },
        { text: 'A star kind is one of these letters and nothing else. In Python, a Literal or an Enum.', say: 'A star kind is one of these letters and nothing else. In Python, a literal, or an ee num.' },
        { text: 'Misspell one anywhere in the code, and the checker stops you before the game ever runs.', step: 1 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/system.ts',
      from: 'const BODY_WORD: Record<BodyKind, string> = {',
      count: 5,
      hl: [{ step: 1, match: 'Record<BodyKind, string>' }],
      lines: [
        { text: 'Here is where that pays off.' },
        { text: 'A Record is a dictionary whose keys must be exactly the members of a type.' },
        { text: 'This one needs a phrase for every kind of body.', step: 1 },
        { text: 'Add a new kind, and the checker names every table like this that you forgot to update.', step: 2 },
        { text: 'It is a to-do list you cannot lose.', step: 2 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      from: 'private nameOf(id: string): string {',
      count: 3,
      hl: [{ step: 1, match: '?.name ??' }],
      aside: {
        label: 'roughly, in Python',
        code: ['m = self.state.mem.get(id)', 'return (m and m.name) or self.system(id).name'],
        step: 3,
      },
      lines: [
        { text: 'Missing values get two small operators.' },
        { text: 'Question mark, dot, reads a field only if the thing exists.' },
        { text: 'Two question marks supply a fallback.', step: 1 },
        { text: 'So this says: the name we gave it, or else the name it came with.', step: 3 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      pick: ['const free = s.crews.filter((c) => c === null).length;'],
      hl: [{ step: 1, match: '(c) => c === null' }],
      aside: {
        label: 'the same line in Python',
        code: ['free = len([c for c in s.crews if c is None])'],
        step: 2,
      },
      lines: [
        { text: 'There are no list comprehensions. Arrays carry methods instead: filter, map, some, find.' },
        { text: 'The arrow is a lambda. A crew goes in, a test comes out.' },
        { text: 'In Python this line is a comprehension.' },
        { text: 'And three equals signs is the comparison you want. Always three.', step: 2 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      pick: ['this.text(`Crew ${i + 1} recalled.`);'],
      hl: [{ step: 0, match: 'Crew ${i + 1} recalled.' }],
      aside: {
        label: 'in Python',
        code: ['self.text(f"Crew {i + 1} recalled.")'],
        step: 1,
      },
      lines: [
        { text: 'Backticks make a template string. A dollar sign and braces drop a value in.' },
        { text: 'That is an f-string.', say: 'That is an eff string.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/rng.ts',
      from: 'function fmix(h: number): number {',
      count: 8,
      hl: [
        { step: 2, match: 'Math.imul(h, 0x85ebca6b);' },
        { step: 2, match: 'Math.imul(h, 0xc2b2ae35);' },
        { step: 3, match: 'return h >>> 0;' },
      ],
      lines: [
        { text: 'One trap for a scientist.' },
        { text: 'There is a single number type, and it is a sixty-four bit float.' },
        { text: 'So integer hashing needs care. Math.imul multiplies as thirty-two bit integers.', say: 'So integer hashing needs care. Math dot eye mull multiplies as thirty-two bit integers.' },
        { text: 'And this shift forces the result back to an unsigned integer.' },
        { text: 'In numpy you would simply ask for uint32.', say: 'In num pie you would simply ask for you int thirty-two.', step: 3 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      pick: ["import { Galaxy, type Seen } from './galaxy.ts';", "import { speak } from './mind.ts';", 'export class Game {'],
      hl: [
        { step: 1, match: 'export class Game {' },
        { step: 2, match: "import { Galaxy, type Seen }" },
        { step: 2, match: 'import { speak }' },
      ],
      aside: {
        label: 'in Python',
        code: ['from .galaxy import Galaxy, Seen', 'from .mind import speak'],
        step: 2,
      },
      lines: [
        { text: 'Every file is a module.' },
        { text: 'It shares only what it marks with export.' },
        { text: 'And it names exactly what it takes from other files. Nothing arrives unless you ask for it.' },
      ],
    },
    {
      kind: 'flow',
      nodes: [
        { label: 'node tools/play.ts', sub: 'Node erases the types and runs the file. No build step.', step: 1 },
        { label: 'npm run check', sub: 'the type checker, on its own', step: 2 },
        { label: 'npm run build', sub: 'one plain script for the browser', step: 4 },
      ],
      lines: [
        { text: 'Last: how it runs.' },
        { text: 'Node can run a TypeScript file directly. It simply erases the types.' },
        { text: 'Which means running does not check them. The checker is a separate command.' },
        { text: 'It is worth running before every commit.', step: 2 },
        { text: 'A browser can do neither, so the build bundles everything into one plain script.', step: 4 },
      ],
    },
    {
      kind: 'cmds',
      codeNotes: true,
      rows: [
        { cmd: 'dataclass', note: 'interface', step: 1 },
        { cmd: 'Literal / Enum', note: "'a' | 'b'", step: 1 },
        { cmd: 'dict, every key', note: 'Record<K, V>', step: 1 },
        { cmd: 'a or b', note: 'a ?? b', step: 2 },
        { cmd: '[f(x) for x in a]', note: 'a.map(f)', step: 2 },
        { cmd: 'f"{x}"', note: '`${x}`', step: 2 },
        { cmd: 'mypy', note: 'npm run check', step: 3 },
      ],
      lines: [
        { text: 'So, the short dictionary, Python on the left.' },
        { text: 'Dataclass becomes interface. Literal becomes a union. A complete dict becomes a Record.', say: 'Data class becomes interface. Literal becomes a union. A complete dict becomes a Record.' },
        { text: 'Or becomes two question marks. Comprehensions become map and filter. F-strings become backticks.', say: 'Or becomes two question marks. Comprehensions become map and filter. Eff strings become backticks.' },
        { text: 'And mypy becomes a command you really do run.', say: 'And my pie becomes a command you really do run.' },
      ],
    },
    {
      kind: 'title',
      kicker: 'NEXT',
      title: 'Worlds from a number',
      sub: '3 · what hangs off a star',
      lines: [{ text: 'Next: worlds from a number.' }],
    },
  ],
};
