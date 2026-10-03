/**
 * Copy the repo-root zone maps into the package's `dist/` so the published
 * tarball is self-contained.
 *
 * The OCR engine cannot run without them, and they live outside the package
 * (at the repository root) because they are CC0 assets shared across the
 * project rather than MIT code. Their CC0 LICENSE travels with them, so the
 * licence that applies to the copies is never ambiguous.
 */
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(pkgRoot, '..', '..', 'zone-maps');
const target = join(pkgRoot, 'dist', 'zone-maps');

mkdirSync(target, { recursive: true });
const copied = [];
for (const entry of readdirSync(source)) {
  if (entry.endsWith('.json') || entry === 'LICENSE') {
    cpSync(join(source, entry), join(target, entry));
    copied.push(entry);
  }
}
console.log(`copied ${copied.length} zone-map asset(s): ${copied.join(', ')}`);
