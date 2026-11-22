# ClaudeSpaceFiction

A text prototype for **Lightspeed**: a forever cruise on a relativistic worldship. You are the navigator, woken by the ship's Mind when there is something to decide. Arrive, sweep the system, put crews to work, stay as long as it pays, pick the next star, burn.

The point of the prototype is to find out what is fun before anything is drawn.

## Play

`docs/index.html` is the whole game in one file. Open it in a browser, or serve the `docs/` folder with GitHub Pages. Type commands or tap the buttons; `help` lists everything. The voyage saves itself in the browser, and the menu can copy it out as text.

A link ending in `#seed-12345` (or `?seed=12345`) opens that galaxy, so two people can explore the same sky.

In a terminal:

```
npm install
npm run play                  # interactive
node tools/play.ts sweep ops  # run some commands and exit
```

## What is in this slice

- **The loop.** `sweep` a system, assign crews (`scoop` fuel from giants, cut `ice` for the forward shield, `mine` materials, `survey`, deep `scan` oddities, `repair`), let days pass with `stay`, then `chart`, `plot` and `burn`.
- **Two clocks.** Every trip costs time aboard and more time outside.
- **Gas sets the speed.** In gas of density n the ship cruises at gamma = sqrt(1 + P / n), where P grows with engine thrust and hull grade. Thin gas is fast; clouds are walls for a young ship. `chart far` shows where it lies.
- **Two ways to burn.** `burn` goes at full thrust. `burn eco` goes at a quarter: fuel use goes as thrust squared, so it is far cheaper, but it takes about twice as long and time under way wears the hull.
- **A guided first visit.** On a new voyage the Mind explains each step once, then stops.
- **Charts at three zooms.** `chart close` is the nearest stars. `chart` is what stands out in a view four times wider: signals, things worth a deep scan, bright stars. `chart far` is the bright stars to steer by, four times wider again. `plot` works on whichever was shown last. In the browser each draws a small blocky map: gas as a grey haze, a dotted box for the next zoom in, and a green-tinted shape for the space a culture holds. A terminal shows the same map in characters.
- **Refits.** Knowledge in the Archive unlocks them; materials and crew time pay for them.
- **The Mind.** A written voice with its own tastes, a dissent it logs and later checks, and a habit of noticing how you leave places.
- **Other people.** About one system in a hundred is somebody's home, more in the old cluster where the voyage starts. None of them are human. Each culture is born, rises, declines and ends; a few spread to hold the stars around them for a while. Their radio shows as `^` on the charts, as old as the light that carries it. Come back after a long haul and they may have changed, or be gone.
- **Ruins and relics.** A culture that has ended leaves ruins for a few thousand years, and then nothing. The chart flags unread ruins close by, a sweep picks them out, and a deep scan says whose they were and now and then brings something back for the hold.

Not here yet: dealing with the people you meet (terms, tolls, trade, and what happens when you ignore them), other ships and their invitations, the permanent waypoint systems, marks the navigator leaves behind, and transients.

## How it is built

TypeScript, no framework, no runtime dependencies. The game core never touches the page, so the same code runs in the browser, in a terminal and under the bot.

| File | What it holds |
|---|---|
| `src/core/config.ts` | Every tunable number: galaxy size, drive physics, work rates, refit costs |
| `src/core/rng.ts` | Integer hashing; one substream per purpose |
| `src/core/galaxy.ts` | Where systems are and how thick the gas is, generated per cell on demand |
| `src/core/system.ts` | Stars, bodies and what a survey finds, as a pure function of seed and id |
| `src/core/features.ts` | The catalogue of natural oddities, with their text |
| `src/core/civs.ts` | Who lives where and when: cultures, the space they hold, their ruins |
| `src/core/cultures.ts` | The tables a culture is invented from: names, bodies, habits, what they leave |
| `src/core/travel.ts` | Trip planning: both clocks, fuel and shield |
| `src/core/mind.ts` | The Mind's lines and how one is chosen |
| `src/core/state.ts` | What gets saved |
| `src/core/game.ts` | The commands |
| `src/web/` | The page |
| `tools/` | Build script, terminal player, the bot, and the census of who is out there |
| `video/` | A small renderer for narrated code-walkthrough videos |

Nothing about the galaxy is stored. A save holds the ship, the clocks and what the navigator has seen; everything else is regenerated from the seed. That includes history: who is home at a system in a given year is a function of the seed, the system and the year, so the galaxy can be asked about any date without ever being stepped through time. The demo galaxy is a 6,000 light-year disc of three million systems; `radius` and `totalSystems` in `config.ts` are the only numbers to change to make it larger.

## Working on it

```
npm run check    # typecheck
npm test         # determinism, calibration, physics, cultures, saves, layout width
npm run build    # writes docs/index.html
npm run bot      # a bot flies 150 jumps and reports pacing, repeated lines and who it met
node tools/bot.ts --jumps 500 --seed 7 --transcript > flight.txt
npm run census   # how many cultures, outposts and ruins there are, and how far apart
```

`docs/index.html` is generated; edit `src/` and rebuild.

## Videos

`video/` can turn a short script into a narrated video that quotes this repository's real code. It is there for making tutorials; see `video/README.md`.
