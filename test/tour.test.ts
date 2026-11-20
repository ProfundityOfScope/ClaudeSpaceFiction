import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapter as chapter1 } from '../tour/chapter1.ts';
import { chapter as chapter2 } from '../tour/chapter2.ts';
import { chapter as chapter3 } from '../tour/chapter3.ts';
import { chapter as chapter4 } from '../tour/chapter4.ts';
import { chapter as chapter5 } from '../tour/chapter5.ts';
import { resolveChapter } from '../tour/snippets.ts';

const chapters = [chapter1, chapter2, chapter3, chapter4, chapter5];

test('the tour quotes code that still exists', () => {
  for (const chapter of chapters) {
    for (const scene of resolveChapter(chapter).scenes) {
      if (scene.kind === 'code') assert.ok(scene.code && scene.code.length > 0, scene.file);
    }
  }
});

test('every sentence fits the caption area', () => {
  for (const chapter of chapters) {
    for (const scene of chapter.scenes) {
      assert.ok(scene.lines.length > 0, 'a scene needs something said over it');
      for (const line of scene.lines) assert.ok(line.text.length <= 110, `too long for three caption lines: ${line.text}`);
    }
  }
});
