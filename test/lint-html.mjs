/* Guard the bug class that broke the loading/error overlay earlier: no two
   elements in index.html may share an id. Run: node test/lint-html.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const seen = new Set(), dups = new Set();
for (const id of ids) { if (seen.has(id)) dups.add(id); seen.add(id); }

if (dups.size) { console.log('FAIL duplicate id(s): ' + [...dups].join(', ')); process.exit(1); }
console.log(`PASS no duplicate ids (${ids.length} ids, ${seen.size} unique)`);
