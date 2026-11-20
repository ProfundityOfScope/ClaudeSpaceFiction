# Narrated videos

A small renderer that turns a script into a narrated video, for tutorials about this repository. A film is mostly moving type: titles, file lists, diagrams, real code with lines lighting up as they are discussed, and real output from the game. Captions are on screen throughout.

```
node video/render.ts example                     # writes dist/video/example.mp4
node video/render.ts example --voice bm_george   # the same, in another voice
node video/render.ts example --times             # also print when each scene starts
node video/render.ts example --stills 5,12       # write still frames at those seconds instead
```

Output goes to `dist/`, which is not committed.

## Writing a film

A film is one file in `video/films/` that exports `film`. `films/example.ts` is a short working one to copy. The shapes are in `types.ts`.

A film is a list of **scenes**. A scene is a picture plus the sentences spoken over it. Each sentence is one caption and one sound file, so captions and voice cannot fall out of step.

Things on screen carry a **step** number and appear when the narration reaches it. By default the first sentence of a scene is step 0, the second step 1, and so on; a sentence can name its step to hold the picture still for longer.

| Kind | What it draws |
|---|---|
| `title` | A large title with a line above and below |
| `big` | A few large statements, revealed in turn |
| `tree` | A list of files or terms with a note beside each |
| `split` | Two halves and a one-way arrow between them |
| `fan` | Several callers pointing at one thing |
| `code` | Real code from the repository, with lines lit by step and an optional second block for comparison |
| `flow` | A pipeline, top to bottom |
| `type` | The game's input line with a command being typed |
| `console` | Real output from the game for given commands |
| `cmds` | Two columns of short entries |

A sentence can carry `say`, a spelling for the voice alone, when a word would be mispronounced. The caption keeps the real spelling. Words that come up everywhere are listed once in `SAY` at the top of `render.ts`.

## Quoting real code

A `code` scene names a file and either the text of its first line plus a count, or a list of texts each identifying one line. `snippets.ts` finds them when the film is rendered and fails if any has gone, and `test/video.test.ts` runs the same check on every film. A film cannot quietly drift away from the source it describes.

`console` scenes are real too: the game is run with the listed commands at render time.

## How a film is made

1. `snippets.ts` pulls the quoted code out of the source files.
2. `render.ts` speaks each sentence to a sound file and lays the sentences end to end. That gives the timing; nothing is timed by hand.
3. `player.ts` draws the film in a headless browser as a pure function of time, so frames can be asked for in any order.
4. `ffmpeg` joins the frames and the sound track.

Because scenes are timed from the recorded sentences, a different voice or speaking speed simply produces a film of a different length.

## Set-up

Needs `ffmpeg`, the IBM Plex fonts (Ubuntu package `fonts-ibm-plex`), Playwright with Chromium, and a voice.

The narrator is [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), a small open-source neural voice that runs on an ordinary processor. Once per machine:

```
pip install kokoro-onnx soundfile
mkdir -p ~/.cache/kokoro && cd ~/.cache/kokoro
curl -LO https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/kokoro-v1.0.onnx
curl -LO https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/voices-v1.0.bin
```

Voice names starting with `a` are American and `b` British; the second letter is `f` or `m`. `am_michael` is the default. Sound files are cached by voice and text, so a second render only speaks what changed.

`--voice pico` uses SVOX Pico instead (Ubuntu package `libttspico-utils`). It needs no model download and sounds much more mechanical.
