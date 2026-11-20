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
- **Gas sets the speed.** In gas of density n the ship cruises at gamma = sqrt(1 + P / n), where P grows with engine thrust and hull grade. Thin gas is fast; clouds are walls for a young ship.
- **Refits.** Knowledge in the Archive unlocks them; materials and crew time pay for them.
- **The Mind.** A written voice with its own tastes, a dissent it logs and later checks, and a habit of noticing how you leave places.

Not here yet: civilisations and ruins tied to them, other ships and their invitations, the permanent waypoint systems, marks the navigator leaves behind, and transients.

## How it is built

TypeScript, no framework, no runtime dependencies. The game core never touches the page, so the same code runs in the browser, in a terminal and under the bot.

| File | What it holds |
|---|---|
| `src/core/config.ts` | Every tunable number: galaxy size, drive physics, work rates, refit costs |
| `src/core/rng.ts` | Integer hashing; one substream per purpose |
| `src/core/galaxy.ts` | Where systems are and how thick the gas is, generated per cell on demand |
| `src/core/system.ts` | Stars, bodies and what a survey finds, as a pure function of seed and id |
| `src/core/features.ts` | The catalogue of finds, with their text |
| `src/core/travel.ts` | Trip planning: both clocks, fuel and shield |
| `src/core/mind.ts` | The Mind's lines and how one is chosen |
| `src/core/state.ts` | What gets saved |
| `src/core/game.ts` | The commands |
| `src/web/` | The page |
| `tools/` | Build script, terminal player, and the bot |

Nothing about the galaxy is stored. A save holds the ship, the clocks and what the navigator has seen; everything else is regenerated from the seed. The demo galaxy is a 6,000 light-year disc of three million systems; `radius` and `totalSystems` in `config.ts` are the only numbers to change to make it larger.

## Working on it

```
npm run check    # typecheck
npm test         # determinism, calibration, physics, saves, layout width
npm run build    # writes docs/index.html
npm run bot      # a bot flies 150 jumps and reports pacing and repeated lines
node tools/bot.ts --jumps 500 --seed 7 --transcript > flight.txt
```

`docs/index.html` is generated; edit `src/` and rebuild.
