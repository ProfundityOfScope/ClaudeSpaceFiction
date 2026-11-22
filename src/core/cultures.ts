/**
 * The tables a culture is invented from.
 *
 * Everything here is plain data. Add, remove or rewrite entries freely:
 * nothing else needs to change, and a longer table simply means more variety.
 * Nothing found out there is human; keep it that way.
 */
import { Stream } from './rng.ts';
import type { BodyKind } from './system.ts';

/** How a culture leans, each from 0 to 1. */
export interface Genes {
  /** Openness: how readily it deals with strangers. */
  open: number;
  /** Boldness: how readily it uses force. */
  bold: number;
  /** Cohesion: how tightly it holds together, and to its past. */
  bound: number;
}

export type Temper = 'welcoming' | 'proud' | 'wary' | 'reclusive' | 'hostile';

export function temperOf(g: Genes): Temper {
  if (g.bold > 0.66 && g.open < 0.4) return 'hostile';
  if (g.bold > 0.6 && g.open >= 0.4) return 'proud';
  if (g.open > 0.62) return 'welcoming';
  if (g.open < 0.3) return 'reclusive';
  return 'wary';
}

// ---- names ----

const NAME_A = [
  'Il', 'Ke', 'Or', 'Tha', 'Sel', 'Mi', 'Zu', 'Ar', 'El', 'Ny', 'Qu', 'Ix', 'Bel', 'Cor', 'Dra', 'Eri', 'Fen', 'Hy', 'Jo', 'Ka',
  'Lu', 'Mar', 'Ne', 'Os', 'Pra', 'Ro', 'Sy', 'Tu', 'Ul', 'Vel', 'Xa', 'Yr', 'Ze', 'Ash', 'Om', 'Ir', 'Cas', 'Dhu', 'Va', 'Ghe',
];
const NAME_B = ['ra', 'li', 'no', 'the', 'mi', 'su', 'ta', 've', 'xi', 'lo', 'dra', 'ke', 'sha', 'ru', 'an', 'or', 'en', 'ya', 'ul', 'ith', 'ma'];
const NAME_C = ['n', 's', 'r', 'th', 'x', 'a', 'is', 'os', 'um', 'ar', 'el', 'on', 'ia', 'e', 'ak', 'ix', 'i'];

/** "Ilmar", "Kelis", "Thaveth" */
export function cultureName(rng: Stream): string {
  return rng.pick(NAME_A) + (rng.chance(0.65) ? rng.pick(NAME_B) : '') + rng.pick(NAME_C);
}

/** What a culture that has spread calls itself, by its leaning. */
const POLITY: Record<Temper, string[]> = {
  welcoming: ['League', 'Concord', 'Compact', 'Exchange'],
  proud: ['Ascendancy', 'Mandate', 'Sovereignty'],
  wary: ['Reach', 'Expanse', 'Holdings'],
  reclusive: ['Communion', 'Covenant', 'Kindred'],
  hostile: ['Dominion', 'Hegemony', 'Warhost'],
};

export function polityWord(temper: Temper, rng: Stream): string {
  return rng.pick(POLITY[temper]);
}

// ---- what they are ----

/** Bodies, by the kind of world they come from. */
const FORM: Partial<Record<BodyKind, string[]>> = {
  ocean: [
    'aquatic and sightless, building in coral they grow to order',
    'broad, slow swimmers that think in shoals',
    'tide-pool engineers no longer than a hand',
    'armoured bottom-walkers, older as a kind than their sea',
  ],
  rocky: [
    'long-limbed climbers',
    'six-legged grazers that came late to fire',
    'burrowing colonies, a thousand small bodies to a mind',
    'armoured and unhurried',
  ],
  desert: ['burrowers who surface only at night', 'tall, dry-skinned walkers', 'light-boned gliders of the canyon winds'],
  ice: ['filter-feeders under the ice, who sing through the water', 'round, furred, and warm-blooded to a fault'],
  gas: ['moon-dwellers, small and quick, at home in low gravity', 'vacuum-hardened, slow, grown from a moon they hollowed out'],
};
const FORM_ANY = ['radial, many-armed, with no front or back', 'paired: two unlike bodies to each person'];

const VOICE = [
  'They speak in colour.',
  'They speak in slow radio pulses, and expect patience.',
  'They speak by scent, which translates badly.',
  'They drum.',
  'They speak all at once and mean the sum.',
  'They write everything down and say very little.',
  'They speak in questions only.',
];

const HABIT = [
  'They count in twelves.',
  'They never name their dead.',
  'They trade only at local night.',
  'They consider questions rude and answers generous.',
  'They keep no maps, only itineraries.',
  'They are older than their own records, and know it.',
  'They bury nothing.',
  'They apologise before disagreeing.',
  'They do not hurry, as a matter of law.',
  'They keep one day in nine silent.',
];

/** One or two sentences on a people, without their name: "long-limbed climbers. They drum. They bury nothing." */
export function speciesSketch(homeBody: BodyKind, rng: Stream): string {
  const forms = [...(FORM[homeBody] ?? []), ...FORM_ANY];
  const form = rng.pick(forms);
  return `${form.charAt(0).toUpperCase()}${form.slice(1)}. ${rng.pick(VOICE)} ${rng.pick(HABIT)}`;
}

// ---- how they show ----

/** Where a made thing sits decides how it looks from orbit. */
const PLACE: Record<BodyKind, 'orbit' | 'small' | 'surface'> = {
  star: 'orbit', gas: 'orbit', icegiant: 'orbit',
  belt: 'small', comets: 'small',
  dwarf: 'surface', scorched: 'surface', rocky: 'surface', desert: 'surface', ocean: 'surface', ice: 'surface',
};

/** A living people on its home world. */
const HOME_TEXT: Partial<Record<BodyKind, string[]>> = {
  ocean: ['lights along every coast, and traffic on the water', 'floating cities, and wakes between them'],
  rocky: ['cities on the night side, and roads between them', 'a web of lit roads, and smoke over the plains'],
  desert: ['cities strung along the canyons, lit at night', 'green lines across the dust, and towns where they cross'],
  ice: ['heat leaking through the ice in regular patterns', 'lit domes on the ice, and warm water under them'],
  gas: ['cities on the moons, and tugs between them'],
};

/** A living outpost. */
const OUTPOST_TEXT = {
  orbit: ['a station in orbit, and tugs among the moons', 'a ring station, lit, with ships alongside'],
  small: ['yards and tailings, and a steady coming and going', 'a depot, lit and busy'],
  surface: ['a walled port and a landing field', 'domes, a landing grid, and one long road'],
};

/** What a broad sweep makes of a ruin before anyone has gone to look. `{b}` is the body. */
const RUIN_HINT = {
  orbit: ['A dark object in orbit at {b}, too regular for a moon.', 'Something in orbit at {b} with an albedo that is wrong for rock.'],
  small: ['Bodies in {b} cut along flat planes.', 'A point in {b} that reflects like metal.'],
  surface: ["Straight lines on {b}'s surface, where geology does not make them.", 'Something on {b} reflects in straight lines.'],
};

/** What a deep scan finds. `{who}` is the people, `{b}` the body. */
const HOME_RUIN: Partial<Record<BodyKind, string[]>> = {
  ocean: ['Sea walls of the {who} on {b}, drowned to the top.', 'Harbour works of the {who} on {b}, silted and breached.'],
  rocky: [
    'Worked stone of the {who} on {b}: foundations, a causeway, a quarry face.',
    'A city of the {who} on {b}, roofless, its streets still on their grid.',
  ],
  desert: ['Cisterns and wind-towers of the {who} on {b}, half under the dunes.', 'Terraces of the {who} cut into the cliffs on {b}.'],
  ice: ['Habitats of the {who} under the ice of {b}, their warmth long gone.'],
  gas: ['Cities of the {who} on the moons of {b}, open to vacuum.'],
};

const OUTPOST_RUIN = {
  orbit: ['A station of the {who} in orbit at {b}, dark and slowly tumbling.'],
  small: ['Slipways and tailings of the {who} in {b}.', 'A depot of the {who} in {b}: tanks, a landing grid, tracks that lead nowhere now.'],
  surface: ['An outpost of the {who} on {b}: a landing grid, empty tanks, sealed halls.', 'A walled port of the {who} on {b}, its field cracked by frost.'],
};

const choose = (list: string[], n: number) => list[n % list.length];

/** `n` is any stable integer; it picks between the wordings. */
export function settledText(kind: BodyKind, home: boolean, n: number): string {
  return choose((home && HOME_TEXT[kind]) || OUTPOST_TEXT[PLACE[kind]], n);
}

export function ruinHint(kind: BodyKind, n: number): string {
  return choose(RUIN_HINT[PLACE[kind]], n);
}

export function ruinText(kind: BodyKind, home: boolean, n: number): string {
  return choose((home && HOME_RUIN[kind]) || OUTPOST_RUIN[PLACE[kind]], n);
}

// ---- what they leave ----

export type RelicKind = 'records' | 'device' | 'art' | 'sacred' | 'arms';

const RELICS: Record<RelicKind, string[]> = {
  records: ['a case of tablets', 'a memory lattice', 'star charts on beaten metal', 'a ledger nobody can yet read'],
  device: ['a tool nobody can name', 'a sealed mechanism, still warm', 'a lens ground for eyes unlike ours'],
  art: ['a carved panel', 'a set of bells', 'a figure with too many hands'],
  sacred: ['a reliquary', 'a funerary mask', 'a lamp made to be carried in procession'],
  arms: ['a ceremonial blade', 'an inert warhead casing', 'a shield boss, scored'],
};

/** Something small enough to carry away. */
export interface Relic {
  what: string;
  /** Whose it was; empty for makers unknown. */
  of: string;
  kind: RelicKind;
  /** Year outside when it was taken aboard. */
  t: number;
}

export function relicFrom(genes: Genes, rng: Stream): { what: string; kind: RelicKind } {
  // What a people leaves behind follows how they lived.
  const kind = rng.weighted<RelicKind>({
    records: 2 + 2 * genes.open,
    device: 2,
    art: 1.5,
    sacred: 1 + 3 * genes.bound,
    arms: 0.5 + 3 * genes.bold,
  });
  return { what: rng.pick(RELICS[kind]), kind };
}

/** "a carved panel of the Ilmar" */
export function relicLabel(relic: Relic): string {
  return relic.of ? `${relic.what} of the ${relic.of}` : `${relic.what}, makers unknown`;
}
