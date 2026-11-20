/**
 * Turn a tour chapter into a narrated video.
 *
 *   node tour/render.ts 1                     writes dist/tour/chapter1.mp4
 *   node tour/render.ts 1 --voice bm_george   the same, in another voice
 *   node tour/render.ts 1 --stills 5,40       writes stills at those seconds instead
 *
 * Steps: quote the real code, speak each sentence to a sound file, lay the
 * sentences end to end to get the timing, draw every frame in a headless
 * browser, and let ffmpeg join pictures and sound.
 *
 * Needs on the machine: ffmpeg, the IBM Plex fonts, Playwright with Chromium,
 * and a voice: Kokoro (see tour/speak.py) or, with --voice pico, pico2wave.
 */
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { Game } from '../src/core/game.ts';
import { resolveChapter } from './snippets.ts';
import type { Chapter, TimedChapter, TimedScene } from './types.ts';

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1350;
/** Seconds of quiet: before a scene's first sentence, between sentences, between scenes, at the very end. */
const SETTLE = 0.35;
const BREATH = 0.24;
const TURN = 0.55;
const TAIL = 1.4;
/** Speaking rate: for Kokoro a multiplier, for Pico a percentage of its own pace. */
const SPEED = 1.0;
const PACE = 122;
/** How the voice should say words it would otherwise mangle. Captions keep the real spelling. */
const SAY: [RegExp, string][] = [
  [/Lightspeed/g, 'Light speed'],
  [/TypeScript/g, 'Type Script'],
  [/GitHub/g, 'Git hub'],
  [/JSON/g, 'Jason'],
];

const args = process.argv.slice(2);
const option = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const which = args.find((a) => /^\d+$/.test(a)) ?? '1';
/** The narrator: a Kokoro voice such as am_michael or bm_george, or "pico" for the older offline synthesiser. */
const VOICE = option('voice') ?? 'am_michael';
const stillsAt = option('stills')?.split(',').map(Number) ?? null;
const out = 'dist/tour';
mkdirSync(`${out}/voice`, { recursive: true });

const source = ((await import(`./chapter${which}.ts`)) as { chapter: Chapter }).chapter;

// ---- 1. real code and real game output ----

const chapter = resolveChapter(source);
for (const scene of chapter.scenes) {
  if (scene.kind !== 'console') continue;
  const game = Game.fresh();
  // Drop the echoed command; the scene before it already showed the typing.
  scene.outs = scene.commands.flatMap((c) => game.exec(c)).filter((o) => o.k !== 'echo');
}

// ---- 2. the voice: one sound file per sentence, cached by voice and text ----

interface Clip {
  pcm: Buffer;
  rate: number;
  seconds: number;
}

const said = (text: string) => SAY.reduce((s, [from, to]) => s.replace(from, to), text);
const clipFile = (text: string) =>
  `${out}/voice/${createHash('sha1').update(`${VOICE}|${VOICE === 'pico' ? PACE : SPEED}|${said(text)}`).digest('hex').slice(0, 12)}.wav`;

/** Make sure every sentence has a sound file. Kokoro loads its model once and speaks them all. */
function record(texts: string[]) {
  const missing = [...new Set(texts)].filter((t) => !existsSync(clipFile(t)));
  if (!missing.length) return;
  if (VOICE === 'pico') {
    for (const t of missing) execFileSync('pico2wave', ['-l', 'en-GB', '-w', clipFile(t), `<speed level="${PACE}">${said(t)}</speed>`]);
    return;
  }
  const job = `${out}/voice/job.json`;
  writeFileSync(job, JSON.stringify({ voice: VOICE, speed: SPEED, items: missing.map((t) => ({ text: said(t), file: clipFile(t) })) }));
  execFileSync('python3', ['tour/speak.py', job], { stdio: 'inherit' });
}

function load(text: string): Clip {
  const file = clipFile(text);
  const wav = readFileSync(file);
  // A WAV file is a header, then chunks; the sound itself is the chunk named "data".
  let at = 12;
  while (wav.toString('ascii', at, at + 4) !== 'data') at += 8 + wav.readUInt32LE(at + 4);
  const pcm = wav.subarray(at + 8, at + 8 + wav.readUInt32LE(at + 4));
  const rate = wav.readUInt32LE(24);
  return { pcm, rate, seconds: pcm.length / 2 / rate };
}

// ---- 3. timing: sentences laid end to end ----

record(chapter.scenes.flatMap((s) => s.lines.map((l) => l.say ?? l.text)));
let t = 0;
let rate = 16000;
const placed: { at: number; clip: Clip }[] = [];
const scenes: TimedScene[] = chapter.scenes.map((scene) => {
  const start = t;
  t += SETTLE;
  const lineStart: number[] = [];
  const lineEnd: number[] = [];
  for (const line of scene.lines) {
    const clip = load(line.say ?? line.text);
    rate = clip.rate;
    placed.push({ at: t, clip });
    lineStart.push(t);
    t += clip.seconds;
    lineEnd.push(t);
    t += BREATH;
  }
  t += TURN - BREATH;
  return { ...scene, start, end: t, lineStart, lineEnd };
});
const total = t + TAIL;
scenes[scenes.length - 1].end = total;
const timed: TimedChapter = { number: chapter.number, title: chapter.title, total, scenes };

// One sound track: silence, with each sentence copied in at its moment.
const track = Buffer.alloc(Math.ceil(total * rate) * 2);
for (const { at, clip } of placed) clip.pcm.copy(track, Math.round(at * rate) * 2);
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + track.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // plain PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(track.length, 40);
writeFileSync(`${out}/chapter${which}.wav`, Buffer.concat([header, track]));

// ---- 4. the page that draws it ----

const bundle = await build({ entryPoints: ['tour/player.ts'], bundle: true, format: 'iife', write: false, legalComments: 'none' });
const page = `<!doctype html><html><head><meta charset="utf-8"><title>Lightspeed tour ${which}</title>
<style>${readFileSync('tour/player.css', 'utf8')}</style></head><body><div id="frame"></div>
<script>window.CHAPTER = ${JSON.stringify(timed).replaceAll('</', '<\\/')};</script>
<script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></body></html>`;
const pagePath = `${out}/chapter${which}.html`;
writeFileSync(pagePath, page);
const words = chapter.scenes.flatMap((s) => s.lines).reduce((n, l) => n + l.text.split(/\s+/).length, 0);
console.log(`chapter ${which}: ${scenes.length} scenes, ${placed.length} sentences, ${words} words, ${total.toFixed(1)} s`);
if (args.includes('--times')) for (const s of scenes) console.log(`  ${s.start.toFixed(1).padStart(6)}  ${s.kind}  ${s.lines[0].text.slice(0, 50)}`);

// ---- 5. frames, and the film ----

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
await tab.goto(`file://${process.cwd()}/${pagePath}?render`);
await tab.evaluate(() => document.fonts.ready);
const shot = async (seconds: number): Promise<Buffer> => {
  await tab.evaluate((s: number) => window.__tour.renderAt(s), seconds);
  return tab.screenshot({ type: 'png' });
};

if (stillsAt) {
  mkdirSync(`${out}/stills`, { recursive: true });
  for (const s of stillsAt) writeFileSync(`${out}/stills/c${which}-${String(s).padStart(3, '0')}.png`, await shot(s));
  console.log(`wrote ${stillsAt.length} stills to ${out}/stills`);
} else {
  const film = `${out}/chapter${which}.mp4`;
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-i', `${out}/chapter${which}.wav`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-tune', 'animation',
      // The voice arrives at a low sample rate and uneven level: trim the rumble, bring it to a normal level,
      // and resample last, because the loudness filter works at a very high rate internally.
      '-af', 'highpass=f=70,loudnorm=I=-17:TP=-1.5:LRA=11,aresample=44100',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', '-shortest', film,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const frames = Math.round(total * FPS);
  for (let f = 0; f < frames; f++) {
    if (!ffmpeg.stdin.write(await shot(f / FPS))) await once(ffmpeg.stdin, 'drain');
    if (f % (FPS * 20) === 0) console.log(`  frame ${f} of ${frames}`);
  }
  ffmpeg.stdin.end();
  await once(ffmpeg, 'close');
  console.log(`wrote ${film}`);
}
await browser.close();
