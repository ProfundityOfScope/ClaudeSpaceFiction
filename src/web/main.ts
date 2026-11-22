/**
 * The web page: a thin shell around `Game`.
 *
 * It prints what the game returns, offers the suggested commands as buttons,
 * and keeps the voyage in this browser's storage (one slot per seed).
 */
import { Game, type Out } from '../core/game.ts';
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

// ---- drawing ----

function print(items: Out[]) {
  let first: HTMLElement | null = null;
  for (const item of items) {
    // A map arrives with the numbers behind it as well; this page shows the character map.
    const block = item.k === 'pre' || item.k === 'map';
    const el = document.createElement(block ? 'pre' : 'p');
    el.className = `o ${block ? 'pre' : item.k} fresh`;
    el.textContent = item.s;
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
