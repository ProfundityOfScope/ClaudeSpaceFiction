/**
 * Pull the code a scene quotes out of the real source files.
 *
 * Quoting by search text rather than by line number means the tour survives
 * edits elsewhere in a file, and fails loudly if the quoted code is removed.
 */
import { readFileSync } from 'node:fs';
import type { Chapter, CodeScene } from './types.ts';

function dedent(lines: string[]): string[] {
  const indents = lines.filter((l) => l.trim() && l !== '…').map((l) => l.length - l.trimStart().length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => (l === '…' ? l : l.slice(cut)));
}

export function resolveSnippet(scene: CodeScene, root = '.'): string[] {
  const lines = readFileSync(`${root}/${scene.file}`, 'utf8').split('\n');
  const find = (needle: string, after: number): number => {
    const at = lines.findIndex((l, i) => i >= after && l.includes(needle));
    if (at < 0) throw new Error(`tour: "${needle}" not found in ${scene.file}`);
    return at;
  };
  let out: string[] = [];
  if (scene.from !== undefined) {
    const start = find(scene.from, 0);
    out = lines.slice(start, start + (scene.count ?? 1));
  } else if (scene.pick) {
    let last = -1;
    for (const needle of scene.pick) {
      const at = find(needle, last + 1);
      // Mark the places where lines were skipped.
      if (last >= 0 && at > last + 1) out.push('…');
      out.push(lines[at]);
      last = at;
    }
  } else {
    throw new Error(`tour: a code scene for ${scene.file} needs "from" or "pick"`);
  }
  out = dedent(out);
  for (const mark of scene.hl ?? []) {
    if (!out.some((l) => l.includes(mark.match))) throw new Error(`tour: highlight "${mark.match}" is not in the quoted lines of ${scene.file}`);
  }
  return out;
}

/** Fill in `code` on every code scene of a chapter. */
export function resolveChapter(chapter: Chapter, root = '.'): Chapter {
  return {
    ...chapter,
    scenes: chapter.scenes.map((s) => (s.kind === 'code' ? { ...s, code: resolveSnippet(s, root) } : s)),
  };
}
