#!/usr/bin/env node
/**
 * Guard: no real ID-sample data in the repository.
 *
 * The eID samples and their ground truth are gitignored, but prose *about* them
 * is not — two real NINs reached `specs/002-.../plan.md` as worked OCR examples
 * and were committed. `.gitignore` cannot catch that, so this does.
 *
 * Three checks, in order of strength:
 *
 *   1. No tracked file sits in a sample directory. Always runs.
 *   2. No ground-truth value appears in a tracked file. Only possible where the
 *      samples exist (a contributor's machine, a pre-commit hook) — skipped with
 *      a notice in CI, which never checks them out.
 *   3. Every NIN-shaped literal in tracked source/docs is on the synthetic
 *      allowlist. This is the check that works in CI without the samples: a new
 *      real NIN pasted into a doc is not on the list, so the build fails.
 *
 * Run: `node scripts/check-sample-pii.mjs`
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_FILE = join(ROOT, 'scripts', 'allowed-id-literals.txt');
const GROUND_TRUTH = join(ROOT, 'eID samples', 'ground-truth.json');

/** Directories that hold real document samples (mirrors .gitignore). */
const SAMPLE_DIRS = [
  /^eID samples\//,
  /(^|\/)[^/]*-samples\//,
  /(^|\/)samples\//,
];

/** Files worth scanning for pasted identifiers. */
const SCANNED = /\.(md|ts|tsx|js|mjs|cjs|json|py|php|dart|yml|yaml)$/;

/**
 * Lockfiles are machine-generated and full of base64 hash fragments that look
 * NIN-shaped. Nobody pastes a card value into one, and allowlisting the churn
 * would be endless.
 */
const NOT_SCANNED =
  /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|composer\.lock|pubspec\.lock)$/;

/** An 8-char uppercase-alphanumeric run: the shape of a Sierra Leone NIN. */
const NIN_SHAPED = /(?<![A-Za-z0-9_])[A-Z0-9]{8}(?![A-Za-z0-9_])/g;

const problems = [];
const notes = [];

const tracked = execFileSync('git', ['ls-files', '-z'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
})
  .split('\0')
  .filter(Boolean);

// ---------------------------------------------------------------- check 1
for (const file of tracked) {
  if (SAMPLE_DIRS.some((re) => re.test(file))) {
    problems.push(
      `tracked file inside a sample directory: ${file}\n` +
        '    Real ID samples are PII and must never be committed (Architecture Spec §9).',
    );
  }
}

// ------------------------------------------------------- read tracked files
const contents = new Map();
for (const file of tracked) {
  if (!SCANNED.test(file) || NOT_SCANNED.test(file)) continue;
  try {
    contents.set(file, readFileSync(join(ROOT, file), 'utf8'));
  } catch {
    // Unreadable/binary — nothing to scan.
  }
}

// ---------------------------------------------------------------- check 2
if (existsSync(GROUND_TRUTH)) {
  // Keys that hold bookkeeping, not card data. Everything else — nin, name, dob,
  // document_number, whatever the ground truth grows next — is treated as PII by
  // default, so a new field is protected without editing this script.
  const NOT_PII_KEYS = new Set(['file', 'files', '_note', 'note', 'source']);

  const secrets = new Set();
  const collect = (node, key) => {
    if (Array.isArray(node)) {
      node.forEach((child) => collect(child, key));
    } else if (node && typeof node === 'object') {
      for (const [childKey, child] of Object.entries(node))
        collect(child, childKey);
    } else if (
      typeof node === 'string' &&
      node.length >= 6 &&
      !NOT_PII_KEYS.has(key)
    ) {
      secrets.add(node);
    }
  };
  const gt = JSON.parse(readFileSync(GROUND_TRUTH, 'utf8'));
  collect(gt.samples ?? gt, 'samples');

  for (const [file, text] of contents) {
    for (const secret of secrets) {
      if (text.includes(secret)) {
        // Never echo the value itself — that would leak it into CI logs.
        problems.push(
          `real sample value from ground-truth.json appears in ${file} ` +
            `(${mask(secret)})\n` +
            '    Replace it with a synthetic stand-in, then purge it from git history.',
        );
      }
    }
  }
} else {
  notes.push(
    'eID samples/ground-truth.json not present — skipped the exact-value check ' +
      '(expected in CI). Check 3 still applies.',
  );
}

// ---------------------------------------------------------------- check 3
const allowed = readAllowlist();
const unknown = new Map();
for (const [file, text] of contents) {
  if (file === 'scripts/allowed-id-literals.txt') continue;
  for (const [token] of text.matchAll(NIN_SHAPED)) {
    if (allowed.has(token)) continue;
    if (!unknown.has(token)) unknown.set(token, new Set());
    unknown.get(token).add(file);
  }
}
for (const [token, files] of unknown) {
  problems.push(
    `un-allowlisted NIN-shaped literal ${mask(token)} in ${[...files].join(', ')}\n` +
      '    If it is synthetic, add it to scripts/allowed-id-literals.txt with a note.\n' +
      '    If it came off a real card, replace it and purge it from git history.',
  );
}

// ---------------------------------------------------------------- report
for (const note of notes) console.log(`note: ${note}`);
if (problems.length > 0) {
  console.error(
    `\n✗ sample-PII guard failed (${problems.length} problem(s)):\n`,
  );
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log(
  `✓ sample-PII guard passed — ${contents.size} tracked files scanned, ` +
    `${allowed.size} synthetic literals allowlisted.`,
);

/** Show only the first two characters, so logs never carry a real identifier. */
function mask(value) {
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(0, value.length - 2))}`;
}

function readAllowlist() {
  if (!existsSync(ALLOWLIST_FILE)) {
    console.error(`✗ missing allowlist: ${ALLOWLIST_FILE}`);
    process.exit(1);
  }
  return new Set(
    readFileSync(ALLOWLIST_FILE, 'utf8')
      .split('\n')
      .map((line) => line.replace(/#.*$/, '').trim())
      .filter(Boolean),
  );
}
