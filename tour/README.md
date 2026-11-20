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
node tour/render.ts 1 --voice bm_george    # the same, in another voice
node tour/render.ts 1 --times              # also print when each scene starts
node tour/render.ts 1 --stills 5,40,90     # write still frames at those seconds instead
```

Needs `ffmpeg`, the IBM Plex fonts (Ubuntu package `fonts-ibm-plex`), Playwright with Chromium, and a voice. Output goes to `dist/`, which is not committed.

## The voice

The narrator is [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), a small open-source neural voice that runs on an ordinary processor. `render.ts` hands every sentence to `speak.py`, which loads the model once and writes one sound file per sentence. Files are cached by voice and text, so a second render only speaks what changed.

Set-up, once per machine:

```
pip install kokoro-onnx soundfile
mkdir -p ~/.cache/kokoro && cd ~/.cache/kokoro
curl -LO https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/kokoro-v1.0.onnx
curl -LO https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/voices-v1.0.bin
```

Voice names starting with `a` are American and `b` British; the second letter is `f` or `m`. `af_heart` is the default.

`--voice pico` uses SVOX Pico instead (Ubuntu package `libttspico-utils`). It needs no model download and sounds much more mechanical.

The pictures do not depend on the voice. Scenes are timed from the length of the recorded sentences, so a different voice, or a different speaking speed, just produces a film of a different length.
