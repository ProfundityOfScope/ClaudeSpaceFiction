/**
 * Build the playable page.
 *
 *   docs/index.html     a complete page, served by GitHub Pages
 *   dist/artifact.html  the same page as a fragment, for publishing as an Artifact
 *
 * The game is bundled into one script and inlined, so the page is a single file.
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/web/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
});
const script = result.outputFiles[0].text.replaceAll('</script', '<\\/script');

const page = readFileSync('src/web/page.html', 'utf8');
const head = /<!--HEAD-->([\s\S]*?)<!--\/HEAD-->/.exec(page)[1].trim();
const body = page.replace(/<!--HEAD-->[\s\S]*?<!--\/HEAD-->/, '').trim();

// The same small reset the Artifact host supplies, so both builds look alike.
const reset = `<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>`;

mkdirSync('docs', { recursive: true });
mkdirSync('dist', { recursive: true });
writeFileSync(
  'docs/index.html',
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${reset}\n${head}\n</head>\n<body>\n${body}\n<script>\n${script}</script>\n</body>\n</html>\n`,
);
writeFileSync('dist/artifact.html', `${head}\n\n${body}\n<script>\n${script}</script>\n`);
console.log(`built docs/index.html and dist/artifact.html (${Math.round(script.length / 1024)} KB of script)`);
