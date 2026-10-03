/**
 * OCR NIN-extraction accuracy harness (milestone M2, acceptance criterion #8).
 *
 * Runs the real, built OCR engine over a labelled set of eID front images and
 * reports the exact NIN-match rate plus a character-level accuracy. The labelled
 * images and their ground-truth NINs are PII and are NEVER committed — point this
 * at a local, gitignored directory.
 *
 *   node packages/core/scripts/measure-ocr-accuracy.mjs ["eID samples"]
 *
 * The directory must contain a `ground-truth.json` of the form:
 *   { "samples": [ { "file": "sample-1-front.jpeg", "nin": "ABCD1234" }, ... ] }
 *
 * Build the package first (`pnpm -C packages/core build`).
 */
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ocr } = require('../dist/index.js');

const dir = resolve(process.argv[2] ?? 'eID samples');
const clean = (s) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function charAccuracy(got, truth) {
  const n = Math.max(got.length, truth.length) || 1;
  let same = 0;
  for (let i = 0; i < n; i++) if (got[i] === truth[i]) same++;
  return same / n;
}

const truth = JSON.parse(
  await readFile(join(dir, 'ground-truth.json'), 'utf8'),
);
let exact = 0;
let charSum = 0;
const rows = [];

for (const { file, nin } of truth.samples) {
  const image = await readFile(join(dir, file));
  const result = await ocr(image);
  const got = clean(result.extracted?.nin);
  const want = clean(nin);
  const hit = got === want;
  if (hit) exact++;
  charSum += charAccuracy(got, want);
  rows.push(
    `${file.padEnd(22)} got=${(got || '(none)').padEnd(12)} ${hit ? 'OK' : 'x '}`,
  );
}

const n = truth.samples.length;
console.log(rows.join('\n'));
console.log(
  `\nExact NIN match: ${exact}/${n} = ${((100 * exact) / n).toFixed(0)}%`,
);
console.log(`Mean char accuracy: ${((100 * charSum) / n).toFixed(0)}%`);
