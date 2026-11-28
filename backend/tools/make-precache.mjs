// frontend/precache.json ni yaratadi (service worker shu ro'yxatni keshlaydi). Har relizdan oldin: node backend/tools/make-precache.mjs
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const ROOT = new URL('../../frontend/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SKIP = new Set(['sw.js', 'version.json', 'precache.json', '_headers', '.assetsignore', 'README.txt']);
const out = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (!SKIP.has(n)) out.push(relative(ROOT, p).split('\\').join('/'));
  }
})(ROOT);
if (!out.includes('vendor/supabase.min.js')) out.push('vendor/supabase.min.js');
writeFileSync(join(ROOT, 'precache.json'), JSON.stringify(out.sort(), null, 1) + '\n');
console.log(out.length, 'fayl');
