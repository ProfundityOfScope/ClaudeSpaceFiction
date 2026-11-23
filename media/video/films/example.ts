/**
 * A short example film that uses the main kinds of scene.
 * Copy it to start a new one.
 */
import type { Film } from '../types.ts';

export const film: Film = {
  series: 'Lightspeed',
  title: 'An example film',
  scenes: [
    {
      kind: 'title',
      kicker: 'AN EXAMPLE',
      title: 'One command',
      sub: 'from the input box to the screen',
      lines: [{ text: 'This short film follows one command through the game.' }],
    },
    {
      // Real code, found by the text it contains. `hl` lights a line when its step is spoken.
      kind: 'code',
      file: 'src/web/main.ts',
      from: 'function submit(line: string) {',
      count: 9,
      hl: [{ step: 1, match: 'print(game.exec(text));' }],
      aside: { label: 'in Python', code: ['print(game.exec(text))'], step: 2 },
      lines: [
        { text: 'The page hands your text to a function called submit.' },
        { text: 'This line gives it to the game and prints what comes back.' },
        { text: 'In Python it would read almost the same.' },
      ],
    },
    {
      kind: 'flow',
      nodes: [
        { label: 'your text', sub: 'one line', step: 0 },
        { label: 'game.exec', sub: 'finds the command and runs it', step: 1 },
        { label: 'a list of lines', sub: 'printed in order', step: 2 },
      ],
      lines: [
        { text: 'So the whole path is short.' },
        { text: 'The game finds the command and runs it.' },
        { text: 'And a list of lines comes back.' },
      ],
    },
    {
      // Real output: the game is run with these commands when the film is rendered.
      kind: 'console',
      commands: ['system'],
      match: 'orange dwarf|the star',
      lines: [{ text: 'This is what the game really printed, a moment ago.' }],
    },
  ],
};
