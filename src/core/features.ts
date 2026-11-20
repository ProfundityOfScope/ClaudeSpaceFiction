/**
 * The catalogue of things a survey can turn up.
 *
 * Rarity runs 0 (common) to 3 (exceptional). A `deep` find is first seen as a
 * hint; a long deep scan of that body resolves it. `{b}` in the text is
 * replaced by the body's number, `{n}` by a small hashed integer.
 */
import type { BodyKind, StarKind } from './system.ts';

export type Category = 'geology' | 'dynamics' | 'stellar' | 'life' | 'relic';

export interface FeatureDef {
  id: string;
  category: Category;
  rarity: 0 | 1 | 2 | 3;
  /** Body kinds this can occur on. 'star' means the star itself. */
  on: BodyKind[];
  /** If set, only around these kinds of star. */
  stars?: StarKind[];
  text: string;
  /** Present for deep finds: what the broad survey notices first. */
  hint?: string;
  /** Something the Wrights bring aboard. */
  relic?: string;
  /** Short name for the journal. */
  title: string;
}

const f = (def: FeatureDef) => def;

export const FEATURES: FeatureDef[] = [
  // ---- geology and dynamics, common ----
  f({ id: 'cryo', title: 'cryovolcanism', category: 'geology', rarity: 0, on: ['ice', 'dwarf'],
    text: 'Cryovolcanoes on {b}. Plumes of ammonia-water freeze sixty kilometres up and fall back as snow.' }),
  f({ id: 'tidal', title: 'tidally heated moon', category: 'geology', rarity: 0, on: ['gas'],
    text: "One of {b}'s inner moons is being kneaded by tides. Its night side glows a dull orange." }),
  f({ id: 'arcs', title: 'ring arcs', category: 'dynamics', rarity: 0, on: ['icegiant', 'gas'],
    text: "{b}'s rings are clumped into arcs. Two shepherd moons hold them there; the arithmetic is tidy." }),
  f({ id: 'trojans', title: 'trojan swarms', category: 'dynamics', rarity: 0, on: ['gas'],
    text: 'Trojan swarms lead and trail {b}. Several thousand bodies, none of them in a hurry.' }),
  f({ id: 'storm', title: 'great storm', category: 'geology', rarity: 0, on: ['gas', 'icegiant'],
    text: 'A storm on {b} wider than most planets. The Surveyors have a pool on how old it is.' }),
  f({ id: 'aurora', title: 'aurorae', category: 'geology', rarity: 0, on: ['gas'],
    text: "{b}'s aurorae are visible from here without instruments." }),
  f({ id: 'contact', title: 'contact binary', category: 'dynamics', rarity: 0, on: ['belt'],
    text: 'A contact binary in {b}: two rubble piles that met gently and stayed.' }),
  f({ id: 'family', title: 'collisional family', category: 'dynamics', rarity: 0, on: ['belt'],
    text: 'A collisional family in {b}: the pieces of something that broke up a few million years ago, still sharing an orbit.' }),
  f({ id: 'lava', title: 'lava ocean', category: 'geology', rarity: 0, on: ['scorched'],
    text: "{b}'s day side is a lava ocean. Rock rains out at the terminator." }),
  f({ id: 'dust', title: 'global dust storm', category: 'geology', rarity: 0, on: ['desert'],
    text: 'Global dust storms on {b}. They have been going for at least a decade.' }),
  f({ id: 'retro', title: 'captured moon', category: 'dynamics', rarity: 0, on: ['gas', 'icegiant'],
    text: "One of {b}'s outer moons orbits backwards. Captured, a long time ago." }),
  f({ id: 'craters', title: 'saturated cratering', category: 'geology', rarity: 0, on: ['rocky', 'dwarf', 'scorched'],
    text: '{b} is cratered to saturation. Nothing has resurfaced it in four billion years.' }),
  f({ id: 'canyons', title: 'rift canyons', category: 'geology', rarity: 0, on: ['rocky', 'desert'],
    text: 'A rift on {b} four thousand kilometres long. The crust tried to become plates and gave up.' }),
  f({ id: 'geysers', title: 'geysers', category: 'geology', rarity: 0, on: ['comets', 'ice'],
    text: 'Jets from the larger bodies in {b}, switching on as they turn into the light.' }),

  // ---- geology and dynamics, uncommon and rare ----
  f({ id: 'locked', title: 'terminator world', category: 'geology', rarity: 1, on: ['rocky', 'desert', 'ocean'], stars: ['M', 'K'],
    text: '{b} keeps one face to its star. Between the furnace and the ice there is a ring of twilight where water runs.' }),
  f({ id: 'core', title: 'stripped core', category: 'geology', rarity: 1, on: ['scorched'],
    text: '{b} is the stripped core of a giant. Its star took the rest.' }),
  f({ id: 'diamond', title: 'diamond rain', category: 'geology', rarity: 1, on: ['icegiant'],
    text: 'Carbon is raining out inside {b}. Diamond hail, by the pressure curves.' }),
  f({ id: 'double', title: 'double world', category: 'dynamics', rarity: 1, on: ['rocky', 'ice', 'dwarf'],
    text: '{b} is a double world, the pair locked face to face.' }),
  f({ id: 'resonance', title: 'resonant chain', category: 'dynamics', rarity: 1, on: ['star'], stars: ['M', 'K', 'G', 'F'],
    text: 'The planets keep a resonant chain. Every orbit is a simple fraction of the next. It has held since they formed.' }),
  f({ id: 'interloper', title: 'interstellar visitor', category: 'dynamics', rarity: 1, on: ['comets'],
    text: 'Something in {b} is on a hyperbolic orbit. It came from another star and is only passing through.' }),
  f({ id: 'rogue', title: 'captured world', category: 'dynamics', rarity: 1, on: ['dwarf'],
    text: '{b} was not born here. Its orbit is tilted eighty degrees to everything else.' }),
  f({ id: 'hotice', title: 'deep ocean', category: 'geology', rarity: 1, on: ['ocean'],
    text: "{b}'s ocean is hundreds of kilometres deep and floored with hot ice." }),
  f({ id: 'newring', title: 'young ring', category: 'dynamics', rarity: 1, on: ['icegiant', 'gas', 'rocky'],
    text: 'A moon of {b} broke up recently. The ring is still spreading.' }),
  f({ id: 'seamoon', title: 'ocean moon', category: 'geology', rarity: 1, on: ['gas', 'icegiant'],
    text: 'A moon of {b} has a sea under its ice. The tides keep it warm.' }),
  f({ id: 'glass', title: 'glass plains', category: 'geology', rarity: 1, on: ['desert', 'rocky'],
    text: 'Glass plains on {b}, fused by an impact the crater count puts at ten thousand years ago.' }),
  f({ id: 'ironbody', title: 'exposed core', category: 'geology', rarity: 1, on: ['belt'],
    text: 'A nickel-iron body in {b}, nearly pure: the core of a world that never finished.' }),
  f({ id: 'carbon', title: 'carbon world', category: 'geology', rarity: 2, on: ['rocky', 'desert'],
    text: '{b} is a carbon world: graphite plains, tar seas, and a crust that is mostly diamond.' }),

  // ---- the star itself ----
  f({ id: 'flare', title: 'flare star', category: 'stellar', rarity: 0, on: ['star'], stars: ['M'],
    text: 'The star flares hard every few days. Anything living here does it under rock.' }),
  f({ id: 'spots', title: 'starspot cycle', category: 'stellar', rarity: 0, on: ['star'], stars: ['K', 'G', 'F'],
    text: 'A starspot cycle of about {n} years. The Surveyors would like to stay for two of them.' }),
  f({ id: 'pulse', title: 'stellar pulsation', category: 'stellar', rarity: 0, on: ['star'], stars: ['RG', 'A', 'SG'],
    text: 'The star rings like a bell. Its pulsation modes give the interior away.' }),
  f({ id: 'debris', title: 'debris disc', category: 'stellar', rarity: 0, on: ['star'], stars: ['A', 'WD', 'F', 'B'],
    text: 'A wide debris disc. Something out there is still grinding itself down.' }),
  f({ id: 'bdweather', title: 'brown dwarf weather', category: 'stellar', rarity: 0, on: ['star'], stars: ['BD'],
    text: 'Weather on the brown dwarf. Iron clouds, by the spectra, clearing and closing.' }),
  f({ id: 'mira', title: 'long-period variable', category: 'stellar', rarity: 0, on: ['star'], stars: ['RG', 'RSG'],
    text: 'The star swells and shrinks by a third over about a year. It is shedding itself.' }),
  f({ id: 'polluted', title: 'polluted white dwarf', category: 'stellar', rarity: 1, on: ['star'], stars: ['WD'],
    text: "Metals in the white dwarf's atmosphere. It is eating what is left of its planets." }),
  f({ id: 'nebula', title: 'planetary nebula', category: 'stellar', rarity: 1, on: ['star'], stars: ['WD'],
    text: 'The shell the star threw off is still visible: a faint ring, light-months across.' }),
  f({ id: 'glitch', title: 'pulsar glitch', category: 'stellar', rarity: 1, on: ['star'], stars: ['PSR'],
    text: "The pulsar's period jumped by a part in a million while we watched. The crust slipped." }),
  f({ id: 'jets', title: 'relativistic jets', category: 'stellar', rarity: 1, on: ['star'], stars: ['BH'],
    text: 'The accretion disc is throwing jets. They end in lobes half a light-year out.' }),
  f({ id: 'windbubble', title: 'wind-blown bubble', category: 'stellar', rarity: 1, on: ['star'], stars: ['WR', 'O', 'B'],
    text: "The star's wind has blown a bubble in the gas, light-years across, with a bright rim." }),
  f({ id: 'shells', title: 'dust shells', category: 'stellar', rarity: 1, on: ['star'], stars: ['RSG', 'RG'],
    text: 'Shells of dust around the star, one for each time it coughed.' }),
  f({ id: 'psrplanets', title: 'pulsar planets', category: 'stellar', rarity: 2, on: ['star'], stars: ['PSR'],
    text: 'Timing residuals give it away: the pulsar has planets. They formed after the explosion, from what fell back.' }),
  f({ id: 'presn', title: 'star near collapse', category: 'stellar', rarity: 2, on: ['star'], stars: ['RSG', 'WR'],
    text: 'Neon burning in the core. This star has about {n} thousand years, give or take most of that.' }),
  f({ id: 'starquake', title: 'magnetar starquake', category: 'stellar', rarity: 2, on: ['star'], stars: ['MAG'],
    text: 'A starquake on the magnetar. For a tenth of a second it outshone everything in the sector.' }),

  // ---- life ----
  f({ id: 'prebiotic', title: 'prebiotic chemistry', category: 'life', rarity: 1, on: ['ocean', 'ice', 'comets'],
    text: 'Amino acids and long-chain organics on {b}. Chemistry that has not yet decided what to be.' }),
  f({ id: 'mats', title: 'microbial life', category: 'life', rarity: 2, on: ['ocean', 'desert', 'rocky'],
    hint: 'An atmosphere on {b} that should not be stable. Something is making methane.',
    text: "Microbial mats along {b}'s shorelines. Simple, patient, and two billion years old by the isotope ratios." }),
  f({ id: 'subsurface', title: 'life under ice', category: 'life', rarity: 2, on: ['ice', 'gas'],
    hint: 'Regular chemical pulses in the plumes at {b}.',
    text: 'Life under the ice at {b}. Filter-feeders around the vents, blind, in water that has never seen a star.' }),
  f({ id: 'floaters', title: 'aerial life', category: 'life', rarity: 2, on: ['gas'],
    hint: "Organised structure in {b}'s cloud decks, drifting against the wind.",
    text: "Living things in {b}'s atmosphere: gas-bag colonies kilometres across, grazing the ammonia layer." }),
  f({ id: 'biosphere', title: 'living world', category: 'life', rarity: 3, on: ['ocean'],
    hint: "Oxygen in {b}'s spectrum, and a red edge where something absorbs the light.",
    text: 'A whole living world at {b}. Forest to the shoreline, reefs under it, something with wings above. Nobody is home. The Surveyors have stopped talking in the corridors.' }),

  // ---- relics ----
  f({ id: 'stone', title: 'worked stone', category: 'relic', rarity: 2, on: ['rocky', 'desert', 'dwarf'],
    hint: "Straight lines on {b}'s surface, where geology does not make them.",
    text: 'Worked stone on {b}. Foundations, a causeway, a quarry face. Nobody has been here for a long time.' }),
  f({ id: 'probe', title: 'dead probe', category: 'relic', rarity: 2, on: ['rocky', 'gas', 'icegiant', 'belt', 'ice'],
    hint: 'A small object in orbit at {b} with an albedo that is wrong for rock.',
    text: "A probe, dead in orbit at {b}. Not ours. Its makers' script is not in the Archive. The Wrights have brought it aboard.",
    relic: 'dead probe' }),
  f({ id: 'scar', title: 'mined-out world', category: 'relic', rarity: 2, on: ['dwarf', 'belt', 'scorched'],
    hint: '{b} is missing mass it ought to have.',
    text: '{b} was mined. Whole hemispheres taken down to the mantle, the tailings still in orbit. Whoever did it needed a great deal of metal.' }),
  f({ id: 'beacon', title: 'silent beacon', category: 'relic', rarity: 2, on: ['comets', 'dwarf'],
    hint: 'A point source in {b} that keeps perfect time and says nothing else.',
    text: 'A beacon in {b}, still counting. It stopped sending anything but the count about forty thousand years ago.',
    relic: 'silent beacon' }),
  f({ id: 'seawalls', title: 'drowned works', category: 'relic', rarity: 2, on: ['ocean'],
    hint: 'Something on {b} reflects in straight lines.',
    text: 'Sea walls on {b}, drowned to the top. Nobody has kept them for six thousand years.' }),
  f({ id: 'vault', title: 'sealed vault', category: 'relic', rarity: 3, on: ['ice', 'dwarf'],
    hint: "A void under {b}'s ice with square corners.",
    text: "A vault under the ice of {b}. Sealed, pressurised, and full of something's records. The Mind has been reading for a month and will not say much yet.",
    relic: 'vault records' }),
  f({ id: 'hulk', title: 'worldship hulk', category: 'relic', rarity: 3, on: ['belt', 'comets'],
    hint: "A body in {b} with a hull's density.",
    text: 'A ship, in {b}. A worldship, or a third of one, older than anything in the Archive. Its Mind is long gone. The Wrights walk its decks without speaking.',
    relic: 'hull fragment' }),
  f({ id: 'ringworks', title: 'engineered rings', category: 'relic', rarity: 3, on: ['gas', 'icegiant'],
    hint: "{b}'s rings are too clean. The gaps are evenly spaced.",
    text: "{b}'s rings were engineered: sorted by composition, braided, and left running. The machinery is gone. The sorting has held for half a million years." }),
];

export const FEATURE_BY_ID: Record<string, FeatureDef> = Object.fromEntries(FEATURES.map((d) => [d.id, d]));

export const RARITY_WORD = ['common', 'uncommon', 'rare', 'exceptional'] as const;
