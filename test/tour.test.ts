import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapter } from '../tour/chapter1.ts';
import { resolveChapter } from '../tour/snippets.ts';

test('the tour quotes code that still exists', () => {
  const resolved = resolveChapter(chapter);
  for (const scene of resolved.scenes) {
    if (scene.kind === 'code') assert.ok(scene.code && scene.code.length > 0, scene.file);
  }
});

test('every sentence fits the caption area', () => {
  for (const scene of chapter.scenes) {
    assert.ok(scene.lines.length > 0, 'a scene needs something said over it');
    for (const line of scene.lines) assert.ok(line.text.length <= 110, `too long for three caption lines: ${line.text}`);
  }
});
