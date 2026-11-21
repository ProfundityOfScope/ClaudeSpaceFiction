/**
 * The shape of a film script.
 *
 * A film is a list of scenes. A scene is a picture plus the sentences
 * spoken over it. Each sentence can move the picture on one "step": things
 * on screen carry a step number and appear when the narration reaches it.
 */

/** One spoken sentence. `say` overrides how the voice pronounces it. */
export interface Line {
  text: string;
  say?: string;
  /** The step this sentence triggers. Defaults to its position in the scene. */
  step?: number;
}

export interface Box {
  label: string;
  sub?: string;
  step: number;
}

interface Base {
  lines: Line[];
}

export interface TitleScene extends Base {
  kind: 'title';
  kicker: string;
  title: string;
  sub: string;
}

/** A few large statements. */
export interface BigScene extends Base {
  kind: 'big';
  items: { text: string; step: number; tone?: 'ink' | 'mind' | 'code' | 'dim' }[];
}

/** A list of files or folders with a note beside each. */
export interface TreeScene extends Base {
  kind: 'tree';
  heading?: string;
  rows: { text: string; note: string; step: number }[];
}

/** Two halves and the one-way arrow between them. */
export interface SplitScene extends Base {
  kind: 'split';
  left: Box;
  right: Box;
  arrow: { text: string; step: number };
  rule: { text: string; step: number };
}

/** Several callers of one thing. */
export interface FanScene extends Base {
  kind: 'fan';
  callers: Box[];
  target: Box;
}

/**
 * Real code from the repository. Either `from` (text on the first line) with
 * a `count` of lines, or `pick` (text identifying each line wanted, in order).
 * The renderer fills in `code`; a line that cannot be found is an error, so
 * a film cannot quietly drift away from the source.
 */
export interface CodeScene extends Base {
  kind: 'code';
  file: string;
  from?: string;
  count?: number;
  pick?: string[];
  /** Lines to light up at a step, found by the text they contain. */
  hl?: { step: number; match: string }[];
  /** A second, hand-written block for comparison. */
  aside?: { label: string; code: string[]; step: number };
  code?: string[];
}

/** A pipeline, top to bottom. */
export interface FlowScene extends Base {
  kind: 'flow';
  nodes: Box[];
}

/** The game's input line, with a command being typed. */
export interface TypeScene extends Base {
  kind: 'type';
  typed: string;
  step: number;
  chips: string[];
}

/** Real output from the game for these commands; the renderer fills in `outs`. */
export interface ConsoleScene extends Base {
  kind: 'console';
  commands: string[];
  /** If set, keep only output lines matching this pattern. */
  match?: string;
  outs?: { k: string; s: string }[];
}

/** Two columns of short entries: a command and what it does, or a term and its counterpart. */
export interface CmdScene extends Base {
  kind: 'cmds';
  /** Set when the right-hand column is code too. */
  codeNotes?: boolean;
  rows: { cmd: string; note: string; step: number }[];
}

export type Scene =
  | TitleScene | BigScene | TreeScene | SplitScene | FanScene | CodeScene | FlowScene | TypeScene | ConsoleScene | CmdScene;

export interface Film {
  /** Shown at the top left of every frame: the name of the series or project. */
  series: string;
  /** Shown at the top right. */
  title: string;
  scenes: Scene[];
}

/** Timing added once the narration has been recorded and measured. */
export interface Timing {
  start: number;
  end: number;
  lineStart: number[];
  lineEnd: number[];
}

export type TimedScene = Scene & Timing;

export interface TimedFilm {
  series: string;
  title: string;
  total: number;
  scenes: TimedScene[];
}
