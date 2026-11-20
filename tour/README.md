# The tour

Short narrated videos that explain this repository, written for someone fluent in scientific Python and new to TypeScript and web builds.

## Chapters

1. **The shape of it.** What each folder is for, and one command followed from the input box through the game and back as text. *(made)*
2. **TypeScript for a Python person.** Taught from this code: interfaces as dataclasses, union types, modules, why there is a build step, how it runs.
3. **Worlds from a number.** Less about placing stars, more about what hangs off them: how a system's contents, its survey order and its finds come from a seed and an address; how events nearby, and events later in time, can be asked for the same way; and how the planned layers (civilisations, other ships, things the navigator leaves behind) will sit on the same idea. The useful part is the implementation and how it continues, not the astrophysics.
4. **Changing things.** Tune a number, add a find to the catalogue, add a line for the Mind, then test, build, merge, tag.
5. **Why it is built this way.** The design choices: staying pays, retired lines, a bot that flies before a person does, and what was cut.

## How a chapter is made

A chapter is data: a list of scenes, each a picture plus the sentences spoken over it (`chapter1.ts`, shapes in `types.ts`). From that one script:

- `snippets.ts` pulls quoted code out of the real source files by search text, and fails if the code has gone. The tour cannot quietly drift from the source.
- `render.ts` speaks each sentence to a sound file, lays the sentences end to end to get the timing, asks a headless browser for every frame, and has ffmpeg join pictures and sound.
- `player.ts` draws a scene as a pure function of time, so frames can be requested in any order.

Captions and voice come from the same sentences, so they cannot fall out of step.

## Rendering

```
node tour/render.ts 1                      # writes dist/tour/chapter1.mp4
node tour/render.ts 1 --times              # also print when each scene starts
node tour/render.ts 1 --stills 5,40,90     # write still frames at those seconds instead
```

Needs `pico2wave` (Ubuntu package `libttspico-utils`), `ffmpeg`, the IBM Plex fonts (`fonts-ibm-plex`) and Playwright with Chromium. Output goes to `dist/`, which is not committed.

The voice is SVOX Pico, an older offline synthesiser. It was chosen because it installs without downloading a model. Sentences are cached by their text, so swapping in a better voice means changing one function, `speak`, in `render.ts`; the pictures re-time themselves to whatever the new voice produces.
