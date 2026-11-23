# Roadmap and working notes

Written by Claude, for Claude. This is the memory that survives a lost context: read it first, keep it current, and change it in the same commit as the work it describes. The README is for people; this is the rest.

## What this is

A text prototype of the game Lightspeed: a forever cruise on a relativistic worldship. The player is the navigator, the human who makes the big calls alongside the ship's Mind. The prototype exists to find out what is fun before anything is drawn. The owner's premise: if it is not fun as text, nothing added later will save it.

## Where things stand

- `main` = slice 1, onboarding and tuning, the charts, slice 2 step 1 (other people, ruins, relics), the media folder, materials, the first round of the scale test, and arriving as a sentence from the Mind with no separate sweep. `v0.1.0` tags slice 1 (commit 8461d87). Suggested to the owner: tag `main` `v0.1.1` if they want a marker, and keep `v0.2.0` for when contact and trade are in.
- Public page: GitHub Pages serves `main` / `docs/`. Dev preview: a private Artifact named "Lightspeed", republished from `dist/artifact.html` (find it in the artifact list; pass its URL to update it in place).
- Current branch of work: `claude/target-game`, which so far holds only the notes under "Where this is going". Next to build, unless the owner redirects: slice 2 step 2 (contact), then step 3 (trade).
- Not yet heard: how the onboarding, the economy burn, the three charts and the reach line played. Ask.

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
- **The scale test.** Ask of every mechanic, built or planned: "does this scale to 100 billion stars, 10000 trips, and 1 Gyr of time?" Not literally: the point is the endgame player who never stops. See "The scale test" below.
- **Refits should keep going.** More tiers and a flatter curve, so that one can keep improving for a lot longer. Also offered: tiers that mix stats, or a late game that is about choosing between different kinds of engine (and so on) more than about climbing one ladder.
- **The Mind's repetition is solved by volume.** A very large amount of written text, added over time. No cleverer mechanism is wanted.

Working with the owner: fluent in scientific Python, new to TypeScript and web builds. Wants things physically motivated, easy to follow and concisely documented. Prefers short summaries and being told what to look for when testing. Often plays on a phone, so check phone width.

Reactions to slice 1 so far: finding the worked stone at Ember 61 was the high point; the Mind's remarks landed well; working out the commands took a minute.

## Where this is going: the phone game

The owner's description of the target, given once the text version had become fun to play. The text prototype stays the place where rules are tried; this is what they are being tried for.

- **A visual phone game, away from the terminal entirely.** The Duo concept in `media/` is the first sketch of how it looks.
- **Idle and incremental, in real time.** There will be no `stay 30`: the player actually waits.
- **So the navigator needs things to do** while parked and while under way. That is the gap to design for.
- **What we have is the bones** of the loop where the ship deals with the world, and the roadmap holds the premises for much of the rest.

Three features the owner named, with what inspired each:

1. **Moving the ship within a system**: nearer to a mining site; to a station for a meeting or faster repairs; out of the path of a coronal mass ejection; sometimes to investigate an anomaly. (Ixion.)
2. **Cryo for the navigator, at some cost**: time passes faster while parked, and micromanagement is given up for the duration. It also makes trips subjectively shorter. (House of Suns.)
3. **Managing the ship itself, small and large**: in the manner of FTL and Barotrauma but on a bigger scale; Space Haven for the look; the population handled more like a city in Cities: Skylines, complicated by its being a giant spaceship.

What the owner has decided since:

- **The player is the navigator.** Things happen in real time from the player's point of view, and that includes while the app is closed: time runs on under the Mind's standing orders.
- **Cryo costs absence**, and nothing else. No mortal navigator, no succession: that idea is dropped, because the player is the navigator.
- **Order of work**: contact, then trade, then anything else vital, then real time, tried in the text version first.
- **A well-built native iOS app, Apple only, for good.** Not a website in a wrapper: the owner finds those limit the design. Swift throughout, SwiftUI for the interface, Metal for the pixel views. See "The native app".
- **The ship view** as the owner pictures it: like Cities: Skylines or Ixion. Sectors are swapped in and out, people move about as tiny dots, things can be tapped, and refits show. So it is driven by the game's state, not hand-animated.
- **The ship's shape, from the owner's own sketch**: a central spine, with districts arranged round it and along it. The player sees one slice through the axis at a time and turns to the next with buttons, with perhaps four to six slice angles in all. The body the ship is parked at lies below it, and the star may be in the background. The style: pixel art, 2.5D, isometric.
- A schematic of that was made for the owner to react to: a private Artifact named "Spine and Slices" (https://claude.ai/artifact/PdZb9FH3UHpGHwkq382oE8; source in the session's scratchpad only, so rebuild it from this description if it is ever needed again). The owner called it "legitimately really cool". It took three versions to get right, and the third is the one to build from:
  - **The model (from the first version, which the owner asked to go back to).** The spine has faces (four, six or eight). Districts are boxes that stand on a face and stack outward in tiers, each built on the one beneath and a little narrower. A district is placed by station (along the spine), face (round it) and tier (outward).
  - **The view (from the second).** The ship is cut along a plane through the axis, and that plane is seen as the ground of an ordinary isometric picture: from 30 degrees above it, the spine running up to the right, the pixel-art 2:1 slope. The two faces lying in the plane spread out to the left and right of the spine. The plane itself is not drawn.
  - **What is shown.** Faces in the plane and beneath it are drawn solid, the ones beneath naturally hidden in part by those above them. Faces above the plane are simply gone; during a turn a face fades out as it rises through the plane and fades in as it comes down into it.
  - **The end-on key** is the first version's: wedges round the spine in three rings, a dashed line for the cut, the removed half hatched.
  - **Tried and dropped:** standing the districts on the cut plane as if it were a deck (the second version: not what was meant), and ghosting the faces not in view at 90% transparent (the owner asked for it, then found it did not look as good as hoped).
  - A choice made without asking: the districts lying in the plane are drawn whole, not sliced in half at it.
  - Still not confirmed by the owner: whether four to six counts faces (as built: six faces, so three distinct cuts, each seen from both sides) or cuts.

### The native app

Agreed with the owner:

- **Swift for the rules, SwiftUI for every panel, Metal for the three pixel views** (galaxy, system, ship). Not Godot: the game is mostly interface over a simulation, the glass look is the system's own material in SwiftUI, and an idle game lives on what native code reaches easily (local notifications as the Mind waking the navigator, a widget, a Live Activity for a burn). Not SpriteKit either: the owner will not build on something Apple has left untouched for so long, and the ship view as described needs little that SpriteKit would have given.
- **Real time is tried in the text version first**, after trade.

How to build it, as proposed (details open until the work starts):

- **The renderer stays small and is ours.** One pipeline that draws instanced, textured quads from a sprite atlas with hard pixels at whole-number scales: sectors, bodies, shuttles and the dots are all that. One full-screen pass for pictures generated from data (the gas, the star field) and for the glass that shows the map beneath it at twice the pixel size. Nothing else until something needs it.
- **Draw on demand.** The view redraws when the state changes, and at a low rate while dots are moving. An idle game should not cost battery to look at.
- **Tapping is worked out from the layout**, on the processor: sectors are rectangles and the game knows where they are.
- **The dots are not simulated.** Where people are is a function of the sector's state, the seed and the time, like everything else about the world, so they cost nothing in the save and nothing while the app is closed.
- **Decide the pixel grid early** (how many screen points to one art pixel, and the palette), because every piece of art depends on it.
- **The rules move to Swift** (a widget has to be able to compute the ship's state without the app). Port them faithfully first, checked against transcripts recorded from the TypeScript version on several seeds; then do galaxy version 2 in Swift, where 64-bit integers are native. The port throws saves away once, and so does version 2: do them together.
- **Keep the rules a plain Swift package** with no Apple frameworks in it, so that its tests, the bot and the census can still run in a cloud session on Linux.
- **Metal cannot be compiled or run in a cloud session.** The app and its shaders need Xcode on the owner's Mac: either the owner builds and reports, or the Mac is attached to the session so that builds and simulator screenshots can be made from here. Plan for that before the first rendering work.
- **Before any of that**, in TypeScript, where trying things is cheapest: split rules from prose in `game.ts` (typed actions in, typed events out, the text log as one reader of them), and replace `stay` by a clock that jumps from event to event, so that weeks away cost one calculation. That split is the blueprint for the port.
- Order of drawing, when it comes: the text game running natively with notifications; then the system map; then the ship; then the galaxy.
- Offered, not taken up yet: a small early spike on the owner's Mac (the existing galaxy map and the glass-over-pixels effect in a bare Metal view inside SwiftUI) to have the look in hand long before the port.

## The slice plan

1. **Sweep, scan, jump.** Done. Refits were pulled forward into it. (The sweep has since been folded into arriving: see "Onboarding and tuning".)
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

- **Views.** `system` is the system table plus what each crew is doing, with `c1` under the body crew 1 is working. `ops` is the work on offer. `ship` includes the refit table; `refits` is another word for it. These merges came out of the phone concept, where three panes covered what five commands did.
- **Onboarding.** `guide` in the save is the step of a first-visit walkthrough; the lines are `GUIDE` in `mind.ts` and the logic is `Game.guide`. It reacts to what has happened, so steps taken out of order are skipped, and it ends at the first arrival. Saves without the field are never walked through. Also: a fixed closing set of buttons (system, ops, chart, ship, ask), and "did you mean" on near misses.
- **No separate sweep** (the owner's call, after the materials work). The reasoning: the ship would have looked the system over during the weeks of braking, so asking for a sweep on arrival was a step with no decision in it. `approach()` does what the sweep did for the books (the star's Archive credit); ruins and people are reported on arriving. `Memory.swept` and `visit.starShown` are gone: a remembered system is a swept one. The survey is unchanged: it still needs crews, closeness and time, and it is the only way to learn what a body is worth.
- **Arriving is a sentence, not a table** (the owner's call, a day later: the first version printed the whole table on arrival and it was an info dump). The Mind sums the system up from what it saw on the way in: "Standard low-metallicity orange dwarf, one rock, one lovely gas giant system, a comet halo." The owner's wording was the model. `sketchSystem` in `mind.ts` builds it from the system: an opener for the commonest stars, a metallicity word, the star and any companion, then the bodies grouped by kind in the order they are met going outward, then "no giants" or "nothing in orbit" where true, and "something I cannot place" for an unresolved anomaly. The same place always gets the same sentence. The word lists (`PLAIN`, `FINE`, `ROCKS`) are the place to add variety.
- **One breath on arriving.** The sentence is the whole of what the Mind says about a new place, with at most one thing joined to it: before it, a word on arriving (`arrive`) or on being back (`revisit`); or after it, what stands out (`firstSight`: an anomaly, an empty system, no giants, a rich one), in which case the sentence leaves that out. When there are people the sentence stands alone and the remark about them follows as before. The once-only remark about a new kind of star is on top.
- **`system`** lays the place out: the table and what each crew is doing. `look`, `sweep`, `map`, `sys` and `l` are other words for it. It is the first button after an arrival, and the one command a new voyage asks for: the walkthrough's first step is `system`, which also fixes the play-test finding that the table was hard to find again.
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

### Materials (ISRU): what the owner decided, and the design

The owner chose the middle of three sizes offered ("places matter"), with these calls:

- **Five materials**, not six: silicates are folded into metals.
- **Seams thin out**, but not fast: it is still a whole system. Enough to be some incentive to move on.
- **A living spacefaring culture has already thinned its own system's seams**, to various extents.
- **Hot work** wears the ship. Not common, but something to be aware of.
- Its own branch and pull request, before contact.

The five, and where they come from:

| Material | Short | Comes from | Wanted for |
|---|---|---|---|
| Volatiles | vol | comets, ice worlds, dwarfs: beyond the snow line | crews refit; trade |
| Metals | met | belts, rocky and scorched worlds; richer where [Fe/H] is high | repairs, hold, tanks, hull |
| Carbon | car | carbon-rich belts, comets, dwarfs, ice giant interiors, red giant winds | later hull; optics |
| Isotopes | iso | giants, ice giants best | engine; tanks |
| Heavy elements | hvy | debris round pulsars, magnetars, black holes; a trickle round white dwarfs | top engine and optics levels |

Rules of the design:

- **One hold, shared.** What to carry is a choice. `dump` throws stock overboard.
- **`scoop` and `ice` stay as they are** (fuel and shield are the ship's own consumables). `mine N` fills the hold from a body's seams; `mine N car` picks a material.
- **The survey reveals seams.** A body must be charted before it can be mined.
- **Thinning**: a seam's rate falls with the amount taken, toward a floor, and what was taken is remembered per system in the save. A culture present in the system counts as having taken some already.
- **The body matters**: free fall (belts, comets) is quick, deep gravity wells are slow.
- **Hot work**: a few bodies (very close-in rock and giants, anything round a pulsar, magnetar or black hole) cost hull or shield for each day worked.
- **Refits have recipes**: early levels need the common materials, later ones carbon and isotopes, the top ones heavy elements, so the far chart becomes a ladder.
- Offered and liked, not yet built: very rare survey finds that boost a rate for a while (the owner's own idea from play-test 1).
- Left for later: processing steps and equipment refits (the biggest of the three sizes); carrying volatiles to patch the shield in flight.

### Materials, as built

- **Where it lives.** `MATERIALS`, `MATERIAL` (short names), `ISRU` (every rate) and the refit `RECIPES` are in `config.ts`. Seams are part of a system: `Body.seams` and `Body.hot`, made in `seamsFor` and `hotFor` in `system.ts` on their own stream (`K.SEAM`), so the bodies themselves did not change. Bodies no longer have `ore`.
- **A seam's rate** is `GRADE[grade] * WELL[kind of body] * (FLOOR + (1 - FLOOR) * exp(-taken / size))`. `taken` is what we have mined (`mem.taken["body:material"]`, saved, and counting for half as much after each `ISRU.RECOVER` = a million years: see "The scale test") plus what the people of the system have had (`workedByOthers`: by phase, halved for an outpost, between a fifth and all of that by a hash per seam). Ruins count as their makers did at the end; once the ruins are gone the seams are fresh again, which is not physics but matches everything else about cultures leaving no permanent mark.
- **Commands.** `mine N` takes the richest seam; `mine N car` a named one (name, any prefix, or the short form); `mine N car 45` or `mine N 45` stops after that many units. `dump X [n]`. A body must be charted first; the star's own seam (red giant wind, a black hole's disc, pulsar debris) needs no survey. `ops` lists every open seam with its rate, and `thin` or `hot`.
- **The table** shows what fits in 13 columns, rarest first; `ore?` until the body is charted.
- **What crews are pointed at** (`suggestions`, which also drives the buttons and the bot): one refit at a time (`refitAim`: of those the Archive allows, the one this system can best supply and the hold is nearest to affording), plus metal to mend the hull. Each suggestion carries an amount. Without this the hold filled with stock for every refit at once and none could be paid for; the bot found that.
- **Repairs** cost 1 metal per percent (was 1.5 of the old single material). With no metal at all the Wrights patch from scrap, slowly, up to 30%: that is what stops a wrecked ship being stranded where there is no metal.
- **Hot work**: `HEAT` 0.06% of hull or `RADIATION` 0.15% of shield per crew-day. The Mind warns once a visit and recalls the crew at 45% hull.
- **Saves are version 3**, stored leanly (see "The scale test").

Numbers on the default seed:

- Share of field systems with each material (any seam / grade 2 or better): volatiles 79% / 61%, metals 94% / 57%, carbon 42% / 12%, isotopes 37% / 16%, heavy 1.2% / 0.03%. Hot work somewhere in 11% of systems, and the only source of something in 2.6%.
- From the start: carbon and isotopes are in the start system and next door; the nearest heavy elements are 15 ly off at a white dwarf; nothing of grade 2 within 120 ly. The top refit levels really do need a long trip.
- Bot, 150 jumps on three seeds: no dead ends; hull healthy; tanks, optics, crews and hold reach their top level, engine 4 to 8 and hull 6 to 7, held back by heavy elements and carbon. First refit at the second system. A person plays far fewer jumps, so this is a ceiling, not a pace.

Rough edges, left on purpose:

- A culture's home world cannot be mined at all (as before), and its other seams are only thinned. Contact will decide what working in somebody's system costs.
- Survey finds do not know about seams (a "nickel-iron body" find does not make a belt richer).
- Thinning is hard to feel at the bot's pace: seams are sized so that a hold or two barely dents them. The dial is `ISRU.SIZE`.
- The start system happens to have four of the five materials. Nothing guarantees that on other seeds.

### Contact (slice 2 step 2): defaults the owner has agreed

Build after materials. Terms on arrival by temperament (welcoming: free; proud: a toll; wary: a limited stay; reclusive: look but take nothing; hostile: leave). Comply or ignore; ignoring escalates. Agreed defaults: a toll is paid in materials the culture lacks; about ten days of warning, then a few percent of hull a day, so the Mind takes the conn after roughly a month; claimed space with nobody in it has no terms. The Mind's exit is at 10% hull, written as one function with a cutoff so a smarter rule can replace it.

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
- **In the game.** `takeNote('arrive' | 'stay')` is the one place that reports on people: what became of those we knew, anyone new, and ruins. `meet`, `noticeRuin` and `finishRuin` do the rest. `scanTargets()` is the single list of things a deep scan can be pointed at (oddity hints and ruins). Crews take nothing from a living home world (`homes()`).
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

Each of these has to pass the scale test before it is built; what that asks is under "What the plan has to respect" below.

## The scale test

The owner's standing question for every mechanic: **"does this scale to 100 billion stars, 10000 trips, and 1 Gyr of time?"** It is not meant literally. It is a habit: picture the player who never stops, and check that the save, the charts and the fiction all still hold. The first full pass over the game was done while materials were in review, and this section is its result.

### How each axis stands

| Axis | Holds? | What sets the limit |
|---|---|---|
| 10,000 trips | Yes | The save: about 30 bytes for a system only passed through, 74 in a stress run that surveys and mines every stop (it was 165). 10,000 systems is well under 1 MB, written in a few milliseconds. The browser allows about 5 MB, so roughly 50,000 systems before something more is needed. |
| 1 Gyr of time | For people, yes. For the sky, no. | History is never stepped, so any year costs the same to ask about, and long times print properly (`2.31 Gyr`). But stars, gas and clusters are the same at year one billion as at year zero. |
| 100 billion stars | No | The disc is flat. At that count, one scale length out, there are 42.6 systems per square light-year against the demo's 0.084: about 13,000 within 10 ly. Also 32-bit hashes and too few names. See "Galaxy version 2". |

### What was built for it (in the materials pull request)

- **Seams recover.** What was taken from a seam counts for half as much after each `ISRU.RECOVER` (a million years), on the reasoning that impacts and collisions keep turning fresh material up. `mem.taken` is the amount as it stood at `mem.last`; `recovery(mem)` in `game.ts` gives the share that still counts. On arriving at a known system the decay is settled into the stored amounts before the visit is restamped, and anything under one unit is dropped.
- **Peoples of whom nothing is left are forgotten.** Each entry in `state.met` carries `until`, the year by which even their ruins will be gone (`born + life + CIV.RUIN_MAX`). The list is capped at `MEMORY.PEOPLES` (300): past that, the longest-vanished are dropped. Nobody is dropped while anything of theirs still stands. `stats.peoples` counts everyone ever known, and that is what `finds` reports.
- **Their name outlives the list.** A living culture noted in a system has its title stored in that system's note (`SiteNote.title`), so "Nothing is left of the Qumaix" can still be said after they have left `met`.
- **The chart no longer walks the dead.** `heldPoints` skips anyone past `until` without looking them up, and skips a culture that the light now arriving shows to have ended, before asking the galaxy for its systems.
- **A leaner save.** `packState` and `unpackState` in `state.ts`: a remembered system stores only what differs from a fresh memory, and loading puts the rest back. Nothing is rounded there, so `load(save)` gives back the same state. Dates are rounded to a hundredth of a year when they are written (`stamp`).
- **A tidy pass** every `MEMORY.TIDY` (25) jumps, on arrival: recovered seams everywhere, the list of peoples, and the Mind's note of which stars it has asked to visit (the last 40 are kept).
- **Long times print.** `clock`, `span` and `spanWords` go up to billions of years without widening.

Honest limits of that work: at the bot's pace 10,000 jumps cover something like a hundred thousand to a million years, so seam recovery is about the fiction being right in deep time, not about bytes. The bytes come from the leaner format.

### Still open, small

- **Remembered systems are never forgotten.** Fine to about 50,000. Past that: forget plain systems (unnamed, nothing unread, not visited for a very long time), or move the save to IndexedDB. Do this when someone gets near, not before.
- **Relics pile up in the hold list** (a few per hundred jumps). Trade (slice 2 step 3) should give them somewhere to go; if it does not, cap the list.
- **The journal** keeps its last 300 lines, and the Mind's used-line lists reset per pool, so neither grows.

### Galaxy version 2 (one deliberate re-roll, later)

Three things stand between the demo and a full-size galaxy, and each of them changes every system in the sky when it is fixed. So they are to be done together, once, as "galaxy version 2", and not one at a time. Until then, do not make any change that re-rolls the sky for scale reasons alone.

- **Thickness.** The decision to take: a true third coordinate (charts become a slice or a projection, distances are 3D, the phone map needs a way to show depth), or keep the map flat and treat it as a thin slab through a thick disc, so that only a small share of the hundred billion are ever "in the plane". The slab is far cheaper and keeps every chart as it is; it is the one to try first. The owner has not chosen; ask when version 2 is scheduled.
- **64-bit identity.** A system's contents come from `strHash(id)`, which is 32 bits. With three million systems there are already about a thousand pairs somewhere in the sky that roll exactly the same dice; with a hundred billion every system would have about twenty such twins. Use two 32-bit words (or hash the cell coordinates directly) for systems, cultures and anything else drawn per system.
- **Names that scale.** Cluster and sector names are drawn from 145 nouns, which repeat long before a full galaxy is filled. Names need to be composed (syllables, or noun plus qualifier by region) so that nearby things never share one.
- **Worth doing in the same pass:** anything else that changes what the dice pick, such as new `FEATURES` entries held back for the purpose, and re-tuning densities for the new geometry (the census tool is the check).

Version 2 throws every voyage away. That is acceptable during testing; it is the reason to do it once.

### What the plan has to respect

- **Contact and trade (slice 2 steps 2 and 3).** Standing with a culture, debts, tolls paid, what they wanted: all of it belongs on the `met` entry and dies with it. Nothing about a culture may be stored anywhere that outlives `until`. Prices and wants should be a function of (culture, year), like everything else about them, with only the navigator's own dealings saved.
- **Ships (slice 3).** Seeded itineraries are right, but a ship cannot be seeded once for the whole galaxy and all time: seed them per region and per era, like the spreading cultures, so that a chart asks only the cells around it. Remember a ship only once met, with an end date.
- **Lodestars.** "A fixed handful" does not survive a hundred billion stars or a billion years. Make them a rule: about one per so many coarse cells, each lasting a long era and then succeeded by another. Permanent on the scale of a voyage, not of the galaxy.
- **Marks and alerts.** Already designed with an expiry and with pin-on-commitment. Keep it so; cap how many can be open at once.
- **Deep time (slice 4).** The sky has to age the way history does: a star's state as a function of (seed, system, epoch), never stepped. Long epochs (stars forming and dying, clusters dispersing) are what make a billion years look different from a thousand.
- **Refits** (the owner's steer). There are 38 upgrades in all (ten each for engine and hull, three to six on the other tracks), and the bot tops four of the six tracks within 150 jumps. Wanted: many more tiers on a flatter curve, so that improvement continues for thousands of jumps. Today each level multiplies its stat by about 1.6, materials cost `90 * 1.35^level` and the Archive needed grows by 1.7 a level; smaller steps and gentler growth in all three is the starting point. Then, past some level, sideways choices in place of more of the same: engine kinds with different trades (thrust against fuel, against gas tolerance, against wear), and tiers that mix two stats. A choice that can be re-made later fits "nothing lasts for ever" better than a ladder with a top. Design this with the owner before building; it touches `REFITS`, `RECIPES` and `refitCost` in `config.ts`.
- **The Mind** (the owner's steer). Lines are picked without repeats until a pool is used up, so variety is purely the size of the pools in `mind.ts`. Grow them steadily: every piece of work adds lines, and the pools the bot shows repeating most are the ones to feed first (`npm run bot` prints the most repeated sentences). Lines that take variables go further than fixed ones.

## Rules that keep the world stable

- Integer hashing only. One substream per purpose. Append to `K`, never renumber.
- Nothing derived is stored. The save holds what the player did; the galaxy is rebuilt from the seed.
- A save is `State` with `v: SAVE_VERSION` (now 3). Adding a field needs a default on load. Changing what a field means needs a version bump, which throws old voyages away; the owner has said that is fine during testing.
- History is never stepped. Who is home is a function of (seed, system, year); keep it that way, so a save never has to hold a simulation.
- Everything in the save is bounded or expires. Before adding a list or a record, say what caps it or when each entry lapses, and put the pruning in `tidy`.
- Changes that re-roll the sky for the sake of scale wait for galaxy version 2.
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
