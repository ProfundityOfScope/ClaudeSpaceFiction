/** Chapter 5: the design choices, and the one test the prototype exists to answer. */
import type { Chapter } from './types.ts';

export const chapter: Chapter = {
  number: 5,
  title: 'Why it is built this way',
  scenes: [
    {
      kind: 'title',
      kicker: 'A TOUR OF THE CODE',
      title: 'Why it is built this way',
      sub: '5 · the design choices',
      lines: [
        { text: 'Chapter five: why it is built this way.' },
        { text: 'Every choice here serves one question: is this fun before anything is drawn?' },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'The premise', tone: 'dim', step: 0 },
        { text: 'If it is not fun as text, nothing added later will save it.', step: 1 },
      ],
      lines: [
        { text: 'The premise came from you.' },
        { text: 'If it is not fun as text, nothing added later will save it.' },
        { text: 'Text cannot hide a weak decision behind a picture.', step: 1 },
        { text: 'So the prototype is nothing but decisions.', step: 1 },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'The loop', tone: 'dim', step: 0 },
        { text: 'arrive · sweep · work', tone: 'code', step: 1 },
        { text: 'stay · choose · burn', tone: 'code', step: 1 },
        { text: 'mostly quiet, sometimes a find', tone: 'mind', step: 2 },
      ],
      lines: [
        { text: 'The loop is a rhythm.' },
        { text: 'Arrive, sweep, work, stay, choose, burn.' },
        { text: 'Most systems are quiet, and a few are finds.' },
        { text: 'The quiet ones are what make the finds land.', step: 2 },
      ],
    },
    {
      kind: 'console',
      commands: ['sweep', 'survey', 'stay 200'],
      match: '^Day \\d+\\. (?!Crew)',
      lines: [
        { text: 'Staying has to pay, or the best move is always to leave.' },
        { text: 'So work takes real days, and there are only two crews, which forces a choice.' },
        { text: 'And a survey slows down. Look at the gaps between these finds: three weeks, a month, ten weeks.' },
        { text: 'The rare things tend to come last. That is the pull to stay a little longer.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/travel.ts',
      pick: ['return Math.sqrt(1 + reach / n);'],
      lines: [
        { text: 'The physics is one line.' },
        { text: 'Speed depends on the gas. Thin gas is fast, a cloud is a wall.' },
        { text: 'A better ship raises the limit everywhere.' },
        { text: 'It is here because it makes terrain, and a real choice at every burn. Accuracy came second.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/mind.ts',
      pick: ['export interface MindState {', 'fancy: StarKind;', 'early: number;', 'thorough: number;', 'overruled: number;'],
      hl: [
        { step: 2, match: 'fancy: StarKind;' },
        { step: 2, match: 'early: number;' },
        { step: 2, match: 'thorough: number;' },
        { step: 2, match: 'overruled: number;' },
      ],
      lines: [
        { text: 'The Mind is written, not generated. Every line was authored ahead of time.' },
        { text: 'What makes it feel present is that it keeps score.' },
        { text: 'It remembers what it likes, how you leave places, and how often you overruled it.' },
        { text: 'A live language model was left out on purpose.', step: 3 },
        { text: 'Good prose can make a dull loop feel alive, and then you cannot judge the loop.', step: 3 },
      ],
    },
    {
      kind: 'tree',
      heading: 'what the bot caught',
      rows: [
        { text: 'refits', note: 'five at once, in the second system', step: 1 },
        { text: 'range', note: 'upgrades never let you travel further', step: 2 },
        { text: 'the Mind', note: 'thirteen remarks per jump', step: 3 },
      ],
      lines: [
        { text: 'Before you played a single jump, a bot played hundreds.' },
        { text: 'It found refits arriving five at a time in the second system.' },
        { text: 'It found that upgrades never let you travel further.' },
        { text: 'And it found the Mind talking thirteen times a jump.' },
        { text: 'All three were fixed before you saw them.', step: 3 },
        { text: 'A bot cannot tell you what is fun. It can tell you what is broken.', step: 3 },
      ],
    },
    {
      kind: 'tree',
      heading: 'left out, for now',
      rows: [
        { text: 'walkable ship', note: 'the console is enough', step: 1 },
        { text: 'combat', note: 'nothing to fight yet', step: 1 },
        { text: 'faction meters', note: 'voices first, numbers later', step: 1 },
        { text: 'prices', note: 'wants, not markets', step: 1 },
        { text: 'full galaxy', note: 'two numbers in config', step: 1 },
      ],
      lines: [
        { text: 'Just as much design went into what is missing.' },
        { text: 'No walkable ship, no combat, no faction meters, no prices, and a galaxy a fraction of full size.' },
        { text: 'Each can come back once the loop has earned it.', step: 1 },
        { text: 'Adding is easy. Finding out what matters is the work.', step: 1 },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'The only test', tone: 'dim', step: 0 },
        { text: 'Do you want one more jump?', step: 1 },
      ],
      lines: [
        { text: 'Which leaves the only test that counts.' },
        { text: 'Do you want one more jump?' },
        { text: 'If yes, there is a game here, and the rest is building.', step: 1 },
        { text: 'If no, better to learn it now, in text.', step: 1 },
      ],
    },
    {
      kind: 'title',
      kicker: 'END OF THE TOUR',
      title: 'Lightspeed',
      sub: 'the rest is in the code',
      lines: [{ text: 'That is the tour. The rest is in the code, and in whatever you find out there.' }],
    },
  ],
};
