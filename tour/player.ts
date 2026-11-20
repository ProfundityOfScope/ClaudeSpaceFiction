/**
 * Draws a tour chapter in the browser.
 *
 * Everything on screen is a pure function of the time `t`: `renderAt(t)` sets
 * every element to how it looks at that moment. Nothing uses CSS transitions,
 * so the renderer can ask for frames in any order and get the same picture.
 */
import type { Box, TimedChapter, TimedScene } from './types.ts';

declare global {
  interface Window {
    CHAPTER: TimedChapter;
    __tour: { total: number; renderAt(t: number): void };
  }
}

type Anim = (t: number) => void;
const anims: Anim[] = [];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);

function el(tag: string, cls = '', text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

/** When step `k` of a scene is the current one: [begins, ends). */
function stepSpan(scene: TimedScene, k: number): [number, number] {
  const steps = scene.lines.map((line, i) => line.step ?? i);
  const first = steps.findIndex((s) => s >= k);
  const next = steps.findIndex((s) => s > k);
  const begins = k === 0 ? scene.start : first < 0 ? Infinity : scene.lineStart[first];
  return [begins, next < 0 ? scene.end : scene.lineStart[next]];
}

/** Bring something in when its step begins, and mark it while its step is current. */
function staged(node: HTMLElement, scene: TimedScene, step: number, hidden: boolean) {
  const [begins, ends] = stepSpan(scene, step);
  anims.push((t) => {
    if (hidden) {
      const p = ease((t - begins) / 0.45);
      node.style.opacity = String(p);
      node.style.transform = `translateY(${(1 - p) * 18}px)`;
    } else {
      node.classList.toggle('wait', t < begins);
    }
    node.classList.toggle('now', t >= begins && t < ends);
  });
}

function box(b: Box, extra = ''): HTMLElement {
  const node = el('div', `box ${extra}`);
  node.append(el('div', 'label', b.label));
  if (b.sub) node.append(el('div', 'sub', b.sub));
  return node;
}

// ---- code colouring: just enough to tell words from strings from comments ----

const TOKEN = /(\/\/.*$|#.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(@\w+|\b(?:const|let|function|return|if|else|for|of|switch|case|break|export|interface|type|class|private|new|this|import|from)\b)/g;

function codeLine(text: string): HTMLElement {
  const line = el('span', text === '…' ? 'cl gap' : 'cl');
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    line.append(text.slice(last, m.index));
    line.append(el('span', m[1] ? 'com' : m[2] ? 'str' : 'kw', m[0]));
    last = m.index + m[0].length;
  }
  line.append(text.slice(last) || ' ');
  return line;
}

// ---- one builder per kind of scene ----

function build(scene: TimedScene): HTMLElement {
  const root = el('section', `scene ${scene.kind}`);
  switch (scene.kind) {
    case 'title': {
      const name = el('div', 'name');
      root.append(el('div', 'kicker', scene.kicker), name, el('div', 'sub', scene.sub));
      // The title writes itself in.
      anims.push((t) => {
        name.textContent = scene.title.slice(0, Math.ceil(clamp((t - scene.start - 0.1) / 0.7) * scene.title.length)) || ' ';
      });
      break;
    }
    case 'big':
      for (const item of scene.items) {
        const node = el('div', `item ${item.tone ?? 'ink'}`, item.text);
        root.append(node);
        staged(node, scene, item.step, item.step > 0);
      }
      break;
    case 'tree':
      if (scene.heading) root.append(el('div', 'heading', scene.heading));
      for (const row of scene.rows) {
        const node = el('div', 'row');
        node.append(el('span', 'name', row.text), el('span', 'note', row.note));
        root.append(node);
        staged(node, scene, row.step, false);
      }
      break;
    case 'split': {
      const pair = el('div', 'pair');
      const left = box(scene.left);
      const right = box(scene.right);
      const arrow = el('div', 'arrow');
      arrow.append(el('b', '', '→'), scene.arrow.text);
      const rule = el('div', 'rule', scene.rule.text);
      pair.append(left, arrow, right);
      root.append(pair, rule);
      staged(left, scene, scene.left.step, false);
      staged(right, scene, scene.right.step, false);
      staged(arrow, scene, scene.arrow.step, true);
      staged(rule, scene, scene.rule.step, true);
      break;
    }
    case 'fan': {
      const callers = el('div', 'callers');
      const arrows = el('div', 'arrows');
      for (const c of scene.callers) {
        const node = box(c);
        const arrow = el('span', '', '↓');
        callers.append(node);
        arrows.append(arrow);
        staged(node, scene, c.step, true);
        staged(arrow, scene, c.step, true);
      }
      const target = box(scene.target, 'target');
      root.append(callers, arrows, target);
      staged(target, scene, scene.target.step, false);
      break;
    }
    case 'code': {
      const code = scene.code ?? [];
      const longest = Math.max(...code.map((l) => l.length), ...(scene.aside?.code ?? []).map((l) => l.length));
      const size = Math.min(34, Math.floor(846 / (longest * 0.602)));
      const pre = el('pre');
      pre.style.fontSize = `${size}px`;
      const lines = code.map(codeLine);
      pre.append(...lines);
      root.append(el('div', 'file', scene.file), pre);
      // Light up the lines that the current sentence is about; fade the rest.
      const marks = (scene.hl ?? []).map((h) => ({ span: stepSpan(scene, h.step), match: h.match }));
      anims.push((t) => {
        const live = marks.filter((m) => t >= m.span[0] && t < m.span[1]);
        lines.forEach((line, i) => {
          const hit = live.some((m) => code[i].includes(m.match));
          line.classList.toggle('hl', hit);
          line.classList.toggle('low', live.length > 0 && !hit);
        });
      });
      if (scene.aside) {
        const aside = el('div', 'aside');
        const asidePre = el('pre');
        asidePre.style.fontSize = `${size}px`;
        asidePre.append(...scene.aside.code.map(codeLine));
        aside.append(el('div', 'file', scene.aside.label), asidePre);
        root.append(aside);
        staged(aside, scene, scene.aside.step, true);
      }
      break;
    }
    case 'flow':
      scene.nodes.forEach((n, i) => {
        if (i > 0) {
          const down = el('div', 'down', '↓');
          root.append(down);
          staged(down, scene, n.step, true);
        }
        const node = box(n);
        root.append(node);
        staged(node, scene, n.step, n.step > 0);
      });
      break;
    case 'type': {
      const field = el('div', 'field');
      const typed = el('span', 'typed');
      const caret = el('span', 'caret');
      field.append(el('span', 'prompt', '>'), typed, caret);
      const chips = el('div', 'chips');
      const [begins] = stepSpan(scene, scene.step);
      for (const c of scene.chips) {
        const chip = el('span', 'chip', c);
        chips.append(chip);
        if (c === scene.typed) staged(chip, scene, scene.step, false);
      }
      root.append(chips, field);
      anims.push((t) => {
        typed.textContent = scene.typed.slice(0, Math.floor(clamp((t - begins - 0.5) / 0.8) * scene.typed.length));
        caret.style.opacity = Math.floor(t * 2.5) % 2 === 0 ? '1' : '0';
      });
      break;
    }
    case 'console':
      (scene.outs ?? []).forEach((o, i) => {
        const node = el(o.k === 'pre' ? 'pre' : 'p', `o ${o.k}`, o.s);
        root.append(node);
        const at = scene.start + 0.25 + i * 0.22;
        anims.push((t) => (node.style.opacity = String(ease((t - at) / 0.3))));
      });
      break;
    case 'cmds':
      for (const row of scene.rows) {
        const node = el('div', 'row');
        node.append(el('span', 'cmd', row.cmd), el('span', 'note', row.note));
        root.append(node);
        staged(node, scene, row.step, false);
      }
      break;
  }
  // A scene is on stage only during its own time, and fades in.
  anims.push((t) => {
    const on = t >= scene.start && t < scene.end;
    root.style.display = on ? 'flex' : 'none';
    if (on) root.style.opacity = String(ease((t - scene.start) / 0.3));
  });
  return root;
}

function start(chapter: TimedChapter) {
  const frame = document.getElementById('frame')!;
  const top = el('div');
  top.id = 'top';
  top.append(el('span', '', 'LIGHTSPEED · A TOUR'), el('span', '', `${chapter.number} · ${chapter.title}`));
  const bar = el('div');
  bar.id = 'bar';
  const fill = el('i');
  bar.append(fill);
  const rule = el('div');
  rule.id = 'rule';
  const cap = el('div');
  cap.id = 'cap';
  frame.append(top, bar, ...chapter.scenes.map(build), rule, cap);

  // Captions: the sentence being spoken, held until the next one starts.
  // A caption belongs to its scene: it clears when the picture changes.
  const spoken = chapter.scenes.flatMap((s) => s.lines.map((line, i) => ({ text: line.text, at: s.lineStart[i], until: s.end })));
  anims.push((t) => {
    let current = -1;
    for (let i = 0; i < spoken.length && spoken[i].at <= t; i++) current = i;
    if (current >= 0 && t >= spoken[current].until) current = -1;
    cap.textContent = current < 0 ? '' : spoken[current].text;
    cap.style.opacity = current < 0 ? '0' : String(ease((t - spoken[current].at) / 0.2));
    fill.style.width = `${(100 * clamp(t / chapter.total)).toFixed(2)}%`;
  });

  window.__tour = { total: chapter.total, renderAt: (t) => anims.forEach((a) => a(t)) };
  window.__tour.renderAt(0);
  // Opened by hand rather than by the renderer: just play, silently, in real time.
  if (!location.search.includes('render')) {
    const began = performance.now();
    const tick = () => {
      window.__tour.renderAt(((performance.now() - began) / 1000) % (chapter.total + 1));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

start(window.CHAPTER);
