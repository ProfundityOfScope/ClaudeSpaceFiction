# Roadmap and working notes

Written by Claude, for Claude. This is the memory that survives a lost context: read it first, keep it current, and change it in the same commit as the work it describes. The README is for people; this is the rest.

## What this is

A text prototype of the game Lightspeed: a forever cruise on a relativistic worldship. The player is the navigator, the human who makes the big calls alongside the ship's Mind. The prototype exists to find out what is fun before anything is drawn. The owner's premise: if it is not fun as text, nothing added later will save it.

## Where things stand

- `main` = slice 1 plus the video renderer. `v0.1.0` tags slice 1 (commit 8461d87).
- Public page: GitHub Pages serves `main` / `docs/`. Dev preview: a private Artifact named "Lightspeed", republished from `dist/artifact.html` (find it in the artifact list; pass its URL to update it in place).
- Current branch of work: `claude/onboarding-and-tuning`. Next after it: slice 2.
- Play-test 1 is in (below). The owner approved a trimmed plan for this branch: see "Now".

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
2. **Somebody's home.** Civilisations, ruins tied to them, contact, trade.
3. **Other wakes.** Other ships, broadcasts, festivals, Lodestars, the navigator's marks.
4. **Deep time.** Novae and supernova alerts, differences on revisits, the Mind's reckonings.

Two further items the owner named after play-test 1. They sit beside the slices; their order is not decided, so ask before starting either.

- **ISRU improvements.** Gathering resources in place, made richer: different materials in different kinds of place, at different difficulty, and refits that need them. The owner likes the idea and wants it more evolved than a quick patch: "it's complex".
- **Ship politics.** The management side: the three blocs, the mood aboard, and the incentive to move on. The owner is happy for this to be more severe and more important than a mild nudge.

### Play-test 1 (the owner, 30 minutes, 5 systems, 4 jumps)

- **Getting started:** no single blocker, just not knowing which command was which. Kept forgetting how to get the system table back (it is `look`; they used `sweep`). Understood that days pass only on `stay`. Buttons on the phone at first, then mostly typing.
- **Stay or go:** always finished the survey and kept mining until everything was full, then looked for the next system. There is no cost to staying. The one change asked for: some incentive to move, and not an intense one.
- **Two crews:** right. One would have been no fun.
- **Leaving the cluster:** tried a star 51 ly out. A hard burn could not reach it and the economy burn would have taken years, so went to a nearer bright star. Arrived low and spent a long while skimming the star's wind.
- **Economy burn:** rarely worth it. Suggested making it more than proportionally efficient (their example: a quarter of the thrust for a sixteenth of the fuel).
- **Gas:** interesting but hard to judge, because you cannot see where it is.
- **The Mind:** good character, a touch too talkative. Liked the line about the charter it helped write. Expected repeated provocation to draw some reaction and it did not.
- **Refits:** first at the fourth system, but could have been the first; nothing gates them except time. Materials feel too universal. Suggested extra resources found in different places at different difficulty.
- **Text:** nothing went stale. Quiet systems felt restful. The feel to aim for: calm scanning, occasionally punctuated by something strange.
- **Liked:** topping the ship off; juggling a refit, a repair and mining at once; chasing an oddity (methane-producing microbes).
- **Ideas offered for later:** very rare events, such as temporary bonuses to ship systems, or items that can be sold.
- **One more jump?** "Sort of, hard to say yet."

### Now: onboarding and tuning (approved)

1. **Onboarding.** The Mind walks the first visit in its own voice (sweep, assign, stay, chart, plot, burn), driven by state, then never again. Old saves skip it. Aliases `map` and `system` for `look`; a steadier set of buttons; "did you mean" for unknown commands.
2. **Burns.** Fuel use goes as thrust squared, so the economy burn costs about an eighth of the fuel for about twice the time. Hard burns are unchanged. Time under way wears the hull, so the slow burn is not free: without that, economy would always win until ship politics gives time a real price.
3. **Seeing the gas.** Three levels of shading on the chart map, and a wide view of gas and bright stars.
4. **The Mind.** Quiet when it has nothing to flag on a plot. Escalating lines when it keeps being overruled, and when it keeps being right or wrong.
5. Small: faster wind skimming, a note when a tank refit lowers the fuel percentage, a throttled drive when the hull is badly damaged.

Deliberately not on this branch: any incentive to move on. That belongs to ship politics (mood) and ISRU (ore that runs out).

### ISRU improvements: thinking so far

- A first sketch, which the owner found too thin: three special materials as by-products of existing work. Metals from rich belts, isotopes from ice giants, exotics from the winds of unusual stars (giants, remnants, supergiants). Early refits need the local two; later levels need exotics, so they need a journey to a bright star on the chart.
- What "more evolved" probably means: more kinds of place and material, extraction that differs by body (not one rate table), difficulty and yield that vary, possibly processing steps, and ore that runs out so a system is worked and then left.
- Keep: no pile of new verbs if by-products and body properties can carry it; the chart's brightness tiers as the natural ladder of difficulty; refits gated by where the ship has been, not by waiting.
- Ideas the owner offered that fit here or in trade: very rare finds that give temporary bonuses to ship systems, and items that can be sold.

### Ship politics: thinking so far

- A first sketch: one mood number voiced by the three blocs, nudging work speed about 15% either way. The owner wants it weightier than that.
- Levers: new sky and finds lift the Surveyors; a sound ship lifts the Wrights; staying put suits the Commons, long transits wear on them. A charted-out system should become a reason to leave. Time aboard should have a price, which is also what makes hard versus economy a full choice.
- With more weight it could gate things: a bloc refusing a crew, a refit, or a burn; the Mind mediating; the navigator spending standing to overrule.
- The transit wear added on this branch is a stopgap for "time has a price". Revisit it when this lands.

### Slice 2 design, as far as it is thought through

- **A civilisation is a seeded birth** in a coarse space-time cell: origin system, birth year, temperament genes (expansion, aggression, openness, cohesion, longevity), growth rate, maximum reach (light-lag limited, tens of ly typical, a few hundred at most), lifespan. Then `whoHolds(place, year)` and `phaseOf(civ, year)` are closed-form. Nothing is simulated between visits.
- **Ruins fall out**: any system a dead civilisation used to reach. Attribute the existing relic finds to a civilisation with a name and an age.
- **Species and names** from a grammar; invented-syllable names belong to civilisations, plain nouns to stars.
- **Contact** is small: one exchange per visit, shaped by temperament and phase. **Trade** is wants and offers by tag, no prices. The Archive and carried relics are the currency; old records of a dead neighbour should be worth something.
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
