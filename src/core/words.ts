/**
 * Name material. Bright stars, clusters and sectors take plain old nouns;
 * dim field stars get a sector name and a catalogue code.
 */
import { Stream } from './rng.ts';

export const NOUNS = [
  'Kestrel', 'Anvil', 'Marrow', 'Vesper', 'Tallow', 'Cinder', 'Hollis', 'Brine', 'Lantern', 'Harrow',
  'Tessel', 'Ombre', 'Wick', 'Sable', 'Thistle', 'Gannet', 'Farrow', 'Loom', 'Quill', 'Ember',
  'Bracken', 'Corbel', 'Dunnock', 'Fennel', 'Garnet', 'Heron', 'Isle', 'Juniper', 'Kiln', 'Larch',
  'Mallow', 'Nettle', 'Osier', 'Pewter', 'Rook', 'Sorrel', 'Tarn', 'Umber', 'Vane', 'Wren',
  'Yarrow', 'Alder', 'Barrow', 'Cairn', 'Dray', 'Eyot', 'Fallow', 'Gorse', 'Hearth', 'Ingot',
  'Jetty', 'Knoll', 'Linnet', 'Mere', 'Nave', 'Oriel', 'Plover', 'Quarry', 'Rushlight', 'Shale',
  'Teasel', 'Verge', 'Weir', 'Antler', 'Bellows', 'Clinker', 'Drover', 'Flint', 'Gimbal',
  'Halyard', 'Ironwood', 'Kelp', 'Lathe', 'Mortar', 'Nacre', 'Ochre', 'Pilot', 'Rime',
  'Saltern', 'Tiller', 'Sexton', 'Whin', 'Yoke', 'Arbor', 'Bodkin', 'Cresset', 'Dowel',
  'Fathom', 'Gable', 'Hasp', 'Lintel', 'Mullion', 'Purlin', 'Rafter', 'Spindle', 'Trestle',
  'Wainscot', 'Ashlar', 'Beacon', 'Cooper', 'Fuller', 'Glazier', 'Mason', 'Sawyer', 'Thatcher',
  'Turner', 'Wright', 'Chandler', 'Collier', 'Ferrier', 'Hayward', 'Reeve', 'Tanner', 'Warden',
  'Merrow', 'Pallas', 'Corvid', 'Siskin', 'Curlew', 'Lapwing', 'Dipper', 'Pipit', 'Bittern',
  'Stonechat', 'Whimbrel', 'Godwit', 'Redpoll', 'Fieldfare', 'Sedge', 'Tansy', 'Vetch',
  'Madder', 'Woad', 'Saffron', 'Russet', 'Tawny', 'Slate', 'Pitch', 'Chalk', 'Marl', 'Loam',
] as const;

const SECTOR_KINDS = [
  'Reach', 'Drift', 'Shoal', 'Deep', 'Banks', 'Narrows', 'Marches', 'Fields', 'Stair',
  'Sound', 'Strand', 'Wastes', 'Shelf', 'Verge', 'Hollow', 'Rise', 'Passage', 'Commons',
] as const;

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function noun(rng: Stream): string {
  return rng.pick(NOUNS);
}

/** "the Tessel Drift" */
export function sectorName(rng: Stream): string {
  return `${rng.pick(NOUNS)} ${rng.pick(SECTOR_KINDS)}`;
}

/** A proper name for a bright star: mostly a bare noun, sometimes dressed up. */
export function brightName(rng: Stream): string {
  const base = rng.pick(NOUNS);
  const roll = rng.next();
  if (roll < 0.62) return base;
  if (roll < 0.74) return `${base}'s Lamp`;
  if (roll < 0.84) return `Old ${base}`;
  if (roll < 0.92) return `${base} Major`;
  return `High ${base}`;
}

/** A catalogue code such as "QK-204". */
export function catalogueCode(rng: Stream): string {
  const a = CODE_LETTERS[rng.int(CODE_LETTERS.length)];
  const b = CODE_LETTERS[rng.int(CODE_LETTERS.length)];
  return `${a}${b}-${100 + rng.int(900)}`;
}

/** Names for the ship's Mind. `tag` is how it signs its lines. */
export const MIND_NAMES: { name: string; tag: string }[] = [
  { name: 'Margin of Error', tag: 'MARGIN' },
  { name: 'Subject to Revision', tag: 'SUBJECT' },
  { name: 'Later Than It Looks', tag: 'LATER' },
  { name: 'A Longer View', tag: 'LONGER' },
  { name: 'Quiet Arithmetic', tag: 'QUIET' },
  { name: 'Benefit of the Doubt', tag: 'BENEFIT' },
  { name: 'Standing Correction', tag: 'STANDING' },
  { name: 'Ask Me Something With Units', tag: 'UNITS' },
  { name: 'Provisional Answer', tag: 'PROVISO' },
  { name: 'Patience of Stone', tag: 'PATIENCE' },
  { name: 'Nobody Asked The Stars', tag: 'NOBODY' },
  { name: 'Unhurried On Principle', tag: 'UNHURRIED' },
  { name: 'Reasonable Doubt', tag: 'DOUBT' },
  { name: 'Slow Light, Good Company', tag: 'SLOW' },
];
