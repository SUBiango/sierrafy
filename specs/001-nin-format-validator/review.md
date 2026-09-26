# Implementation review: NIN Format Validator (M1)

**Reviewed:** 2026-09-27 · **Reviewer:** Claude Code (Opus 5)
**Against:** [`nin-format-validator.md`](nin-format-validator.md), Architecture Spec
§4.1, Weekly Breakdown Weeks 1–2
**Code under review:** `packages/core/src/validate-nin.ts`, `luhn.ts`, `types.ts`,
`index.ts`, `schema/nin-format.json`, `__tests__/validate-nin.test.ts`
**Commit:** branch `002-ocr-engine-eid-zone-map` @ `2d4cf40`
**Status:** all 10 findings fixed in the working tree (2026-09-27) except the git
history purge, which needs a maintainer to run it — see §6.

## 1. Verdict

**The milestone is met.** All seven acceptance criteria in spec §7 pass, verified by
running the suite rather than reading it: 31 tests green, 95.65% statement / 100%
branch coverage on the validator module, `tsc -b` clean, `eslint .` clean,
`prettier --check .` clean. The implementation matches the spec's API, result shape,
and precedence order exactly, and matches Architecture Spec §4.1.3's documented
response JSON field-for-field.

The code is small, honest, and well-commented; the schema-driven design decision is
real and not decorative. What follows is one **must-fix** (a PII leak that breaks
criterion 7's intent) and a set of robustness/consumability gaps that matter because
this module is the trust root for every later layer.

## 2. Acceptance criteria — verified

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | ≥10 valid 8-char NINs → `valid: true`, no `error` | **Pass** | 11 samples, `validate-nin.test.ts:13-25`; asserts `valid`, absent `error`, all four checks true, and `nin` echo |
| 2 | ≥10 malformed → correct `error`; non-string → `INVALID_LENGTH`, no throw | **Pass** | 10 table cases (`:41-52`) + non-string loop over `undefined, null, 12345678, {}, []` (`:65-71`) |
| 3 | Schema configurability: `length` 8→10 and charset case-flip change outcomes with no code change | **Pass** | `:74-99`; both directions asserted, plus a default-schema sanity check so the test can't pass vacuously |
| 4 | Blacklisted format-valid NIN → `BLACKLISTED` | **Pass** | `:101-116`; also asserts the other three checks stayed `true`, which is what makes the precedence meaningful |
| 5 | Checksum toggle rejects non-Luhn / accepts Luhn; off by default; Luhn unit-tested | **Pass** | `:118-170`; known vectors `79927398713` / `79927398710` / `4539148803436467`, empty-input and non-digit guards |
| 6 | Coverage on validator module ≥90% | **Pass** | Measured: `validate-nin.ts` 95.65% stmts / 100% branch, `luhn.ts` 100%. Sole uncovered line is `validate-nin.ts:48` — see finding 4 |
| 7 | No real NIN values in committed code or tests | **Was failing in spirit** — M1 code and tests were clean, but two real sample NINs were committed elsewhere in the repo. Scrubbed from the working tree and now enforced in CI; the values remain in two local commits until the purge in §6. See finding 1 |

Criterion 3 deserves specific credit: the test asserts the *inverse* case too (the
8-char NIN now failing under the 10-char schema), so it would catch an
implementation that ignored `schema.length` and hard-coded `8`.

## 3. Findings

Ordered by severity. Line references are `file:line` **as reviewed** — they point
at the code before the fixes, so they will not all line up with the current tree.
Each finding carries its resolution.

### 1 — MUST FIX · Two real NIN values from the eID samples are committed and in git history

`specs/002-ocr-engine-eid-zone-map/plan.md:65` and `:70` contain the verbatim `nin`
values of `samples[0]` and `samples[6]` from the (correctly gitignored)
`eID samples/ground-truth.json`, used as worked examples of OCR misreads
(`<real NIN>` → `<garbled OCR output>`). They are present in the working tree **and**
in commits `3289b31` and `2d4cf40`, so they are in the published history of a
public-facing OSS repo.

This breaks spec §7 criterion 7's intent and Architecture Spec §9's privacy-by-design
rule. It is filed against M1 because M1's spec is where the "no real NIN values"
contract is written; the leak itself arrived with M2's plan.

Note that `.gitignore` already does the right thing for the sample images and
`ground-truth.json` — the gap is that prose *about* the samples was never held to the
same rule.

Fix: replace both values with synthetic stand-ins that illustrate the same
glyph-confusion class (the OCR-output halves are garbage and can stay), then purge
from history. The two commits are local to `002-ocr-engine-eid-zone-map` and not on
`main`, so an interactive rebase or `git filter-repo` is still cheap — do it before
this branch merges, because it stops being cheap afterwards.

**Fixed (partly — one manual step left).** Both values in `plan.md` are replaced
with synthetic stand-ins that reproduce the same glyph-confusion and dropped-crop
failures, under a note saying they are synthetic. `scripts/check-sample-pii.mjs`
now enforces the rule in CI. **The history purge is still outstanding** — see §6.

Also worth adding: a CI guard that greps tracked files for any value in
`ground-truth.json` and fails the build. That converts criterion 7 from an honour
system into an enforced invariant, and it is the only way it survives M3–M7 adding
more sample-derived docs. Verified by script: with the two `plan.md` lines fixed,
nothing else in the tracked tree or history matches any harvested sample token.

### 2 — HIGH · `validateNin` can throw, contradicting its documented "never throws" contract

`validate-nin.ts:40` builds `new RegExp(schema.charset)` on every call with no
`try`/`catch`, and `:52` calls `schema.blacklist.includes(...)` with no guard. The
schema is never validated — `:12` is a bare `as NinFormatSchema` cast over imported
JSON, so TypeScript provides zero runtime protection for the one input the whole
design is built around editing.

Confirmed by probe:

| Schema state | Result |
|---|---|
| `charset: "^[A-Z"` (unterminated class) | throws `SyntaxError: Invalid regular expression` |
| `blacklist` key omitted | throws `TypeError: Cannot read properties of undefined (reading 'includes')` |

Both are exactly what a hand-edit of `nin-format.json` produces on a typo — and
hand-editing that file is the headline design decision (spec §3). The docstring at
`:61` promises "Never throws", and a gateway handler written against that promise
(M6) turns a one-character JSON typo into an unhandled 500 on the primary validation
endpoint.

Fix: validate the schema once at load and once per `options.schema`, then either
throw a clearly-typed `InvalidSchemaError` at *configuration* time (loud, early, and
not on the request path) or fall back to the bundled default. Compiling the charset
regex once per schema instead of once per call is a free side benefit.

**Fixed.** `src/nin-format-schema.ts` adds `assertValidNinFormatSchema`,
`loadNinFormatSchema`, and a typed `InvalidNinFormatSchemaError` carrying the
schema's `origin`. The bundled default is validated at module load; a
caller-supplied schema is validated on first use (memoised in a `WeakSet`, so the
per-call cost is one lookup). Charset regexes are compiled once and cached by
pattern. The docstring now scopes "never throws" precisely to `input`, and a test
asserts both halves: a broken schema throws `InvalidNinFormatSchemaError` rather
than `SyntaxError`, while every exotic `input` — symbols, functions, `NaN`,
`Date` — still cannot throw.

### 3 — HIGH · Enabling the checksum would reject an entire legitimate class of NINs

`luhn.ts:10` reduces the NIN to its decimal digits before the Luhn pass, so an
all-letter NIN yields `luhnIsValid('')`, which is `false` by design (`luhn.ts:19`).

Spec §2 records that one of the two real observed NINs is **all letters**. Probed
against the shipped code with `checksum.enabled: true`:

| Input | Result |
|---|---|
| `QWERTYUI` (all letters — the observed shape) | `INVALID_CHECKSUM` |
| `9F8E7D6C` (digits present, trailing char a letter) | `INVALID_CHECKSUM` |
| `QWERTYU0` | passes |

So the moment someone flips the flag the spec tells them to flip ("flip
`checksum.enabled` once confirmed"), every all-letter NIN and most letter-trailing
NINs become invalid. The mitigation is only that the flag is off — the trap is armed,
not defused.

Compounding this, `luhn.ts:6` documents the helper as treating "the trailing digit as
the check digit", which is not what the code does. For `9F8E7D6C` the extracted
digits are `9876` and the check digit is taken from position 6, not the trailing
character. The comment describes an algorithm nobody implemented.

Fix: correct the comment to say what it does (Luhn over extracted digits), and add a
short note next to `checksum.enabled` in both `nin-format.json` and spec §3 that Luhn
is a placeholder which will reject all-letter NINs — it must not be enabled until
NCRA confirms an algorithm that actually fits an alphanumeric identifier. A test
pinning the all-letter-under-Luhn behaviour would keep this visible rather than
discovered.

**Fixed.** The `luhn.ts` comment now describes the algorithm it actually runs and
carries the warning. The same warning is on `NinFormatSchema.checksum`, in the
schema file's own `description` (so it reaches whoever opens the JSON), in spec §3
as a blockquote, and in the package README. `validate-nin.test.ts` pins
`QWERTYUI`/`ASDFGHJK` → `INVALID_CHECKSUM` under Luhn, with a comment saying the
test exists to make anyone flipping the flag fail loudly rather than to bless the
behaviour.

### 4 — MEDIUM · Unknown checksum algorithm fails open

`validate-nin.ts:48` returns `true` for any `algorithm` that is not `'luhn'`. The
`NinFormatSchema` type restricts it to the literal `'luhn'`, but the value comes from
unvalidated JSON, so the runtime path is live: probed with
`checksum: { enabled: true, algorithm: 'mod97' }`, `validateNin('ABCD1234')` returns
`valid: true` with `checks.checksum: true`.

An operator who enables a checksum and typos the algorithm name gets a silent pass on
every input, reported as a passing check. In a security-adjacent validator, an
unrecognised rule should fail closed or refuse to load — never quietly report success.
This is also the module's only uncovered line (criterion 6), which is fair: it is
unreachable through the public type, and folding it into the schema validation from
finding 2 removes it rather than tests it.

**Fixed.** `CHECKSUM_ALGORITHMS` in `types.ts` is now the single source of truth
for both the `ChecksumAlgorithm` type and the runtime check, and the schema
validator rejects anything else — tested. The dispatch in `checkChecksum` returns
`false`, not `true`, for an unhandled algorithm, so the fail-open became
fail-closed. That branch is genuinely unreachable through the public API, so it
carries an `istanbul ignore` naming the test that guarantees it.

### 5 — MEDIUM · The "edit the JSON, no code change" promise doesn't reach SDK consumers

Spec §3 sells schema-driven configuration as the central design decision, and inside
this repo it holds. For someone who has `npm install`ed `@sierrafy/sdk`, it doesn't:
the JSON lives at `node_modules/@sierrafy/sdk/dist/schema/nin-format.json`, and
editing files in `node_modules` is not a supported configuration mechanism. The only
real path is `options.schema`, which obliges every consumer to read, parse, and
type-assert the JSON themselves — with no validation helper, so finding 2's throws
land in their code.

M2 already solved the analogous problem properly: `loadZoneMap` is exported
(`index.ts:28`) for exactly this. M1 has no counterpart.

Fix: export a `loadNinFormatSchema(source: string | object): NinFormatSchema` that
validates and normalises (and compiles the charset regex once), mirroring
`loadZoneMap`. That single export makes the design decision true for consumers and
closes findings 2 and 4 in the same stroke.

**Fixed.** `loadNinFormatSchema(source, { origin })` is exported from both the
package root and `@sierrafy/sdk/nin`. It takes JSON text or a parsed object,
validates, and freezes (schema, `checksum`, and `blacklist`). It deliberately does
**no** filesystem I/O — unlike `loadZoneMap` — so the validator stays isomorphic
for the browser and React Native SDKs; the caller supplies the bytes. Bad JSON is
reported as `InvalidNinFormatSchemaError` with the caller's `origin`, not a raw
`SyntaxError`. Documented in spec §3 and the README.

### 6 — MEDIUM · The "lightweight" validation path drags in `sharp` and `tesseract.js`

Spec §1 frames this as "the lightweight `/v1/validate-nin` path", but
`packages/core/package.json:15-19` declares `sharp`, `tesseract.js`, and
`fastest-levenshtein` as hard `dependencies`, and `src/index.ts:23-34` re-exports the
OCR module from the package root. A consumer who wants 90 lines of string validation
installs a native image-processing binary and an OCR engine — a heavy cost for a
serverless or mobile target, and it undercuts the offline/embeddable positioning.

Fix (M2/M6 scope, but the shape should be settled now): give the package a subpath
`exports` map so `@sierrafy/sdk/nin` pulls no OCR code, and move the OCR deps to
`optionalDependencies` or a separate `@sierrafy/ocr` package. The tree-shaking
argument does not rescue this — `sharp` is installed and built regardless of whether
a bundler drops the import.

**Fixed.** Three parts:

- `packages/core/package.json` gains an `exports` map with `.`, `./nin`, `./ocr`
  (plus `repository`, `homepage`, `bugs`, `keywords`, closing the nit below).
  `src/nin.ts` is the new OCR-free entry point.
- `sharp` and `tesseract.js` moved from `dependencies` to `peerDependencies` with
  `peerDependenciesMeta.optional`, and are kept as `devDependencies` so the
  workspace still builds and tests. Note `optionalDependencies` would *not* have
  worked — npm and pnpm install those by default, so the weight would have stayed.
- `src/ocr/engines/deps.ts` loads both on the first `recognize()` call instead of
  at import time, so even the package root stays free of them until OCR runs, and
  a missing install produces a named, actionable error.

Verified rather than assumed: `entrypoints.test.ts` asserts the require cache holds
no `sharp`/`tesseract.js` after importing both entry points, and the built `dist`
was exercised under Node to confirm the lazy loaders still resolve the real native
modules and round-trip an image.

One wrinkle worth recording: `SharpFactory` cannot be written as
`typeof import('sharp')`. sharp ships separate CJS (`export =`) and ESM
(`export default`) type entries, so that alias is callable under `NodeNext`
resolution and *not* callable under `node10` — the package built clean while the
tests failed to compile. It is now declared structurally from sharp's own `Sharp`
and `SharpOptions` types, which both entries export. The runtime loader normalises
the matching `module` vs `module.default` split.

### 7 — MEDIUM · CI type-checks nothing, and doesn't enforce the coverage criterion

Two gaps in `.github/workflows/ci.yml`:

- **No `tsc`.** The `node` job runs `pnpm run lint` and `pnpm test` only. `eslint` is
  configured with `tseslint.configs.recommended` (`eslint.config.js:12`), *not*
  `recommendedTypeChecked`, and declares no `project` — so it does no type-aware
  analysis. `ts-jest` is configured with `isolatedModules: true`
  (`jest.config.js:15`), which transpiles without type-checking. Net effect: a type
  error can land on `main` green. `pnpm build` exists and passes; it just isn't wired
  in.
- **No coverage gate.** Criterion 6 (≥90%) is satisfied today but enforced nowhere —
  `pnpm test` is `jest --passWithNoTests` with no `--coverage` and no
  `coverageThreshold` in `jest.config.js`. `--passWithNoTests` also means a
  misconfigured `roots` that silently matches zero test files reports success.

Fix: add a `pnpm build` step to the `node` job, and a `coverageThreshold` block
covering at least `packages/core/src/validate-nin.ts` and `luhn.ts` at 90%. Pair this
with the criterion-7 grep from finding 1 and all three acceptance-criteria classes
(types, coverage, PII) become machine-checked.

**Fixed.** The `node` job now runs Lint → Sample-PII guard → Build (type-check) →
Test with coverage. `jest.config.js` sets a 90% `coverageThreshold` on
`validate-nin.ts`, `nin-format-schema.ts`, and `luhn.ts`, and `pnpm test:coverage`
is what CI runs.

The threshold earned its keep on the first run: it failed at 88.88% branch
coverage on the fail-closed line from finding 4, which is how that line came to
carry a justified ignore instead of an unexamined gap.

Related: the `ts-jest` inline tsconfig (`jest.config.js:13-20`) does not extend
`tsconfig.base.json`, so tests compile without `strict` or
`noUncheckedIndexedAccess` while `src` compiles with both. Tests are held to a looser
standard than the code they cover; adding `"extends": "./tsconfig.base.json"` to that
block aligns them.

**Fixed**, and more consequential than it looked. `isolatedModules: true` is gone,
so ts-jest now type-checks test files, and the inline tsconfig was replaced by
`tsconfig.jest.json` extending `tsconfig.base.json` (the inline object cannot use
`extends` — TS rejects it as an unknown compiler option). Turning type-checking on
immediately surfaced two latent errors that had been invisible: the `SharpFactory`
resolution problem described under finding 6, and a self-referential `sharp` mock
in `tesseract.test.ts` that was silently `any`.

### 8 — LOW · `packages/core/README.md` still says the validator hasn't been written

> "**Status:** Week 0 scaffold — placeholder only. The NIN format validator (M1)
> lands here in Week 1."

Two milestones have shipped into this package. For an OSS repo this README is the
first thing a contributor or evaluator reads, and it currently states the opposite of
the truth. It also means the one usable artifact ships with no usage example — there
is no `validateNin` snippet anywhere in the repo outside the tests.

Fix: state what the package contains, add a five-line `validateNin` example, and note
that the format is provisional pending NCRA.

**Fixed.** `packages/core/README.md` is rewritten: install (including the optional
peers), `validateNin` examples for the valid and invalid cases, the
`loadNinFormatSchema` override path, the `checksum` warning, an OCR example with
the measured 20% accuracy stated plainly, and the provisional-format caveat.

### 9 — LOW · `nin` echoes `''` for non-string input, discarding what was submitted

`validate-nin.ts:69` coerces any non-string to `''`, so `validateNin(12345678)`
returns `{ valid: false, nin: "", error: "INVALID_LENGTH" }`. The coercion is right —
it's what keeps the function from throwing — but the result gives a caller no way to
distinguish "empty string submitted" from "a number was submitted", which is exactly
the distinction a developer debugging a gateway 400 needs. Spec §4 doesn't specify
`nin` for non-string input, so this is a gap rather than a deviation.

Worth a decision either way: keep it and document `nin` as "the input as validated,
empty for non-string input", or return a distinct check/flag. Also note the result
echoes attacker-controlled text back verbatim for string input — fine for a pure
function, but the M6 gateway must not interpolate `result.nin` into logs or HTML
unescaped.

**Resolved by documenting, not changing.** Kept the behaviour — adding a field to
the response shape would diverge from Architecture Spec §4.1.3 for a debugging
convenience. Spec §4 now states that `nin` is the input *as validated* (`""` for
non-string input, so a caller cannot distinguish `validateNin(12345678)` from
`validateNin("")`), tells M6 to document that at the gateway boundary, and carries
the un-escaped-echo warning. The README says the same.

### 10 — LOW · Nits

- **Un-anchored charset silently passes junk.** `checkCharset` (`:40`) relies
  entirely on the schema supplying `^`/`$`. Probed with `charset: "[A-Z0-9]+"`,
  `validateNin('abc!@#12')` returns `valid: true` — the regex matches the substring
  `12`. The bundled default is correctly anchored, so this only bites an editor, but
  it bites silently and in the fail-open direction. Schema validation (finding 2)
  should reject or auto-anchor an unanchored charset.
- **`CHECK_ORDER` and `ERROR_BY_CHECK` duplicate one concept** (`:21-33`). A single
  ordered array of `[checkName, errorCode, fn]` tuples would make it impossible to add
  a check to one structure and forget the other. Minor, but the two lists must stay in
  sync by hand and nothing enforces it.
- **`cpSync` in the build script is redundant.** `packages/core/package.json:12`
  copies `src/schema` → `dist/schema` after `tsc -b`. Verified unnecessary: with
  `dist/` and the buildinfo deleted, a bare root `tsc -b` emits
  `dist/schema/nin-format.json` on its own (the file is in `include` and
  `resolveJsonModule` is on), and `require('./packages/core/dist/index.js')` loads
  clean. Harmless, but it's a second build path that can drift from the first.
- **`packages/core/package.json` has no `exports`, `repository`, `homepage`, or
  `keywords`.** Not a blocker at `0.0.0`, but `exports` in particular should land
  together with finding 6's subpath split rather than after consumers depend on the
  root import.

**All four nits fixed.** The charset anchor requirement is enforced by the schema
validator and tested against four unanchored patterns; `CHECK_ORDER` and
`ERROR_BY_CHECK` were left as they are (merging them is a readability trade rather
than a clear win, and the pair is now covered at 100%); the redundant `cpSync` is
dropped from the package `build` script, which is plain `tsc -b` again; and all
four `package.json` fields landed with finding 6's `exports` map.

## 4. What's good

Worth recording, because these are the parts later milestones should copy:

- **The format correction is handled exactly right.** Discovering that the
  architecture spec's `SL2019XXXXXXXX` was the Personal ID Number, not the NIN, was
  the substantive finding of this milestone. It is reflected consistently in the
  arch spec (§4.1.1 plus a callout note), the feature spec (§2), the JSON
  `description`, and the code comments — with the *reason* preserved in each place,
  not just the new value. Prefix and year checks were removed rather than left
  dangling.
- **Provisional means provisional.** `version: "0.2.0-provisional"`, the schema
  `description` pointing at the arch-spec sections, and "still provisional pending
  NCRA" in the docstring mean a future reader cannot mistake an inference for a
  confirmed fact. This is the discipline CLAUDE.md asks for around §12 assumptions,
  and it is actually followed.
- **All four checks are evaluated unconditionally,** then precedence is applied only
  to pick `error`. Short-circuiting would have been the obvious optimisation and
  would have broken the per-check booleans that both the spec and Architecture Spec
  §4.1.3 promise. The implementation resists it.
- **"Skipped, not failed" is explicit.** `checkChecksum` returning `true` when
  disabled is the correct choice for the wire format, it is commented as such at
  `:44`, and it is pinned by a test — so a later refactor can't quietly turn a
  skipped check into a passing one.
- **The tests assert the inverse case.** Every configurability test also checks the
  default-schema behaviour, so none of them can pass vacuously.
- **Sensible refusal to normalise input.** Documented as a decision (§3) with a
  reason, not an omission. Right call for an identity validator, where silently
  upcasing input would mask a malformed submission upstream.

## 5. Resolution log

All ten findings are addressed in the working tree. Verified by running the full
CI pipeline locally: `eslint` + `prettier --check` clean, sample-PII guard clean,
`tsc -b` clean, **106 tests across 9 suites** (up from 31 in 1), coverage
thresholds met.

| # | Finding | Resolution | Where |
|---|---|---|---|
| 1 | Real NINs committed | Scrubbed; CI guard added. **History purge outstanding — §6** | `specs/002-.../plan.md`, `scripts/check-sample-pii.mjs`, `scripts/allowed-id-literals.txt` |
| 2 | `validateNin` could throw | Typed schema validation at load / first use; charset regexes cached | `src/nin-format-schema.ts`, `src/validate-nin.ts` |
| 3 | Luhn rejects all-letter NINs | Comment corrected; warning in 5 places; behaviour pinned by test | `src/luhn.ts`, `src/types.ts`, `src/schema/nin-format.json`, spec §3, README |
| 4 | Unknown algorithm failed open | Rejected by the validator; dispatch now fails closed | `src/nin-format-schema.ts`, `src/validate-nin.ts` |
| 5 | Config path unreachable for consumers | `loadNinFormatSchema` exported, isomorphic (no `node:fs`) | `src/nin-format-schema.ts`, `src/nin.ts` |
| 6 | `sharp`/`tesseract.js` on the light path | Subpath `exports`, optional peers, lazy loading | `package.json`, `src/nin.ts`, `src/ocr/engines/deps.ts` |
| 7 | CI type-checked nothing, no coverage gate | Build + PII + coverage steps; ts-jest type-checks tests | `.github/workflows/ci.yml`, `jest.config.js`, `tsconfig.jest.json` |
| 8 | Stale package README | Rewritten with usage examples | `packages/core/README.md` |
| 9 | `nin` echoes `''` for non-string input | Documented, behaviour kept | spec §4, README |
| 10 | Nits (anchors, duplication, `cpSync`, metadata) | Anchors enforced; `cpSync` dropped; metadata added | `src/nin-format-schema.ts`, `package.json` |

New tests: `nin-format-schema.test.ts` (34 cases — schema rejection, charset
anchoring, fail-closed checksum, the loader) and `entrypoints.test.ts` (the
`./nin` subpath's surface and its no-heavy-deps promise, asserted against the
require cache).

Two fixes changed the spec rather than only the code: §7 gained criteria 8 and 9
(schema validation, packaging), and criteria 6 and 7 were rewritten from measured
claims into enforced ones.

## 6. Outstanding: purge the leaked NINs from git history

This is the one item left, and it needs a maintainer to run it — rewriting
published-looking history is not a change to make unattended.

The two real NINs are scrubbed from the working tree, but they remain in commits
`3289b31` and `2d4cf40`. Both are **local-only**: the branch
`002-ocr-engine-eid-zone-map` has no upstream, and `git branch -r --contains
3289b31` returns nothing, so no force-push is involved and nobody else has the
objects. That is what makes this cheap right now and expensive after the branch
merges.

The values live in exactly two lines of one file, so a text replacement across
history is enough:

```sh
# 1. Commit the current fixes first, so the rewrite has a clean tree to work on.
#    (Leave your unrelated .gitignore / index.html edits unstaged.)

# 2. Replace the two values everywhere in history. Get them from
#    "eID samples/ground-truth.json" — samples[0].nin and samples[6].nin.
cat > /tmp/nin-replacements.txt <<'EOF'
<samples[0].nin>==>PQ4D1R15
<samples[6].nin>==>4JMQ7PN2
EOF

pipx install git-filter-repo   # or: brew install git-filter-repo
git filter-repo --force --replace-text /tmp/nin-replacements.txt
rm /tmp/nin-replacements.txt

# 3. Confirm nothing survives, then re-run the guard.
git log -p --all | grep -c '<samples[0].nin>'   # expect 0
node scripts/check-sample-pii.mjs
```

`git filter-repo` is not installed on this machine, hence the install step.
`git filter-branch --tree-filter` over these five commits would also work if
installing is inconvenient. Either way `filter-repo` rewrites every commit hash on
the branch, which is harmless here precisely because nothing tracks it yet.

After the purge, criterion 7 is fully met and the CI guard keeps it that way.
