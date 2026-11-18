// Inline the built CSS and JS into one self-contained HTML file: dist/ball-tower.html.
// Run after `vite build` (npm run build:single does both).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_, file) =>
  `<style>\n${readFileSync(join(dist, file), 'utf8')}\n</style>`);
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, file) =>
  `<script type="module">\n${readFileSync(join(dist, file), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`);

if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error('Some assets were not inlined');
writeFileSync(join(dist, 'ball-tower.html'), html);
console.log('Wrote dist/ball-tower.html', `${(html.length / 1024).toFixed(1)} kB`);
