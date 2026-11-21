import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { resolveFilm } from '../video/snippets.ts';
import type { Film } from '../video/types.ts';

// Every script in video/films is checked, so a new film is covered as soon as it exists.
const films: [string, Film][] = [];
for (const file of readdirSync('video/films').filter((f) => f.endsWith('.ts'))) {
  films.push([file, ((await import(`../video/films/${file}`)) as { film: Film }).film]);
}

test('there is at least the example film', () => {
  assert.ok(films.some(([file]) => file === 'example.ts'));
});

test('films quote code that still exists', () => {
  for (const [file, film] of films) {
    for (const scene of resolveFilm(film).scenes) {
      if (scene.kind === 'code') assert.ok(scene.code && scene.code.length > 0, `${file}: ${scene.file}`);
    }
  }
});

test('every sentence fits the caption area', () => {
  for (const [file, film] of films) {
    for (const scene of film.scenes) {
      assert.ok(scene.lines.length > 0, `${file}: a scene needs something said over it`);
      for (const line of scene.lines) assert.ok(line.text.length <= 110, `${file}: too long for three caption lines: ${line.text}`);
    }
  }
});
