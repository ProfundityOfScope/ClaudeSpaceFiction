/**
 * The ship's Mind: what it says and when.
 *
 * Nothing here is generated at runtime. Each situation has a pool of written
 * lines; a line that has been used is retired until its pool runs dry, so the
 * Mind does not repeat itself for a long while. `{name}` slots are filled
 * from the game state.
 */
import { K, Stream } from './rng.ts';
import type { StarKind } from './system.ts';

export interface MindState {
  /** Index into MIND_NAMES. */
  name: number;
  /** The kind of star it privately likes to visit. */
  fancy: StarKind;
  /** Lines already used, per pool. */
  used: Record<string, number[]>;
  /** Counter that keeps line choice deterministic. */
  n: number;
  /** One-off remarks already made (milestones and the like). */
  said: string[];
  /** Habits it has noticed in the navigator. */
  early: number;
  thorough: number;
  overruled: number;
  /** A dissent waiting to be checked on arrival. */
  dissent?: { where: string; reason: 'shield' | 'fuel'; hull: number };
}

export const FANCIES: StarKind[] = ['WD', 'PSR', 'RG', 'BD', 'A', 'RSG'];

export const LINES: Record<string, string[]> = {
  arrive: [
    'New sky. I have nothing on file for this one.',
    "We're here. Nobody is expecting us, which simplifies things.",
    'Braking burn complete. The plume will be visible for light-years, to anyone looking.',
    "Station kept. I'll have a first look at whatever you point me at.",
    "Arrived. The Surveyors were at the windows before I'd finished the burn.",
    'In orbit. Everything in this system is new to the Archive, including the dull parts.',
    "We've stopped. I recommend looking before deciding anything.",
    "Another one. I don't get tired of them. I've checked.",
    "Here we are. I've started the clocks for this system.",
    'Arrived, and nothing shot at us. I always note that.',
    'The light we steered by was {light} old. The place appears to have kept.',
    "Holding orbit. Go gently with the Surveyors, they've been up for the whole approach.",
    'We are where I said we would be. I enjoy that more than I should.',
    'Parked. The galaxy is {outside} older than when you last looked.',
  ],
  revisit: [
    'Back at {sys}. {gap} since we left, by their count.',
    "We've been here before. I kept the charts.",
    '{sys} again. It has not missed us.',
    'I know this sky. {gap} have gone by here since we last used it.',
  ],
  star_WD: ['I find these restful. Everything that was going to happen here has.'],
  star_PSR: ["I'll use it to check my clocks. Over a short enough span it is a better clock than I am."],
  star_BH: ['We will not be going closer than this.'],
  star_RSG: ['If it goes while we are here, you will not have time to be annoyed with me.'],
  star_BD: ['Not much of a star. I say that fondly.'],
  star_O: ["Hard light. I'm keeping the hull between it and the people."],
  star_WR: ["Hard light. I'm keeping the hull between it and the people."],
  star_RG: ['It was a star like any other for ten billion years. This part is brief.'],
  star_MAG: ['I have shut down everything that can be shut down. Please do not ask me to go nearer.'],
  star_B: ['Young, bright and not planning for the future. I have known ships like that.'],

  sweep_empty: [
    'Nothing orbits it. A star alone.',
    'No planets, no belt. We came a long way to look at one object.',
  ],
  sweep_nogiant: [
    "No giants. If we want fuel here it's the star's wind, and that is slow.",
    "Nothing to scoop but the star's own wind. I can do it; it will take most of a year.",
    'No giants here. Worth knowing before the tanks get low.',
  ],
  sweep_rich: [
    "A full house. There's a season's work here if you want it.",
    'Fuel, ice and ore in one system. We could leave here whole.',
    'A generous system. The Wrights are already drawing up lists.',
  ],
  sweep_anomaly: [
    "And there is the thing we saw from outside. I can't resolve it from this orbit. A survey would.",
    'Something here does not fit. A survey will tell us which body it belongs to.',
  ],

  plot_ok: [
    'Comfortable. Nothing in that I would argue with.',
    'Within our means.',
    'A short step. I approve of short steps.',
    'That works. We arrive with {fuel}% in the tanks.',
    'No objection. I checked twice out of habit.',
    'Easy going. The gas is {gas} the whole way.',
  ],
  plot_tight: [
    "We'd arrive on {fuel}% fuel. I'd want to know there is something to scoop at the far end.",
    'It can be done. We would arrive with {fuel}% in the tanks and no second choice.',
  ],
  plot_nofuel: [
    "We haven't the fuel for that at full thrust.",
    'Not on what is in the tanks. A quarter thrust might do it; look at the economy line.',
  ],
  plot_nothing: [
    "We haven't the fuel for that at any thrust. We scoop first, or we choose nearer.",
  ],
  plot_shield: [
    "The shield won't last the trip. What it can't stop comes out of the hull: about {hull}%.",
    'We run out of shield before we run out of gas. The hull pays the difference, about {hull}%.',
  ],
  plot_cloud: [
    'That line runs through thick gas. We would be wading.',
    'There is a cloud across the way. It costs time, fuel and ice, in that order.',
  ],
  plot_long: [
    '{ship} aboard is a long time to ask of people.',
    'A long haul: {ship} for us, {outside} for everyone else.',
  ],
  plot_thin: [
    "Thin gas most of the way. We'll make good speed.",
    'Clear running. The drive likes this.',
  ],
  dissent: [
    "For the record, I would not do this. I've logged it, and I'll check afterwards whether I was right.",
    "I'm entering a dissent. It changes nothing. It means I will look back at this later.",
    "My objection is in the log. You have the conn; that's what the charter says and I helped write it.",
  ],
  reckon_right: [
    'I dissented at {where}. Hull is down {hull} points. I will leave it there.',
    'About my objection at {where}: {hull} points off the hull. I take no pleasure in it.',
  ],
  reckon_wrong: [
    "I dissented at {where}. We arrived in good order. I've adjusted my margins.",
    'I was wrong at {where}. It is in the log next to the objection, same size type.',
  ],

  provisioned: [
    'Tanks full and the shield whole. Anything more we do here is by choice.',
    'We are provisioned. From here on we stay because we want to.',
  ],
  idle: [
    "A crew stood idle for {days} days. I don't mind. The Wrights do.",
    '{days} crew-days went unused. I mention it once.',
  ],
  long_stay: [
    "We've been here {stay}. The Commons have started naming the constellations.",
    '{stay} in one orbit. People are planting things that take years to fruit.',
    "{stay} here now. I'm content. I'm reporting it, not complaining.",
  ],
  survey_slow: [
    "The survey is finding less each week. What's left will take patience.",
    'Diminishing returns on the survey. There may be one more thing; there may not.',
  ],
  survey_done: [
    'Fully charted. I do like a finished page.',
    'That is everything this system has to show a telescope.',
  ],

  leave_early: [
    'Leaving with most of it unlooked-at. Noted, not criticised.',
    'We are going before the survey has properly started. The Surveyors will say so at length.',
    "Off again. One day I'd like to know what we left behind in places like this.",
  ],
  leave_early_habit: [
    "That's {n} systems we've left barely opened. I'm not complaining. I'm counting because nobody else will.",
  ],
  leave_thorough: [
    "Nothing left here that we haven't written down. A clean departure.",
    'We leave it fully charted. Whoever comes next can use our numbers.',
  ],

  find_rare: [
    'That goes in the Archive under its own heading.',
    "I'd like to stay with this one a while.",
    "I've seen very few of those. Fewer than you'd think.",
    'Somebody should write that up properly. I suppose that is me.',
  ],
  find_exceptional: [
    "I have been travelling a long time. I haven't seen that before.",
    'Wake everyone.',
    'I would have crossed the disc for this. We nearly flew past it.',
  ],
  find_hint: [
    "That's worth a closer look. It will take months, not days.",
    'I cannot tell what that is from here. A deep scan would settle it.',
    'An oddity. I dislike leaving those unresolved, but it is your time to spend.',
  ],
  relic: [
    "Somebody made that. They are not here now, and I can't yet say for how long.",
    "The Wrights have it in the yard. They've put a rope around it, as if it might leave.",
  ],

  fancy_seen: [
    "There's a {kind} {dist} off, number {n} on the chart. I'd like to see it, if we're passing. I don't ask often.",
    "Number {n} is a {kind}. I have a weakness for those. Only if it's on the way.",
  ],
  fancy_thanks: [
    "Thank you for this one. I won't say it twice.",
    'You brought me to see it. I have noted that, in the part of the log I keep for myself.',
  ],

  warn_fuel: [
    "Fuel at {fuel}%. I'd think about a giant.",
    'The tanks are at {fuel}%. Our choices narrow from here.',
  ],
  warn_shield: [
    "The shield is thin: {shield}%. Ice, when we can find it.",
    '{shield}% of a shield. The next thick gas we meet will find the hull.',
  ],
  warn_hull: [
    'Hull at {hull}%. The Wrights have opinions and so do I.',
    "The hull is at {hull}%. I'd stop being polite about it soon.",
  ],

  refit_start: [
    'The Wrights say {days} days, if nobody jogs their elbow.',
    "{days} days in the yard. They've wanted to do this since launch.",
  ],
  refit_done: [
    "Refit complete. She's a better ship than she was this morning.",
    'The Wrights have finished and are pretending it was easy.',
  ],

  chatter: [
    "You're asking what I think. I think the arithmetic is fine and the choice is yours.",
    "I would always wait. I have the time. That's why the charter gives the choosing to someone who hasn't.",
    'Ask me something with units.',
    "I keep a list of stars I'd like to see again. It is longer than any trip allows.",
    'The Surveyors want new sky, the Wrights want a quiet yard, the Commons want to stay put. They are all right.',
    "We've come {ly} light-years since you woke. The galaxy hasn't noticed.",
    "I've been counting: {systems} systems, and {finds} things worth writing down.",
    "Light from where we started is {outside} behind us. If anyone there is watching, they see us leaving.",
    "I don't sleep. I do idle. It's when I go back over the surveys.",
    'I can get us anywhere on the chart. Whether we should want to go is yours. I would be bad at it.',
    "It has been {aboard} for you and {outside} for everyone else. I keep both clocks. Somebody should.",
    "Most of what's out there nobody has ever looked at. That is the whole job, and I like it.",
    'If you want my preference: stay longer, leave less unseen. But I would say that.',
    "Nothing is wrong. I mention it because I'm so rarely asked when nothing is.",
  ],

  milestone_g100: [
    'A hundred years outside since you woke; {aboard} aboard. Everyone we passed at the start is dead or very old.',
  ],
  milestone_g1000: [
    'A thousand years outside. Whatever language they spoke back at {home} has turned over at least once.',
  ],
  milestone_g10000: [
    'Ten thousand years outside. Anything written about us at {home} is archaeology now.',
  ],
  milestone_g100000: [
    "A hundred thousand years outside. I've stopped expecting to recognise anything.",
  ],
  milestone_s10: [
    'Ten years aboard. The children born at {home} are flying crews now.',
  ],
  milestone_s50: [
    'Fifty years aboard. There are grandparents on the ring who have never known another navigator.',
  ],
  milestone_s200: [
    "Two hundred years aboard. The ship's dialect has drifted. I translate without mentioning it.",
  ],
};

/** Replace `{slot}` markers. Unknown slots are left visible so they get noticed. */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/** Pick an unused line from a pool, retiring it. Returns null for an unknown pool. */
export function speak(mind: MindState, seed: number, pool: string, vars: Record<string, string | number> = {}): string | null {
  const lines = LINES[pool];
  if (!lines) return null;
  let used = mind.used[pool] ?? [];
  if (used.length >= lines.length) used = [];
  const free = lines.map((_, i) => i).filter((i) => !used.includes(i));
  const choice = free[new Stream(seed, K.MIND, mind.n++).int(free.length)];
  mind.used[pool] = [...used, choice];
  return fill(lines[choice], vars);
}
