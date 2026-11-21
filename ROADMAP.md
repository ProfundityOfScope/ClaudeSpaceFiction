# Roadmap and working notes

Written by Claude, for Claude. This is the memory that survives a lost context: read it first, keep it current, and change it in the same commit as the work it describes. The README is for people; this is the rest.

## What this is

A text prototype of the game Lightspeed: a forever cruise on a relativistic worldship. The player is the navigator, the human who makes the big calls alongside the ship's Mind. The prototype exists to find out what is fun before anything is drawn. The owner's premise: if it is not fun as text, nothing added later will save it.

## Where things stand

- `main` = slice 1 plus the video renderer. `v0.1.0` tags slice 1 (commit 8461d87).
- Public page: GitHub Pages serves `main` / `docs/`. Dev preview: a private Artifact named "Lightspeed", republished from `dist/artifact.html` (find it in the artifact list; pass its URL to update it in place).
- Current branch of work: `claude/onboarding-and-tuning`. Next after it: slice 2.
- Waiting on the owner: a filled-in play-test checklist (sent in chat, not in the repo).

## What the owner wants (their steers, in order of weight)

- **Adventure and exploration first.** A calm arrive-scan-jump rhythm, plus aliens, a galaxy that feels alive and that changes. Stale light is flavour only; they explicitly demoted it from the earlier experiments.
- **Staying should pay.** Mining, cutting ice, scooping, deep scans and surveying take realistic time and are worth it; leaving for better prospects must stay a live option.
- **Mostly survey and exploration**, but carrying knowledge and materials between civilisations, and keeping the ship happy, should matter.
- **A forever cruise.** Save and come back. The motivation is what you find and what emerges. No runs, no win state.
- **The Mind is a real presence**: its own preferences, a rare formal dissent. Written lines only. A live language model might be fun later, not now.
- **Player marks are worth trying** but bounded: nothing the navigator does should last forever in a galaxy this big. Store them with an expiry.
- **Start weak in a dense region** so early hops are cheap and the player learns before long hauls. Dense may mean stars, gas or both; treat it as a dial.
- **Other ships**, of many sizes, classes, speeds and origins. The example given: on arrival, a broadcast from a ship that saw your braking plume from the next system, inviting you to a festival at a named system in ten years.
- **A few permanent systems** that stay relevant forever. Working name: Lodestars.
- **Civilisations have extent, but small.** Even a powerful one should not control much.
- **Demo galaxy small, design scalable.** A fraction of real star counts is fine if the systems scale.
- **Earlier experiments are flavour, not spec.** Borrow the universe, not the implementations.

Working with the owner: fluent in scientific Python, new to TypeScript and web builds. Wants things physically motivated, easy to follow and concisely documented. Prefers short summaries and being told what to look for when testing. Often plays on a phone, so check phone width.

Reactions to slice 1 so far: finding the worked stone at Ember 61 was the high point; the Mind's remarks landed well; working out the commands took a minute.

## The slice plan

1. **Sweep, scan, jump.** Done. Refits were pulled forward into it.
2. **Somebody's home.** Civilisations, ruins tied to them, contact, trade, ship mood.
3. **Other wakes.** Other ships, broadcasts, festivals, Lodestars, the navigator's marks.
4. **Deep time.** Novae and supernova alerts, differences on revisits, the Mind's reckonings.

### Now: onboarding and tuning

- **Onboarding.** Have the Mind walk the first visit and then go quiet: sweep, assign a crew, stay, chart, plot, burn. The likely stumble is that days only pass on `stay`. Do it in the Mind's voice, driven by state, not as a tutorial mode; a returning player must never see it.
- **Tuning.** Wait for the checklist. Things already suspected:
  - First refits may come too soon (the bot got one in the second system).
  - The bot only makes short hops, so nothing past the starting cluster has been exercised: long hauls, clouds, the economy burn, a real dissent.
  - Common finds repeat within about twenty systems; rare ones have one text each.
  - Hull barely matters in bot runs. Fuel and shield bite only outside the cluster.
- **Known rough edges.** After a tank refit the fuel percentage drops with no explanation. Oddities (`!`) may be too reliable a source of rare finds.

### Slice 2 design, as far as it is thought through

- **A civilisation is a seeded birth** in a coarse space-time cell: origin system, birth year, temperament genes (expansion, aggression, openness, cohesion, longevity), growth rate, maximum reach (light-lag limited, tens of ly typical, a few hundred at most), lifespan. Then `whoHolds(place, year)` and `phaseOf(civ, year)` are closed-form. Nothing is simulated between visits.
- **Ruins fall out**: any system a dead civilisation used to reach. Attribute the existing relic finds to a civilisation with a name and an age.
- **Species and names** from a grammar; invented-syllable names belong to civilisations, plain nouns to stars.
- **Contact** is small: one exchange per visit, shaped by temperament and phase. **Trade** is wants and offers by tag, no prices. The Archive and carried relics are the currency; old records of a dead neighbour should be worth something.
- **Mood**: one number, voiced by Surveyors (want new sky), Wrights (want the ship sound), Commons (want to stay put). It should pull against the route, not be a chore.
- New random streams get **new keys in `K`** (`rng.ts`). Never renumber.

### Later slices, ideas held

- **Ships** as seeded itineraries (stops and dates) so the same ship can be met again; they are time-dilated too, so they are the only recurring characters across millennia. An invitation is a place and a date window.
- **Alerts** seeded per era with a good bearing and a rough distance. **Pin on commitment**: an event gets a concrete system only when the player plots toward it, and only then is it written to the save. This was the owner's idea.
- **Marks**: stored with an expiry, affecting only their own system.
- **Lodestars**: a fixed handful, kept by travellers for travellers: refits, archives, festival grounds.

## Rules that keep the world stable

- Integer hashing only. One substream per purpose. Append to `K`, never renumber.
- Nothing derived is stored. The save holds what the player did; the galaxy is rebuilt from the seed.
- A save is `State` with `v: 1`. Adding a field needs a default on load. Changing what a field means needs a version bump.
- Adding an entry to `FEATURES` changes what the dice pick, so surveyed systems can change. Acceptable now; say so when it happens.
- Fixed-width output stays within 42 columns (there is a test).

## How to work here

- `npm run check`, `npm test`, `npm run build`, `npm run bot`. Node runs `.ts` directly.
- **Build before committing page changes.** Pages serves `docs/index.html`, which is generated.
- Publish a dev build by republishing `dist/artifact.html` to the dev Artifact.
- One branch per piece of work, a pull request to `main`, and the owner merges. Squash when the branch history is messy, merge commit when it is clean. After a squash, start the next branch from `main`.
- **These sessions cannot push tags** (403). The owner creates them from GitHub's release page. Next is `v0.2.0`.
- Do not force-push. A built-in safety check refuses `rm` with a glob after a `cd`; write to fresh paths instead.
- The cloud environment `ClaudeSpaceFiction` allows `huggingface.co` and `us.aws.cdn.hf.co`, for the narration voice.

## The video renderer

`video/` makes narrated walkthroughs; `video/README.md` explains it. Five tutorial chapters were made for the owner and then removed from the repo (recoverable from pull request #2). The chosen narrator is `am_michael`. A fresh container needs the fonts, `kokoro-onnx`, and the two model files again.
