/** Chapter 4: three small edits, and how a change travels from a file to the public page. */
import type { Chapter } from './types.ts';

export const chapter: Chapter = {
  number: 4,
  title: 'Changing things',
  scenes: [
    {
      kind: 'title',
      kicker: 'A TOUR OF THE CODE',
      title: 'Changing things',
      sub: '4 · tune, add, test, ship',
      lines: [
        { text: 'Chapter four: changing things.' },
        { text: 'Three small edits, and then how a change reaches the public page.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/config.ts',
      pick: ['export const TUNE = {', 'SCOOP: [0, 0.5, 1.0, 1.6],', 'ICE: [0, 0.35, 0.7, 1.1],', 'ORE: [0, 0.25, 0.55, 1.0],'],
      hl: [{ step: 1, match: 'SCOOP: [0, 0.5, 1.0, 1.6],' }],
      lines: [
        { text: 'First, tuning. Every number that shapes play lives in one file: config.' },
        { text: 'This line is the fuel gathered per day, by how rich the giant is.' },
        { text: 'If refuelling feels slow, this is the only place you need to look.', step: 1 },
      ],
    },
    {
      kind: 'cmds',
      rows: [
        { cmd: 'edit config.ts', note: 'change one number', step: 0 },
        { cmd: 'npm run bot', note: 'does the pacing hold?', step: 1 },
        { cmd: 'npm run play', note: 'does it feel right?', step: 2 },
      ],
      lines: [
        { text: 'Then check it twice.' },
        { text: 'The bot shows what the change does over hundreds of jumps: time per system, how soon refits come.' },
        { text: 'Playing tells you the part a bot cannot: whether it feels right.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/features.ts',
      pick: ['export interface FeatureDef {', 'category: Category;', 'rarity: 0 | 1 | 2 | 3;', 'on: BodyKind[];', 'text: string;'],
      hl: [
        { step: 1, match: 'rarity: 0 | 1 | 2 | 3;' },
        { step: 1, match: 'on: BodyKind[];' },
        { step: 1, match: 'text: string;' },
      ],
      aside: {
        label: 'a new entry you might add',
        code: [
          "f({ id: 'geode', title: 'crystal caverns',",
          "  category: 'geology', rarity: 1,",
          "  on: ['rocky', 'dwarf'],",
          "  text: 'Caverns under {b}, walled in quartz.' }),",
        ],
        step: 2,
      },
      lines: [
        { text: 'Second, adding something to find. The catalogue is a list of entries with this shape.' },
        { text: 'How rare it is, which bodies can host it, and the sentence the player reads.' },
        { text: 'A new find is one more entry. The generator picks from whatever is in the list.' },
        { text: 'The b in braces becomes the body it landed on.', step: 2 },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'A caution', tone: 'dim', step: 0 },
        { text: 'A longer list changes what the dice pick.', step: 1 },
      ],
      lines: [
        { text: 'One caution, and it follows from chapter three.' },
        { text: 'A longer list changes what the dice pick.' },
        { text: 'So some stars you have already surveyed will hold different things after the change.', step: 1 },
        { text: 'That is fine in a prototype. In a released game, the catalogue would need a version.', step: 1 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/mind.ts',
      pick: ['arrive: [', "'New sky. I have nothing on file for this one.',", "'Arrived, and nothing shot at us. I always note that.',"],
      lines: [
        { text: 'Third, the Mind. What it says lives in pools of written lines, one pool per situation.' },
        { text: 'To give it something new to say on arrival, add a sentence here.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/mind.ts',
      pick: ['let used = mind.used[pool] ?? [];', 'if (used.length >= lines.length) used = [];'],
      hl: [{ step: 1, match: 'if (used.length >= lines.length) used = [];' }],
      lines: [
        { text: 'It will not repeat a line until the whole pool has been used.' },
        { text: 'That rule is these two lines: what has been said, and a reset once everything has.' },
      ],
    },
    {
      kind: 'flow',
      nodes: [
        { label: 'check · test', sub: 'the types agree and the tests pass', step: 1 },
        { label: 'build', sub: 'rewrites docs/index.html', step: 2 },
        { label: 'branch · pull request', sub: 'never straight onto main', step: 3 },
        { label: 'merge', sub: 'GitHub Pages updates the public link', step: 4 },
        { label: 'tag', sub: 'a permanent name for this exact version', step: 5 },
      ],
      lines: [
        { text: 'Now, how a change reaches the page your friends open.' },
        { text: 'Check and test.' },
        { text: 'Build. The public page is the built file, so skip this and nothing changes.' },
        { text: 'Commit on a branch, and open a pull request.' },
        { text: 'Merge it, and GitHub Pages updates the link.' },
        { text: 'Then tag it, so this exact version has a name.' },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'One thing to watch', tone: 'dim', step: 0 },
        { text: 'Old saves meet new code.', step: 1 },
        { text: 'v: 1', tone: 'code', step: 3 },
      ],
      lines: [
        { text: 'One thing to watch as the game grows.' },
        { text: 'A save was written by old code, and will be read by new code.' },
        { text: 'Adding a field is safe if the new code supplies a default. Changing what a field means is not.', step: 1 },
        { text: 'That is what the version number at the top of every save is for.', step: 3 },
      ],
    },
    {
      kind: 'title',
      kicker: 'NEXT',
      title: 'Why it is built this way',
      sub: '5 · the design choices',
      lines: [{ text: 'Next: why it is built this way.' }],
    },
  ],
};
