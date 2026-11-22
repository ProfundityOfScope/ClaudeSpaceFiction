# Roadmap and working notes

Written by Claude, for Claude. This is the memory that survives a lost context: read it first, keep it current, and change it in the same commit as the work it describes. The README is for people; this is the rest.

## What this is

A text prototype of the game Lightspeed: a forever cruise on a relativistic worldship. The player is the navigator, the human who makes the big calls alongside the ship's Mind. The prototype exists to find out what is fun before anything is drawn. The owner's premise: if it is not fun as text, nothing added later will save it.

## Where things stand

- `main` = slice 1, the video renderer, onboarding and tuning, and the pixel maps. `v0.1.0` tags slice 1 (commit 8461d87). Nothing since has been tagged; suggest `v0.1.1` or fold it into `v0.2.0`.
- Public page: GitHub Pages serves `main` / `docs/`. Dev preview: a private Artifact named "Lightspeed", republished from `dist/artifact.html` (find it in the artifact list; pass its URL to update it in place).
- Current branch of work: `claude/civilisations` (slice 2). Step 1 of three is built and in a pull request: cultures exist and can be seen, ruins can be read, relics can be carried. **Stop here** until the owner has judged how busy the galaxy feels; then step 2 (contact and consequences), then step 3 (trade).
- Not yet heard: how the onboarding, the economy burn and the gas views played. Ask.

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

- **ISRU improvements.** Gathering resources in place, made richer: different materials in different kinds of place, at different difficulty, and refits that need them. The owner likes the idea and wants it designed properly as a richer system, not patched in.
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

### Onboarding and tuning (built, awaiting the owner's play-test)

- **Views.** `look` is the system table plus what each crew is doing, with `c1` under the body crew 1 is working. `ops` is the work on offer. `ship` includes the refit table; `refits` is another word for it. These merges came out of the phone concept, where three panes covered what five commands did.
- **Onboarding.** `guide` in the save is the step of a first-visit walkthrough; the lines are `GUIDE` in `mind.ts` and the logic is `Game.guide`. It reacts to what has happened, so steps taken out of order are skipped, and it ends at the first arrival. Saves without the field are never walked through. Also: `map`/`system` for `look`, a fixed closing set of buttons (look, ops, chart, ship, ask), and "did you mean" on near misses.
- **Burns.** Fuel is thrust squared times time under burn, so `burn eco` (a quarter thrust) costs roughly an eighth of the fuel for twice the time. `TRANSIT_WEAR` (1.5% hull per year under way) is the price of going slowly. The plot table now shows time for each burn and fuel, shield and hull on arrival.
- **Gas.** The chart has a one-character column for the gas on the way to each star (`#` if a cloud lies anywhere across the line). The wide view of where the gas is has since become `chart far`; see Charts and map pictures.
- **The Mind.** Comments only on the first unremarkable plot of a visit. Dissents change wording from the third, and go terse after four correct in a row (`streak`). Reckonings name the run. Refusals escalate (`refused`).
- **Small.** Wind skimming doubled. A note when bigger tanks lower the fuel percentage. Below 40% hull the drive is throttled to 70%.

Bot, 200 jumps on three seeds after these changes: no dead ends; longest hop about 90 ly; economy burns on 2 to 5% of jumps; lowest hull on arrival 62 to 75%. Refit pacing is unchanged and still too easy; that is ISRU's job.

Not addressed here, on purpose: any incentive to move on (ship politics; ISRU for ore that runs out).

Things to ask after the next play-test: is economy now worth choosing; is the hull cost of a slow burn noticeable; does the wide gas view make gas readable; did the walkthrough help or get in the way.

### Charts

History, because it explains the shape of the code. First a 64-cell picture for `chart` and a separate `gas` view. The owner found that too chunky and hard to relate, so it became one chart with three zooms and a finer picture with a tinted hull for a culture's space. Then the concept art for a phone app (see Media) made it plain that the map's real home is a full screen moved by hand, and that polishing a static picture in the log was time not spent on the game. So **the page shows the character map again**, and what the picture taught went into words.

- **Three zooms that nest**, each four times wider than the last (`ZOOM_STEP`). `chart close` is sized to hold the nearest nine stars, rounded up to a tidy figure. `chart` (the default, `mid` in the code) is what stands out within four times that. `chart far` (also `gas`) is sixteen times. Each numbers what suits its scale: the nearest nine; voices, flagged systems and bright stars; bright stars and voices beyond the plain chart.
- **Under each list, in words**: which numbers a hard burn reaches on these tanks, which only economy reaches, and which are out of reach (`reachWords`); and whose space we are inside, or how near it begins and in which direction (`heldWords`).
- **`plot`** takes a number from the last chart or a star's name (whole or part), and says what the telescopes see as well as the cost. `scope` is now just another word for it.
- **The picture's data is still made.** Every chart item carries `MapData` (96 cells a side: gas in 36 shades, stars, `held` space as a hull, `inner` box for the next zoom in). Nothing draws it now; it is there because it is exactly what an app's map would draw, and the tests keep it honest. The page's drawing code (`drawMap`) was removed in the commit that made this change and is in the history if wanted.
- **Do not bring the picture back, or make any map interactive, without being asked.**

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

### Slice 2: what the owner has decided

- **Density.** Cultures can be fairly prominent in the starting cluster, for testing and for the early game. Outside it they are rare by the numbers, about one system in a hundred, but not vanishingly rare.
- **Ruins are derived, not tuned.** They are wherever a culture used to be. Their frequency follows from the population and its lifespans.
- **Slow change is fine.** On the weak drive and short hops nothing much changes; long hauls are where turnover should be felt.
- **Sameness comes later.** The tables of species, temperaments and lines will be fleshed out a lot afterwards, so build them as data that is easy to extend.
- **Who is out there.** The ship carries humans, but not only humans. Nothing found out there is human.
- **Consequences, but no death.** Hostility must cost something. The ship is well defended, and the Mind can override the navigator and force an emergency exit, possibly ending in a drift until rescue. The navigator never dies.
- **Oddities, ruins and relics are three things.**
  - *Oddities* (the survey's finds) should be mostly natural, a function of the kind of body, or things that can sit outside time, such as a derelict of unknown age. Use the timeless made things sparingly: radiation and drifting orbits would wear most of them away.
  - *Ruins* are manifestations of a culture that has ended, and are temporary. Surface works such as the worked stone and the drowned sea walls belong here, not among the oddities.
  - *Relics* are items: rare from some ruins, rarer still from oddities. They are carried in the hold and may be worth something to cultures of certain temperaments.
  - Do not rewrite star generation to hold permanent relics.
- **The emergency exit.** For now the Mind bails at 10% hull. Leave the hook for a smarter rule: the nearest empty system is known, so the cutoff can be placed where the resulting drift is painful but not catastrophic.
- **Existing voyages may be invalidated** freely during testing. Saves are now version 2; older ones start afresh.

### Slice 2 design (approved; step 1 built, steps 2 and 3 to come)

- **Generator, `civs.ts`, pure functions of (seed, place, year).**
  - *Worlds*: single-system cultures, rolled per system and per era.
  - *Reaches*: the few that spread, rolled per coarse cell and per era, each with a home system, a frontier speed, a furthest radius and a lifespan. A system inside a living Reach is claimed; about half of those carry an outpost.
  - *Phases* from age over lifespan: founding, rising, height, decline; then ruins, old ruins, nothing.
- **Identity** from extendable tables in `cultures.ts`. Nothing human.
- **Contact (step 2).** They state terms on arrival (welcome, toll, keep out) by temperament, phase and how past visits went. Comply or ignore. Ignoring a strong culture escalates: warning, then damage, then the Mind takes the conn and burns for the nearest empty system. With dry tanks that becomes the long fall. Never a game over.
- **Trade (step 3).** Each culture wants two things and offers two: materials, records by Archive category (each category once per culture), carried items; fuel, ice, repairs, help with a refit, charts that mark leads, their records, a keepsake. No prices. Relics are worth something to cultures of certain temperaments (`RelicKind` is there for this).

### Slice 2, step 1 as built

How it works, for whoever picks this up:

- **Eras with offsets.** Time is cut into eras of `CIV.ERA` years. A system raises at most one culture per era and a culture's whole life fits inside its era, so two never overlap at one world. Every system and every coarse cell counts its eras from its own hashed offset. Without the offsets the whole galaxy died at each era boundary; the first census caught that. Ruins last less than an era, so any year needs only the current era and the one before.
- **A Reach's home** is the nearest world that could raise a people and that no single-world culture is using during the Reach's life. `frontier(c, year)` grows from home, holds, and falls back to a quarter during decline. An outpost lives from when the frontier reaches it until the frontier falls back past it, then is a ruin for a while.
- **The people belong to the world.** The species sketch is seeded by the home system, not the era. A later culture there is the same kind of creature under a newer name, and the game says so if both are known.
- **`Cultures` (in `civs.ts`)**: `presence(sys, year)` gives sites (home or outpost, living or ruined) and claims; `heard(sys, year, dist)` is what the light shows, so it asks about `year - dist`; `signals()` lists everything audible from a point; `byId` finds a culture again. All tunables are `CIV` in `config.ts`.
- **In the game.** `takeNote('arrive' | 'sweep' | 'stay')` is the one place that reports on people: what became of those we knew, anyone new, and ruins once the system is swept. `meet`, `noticeRuin` and `finishRuin` do the rest. `scanTargets()` is the single list of things a deep scan can be pointed at (oddity hints and ruins). Crews take nothing from a living home world (`homes()`).
- **Saved**: `state.met` (cultures known, by id), `mem.seen` (who was here and in what phase, for telling the difference), `mem.sites` (ruins read), `ship.relics` as objects (what, whose, kind, year). Save version 2; older saves are refused and the page starts a new voyage with a line saying why.
- **Seeing them**: a line under the heading; `^` on a body in the system table; a `^` column on the charts for signals (the name column shrank to 14 to fit); the edge of a spreading culture's space on the maps. The page draws all of that in `--ok` green. Unread ruins within planet-resolving range (10 ly times optics) carry the same `!` as oddities, and `scope` says which it is. That flag was Claude's suggestion after the owner asked where the nearest ruins were; they did not clearly ask for it, so check that they want it.
- **Oddities**: the worked stone and the sea walls left the catalogue and are now ruins. The remaining made things are category `artefact`, all rarity 3, and carry `relic: { what, kind, chance }`.
- **The start**: `findStart` now wants an empty system with somebody alive and somebody's ruins within the first chart. The default seed starts at Ember 99.
- **Tools**: `npm run census` counts cultures, outposts and ruins in the starting cluster and the field. The bot counts who it meets; `--deaf` makes it ignore signals.

Numbers on the default seed (rerun the census after touching `CIV`):

- Field systems: about 1.05% are somebody's home, 0.3% carry an outpost, 0.7% are claimed, 1.5% have ruins.
- The starting cluster (117 systems): 5 to 12% inhabited and 7 to 11% with ruins, depending on the year. Four living cultures within 8 ly of the start and four ruins within 10.
- From a field system the nearest living culture is about 21 ly off (median) and the nearest ruin about 16.
- Spreading cultures: about 0.44 alive per coarse cell; they hold a median 12.5 ly, the largest near the start 55 ly.
- Turnover of a culture alive now: 95% still there after 50 years, 82% after 200, 65% after 500, 38% after 1,000, 1% after 3,000.
- The bot goes for everything the chart flags. It lands on somebody's home on a quarter to a third of jumps and on ruins on about 40%; ignoring signals (`--deaf`), 1% and 60%. Relics: 3 to 10 in 200 jumps, after halving the odds (`CIV.RELIC`) because flagged ruins can be hunted. A human will not chase every flag, so read these as upper limits.

Known rough edges, deliberately left:

- The inner disc is much busier with claimed space (about a tenth of systems inside 900 ly of the centre), because spreading cultures scale with star count. `REACH_PER` is the dial; scaling by something gentler than density is the other option.
- Survey finds are fixed for all time and know nothing about people, so a find about life can sit oddly on a world with cities.
- The end is a cliff: decline one year, ruins the next.
- On the map, signal green is close to the ship's teal.
- The tables are thin (two wordings per kind of place, a handful of bodies and habits). The owner said these get fleshed out later.
- A dim line on the first meeting says dealing with them comes in a later build. Remove it in step 2.

To ask the owner: is the starting cluster too busy or about right; does following signals make people too easy to find; are ruins common enough; is a 70-day scan right for a ruin; do the species sketches read well; are the green marks legible.

Notes for step 2: terms attach where `meet` and `homes()` are. The emergency exit is the Mind taking the conn at 10% hull; keep it as one function that takes a cutoff, because the owner wants a smarter rule later: the nearest empty system is known, so the cutoff can be put where the drift that follows is painful but not catastrophic.

### Later slices, ideas held

- **Ships** as seeded itineraries (stops and dates) so the same ship can be met again; they are time-dilated too, so they are the only recurring characters across millennia. An invitation is a place and a date window.
- **Alerts** seeded per era with a good bearing and a rough distance. **Pin on commitment**: an event gets a concrete system only when the player plots toward it, and only then is it written to the save. This was the owner's idea.
- **Marks**: stored with an expiry, affecting only their own system.
- **Lodestars**: a fixed handful, kept by travellers for travellers: refits, archives, festival grounds.

## Rules that keep the world stable

- Integer hashing only. One substream per purpose. Append to `K`, never renumber.
- Nothing derived is stored. The save holds what the player did; the galaxy is rebuilt from the seed.
- A save is `State` with `v: SAVE_VERSION` (now 2). Adding a field needs a default on load. Changing what a field means needs a version bump, which throws old voyages away; the owner has said that is fine during testing.
- History is never stepped. Who is home is a function of (seed, system, year); keep it that way, so a save never has to hold a simulation.
- Adding an entry to `FEATURES` changes what the dice pick, so surveyed systems can change. Acceptable now; say so when it happens. The same goes for the tables in `cultures.ts`: a new entry renames or redescribes cultures already met.
- Fixed-width output stays within 42 columns (there is a test).

## How to work here

- `npm run check`, `npm test`, `npm run build`, `npm run bot`. Node runs `.ts` directly.
- **Build before committing page changes.** Pages serves `docs/index.html`, which is generated.
- The page's text size is one line, `font-size: clamp(11px, 3.1vw, 14px)` on `body` in `src/web/page.html`: smallest, how it scales with screen width, largest. The owner asked for it a little smaller than first set (it was 12.5 to 15). The command box stays at 16px so phones do not zoom in when it is tapped.
- Publish a dev build by republishing `dist/artifact.html` to the dev Artifact.
- One branch per piece of work, a pull request to `main`, and the owner merges. Squash when the branch history is messy, merge commit when it is clean. After a squash, start the next branch from `main`.
- **These sessions cannot push tags** (403). The owner creates them from GitHub's release page. Next is `v0.2.0`.
- Do not force-push. A built-in safety check refuses `rm` with a glob after a `cd`; write to fresh paths instead.
- The cloud environment `ClaudeSpaceFiction` allows `huggingface.co` and `us.aws.cdn.hf.co`, for the narration voice.

## Media: concept art and the video renderer

Everything that is about the game rather than part of it lives in `media/`; `media/README.md` shows and explains it.

### The two-screen phone concept (`media/concepts/`)

The owner is thinking ahead to a more visual app, on a phone that folds open into one wide screen. Three passes of concept art were made on a private design canvas (an Artifact named "Lightspeed on the Duo"; find it in the artifact list). The third pass is the one the owner called right, bar small tweaks, and its three boards are saved as images. Nothing of it is built, and none of it should leak into the text prototype unasked. What the owner settled:

- **Opened, it is one screen.** The star chart runs across the whole device. Whatever else is shown sits on top of the map, so there is no separate picture for the system.
- **One bubble** of glass over the right half holds everything that is not the map: the system's name, the clock, the tab's content, the tabs.
- **Three tabs**: Command (the terminal and log as they are today), Ship (condition, hold, refits), Ops (the system as a row of bodies, crews, work on offer, staying). Along the bottom of the bubble when open; down its right edge when the phone is folded.
- **Only Command takes typed input.** Ops and Ship are buttons.
- **Tapping a star** draws the course on the map and switches to Command, where the tap appears in the log as a `plot` with its output, and the burns are offered as buttons.
- **The chart moves by hand** (pinch and drag): no zoom buttons and no information pane on the map.
- **One clock**, in the bubble's top corner; tap to switch between aboard and outside.
- **Glass over pixels**: the world stays chunky; controls are smooth glass that shows what is behind it at double pixel size instead of blurring it.

How the images were made, in case more are wanted: the map was drawn from the real galaxy (default seed, the system Alder RN-989 inside the Neithi Expanse) by a throwaway script, the boards were written as HTML on the canvas, and the same HTML was rendered to PNG with Playwright. The scripts were not kept; the canvas has the boards. The ring for how far a hard burn reaches is invented, and would be a good small feature for the real chart.

### The video renderer (`media/video/`)

Makes narrated walkthroughs. Five tutorial chapters were made for the owner and then removed from the repo (recoverable from pull request #2). The chosen narrator is `am_michael`. A fresh container needs the fonts, `kokoro-onnx`, and the two model files again.
