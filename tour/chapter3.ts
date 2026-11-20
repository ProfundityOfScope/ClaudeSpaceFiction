/**
 * Chapter 3: what hangs off a star, and how the same idea carries the layers
 * still to come. The second half describes plans, and says so on screen.
 */
import type { Chapter } from './types.ts';

export const chapter: Chapter = {
  number: 3,
  title: 'Worlds from a number',
  scenes: [
    {
      kind: 'title',
      kicker: 'A TOUR OF THE CODE',
      title: 'Worlds from a number',
      sub: '3 · what hangs off a star',
      lines: [
        { text: 'Chapter three: worlds from a number.' },
        { text: 'You have placed stars before, so this skips that.' },
        { text: 'It is about what hangs off a star, and how the idea keeps going.' },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'All the save knows', tone: 'dim', step: 0 },
        { text: 'C3.-5.1.0.37', tone: 'code', step: 1 },
        { text: 'cell · cluster · tier · member', tone: 'mind', step: 2 },
      ],
      lines: [
        { text: 'Start with the only thing the save knows about where you are.' },
        { text: 'An address.' },
        { text: 'It reads: which cell of the galaxy, which cluster in it, which brightness tier, which member.' },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/system.ts',
      pick: [
        'const h = strHash(ref.id);',
        'const srng = new Stream(seed, K.STAR, h);',
        'const brng = new Stream(seed, K.BODIES, h);',
        'const frng = new Stream(seed, K.FEATURE, h);',
        'const orng = new Stream(seed, K.SURVEY, h);',
      ],
      hl: [
        { step: 1, match: 'const h = strHash(ref.id);' },
        { step: 2, match: 'const srng' },
        { step: 2, match: 'const brng' },
        { step: 2, match: 'const frng' },
        { step: 2, match: 'const orng' },
      ],
      lines: [
        { text: 'Everything at a system is built by one function.' },
        { text: 'It hashes the address into a number.' },
        { text: 'Then it opens four separate streams of dice.' },
        { text: 'One for the star, one for the bodies, one for the features, one for the survey.', step: 2 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/rng.ts',
      pick: ['export const K = {', 'STAR: 3,', 'BODIES: 4,', 'FEATURE: 8,', 'SURVEY: 9,', 'START: 13,', '} as const;'],
      aside: { label: 'planned for slice 2', code: ['  CIV: 14,', '  SHIP: 15,'], step: 2 },
      lines: [
        { text: 'Each purpose has its own key.' },
        { text: 'The rule is: append only, never renumber.' },
        { text: 'When civilisations arrive, they get a new key.' },
        { text: 'So every star you have already visited stays exactly as you saw it.', step: 2 },
      ],
    },
    {
      kind: 'flow',
      nodes: [
        { label: 'the star', sub: 'its kind and metal content, from tier and position', step: 1 },
        { label: 'bodies', sub: 'counted outward; metal-rich stars get more giants', step: 2 },
        { label: 'features', sub: 'each placed on a body that can host it, by rarity', step: 3 },
        { label: 'survey order', sub: 'the whole list, sorted once, rare things late', step: 4 },
      ],
      lines: [
        { text: 'The streams are used in order.' },
        { text: 'First the star.' },
        { text: 'Then its bodies.' },
        { text: 'Then the features, each placed on a body that can host it.' },
        { text: 'And last, the order in which a survey will find them.' },
        { text: 'That is decided here, once, before you ever arrive.', step: 4 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/state.ts',
      pick: ['export interface Memory {', 'effort: number;', 'found: number;', 'scanned: string[];'],
      hl: [{ step: 1, match: 'found: number;' }],
      lines: [
        { text: 'That last step is what keeps the save small.' },
        { text: 'To remember how far a survey got, the save stores one number: how many discoveries so far.' },
        { text: 'The list itself is never saved. It is rebuilt, in the same order, every time.', step: 1 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      pick: ['private hints(): Discovery[] {', 'return this.here.discoveries', '.slice(0, this.mem.found)'],
      hl: [
        { step: 1, match: 'return this.here.discoveries' },
        { step: 2, match: '.slice(0, this.mem.found)' },
      ],
      lines: [
        { text: 'So what you see is two things laid together.' },
        { text: 'The world, generated.' },
        { text: 'And your memory of it, saved: here, the first few discoveries, up to the count.' },
        { text: 'The galaxy is a function. The save is a short list of differences.', step: 2 },
      ],
    },
    {
      kind: 'code',
      file: 'src/core/game.ts',
      from: 'private surveyDay(k: number): number {',
      count: 5,
      hl: [{ step: 1, match: 'return -tau * Math.log' }],
      lines: [
        { text: 'Time works the same way. Nothing is scheduled.' },
        { text: 'The day that discovery number k turns up is a formula.', say: 'The day that discovery number kay turns up is a formula.' },
        { text: 'Stay thirty days or three years; the game just asks how many have come due.', step: 1 },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'The pattern', tone: 'dim', step: 0 },
        { text: 'f(seed, place)', tone: 'code', step: 1 },
        { text: 'f(seed, place, time)', tone: 'mind', step: 2 },
      ],
      lines: [
        { text: 'That is the pattern, and it is how the game will grow.' },
        { text: 'So far, a world is a function of the seed and a place.' },
        { text: 'The next layers add time.' },
      ],
    },
    {
      kind: 'tree',
      heading: 'planned · not built yet',
      rows: [
        { text: 'civilisations', note: 'a seeded birth: where, when, how far, how long', step: 1 },
        { text: 'ruins', note: 'wherever a dead civilisation used to reach', step: 3 },
        { text: 'other ships', note: 'an itinerary of stops and dates, from a seed', step: 4 },
        { text: 'alerts', note: 'seeded per era: a bearing and a rough distance', step: 5 },
      ],
      lines: [
        { text: 'None of this is built yet. This is the plan.' },
        { text: 'A civilisation is a seeded birth: a place, a year, how fast it spreads, how long it lasts.' },
        { text: 'Ask who holds this star in this year, and the answer is arithmetic.', step: 1 },
        { text: 'Nothing is simulated while you are away. Ruins fall out for free.', step: 3 },
        { text: 'Other ships are itineraries: stops and dates, from a seed.', step: 4 },
        { text: 'And alerts, like a distant supernova, are seeded per era, with a bearing and a rough distance.', step: 5 },
      ],
    },
    {
      kind: 'flow',
      nodes: [
        { label: 'an alert', sub: 'a good bearing, a rough distance, no star chosen', step: 1 },
        { label: 'you commit', sub: 'plot a course toward it', step: 2 },
        { label: 'it is pinned', sub: 'one system, written into the save', step: 3 },
      ],
      lines: [
        { text: 'One more idea, and it was yours.' },
        { text: 'A far-off event does not need a star until someone goes to look.' },
        { text: 'When you commit to it, the game picks the system.' },
        { text: 'Then it writes that down. So the save grows only where you have paid attention.' },
      ],
    },
    {
      kind: 'big',
      items: [
        { text: 'Three rules to keep', tone: 'dim', step: 0 },
        { text: 'Hash integers.', step: 1 },
        { text: 'One key per purpose.', step: 2 },
        { text: 'Store only what the player did.', step: 3 },
      ],
      lines: [
        { text: 'If you extend this, three rules keep it honest.' },
        { text: 'Hash integers, never floats, so every machine builds the same world.' },
        { text: 'Give each new purpose its own key.' },
        { text: 'And never store what you can rebuild. Store only what the player did.' },
      ],
    },
    {
      kind: 'title',
      kicker: 'NEXT',
      title: 'Changing things',
      sub: '4 · tune, add, test, ship',
      lines: [{ text: 'Next: changing things.' }],
    },
  ],
};
