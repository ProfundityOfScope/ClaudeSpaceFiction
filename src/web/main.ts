/**
 * The web page: a thin shell around `Game`.
 *
 * It prints what the game returns, offers the suggested commands as buttons,
 * and keeps the voyage in this browser's storage (one slot per seed).
 */
import { Game, type MapData, type Out } from '../core/game.ts';
import { DEMO } from '../core/config.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const log = $('log');
const chips = $('chips');
const cmd = $<HTMLInputElement>('cmd');
const panel = $('panel');
const note = $('note');

let game: Game;
const history: string[] = [];
let historyAt = 0;

// ---- storage: may be missing or blocked, so every access is guarded ----

const slot = (seed: number) => `lightspeed.save.${seed}`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* no storage: the voyage lasts as long as the page */
  }
}

/** A seed can arrive as ?seed=123 or as #seed-123. */
function seedFromUrl(): number {
  const fromQuery = new URLSearchParams(location.search).get('seed');
  const fromHash = /^#seed-(\d+)$/.exec(location.hash)?.[1];
  const n = Number(fromQuery ?? fromHash ?? read('lightspeed.last') ?? DEMO.seed);
  return Number.isInteger(n) && n > 0 && n < 2 ** 31 ? n : DEMO.seed;
}

// ---- maps: a small blocky picture, drawn once, in the page's own colours ----

type Rgb = [number, number, number];

/** The digits 0 to 9 as blocks three wide and five tall, read row by row. */
const DIGITS = [
  '111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
  '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111',
];

/** One of the page's colour tokens, as numbers. */
function token(name: string): Rgb {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw)?.[1] ?? '808080';
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

const blend = (a: Rgb, b: Rgb, t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

/** Draw a map one cell to a pixel; the page scales it up without smoothing, which keeps it blocky. */
function drawMap(map: MapData): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = map.size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const bg = token('--bg');
  const ink = token('--ink');
  const tones = { warm: token('--alert'), gold: token('--good'), white: ink, cold: token('--mind') };
  const cells = (color: string, points: number[][]) => {
    ctx.fillStyle = color;
    for (const [x, y] of points) ctx.fillRect(x, y, 1, 1);
  };

  // Gas as haze: the thicker the gas, the stronger the haze.
  const haze = [0, 0.12, 0.27, 0.45, 0.68].map((t) => blend(bg, token('--dim'), t));
  for (let i = 0; i < map.gas.length; i++) cells(haze[Number(map.gas[i])], [[i % map.size, Math.floor(i / map.size)]]);

  // Space somebody holds: a thin ring, under the stars.
  const voice = token('--ok');
  for (const ring of map.rings ?? []) {
    const points: number[][] = [];
    const steps = Math.max(12, Math.round(8 * ring.r));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * 2 * Math.PI;
      points.push([Math.round(ring.x + ring.r * Math.cos(a)), Math.round(ring.y + ring.r * Math.sin(a))]);
    }
    cells(blend(bg, voice, 0.5), points);
  }

  // Stars: faint unnumbered ones first, so the numbered ones sit on top of them.
  const m = map.size / 2;
  type Box = [number, number, number, number];
  const taken: Box[] = [[m - 2, m - 2, m + 2, m + 2]];
  const numbered = map.stars.filter((star) => star.n).sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
  for (const star of [...map.stars.filter((star) => !star.n), ...numbered]) {
    const { x, y } = star;
    const color = star.signal && !star.n ? blend(bg, voice, 1) : blend(bg, tones[star.tone], star.n ? 1 : 0.55);
    cells(color, [[x, y]]);
    if (star.size >= 2) cells(color, [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]);
    if (star.size >= 3) cells(color, [[x + 2, y], [x - 2, y], [x, y + 2], [x, y - 2]]);
    if (star.visited) cells(blend(bg, ink, 0.55), [[x - 1, y + star.size + 1], [x, y + star.size + 1], [x + 1, y + star.size + 1]]);
    if (star.odd) cells(blend(bg, tones.warm, 1), [[x - 3, y - 2], [x - 3, y - 1], [x - 3, y], [x - 3, y + 2]]);
    // A signal: a small caret over the star, in the colour nothing else on the map uses.
    if (star.signal) {
      const top = y - star.size - 2;
      cells(blend(bg, voice, 1), [[x, top], [x - 1, top + 1], [x + 1, top + 1]]);
    }
    if (star.n) taken.push([x - star.size, y - star.size - (star.signal ? 3 : 0), x + star.size, y + star.size]);
  }

  // Numbers: beside each star, on whichever side is free.
  const clash = (box: Box) => taken.some((t) => box[0] <= t[2] && box[2] >= t[0] && box[1] <= t[3] && box[3] >= t[1]);
  for (const star of numbered) {
    const text = String(star.n);
    const width = text.length * 4 - 1;
    const gap = star.size + 1;
    // Tried in order: right, left, above, below, then the four corners.
    const spots = [
      [star.x + gap, star.y - 2],
      [star.x - gap - width + 1, star.y - 2],
      [star.x - Math.floor(width / 2), star.y - gap - 4],
      [star.x - Math.floor(width / 2), star.y + gap],
      [star.x + gap, star.y - gap - 4],
      [star.x + gap, star.y + gap],
      [star.x - gap - width + 1, star.y - gap - 4],
      [star.x - gap - width + 1, star.y + gap],
    ].map(([left, top]) => [Math.min(map.size - width - 1, Math.max(1, left)), Math.min(map.size - 6, Math.max(1, top))]);
    const [left, top] = spots.find(([l, t]) => !clash([l, t, l + width - 1, t + 4])) ?? spots[0];
    taken.push([left - 1, top - 1, left + width, top + 5]);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = blend(bg, bg, 0);
    ctx.fillRect(left - 1, top - 1, width + 2, 7);
    ctx.globalAlpha = 1;
    [...text].forEach((digit, d) => {
      const points: number[][] = [];
      [...DIGITS[Number(digit)]].forEach((on, i) => on === '1' && points.push([left + d * 4 + (i % 3), top + Math.floor(i / 3)]));
      cells(blend(bg, ink, 1), points);
    });
  }
  // The ship goes on last so nothing hides it: a hollow square in the middle.
  cells(blend(bg, bg, 0), [[m, m]]);
  cells(blend(bg, tones.cold, 1), [[m - 1, m - 1], [m, m - 1], [m + 1, m - 1], [m - 1, m], [m + 1, m], [m - 1, m + 1], [m, m + 1], [m + 1, m + 1]]);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Map of the sky around the ship');
  return canvas;
}

// ---- drawing ----

function print(items: Out[]) {
  let first: HTMLElement | null = null;
  for (const item of items) {
    let el: HTMLElement;
    const picture = item.k === 'map' && item.map ? drawMap(item.map) : null;
    if (picture && item.map) {
      el = document.createElement('figure');
      el.className = 'o map fresh';
      const caption = document.createElement('figcaption');
      const edge = item.map.radius < 10 ? item.map.radius.toFixed(1) : Math.round(item.map.radius);
      const voices = item.map.rings?.length || item.map.stars.some((star) => star.signal);
      caption.textContent = `edge at ${edge} ly · haze is gas, stronger is thicker · the hollow square is us${voices ? ' · green is somebody' : ''}`;
      el.append(picture, caption);
    } else {
      // No picture: fall back to the same map in characters.
      const block = item.k === 'pre' || item.k === 'map';
      el = document.createElement(block ? 'pre' : 'p');
      el.className = `o ${block ? 'pre' : item.k} fresh`;
      el.textContent = item.s;
    }
    log.appendChild(el);
    first ??= el;
  }
  while (log.childElementCount > 700) log.firstElementChild?.remove();
  if (!first) return;
  // Long output: put its first line at the top. Short output: stay at the bottom.
  const tall = log.scrollHeight - first.offsetTop > log.clientHeight;
  log.scrollTop = tall ? first.offsetTop - log.offsetTop - 4 : log.scrollHeight;
}

function gaugeEl(id: string, value: number) {
  const el = $(id);
  const bar = el.querySelector('i') as HTMLElement;
  bar.style.setProperty('--v', `${Math.max(0, Math.min(100, value))}%`);
  bar.style.setProperty('--c', value < 20 ? 'var(--crit)' : value < 45 ? 'var(--warn)' : 'var(--ok)');
  (el.querySelector('b') as HTMLElement).textContent = String(Math.round(value));
}

function refresh() {
  const s = game.status();
  $('where').textContent = s.system;
  $('clocks').textContent = `aboard ${s.aboard} · outside ${s.outside}`;
  $('stores').textContent = `hold ${Math.round(s.materials)}/${s.hold} · archive ${s.archive}`;
  gaugeEl('g-fuel', s.fuel);
  gaugeEl('g-shield', s.shield);
  gaugeEl('g-hull', s.hull);
  chips.replaceChildren(
    ...game.chips().map((text) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', () => submit(text));
      return b;
    }),
  );
  chips.scrollLeft = 0;
}

function submit(line: string) {
  const text = line.trim();
  if (!text) return;
  history.push(text);
  historyAt = history.length;
  print(game.exec(text));
  write(slot(game.state.seed), game.save());
  refresh();
}

function begin(seed: number, fresh = false) {
  log.replaceChildren();
  const saved = fresh ? null : read(slot(seed));
  let resumed = false;
  let outdated = false;
  if (saved) {
    try {
      game = Game.load(saved);
      resumed = true;
    } catch (error) {
      // An unreadable save: start over below, and say so if it was simply from an older version.
      outdated = String(error).includes('older version');
    }
  }
  if (resumed) {
    print([{ k: 'dim', s: 'Voyage resumed.' }, ...game.exec('look').slice(1)]);
  } else {
    game = Game.fresh(seed);
    const notice: Out[] = outdated ? [{ k: 'dim', s: 'The galaxy has changed since your last voyage was saved, so that one could not be resumed. This is a new one.' }] : [];
    print([...notice, ...game.intro()]);
    write(slot(seed), game.save());
  }
  write('lightspeed.last', String(seed));
  refresh();
}

// ---- the save menu ----

function openMenu(open: boolean) {
  panel.hidden = !open;
  log.hidden = open;
  note.textContent = '';
  if (!open) {
    log.scrollTop = log.scrollHeight;
    return;
  }
  const seed = game.state.seed;
  $('seedline').textContent = `Seed ${seed}. A link ending in #seed-${seed} opens this same galaxy for someone else.`;
  $<HTMLTextAreaElement>('savetext').value = game.save();
  $<HTMLInputElement>('newseed').value = String(Math.floor(Math.random() * 900000) + 100000);
  $('begin').textContent = 'Begin';
}

$('menu').addEventListener('click', () => openMenu(panel.hidden));
$('close').addEventListener('click', () => openMenu(false));

$('copy').addEventListener('click', () => {
  const area = $<HTMLTextAreaElement>('savetext');
  navigator.clipboard.writeText(area.value).then(
    () => (note.textContent = 'Save copied.'),
    () => {
      area.focus();
      area.select();
      note.textContent = 'Could not copy for you. The text is selected: copy it by hand.';
    },
  );
});

$('load').addEventListener('click', () => {
  const text = $<HTMLTextAreaElement>('loadtext').value.trim();
  try {
    const loaded = Game.load(text);
    game = loaded;
    write(slot(game.state.seed), game.save());
    write('lightspeed.last', String(game.state.seed));
    openMenu(false);
    log.replaceChildren();
    print([{ k: 'dim', s: 'Voyage loaded.' }, ...game.exec('look').slice(1)]);
    refresh();
  } catch (error) {
    note.textContent = String(error).includes('older version')
      ? 'That save is from an older version of the game, and the galaxy has changed since.'
      : 'That text is not a save from this game. Check that all of it was pasted.';
  }
});

$('begin').addEventListener('click', (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const seed = Number($<HTMLInputElement>('newseed').value);
  if (!Number.isInteger(seed) || seed <= 0 || seed >= 2 ** 31) {
    note.textContent = 'A seed is a whole number, for example 271828.';
    return;
  }
  // Starting over is asked twice, because the page cannot show a confirm box.
  if (button.textContent === 'Begin' && read(slot(seed))) {
    button.textContent = 'Replace the voyage saved under this seed';
    return;
  }
  openMenu(false);
  begin(seed, true);
});

// ---- input ----

$('entry').addEventListener('submit', (event) => {
  event.preventDefault();
  submit(cmd.value);
  cmd.value = '';
});

cmd.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' && historyAt > 0) {
    cmd.value = history[--historyAt];
    event.preventDefault();
  } else if (event.key === 'ArrowDown' && historyAt < history.length) {
    cmd.value = history[++historyAt] ?? '';
    event.preventDefault();
  }
});

// Keep the input above an on-screen keyboard where the browser reports one.
const viewport = window.visualViewport;
if (viewport) {
  const fit = () => {
    $('app').style.height = viewport.height < window.innerHeight - 80 ? `${viewport.height}px` : '';
    log.scrollTop = log.scrollHeight;
  };
  viewport.addEventListener('resize', fit);
}

begin(seedFromUrl());
